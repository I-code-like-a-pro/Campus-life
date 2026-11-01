# Backend options: accounts and cloud save only

Scope: sign in, store one save per player, restore it on another device. **No multiplayer, no chat, no payments, no ads.** A decision is wanted from the owner; the recommendation is at the end.

**Honesty note.** Effort figures are my estimates for one developer who already knows the codebase. Prices change often and I have not verified any: **check each vendor's current pricing page and free-tier limits before deciding.** Player counts below mean monthly active players with one save each (a save is a few KB to tens of KB of JSON).

## What we are protecting
`src/save.js` already provides: schema `v3`, `migrate()` which upgrades any older save and refuses newer ones, `exportCode()` / `parseCode()` with a checksum, a rolling backup, and `writeSave()` returning success or failure. Cloud save should sit on top of this, not replace it. The game stays playable with no account and no network.

## Comparison
| | Supabase | Firebase | Small own server |
|---|---|---|---|
| What you get | Postgres, auth (email, Google), row-level security, edge functions | Auth, Firestore, security rules, Cloud Functions | Anything you write: for example Node + Postgres/SQLite + your own auth |
| Effort (estimate) | 3 to 5 days | 3 to 5 days | 8 to 15 days (auth, email, hosting, backups, patching) |
| Cost at 1k players | Likely inside a free tier (verify) | Likely inside a free tier (verify) | A small VPS or app tier, plus email sending if you use email login |
| Cost at 10k | Possibly still free or a low paid tier (verify) | Possibly free or low; reads and writes are billed (verify) | A small paid server |
| Cost at 50k | Likely a paid plan (verify) | Likely paid; per-operation billing can surprise you (verify) | A modest server; you carry the operations work |
| Cheat control | Row-level security limits each player to their own row; size and shape checks | Security rules do the same | Whatever you build |
| Lock-in | Low: standard Postgres, exportable | Higher: proprietary data model | None, but you own everything |
| Data location (NDPA) | Region chosen when the project is created (verify available regions) | Region chosen per project (verify) | You choose |
| Email and Google login | Built in | Built in | You build it or add a library |
| Operations burden | Low | Low | High (backups, patching, uptime, abuse) |

With one small row per player, storage and bandwidth are tiny. The costs that matter are the limits on monthly active auth users, sending sign-in emails, and (Firebase) per-operation billing. Do not rely on my tiers.

