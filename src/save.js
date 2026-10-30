// Saves are versioned. Every change to the shape of a save adds a migration below, so a save made by any
// earlier build always loads in the newest one (spec F-004).

const KEY = 'campuslife.save.v1';       // storage key kept stable across versions
export const SCHEMA_VERSION = 3;

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

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch { return null; }
}

export function writeSave(data) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...data, v: SCHEMA_VERSION })); } catch { /* storage unavailable (private mode) */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
