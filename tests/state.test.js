import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lockStatus, tryAcquire, release, readState, applyUpdate, begin, end, stateDir, STALE_MS } from '../tools/state.js';

const SAMPLE = `# State

## 6. Log of Changes

| Date | Agent / Action | Summary of Changes |
| :--- | :--- | :--- |
| 2026-11-11 | Antigravity | Started. |

## 7. Agents (live)

| Agent | Status | Last note | Updated |
| :--- | :--- | :--- | :--- |
| world-zones | stopped | waiting | 2026-11-11 |

End.
`;

let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'state-')); fs.writeFileSync(path.join(dir, 'STATE.md'), SAMPLE); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe('the STATE.md lock', () => {
  it('is free to start with, then held by whoever takes it', () => {
    expect(lockStatus(dir).held).toBe(false);
    expect(tryAcquire(dir, 'a').ok).toBe(true);
    const st = lockStatus(dir);
    expect(st).toMatchObject({ held: true, owner: 'a', stale: false });
  });
  it('lets only one agent write at a time and says who is writing', () => {
    expect(tryAcquire(dir, 'a').ok).toBe(true);
    const second = tryAcquire(dir, 'b');
    expect(second.ok).toBe(false);
    expect(second.owner).toBe('a');
  });
  it('only the holder can release it, unless forced', () => {
    tryAcquire(dir, 'a');
    expect(release(dir, 'b').ok).toBe(false);
    expect(lockStatus(dir).held).toBe(true);
    expect(release(dir, 'a').ok).toBe(true);
    expect(lockStatus(dir).held).toBe(false);
    tryAcquire(dir, 'a');
    expect(release(dir, 'b', { force: true }).ok).toBe(true);
  });
  it('takes over a lock left behind by an agent that died', () => {
    tryAcquire(dir, 'ghost', Date.now() - STALE_MS - 1000);
    expect(lockStatus(dir).stale).toBe(true);
    expect(tryAcquire(dir, 'b').ok).toBe(true);
    expect(lockStatus(dir).owner).toBe('b');
  });
  it('does not treat a lock with an unreadable owner as free', () => {
    fs.mkdirSync(path.join(dir, '.state.lock'));
    const st = lockStatus(dir);
    expect(st.held).toBe(true);
    expect(st.owner).toBe('unknown');
    expect(tryAcquire(dir, 'b').ok).toBe(false);
  });
});

describe('begin and end', () => {
  it('begin returns the current file so it can be read first, and end writes and releases', async () => {
    const r = await begin(dir, 'a', { waitMs: 100, pollMs: 10 });
    expect(r.ok).toBe(true);
    expect(r.text).toContain('world-zones');
    expect(end(dir, 'a', { status: 'working', note: 'did a thing', date: '2026-11-12' }).ok).toBe(true);
    expect(lockStatus(dir).held).toBe(false);
    const text = readState(dir);
    expect(text).toContain('| a | working | did a thing | 2026-11-12 |');
  });
  it('begin waits while another agent is writing, and gives up rather than writing over them', async () => {
    tryAcquire(dir, 'a');
    const r = await begin(dir, 'b', { waitMs: 60, pollMs: 10 });
    expect(r.ok).toBe(false);
    expect(r.owner).toBe('a');
    expect(readState(dir)).toBe(SAMPLE);
  });
  it('begin succeeds once the other agent finishes', async () => {
    tryAcquire(dir, 'a');
    setTimeout(() => release(dir, 'a'), 40);
    const r = await begin(dir, 'b', { waitMs: 2000, pollMs: 10 });
    expect(r.ok).toBe(true);
    expect(lockStatus(dir).owner).toBe('b');
  });
  it('end refuses to write without the lock, or with someone else\'s', () => {
    expect(end(dir, 'a', { status: 'x' }).ok).toBe(false);
    tryAcquire(dir, 'b');
    const r = end(dir, 'a', { status: 'x' });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('held by b');
    expect(readState(dir)).toBe(SAMPLE);
  });
});

describe('applyUpdate', () => {
  it('updates an existing agent row in place and adds a log line', () => {
    const out = applyUpdate(SAMPLE, { agent: 'world-zones', status: 'running', note: 'zones done', date: '2026-11-12' });
    expect(out).toContain('| world-zones | running | zones done | 2026-11-12 |');
    expect(out).not.toContain('| stopped |');
    expect(out).toContain('| 2026-11-12 | world-zones | zones done |');
    expect(out.match(/\| world-zones \|/g)).toHaveLength(2);      // the table row, and the new log line
  });
  it('adds a new agent row at the end of the table', () => {
    const out = applyUpdate(SAMPLE, { agent: 'hostels', status: 'running', note: 'halls', date: '2026-11-12' });
    const rows = out.split('\n').filter(l => /^\| (world-zones|hostels) \|/.test(l));
    expect(rows[0]).toContain('world-zones');
    expect(rows[1]).toContain('hostels');
  });
  it('keeps the table intact when text contains pipes or newlines', () => {
    const out = applyUpdate(SAMPLE, { agent: 'a', status: 'ok', note: 'one | two\nthree', date: '2026-11-12' });
    expect(out).toContain('| a | ok | one / two three | 2026-11-12 |');
  });
  it('fails loudly when STATE.md has lost its tables', () => {
    expect(() => applyUpdate('# nothing', { agent: 'a' })).toThrow(/agents table/);
    expect(() => applyUpdate('| Agent | Status | Last note | Updated |\n| :-- | :-- | :-- | :-- |\n', { agent: 'a' })).toThrow(/change log/);
  });
  it('is pure: the input text is not changed', () => {
    const copy = String(SAMPLE);
    applyUpdate(SAMPLE, { agent: 'a', status: 'x' });
    expect(SAMPLE).toBe(copy);
  });
});

describe('where STATE.md lives', () => {
  it('uses STATE_DIR when set, and otherwise the main checkout of the repository', () => {
    expect(stateDir({ STATE_DIR: dir })).toBe(path.resolve(dir));
    const root = stateDir({}, process.cwd());
    expect(fs.existsSync(path.join(root, '.git'))).toBe(true);
  });
});
