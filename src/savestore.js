import { loadSave, writeSave, clearSave, migrate, exportCode, parseCode, checksum, SCHEMA_VERSION } from './save.js';

/*
 * SaveStore: where a save lives. The game uses ONE store at a time.
 *
 *   interface SaveStore {
 *     name: string
 *     enabled: boolean                 // false = never used, never touches the network
 *     load(): save | null | Promise<save | null>       // already migrated
 *     save(data): boolean | Promise<boolean>
 *     clear(): void | Promise<void>
 *   }
 *
 * Today the game runs on the local store, which is exactly the old behaviour (localStorage, rolling backup, export/import).
 * The remote store below is a documented stub: it is never created by the game, makes no network call, holds no key and
 * has no account code. docs/CLOUD_SAVE.md lists what the owner must do to switch it on.
 *
 * Conflict rules (resolveConflict): the NEWEST save wins, and the other one is always kept as a backup, never discarded.
 * If the older save is further along (more progress), the result says so, so the screen can ask the player instead of
 * guessing. Export and import codes are unchanged and live in save.js.
 */

/* ---------------- the current behaviour, as a store ---------------- */

export function createLocalStore() {
  return {
    name: 'local',
    enabled: true,
    load: () => loadSave(),
    save: data => writeSave(data),
    clear: () => clearSave()
  };
}

/* ---------------- conflict rules (pure, unit tested) ---------------- */

/** A rough "how far along" number from fields every save has. Not trusted for security; only used to warn the player. */
export function progressMarker(save) {
  const a = save?.academic;
  const year = Number.isFinite(a?.year) ? a.year : 0;
  const term = Number.isFinite(a?.term) ? a.term : 0;
  const day = Number.isFinite(save?.day) ? save.day : 0;
  return year * 1_000_000 + term * 100_000 + day;
}

/**
 * Decides between a local and a remote save.
 * Returns { winner: 'local' | 'remote' | 'same' | 'none', keep, backup, olderIsFurther, reason }
 *  - keep: the save to use from now on
 *  - backup: the other save, to be stored in the backup slot before anything is overwritten (null if there is no other)
 *  - olderIsFurther: true when the losing save has more progress; the screen should then ask the player
 * Rules, in order: nothing on either side; identical content; newest `savedAt` wins; if `savedAt` is missing on either
 * side, the higher progress marker wins; if still equal, local wins (the device the player is holding).
 */
export function resolveConflict(local, remote) {
  if (!local && !remote) return { winner: 'none', keep: null, backup: null, olderIsFurther: false, reason: 'No save on either side.' };
  if (local && !remote) return { winner: 'local', keep: local, backup: null, olderIsFurther: false, reason: 'Only this device has a save.' };
  if (!local && remote) return { winner: 'remote', keep: remote, backup: null, olderIsFurther: false, reason: 'Only the cloud has a save.' };
  if (JSON.stringify(local) === JSON.stringify(remote)) return { winner: 'same', keep: local, backup: null, olderIsFurther: false, reason: 'Both copies are identical.' };

  const lt = Number.isFinite(local.savedAt) ? local.savedAt : null;
  const rt = Number.isFinite(remote.savedAt) ? remote.savedAt : null;
  let winner, reason;
  if (lt !== null && rt !== null && lt !== rt) {
    winner = rt > lt ? 'remote' : 'local';
    reason = 'The newest save wins.';
  } else {
    const lp = progressMarker(local), rp = progressMarker(remote);
    if (lp !== rp) { winner = rp > lp ? 'remote' : 'local'; reason = 'Saved at the same time (or no time recorded): the one further along wins.'; }
    else { winner = 'local'; reason = 'Equal: this device wins.'; }
  }
  const keep = winner === 'remote' ? remote : local;
  const backup = winner === 'remote' ? local : remote;
  return { winner, keep, backup, olderIsFurther: progressMarker(backup) > progressMarker(keep), reason };
}

