#!/usr/bin/env node
/*
 * The STATE.md protocol: before anyone saves state, check that nobody else is writing, read the whole file, then update it.
 *
 *   node tools/state.js check                      who holds the lock, if anyone (exit 0 = free, 1 = held)
 *   node tools/state.js begin <agent>              wait until nobody is writing, take the lock, print the current STATE.md
 *   node tools/state.js end <agent> --status "..." --note "..."
 *                                                  update your row and add a log line, then release the lock
 *   node tools/state.js release <agent> [--force]  give the lock back without writing (or clear a stuck one)
 *
 * Agents work in separate git worktrees, so a lock inside a worktree would not be shared. STATE.md and its lock therefore live
 * in the MAIN checkout (found with `git rev-parse --git-common-dir`), and every agent edits that one file. Agents never commit
 * STATE.md; the lead commits it. Set STATE_DIR to use another folder (the tests do).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const STALE_MS = 10 * 60 * 1000;       // a lock older than this is treated as abandoned
export const LOCK_NAME = '.state.lock';
export const STATE_NAME = 'STATE.md';
const AGENT_HEADER = '| Agent | Status | Last note | Updated |';
const LOG_HEADER = '| Date | Agent / Action | Summary of Changes |';

/** The folder that holds STATE.md and the lock: the main checkout, whichever worktree we run from. */
export function stateDir(env = process.env, cwd = process.cwd()) {
  if (env.STATE_DIR) return path.resolve(env.STATE_DIR);
  const common = execSync('git rev-parse --git-common-dir', { cwd, encoding: 'utf8' }).trim();
  return path.dirname(path.resolve(cwd, common));
}

const lockPath = dir => path.join(dir, LOCK_NAME);
const statePath = dir => path.join(dir, STATE_NAME);
const ownerFile = dir => path.join(lockPath(dir), 'owner.json');

/** Who holds the lock (or that it is free). */
export function lockStatus(dir, now = Date.now()) {
  let owner;
  try { owner = JSON.parse(fs.readFileSync(ownerFile(dir), 'utf8')); }
  catch {
    // the directory exists but has no readable owner: treat as held by an unknown writer until it goes stale
    if (!fs.existsSync(lockPath(dir))) return { held: false };
    const age = now - fs.statSync(lockPath(dir)).mtimeMs;
    return { held: true, owner: 'unknown', since: now - age, stale: age > STALE_MS };
  }
  return { held: true, owner: owner.agent, since: owner.since, stale: now - owner.since > STALE_MS };
}

/** Takes the lock if nobody holds it (or the holder is long gone). mkdir is atomic, so two agents cannot both win. */
export function tryAcquire(dir, agent, now = Date.now()) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.mkdirSync(lockPath(dir));
      fs.writeFileSync(ownerFile(dir), JSON.stringify({ agent, since: now }));
      return { ok: true };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const st = lockStatus(dir, now);
      if (!st.held) continue;                       // released between our two calls: try again
      if (st.stale) { fs.rmSync(lockPath(dir), { recursive: true, force: true }); continue; }
      return { ok: false, owner: st.owner, since: st.since };
    }
  }
  return { ok: false, owner: 'unknown', since: now };
}

/** Gives the lock back. Only the holder may release it, unless `force` is set. */
export function release(dir, agent, { force = false } = {}) {
  const st = lockStatus(dir);
  if (!st.held) return { ok: true, note: 'lock was already free' };
  if (!force && st.owner !== agent) return { ok: false, owner: st.owner };
  fs.rmSync(lockPath(dir), { recursive: true, force: true });
  return { ok: true };
}

export function readState(dir) {
  return fs.readFileSync(statePath(dir), 'utf8');
}

const clean = s => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

