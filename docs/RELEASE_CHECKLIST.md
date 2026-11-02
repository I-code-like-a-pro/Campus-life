# Release checklist (go-live)

Tick each box in the release PR or a copy of this file. Owner = you, Dev = developer.

## 1. Accounts and hosting (Owner)
- [ ] Host chosen (Vercel suggested; `vercel.json`, `netlify.toml`, `render.yaml`, `railway.json` exist) and the account created by the owner.
- [ ] Project connected to the repository; production branch is `main`.
- [ ] Build command `npm run build`, output `dist` (already in `vercel.json`).
- [ ] Domain bought or free host URL accepted. DNS pointed at the host.
- [ ] HTTPS active and the host redirects HTTP to HTTPS. Required for the service worker and install prompt.
- [ ] Pages reachable: `/`, `/landing.html`, `/about.html`, `/privacy.html`, `/terms.html`, `/manifest.webmanifest`.

## 2. Environment variables (set in the host dashboard, then redeploy: they are read at build time)
- [ ] `VITE_CONTACT_EMAIL` set; check it appears on About, Privacy and Terms.
- [ ] `VITE_FEEDBACK_URL` set (feedback form link); check the button in the game.
- [ ] `VITE_FEEDBACK_EMAIL` set (optional email button).
- [ ] `VITE_TELEMETRY_URL` set only if you have a working endpoint; otherwise leave empty so nothing is sent. See `.env.example`.
- [ ] No secrets in the repository or in `VITE_` variables (anything with that prefix is public in the built site).

## 3. Content and legal (Owner)
- [ ] Disclaimer present on the start screen, About page and landing FAQ: fan-made, not affiliated with UNILAG, UI, OAU, JAMB or any institution; no logos or crests.
- [ ] Privacy policy and terms read by a lawyer; changes applied. NDPA points covered (see [BACKEND_OPTIONS.md](BACKEND_OPTIONS.md)).
- [ ] Question banks reviewed by subject reviewers; sign-off recorded. Export with `node tools/export-content.js` and follow [REVIEW_KIT.md](REVIEW_KIT.md) (kit ready; reviewers still needed).
- [ ] Landing page screenshot placeholders replaced with real captures.
- [ ] Share image / social preview created.

## 4. Build and test (Dev)
- [x] `npx vitest run` passes (re-run on the release candidate).
- [ ] After the AI proxy is deployed: `AI_SMOKE_URL=<proxy url> node tools/ai-smoke.js` passes (see [AI_NPCS.md](AI_NPCS.md)). Mock mode is already built and passing.
- [ ] High-contrast mode and the largest text size checked on a real phone at 375px and in landscape.
- [ ] Language picker shows only reviewed languages (English at launch unless native-speaker review is finished).
- [ ] `npx vite build` passes; `dist` contains `index.html`, `landing.html`, `about.html`, `privacy.html`, `terms.html`.
- [ ] [QA_CHECKLIST.md](QA_CHECKLIST.md) run on at least 3 real phones (one low-end Android) and iPhone Safari.
- [ ] Played start to graduation once on the production build.

## 5. Service worker cache bump (Dev)
The service worker (`public/sw.js`) names its cache (`const CACHE = 'campus-life-v2'`). Pages go network-first, but static files go cache-first, so:
- [ ] Bump the cache name (for example to `campus-life-v3`) whenever a file that keeps the same URL changes, and for every release that changes `public/` files. Hashed files in `/assets/` get new names automatically.
- [ ] After deploy, load the site once, close all tabs, reopen, and confirm the new version number shows on the start screen.
- [ ] Confirm `/sw.js` is served with `Cache-Control: no-cache` (set in `vercel.json`).
- [ ] Confirm the game loads offline after a first visit.

- [ ] Cloud save stays OFF for launch unless the owner has completed every step in [CLOUD_SAVE.md](CLOUD_SAVE.md) (default: off, no network calls).

## 6. Rollback plan
- [ ] Know the previous good deployment (Vercel and Netlify keep old deployments; promote or "rollback" in the dashboard, about one minute).
- [ ] Tag every release in git: `git tag v1.0.0`.
- [ ] If the bad release changed the service worker cache name, the rollback must also change it again (to a new name), otherwise players keep cached files. Bump forward, never back.
- [ ] If a release changed the save schema, never roll back below it: older builds refuse newer saves (`migrate()` returns null). Ship a migration forward instead.
- [ ] Players' saves are local, so a rollback cannot corrupt them; export codes still work.
- [ ] Decide who can press rollback and where that person is reachable on launch day.

## 7. Monitoring (Dev)
- Errors are stored locally (last 20) and sent only for players who opted in, when `VITE_TELEMETRY_URL` is set (`src/telemetry.js`).
- [ ] Endpoint chosen and tested with one fake event and one fake error from a test build. Check that no names or free text arrive.
- [ ] Daily review during the first week: new error messages, top 5 by count.
- [ ] Uptime check on the root URL from a free monitor (verify the monitor's terms), alerts to the owner's email.
- [ ] Feedback inbox checked twice a day for the first 72 hours.
- Telemetry is opt-in, so counts undercount real problems; weigh the feedback form heavily.

## 8. Closed-beta exit criteria
Run the beta on the real host with 20 to 50 testers for at least 5 days. Launch only when all are true, or the owner explicitly accepts the gap in writing:
- [ ] At least 20 testers have started, and at least 10 have reached the end of year 1.
- [ ] At least 3 testers have played to graduation (or a scripted full run plus 3 testers reaching year 3).
- [ ] No reported soft-lock (a state where the player cannot continue) in the last 3 days; zero open soft-lock bugs.
- [ ] No reported loss of save progress in the last 3 days; zero open data-loss bugs.
- [ ] Crash-free sessions of at least 99% among opt-in sessions (if fewer than 100 opt-in sessions, rely on the other criteria and say so).
- [ ] Median frame rate of at least 30 fps on the low-end test phone, or the Low graphics preset reaches it. Measure with `?perf=1` and fill the table in [PERFORMANCE.md](PERFORMANCE.md) (tooling is ready; no phone result yet).
- [ ] First load under 10 seconds on a mid-range phone on a typical mobile connection (measure, do not guess).
- [ ] At least 70% of testers say they would recommend it or would play again (simple yes/no in the form).
- [ ] No unresolved top-5 usability issue (first minute confusion, unreadable text, buttons too small).
- [ ] Reviewer sign-off on questions; zero known factual errors.
- [ ] Lawyer comments on legal pages are applied or knowingly deferred.

## 9. Launch day
- [ ] Release candidate deployed 24 hours before; no changes except critical fixes.
- [ ] Rollback drill rehearsed once.
- [ ] Posts scheduled per [MARKETING_KIT.md](MARKETING_KIT.md); ambassadors told the time.
- [ ] Owner and developer both reachable for 6 hours after posting.
- [ ] Hotfix rule: fix, test, bump cache, deploy; no feature work for 72 hours.