/** One-line description for the conflict screen: "Year 2, Day 41, saved 2 hours ago". */
export function describeSave(save, now = Date.now()) {
  if (!save) return 'No save';
  const year = save.academic?.year ? `Year ${save.academic.year}, ` : '';
  let ago = '';
  if (Number.isFinite(save.savedAt)) {
    const mins = Math.max(0, Math.round((now - save.savedAt) / 60000));
    ago = mins < 2 ? ', saved just now' : mins < 120 ? `, saved ${mins} minutes ago` : mins < 2880 ? `, saved ${Math.round(mins / 60)} hours ago` : `, saved ${Math.round(mins / 1440)} days ago`;
  }
  return `${year}Day ${save.day ?? '?'}${ago}`;
}

/**
 * Reconciles a local and a remote store once (first sign-in or "Restore from cloud"). Never overwrites without keeping a
 * backup. `store` pieces are injected so this can be tested with fakes. Returns { action, result }.
 */
export async function reconcile(localStore, remoteStore, { writeBackup = () => {} } = {}) {
  if (!remoteStore?.enabled) return { action: 'skipped', result: null };
  const local = await localStore.load();
  const remote = await remoteStore.load();
  const result = resolveConflict(local, remote);
  if (result.backup) writeBackup(result.backup);
  if (result.winner === 'remote') { await localStore.save(result.keep); return { action: 'downloaded', result }; }
  if (result.winner === 'local' && remote !== null && JSON.stringify(local) !== JSON.stringify(remote)) { await remoteStore.save(result.keep); return { action: 'uploaded', result }; }
  if (result.winner === 'local' && !remote) { await remoteStore.save(result.keep); return { action: 'uploaded', result }; }
  return { action: 'unchanged', result };
}

/* ---------------- the remote store: DISABLED STUB ---------------- */

export const CLOUD_SAVE_READY = false;   // flip to true only after the owner completes docs/CLOUD_SAVE.md

/**
 * The shape a remote adapter must have. It is NOT created anywhere in the game. To use it the owner (or a developer
 * working with the owner) must: choose a backend (docs/BACKEND_OPTIONS.md), create the table and policies there, set the
 * build variable VITE_CLOUD_SAVE_URL, wire a sign-in screen that supplies `getAuthHeader`, and set CLOUD_SAVE_READY.
 * Nothing in this file stores a key, token or password; `getAuthHeader` is supplied by the sign-in code at run time.
 *
 * Wire format (matches docs/BACKEND_OPTIONS.md): GET  {url}  -> 200 { data, checksum, updatedAt } | 404 (no save yet)
 *                                                  PUT  {url}  body { schemaV, data, checksum, baseUpdatedAt } -> 200 | 409 conflict
 */
export function createRemoteStore({ url = '', getAuthHeader = () => ({}), fetchImpl = (...a) => fetch(...a), ready = CLOUD_SAVE_READY } = {}) {
  const enabled = !!(ready && url);
  const off = { ok: false, reason: 'cloud save is not enabled' };
  let baseUpdatedAt = null;
  return {
    name: 'remote',
    enabled,
    async load() {
      if (!enabled) return null;
      try {
        const res = await fetchImpl(url, { method: 'GET', headers: { ...(await getAuthHeader()) } });
        if (res.status === 404) return null;
        if (!res.ok) return null;
        const body = await res.json();
        if (checksum(typeof body.data === 'string' ? body.data : JSON.stringify(body.data)) !== body.checksum) return null;   // damaged in transit
        baseUpdatedAt = body.updatedAt ?? null;
        return migrate(typeof body.data === 'string' ? JSON.parse(body.data) : body.data);   // null if from a newer build: change nothing
      } catch { return null; }
    },
    async save(data) {
      if (!enabled) return false;
      try {
        const text = JSON.stringify({ ...data, v: SCHEMA_VERSION });
        const res = await fetchImpl(url, {
          method: 'PUT',
          headers: { 'content-type': 'application/json', ...(await getAuthHeader()) },
          body: JSON.stringify({ schemaV: SCHEMA_VERSION, data: text, checksum: checksum(text), baseUpdatedAt })
        });
        return res.ok;       // 409 (someone else wrote first) returns false; reconcile() then decides what to keep
      } catch { return false; }
    },
    async clear() { if (!enabled) return off; return { ok: true }; },
    status: () => (enabled ? 'enabled' : off.reason)
  };
}

/** The store the game uses. Always local until cloud save is deliberately switched on and wired. */
export function activeStore() { return createLocalStore(); }

export { exportCode, parseCode };   // export and import codes are unchanged and still live in save.js