/** Returns the new STATE.md text: the agent's row is updated (or added) and one line is added to the log. Pure, so it is easy to test. */
export function applyUpdate(text, { agent, status = '', note = '', date = new Date().toISOString().slice(0, 10) }) {
  const row = `| ${clean(agent)} | ${clean(status)} | ${clean(note)} | ${date} |`;
  const lines = text.split('\n');
  const head = lines.findIndex(l => l.trim() === AGENT_HEADER);
  if (head < 0) throw new Error(`STATE.md has no agents table (expected the header: ${AGENT_HEADER})`);
  let end = head + 2;                               // skip the header and its separator
  while (end < lines.length && lines[end].startsWith('|')) end++;
  const existing = lines.slice(head + 2, end).findIndex(l => l.split('|')[1]?.trim() === clean(agent));
  if (existing >= 0) lines[head + 2 + existing] = row; else lines.splice(end, 0, row);

  const log = lines.findIndex(l => l.trim() === LOG_HEADER);
  if (log < 0) throw new Error(`STATE.md has no change log (expected the header: ${LOG_HEADER})`);
  let logEnd = log + 2;
  while (logEnd < lines.length && lines[logEnd].startsWith('|')) logEnd++;
  lines.splice(logEnd, 0, `| ${date} | ${clean(agent)} | ${clean(note || status)} |`);
  return lines.join('\n');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Waits until nobody is writing, takes the lock, and returns the current STATE.md so it can be read before updating. */
export async function begin(dir, agent, { waitMs = 120000, pollMs = 2000 } = {}) {
  const until = Date.now() + waitMs;
  for (;;) {
    const got = tryAcquire(dir, agent);
    if (got.ok) return { ok: true, text: readState(dir) };
    if (Date.now() >= until) return { ok: false, owner: got.owner, since: got.since };
    await sleep(pollMs);
  }
}

/** Writes the update and releases the lock. Refuses if the caller does not hold the lock. */
export function end(dir, agent, update) {
  const st = lockStatus(dir);
  if (!st.held || st.owner !== agent) return { ok: false, reason: st.held ? `the lock is held by ${st.owner}` : 'you did not take the lock (run begin first)' };
  const next = applyUpdate(readState(dir), { ...update, agent });
  const tmp = `${statePath(dir)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, statePath(dir));              // replace the file in one step so a reader never sees half of it
  release(dir, agent);
  return { ok: true };
}

/* ---------------- command line ---------------- */
function flag(args, name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main(argv) {
  const [cmd, agent, ...rest] = argv;
  const dir = stateDir();
  if (cmd === 'check') {
    const st = lockStatus(dir);
    console.log(st.held ? `${st.owner} is writing STATE.md (since ${new Date(st.since).toISOString()}${st.stale ? ', STALE' : ''})` : 'free: nobody is writing STATE.md');
    return st.held && !st.stale ? 1 : 0;
  }
  if (!agent) { console.error('usage: node tools/state.js check | begin <agent> | end <agent> --status "..." --note "..." | release <agent> [--force]'); return 2; }
  if (cmd === 'begin') {
    const r = await begin(dir, agent);
    if (!r.ok) { console.error(`${r.owner} is still writing STATE.md. Do not write now: wait and run begin again.`); return 3; }
    console.log(r.text);
    console.error(`\n(lock taken by ${agent}: read the file above, then run: node tools/state.js end ${agent} --status "..." --note "...")`);
    return 0;
  }
  if (cmd === 'end') {
    const r = end(dir, agent, { status: flag(rest, 'status'), note: flag(rest, 'note') });
    if (!r.ok) { console.error(`not saved: ${r.reason}`); return 4; }
    console.log('STATE.md updated and lock released');
    return 0;
  }
  if (cmd === 'release') {
    const r = release(dir, agent, { force: rest.includes('--force') });
    if (!r.ok) { console.error(`not released: the lock is held by ${r.owner}`); return 5; }
    console.log('lock released');
    return 0;
  }
  console.error(`unknown command: ${cmd}`);
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code => process.exit(code), e => { console.error(e.message); process.exit(1); });
}
