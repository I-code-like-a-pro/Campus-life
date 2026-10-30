// Saves are versioned. Every change to the shape of a save adds a migration below, so a save made by any
// earlier build always loads in the newest one (spec F-004).
//
// Safety nets so a player never loses progress:
//  - a rolling backup of the previous save, used automatically if the main save is damaged
//  - export/import codes to move a save between devices or keep a copy
//  - writeSave reports failure (for example storage full) so the game can warn the player

const KEY = 'campuslife.save.v1';       // storage key kept stable across versions
const BACKUP_KEY = 'campuslife.save.backup';
const BACKUP_EVERY_MS = 60_000;
export const SCHEMA_VERSION = 3;
export const CODE_PREFIX = 'CL1:';

/** Default "meta" block: progression, money history, notifications and tutorial flags (added in v2). */
export function newMeta() {
  return {
    achievements: {},          // id -> day unlocked
    counters: {},              // lifetime counters used by achievements and daily goals
    daily: { day: 0, goals: [], claimed: [] },
    streak: { last: 0, count: 0 },
    tutorial: {},              // hint id -> true once shown
    ledger: [],                // recent money movements [{ day, text, amount }]
    inbox: [],                 // notification centre [{ id, day, icon, title, text, read }]
    savings: 0,
    jobs: {},                  // action id -> { day, n } daily limits
    // added in v3
    health: { sick: null, immuneUntil: 0, visits: 0, recovered: 0, net: false, lastRoll: 0 },
    pantry: 0,                 // portions of cooking ingredients
    room: {},                  // decorations bought for the hostel room
    bills: [],                 // [{ id, label, amount, due, paid }]
    relations: {},             // npc id -> { points, lastTalk, lastGift }
    clubs: []                  // joined club ids
  };
}

// migrations[n] upgrades a version-n save to version n + 1.
const MIGRATIONS = {
  // v1 was the unversioned prototype save
  1: s => ({ ...s, meta: s.meta ?? newMeta() }),
  // v2 -> v3: health, pantry, room, bills, relations and clubs (filled in by the meta merge below)
  2: s => ({ ...s, meta: { ...newMeta(), ...(s.meta || {}) } })
};

/** Upgrades any save to the current schema. Never mutates its input. Returns null for unusable data. */
export function migrate(save) {
  if (!save || typeof save !== 'object' || !save.campusId || !save.name) return null;
  let s = { ...save };
  let v = Number.isInteger(s.v) ? s.v : 1;
  if (v > SCHEMA_VERSION) return null;            // made by a newer build: don't guess
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) return null;
    s = step(s);
    v += 1;
  }
  s.v = SCHEMA_VERSION;
  s.meta = { ...newMeta(), ...(s.meta || {}) };   // fill any missing meta keys
  return s;
}

const parse = raw => { try { return migrate(JSON.parse(raw)); } catch { return null; } };
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };

/** Why the last load fell back to the backup, if it did ('damaged' or null). */
export let lastLoadNote = null;

export function loadSave() {
  lastLoadNote = null;
  const ls = store();
  if (!ls) return null;
  let raw = null, backup = null;
  try { raw = ls.getItem(KEY); backup = ls.getItem(BACKUP_KEY); } catch { return null; }
  if (!raw && !backup) return null;
  const main = raw ? parse(raw) : null;
  if (main) return main;
  // the main save is missing or damaged: fall back to the last good backup
  const fallback = backup ? parse(backup) : null;
  if (fallback) {
    lastLoadNote = 'damaged';
    try { ls.setItem(KEY, JSON.stringify(fallback)); } catch { /* ignore */ }
  }
  return fallback;
}

let lastBackupAt = 0;

/** Saves the game. Returns true on success, false if the browser refused (storage full or blocked). */
export function writeSave(data) {
  const ls = store();
  if (!ls) return false;
  const json = JSON.stringify({ ...data, v: SCHEMA_VERSION });
  try {
    const previous = ls.getItem(KEY);
    ls.setItem(KEY, json);
    const now = Date.now();
    if (previous && now - lastBackupAt > BACKUP_EVERY_MS && parse(previous)) {   // only back up a save that is itself valid
      lastBackupAt = now;
      try { ls.setItem(BACKUP_KEY, previous); } catch { /* the backup is a bonus */ }
    }
    return true;
  } catch { return false; }
}

export function clearSave() {
  const ls = store();
  if (!ls) return;
  try { ls.removeItem(KEY); ls.removeItem(BACKUP_KEY); } catch { /* ignore */ }
}

/* ---------------- export and import ---------------- */

function checksum(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
const toB64 = text => btoa(unescape(encodeURIComponent(text)));
const fromB64 = b64 => decodeURIComponent(escape(atob(b64)));

/** A text code containing the save, with a checksum so a mistyped or cut-off code is caught. */
export function exportCode(save) {
  const body = toB64(JSON.stringify({ ...save, v: SCHEMA_VERSION }));
  return `${CODE_PREFIX}${checksum(body)}:${body}`;
}

/** Reads a code produced by exportCode. Returns { ok, save?, message }. */
export function parseCode(code) {
  const text = String(code || '').replace(/\s+/g, '');
  if (!text.startsWith(CODE_PREFIX)) return { ok: false, message: 'That does not look like a Campus Life save code.' };
  const rest = text.slice(CODE_PREFIX.length);
  const sep = rest.indexOf(':');
  if (sep < 1) return { ok: false, message: 'The save code is incomplete.' };
  const sum = rest.slice(0, sep), body = rest.slice(sep + 1);
  if (checksum(body) !== sum) return { ok: false, message: 'The code is damaged or cut off. Copy it again in full.' };
  try {
    const save = migrate(JSON.parse(fromB64(body)));
    if (!save) return { ok: false, message: 'That save is from a newer version of the game, or is not valid.' };
    return { ok: true, save, message: 'Save code read.' };
  } catch {
    return { ok: false, message: 'The save code could not be read.' };
  }
}
