# Cloud save: design and how to switch it on

**Status: designed and stubbed. Switched OFF. No network call, no key, no account exists in the game today.** The game runs on the local store, which is the old behaviour (localStorage, rolling backup, export and import codes). Read [BACKEND_OPTIONS.md](BACKEND_OPTIONS.md) first for the choice of backend, privacy (NDPA) and cost.

## What exists in the code (`src/savestore.js`)

| Piece | What it does |
|---|---|
| `SaveStore` interface | `name`, `enabled`, `load()`, `save(data)`, `clear()` |
| `createLocalStore()` | Wraps `loadSave`, `writeSave`, `clearSave` from `src/save.js`. This is what `activeStore()` returns. |
| `createRemoteStore({ url, getAuthHeader, ready })` | Disabled stub. `enabled` is true only if `ready` (the constant `CLOUD_SAVE_READY`, currently `false`) and a `url` are both set. Uses `fetch` only when enabled. Holds no key: the sign-in code supplies `getAuthHeader()` at run time. |
| `resolveConflict(local, remote)` | The conflict rules below. Pure and unit tested. |
| `reconcile(local, remote, { writeBackup })` | One-off sync on first sign-in or "Restore from cloud". |
| `progressMarker`, `describeSave` | Text for the conflict screen: "Year 2, Day 41, saved 2 hours ago". |

`writeSave` now records `savedAt` (milliseconds) in every save so two copies can be compared. Older saves without it still load; they are compared by progress instead.

## Conflict rules (decided)

1. If only one side has a save, use it. Nothing is lost.
2. If both are identical, do nothing.
3. **The newest `savedAt` wins.** The other save is always kept as a backup (the local backup slot, or `saves_history` in the cloud). A save is never discarded.
4. If a side has no `savedAt`, the save further along (year, then term, then day) wins. If still equal, this device wins.
5. If the loser is further along than the winner (`olderIsFurther`), the screen must ask the player with plain facts and two buttons, instead of guessing.
6. Failures never block play. Export and import codes work exactly as before.

## What the owner must do to switch it on

None of these steps can be done by the game or by a developer without you, because they involve accounts and secrets. **Never paste a key, token or password into chat, a file in the repository or a `VITE_` variable.**

1. **Decide** (BACKEND_OPTIONS.md "Decisions for the owner"): backend, who is the data controller, and what happens for players under 18.
2. **Create the backend account yourself** (for example Supabase) and a project. Keep the dashboard keys in the host's server-side secret settings only.
3. **Create the table and access rules** from "Minimal data model" in BACKEND_OPTIONS.md. Row-level security must restrict every row to its owner.
4. **Add a small server endpoint** at one URL that answers `GET` (returns `{ data, checksum, updatedAt }` or 404) and `PUT` (body `{ schemaV, data, checksum, baseUpdatedAt }`, returns 409 if someone wrote first). The wire format is in the comment above `createRemoteStore`. Verify the signed-in user on the server.
5. **Build a sign-in screen** (a developer task, after step 1) that supplies `getAuthHeader()`. The decision on guest versus account for under-18 players must be made first.
6. **Set the build variable** `VITE_CLOUD_SAVE_URL` to the endpoint address (not a secret) and redeploy.
7. A developer then wires `createRemoteStore({ url: import.meta.env.VITE_CLOUD_SAVE_URL, getAuthHeader, ready: true })` into the settings screen (a "Back up to cloud" and "Restore from cloud" button) and changes `CLOUD_SAVE_READY` to `true`. Add a visible "not backed up" indicator and a "Delete cloud save" option.
8. Update the privacy policy and terms (a lawyer should read them) before any player data leaves the device, then run the release checklist again.

## What is not done

The endpoint, the table, the sign-in screen and the buttons. Only the interface, the local store, the disabled remote stub and the tested conflict rules exist.