## Security and cheating
This is a single-player, local-first game. A player can already edit their own local save in the browser console, and with no leaderboard or prizes that harms nobody. So:
- **Do not try to prevent cheating,** and do not claim the cloud save is tamper-proof. Cheating only affects the cheater.
- **Do protect other players and the service:**
  - Players can read and write only their own row (row-level security or rules).
  - Cap payload size (for example 256 KB), accept only JSON, reject the wrong shape.
  - Check `v` is an integer in the supported range and required keys exist. After download the client runs the same `migrate()`.
  - Rate-limit writes: the client uploads at most once per 60 seconds and on page hide; the server rejects more than about 1 write per 10 seconds per user (use the provider's limits; verify what is built in).
  - Treat the save body as untrusted text. Never render it as HTML on a server or admin page.
  - Add CAPTCHA or email verification only if abuse appears.
- **Do not add leaderboards or shared content later without redoing this.** They create a reason to cheat.

## Privacy under Nigeria's NDPA (not legal advice; get a lawyer)
- The Nigeria Data Protection Act 2023 covers personal data of people in Nigeria. An email address is personal data; a save with a nickname probably is too.
- Minimise: store an email (or provider ID), the save blob and timestamps. No phone number, real-name field or location. Keep analytics out of this table.
- Update `privacy.html` to say what is stored, why, where (region), for how long, and how to delete it. Cloud save must be **opt-in**; guest play stays the default.
- Provide **delete my account and cloud data**, in the game or through the contact email, and honour it promptly.
- Many JAMB aspirants are under 18. Find out what the NDPA requires for children's data and consent before launch. If unsure, keep accounts out until a lawyer has answered. I am uncertain here.
- Check whether the regulator (NDPC) expects registration or a compliance filing at your scale, and whether storing data outside Nigeria needs extra safeguards. I have not verified current rules or thresholds.
- Choose a sensible region and state it in the policy.

## Recommendation
1. **Launch without a backend.** Local saves, the rolling backup and export/import codes already cover most device-loss cases. Accounts in the last three weeks add NDPA, children's-data, email-deliverability and support work that can delay launch.
2. **Add cloud save as release 1.1 on Supabase** (about a week including the privacy updates): lowest effort, standard Postgres, easy to leave later. Firebase is a fine second choice. A hand-built server is not worth it for this feature alone.
3. If the owner wants accounts on launch day, build them behind a feature flag and cut them if staging is not solid by 14 November.

## Minimal data model
Table `saves`, one row per user:
| column | type | notes |
|---|---|---|
| `user_id` | uuid, primary key, references the auth user | row-level security: `user_id = auth.uid()` for select, insert, update, delete |
| `schema_v` | int | copy of `save.v` for quick checks |
| `data` | jsonb or text | the save JSON as `writeSave` produces it; at most about 256 KB |
| `checksum` | text | the same FNV checksum used in export codes |
| `progress_marker` | bigint | see the sync design |
| `updated_at` | timestamptz | set by the server |
| `device_id` | text | random id kept in localStorage, used only in the conflict message |

Optional `saves_history`: the last 3 versions per user, so a bad overwrite can be undone.

## Save-sync design
**Principle: local is the source of truth for play; the cloud is a backup that is pulled only on first sign-in or when the player asks. Never overwrite silently.**

1. **Progress marker.** Computed on the client at upload, for example `year * 100000 + day`, from fields already in the save. It is not trusted for security; it only drives the "which is further along" message.
2. **Upload.** Triggered by a "Back up to cloud" button, then automatically at most once per 60 seconds after a successful `writeSave()` while signed in and online, and on page hide. The request carries `{schema_v, data, checksum, progress_marker, device_id, base_updated_at}`. The server uses compare-and-swap: if the stored `updated_at` is newer than `base_updated_at`, it answers "conflict" instead of writing.
3. **Download.** On sign-in and on "Restore from cloud". Verify the checksum, then run `migrate()`. If it returns null because the save is from a newer build, show "Update the game to use this save" and change nothing (this matches the existing behaviour of `migrate()`).
4. **Conflict.** If local and cloud both exist and differ, show a plain choice with facts: "This device: Year 2, Day 41, saved 2 hours ago" versus "Cloud: Year 1, Day 80, saved yesterday". Buttons: Keep this device, Use cloud save, Cancel. Before either choice overwrites anything, the losing save goes into the existing `BACKUP_KEY` slot (local) or `saves_history` (cloud). The higher progress marker is highlighted, but the player decides.
5. **First sign-in.** Cloud empty: upload local. Local empty: download. Both present: step 4.
6. **Offline and errors.** Failures never block play; show a small "not backed up" indicator. Retry on the next save with growing delays. Local backup and export codes keep working unchanged.
7. **Migrations.** Cloud rows keep whatever `v` they had; the client migrates after download. Never migrate on the server, so there is one copy of the logic. Schema v4 will not break old rows.
8. **Delete.** "Delete cloud save and account" removes the row, history and auth user; the local save is untouched.
9. **Code placement.** A new `src/cloud.js` that imports only from `save.js` (`migrate`, checksum helper, which would need exporting). `save.js` otherwise does not change. Put the whole feature behind `VITE_CLOUD_ENABLED` so a build without it contains no network path.

## Decisions for the owner
- Backend at launch (not recommended), at release 1.1 (recommended), or never?
- Who is the data controller for NDPA purposes (you personally or a registered business)? The privacy policy needs this.
- Under-18 players: guest mode only until a lawyer has advised, or accounts open to everyone?
