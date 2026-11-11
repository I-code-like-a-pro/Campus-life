# Rules for every agent working on Campus Life

Read `AGENTS.md` (project rules; it wins if anything here disagrees), this file and `docs/FULL_SCHOOL_PLAN.md` before you start. You work in your own git worktree on your own branch.

## Commits
- **Commit after every change**, as soon as a coherent edit works and tests pass. Small commits with clear messages. Do not wait until the end.
- End every commit message with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- **Do not push and do not merge.** The lead pushes your branch and opens a draft pull request; nobody merges to `main` without human review.
- Never commit secrets, `.env` files, or the `.agents/` or `.claude/` tooling folders.

## Product rules
- Language (see `AGENTS.md` section 5): standard English is the default and is **required** for menus, the portal, clearance, fees, results, hearings, legal pages and every researched fact. Nigerian Pidgin and campus slang are **also accepted** in informal NPC dialogue, banter and flavour text, but never carry a factual claim, always teen-safe and kind, short and consistently spelled.
- Suitable for teenagers: nothing sexual, no graphic violence, no pressure or harassment.
- Mobile first: check 375x812, 320x568 and 667x375 (no overlap, tap targets at least 44px, dialogs fit or scroll).
- Characters keep the original blocky look. The game ends at graduation.
- Never enter, request, store or commit credentials, API keys or tokens. Never create accounts. The owner does those.
- **No real people** (Vice-Chancellor, deans, lecturers, student leaders) and no real political groups: use fictional staff, students and parties. No real logos or photos. Real institutions, faculties, halls and landmarks are fine under the existing "inspired by, not official" notice.

## Facts rules (this is the most important part)
- Every real fact needs a source you actually opened or saw in search results. **No source, no value.** Never invent a figure, name or date and present it as real.
- Record real facts in `data/<topic>/*.json` as `{ id, path, value, source: { url, title, accessed }, confidence: high|medium|low|none, verified: false, note }`. Only the owner sets `verified` to true.
- If you cannot find something, write `value: null`, `confidence: none` and say what you tried.
- Game numbers that are guesses must be labelled **game estimate** in the data and on screen, as the cut-offs for sample programmes already are.
- The official UNILAG site may be unreachable from your environment (DNS errors). Use search summaries, Wikipedia, news and other credible pages, record that in `note`, and lower the confidence accordingly.
- Do not copy long passages from websites. Paraphrase and keep values short.
- Questions and dialogue you write from your own knowledge are unreviewed. List them for a lecturer or senior student to check.

## Code rules
- A university pack is **data only** (see `docs/PACKS.md`). Packs may set numbers inside the limits in `src/packs/schema.js` and use known building types. They never change game logic.
- Put new work in **new files** wherever you can. Edits to busy shared files (`src/main.js`, `src/scenes.js`, `src/campuses.js`, `src/academics.js`) must be small and marked with a comment `// group <your-agent-name>`, so merging stays easy.
- Add tests for pure rules. Keep all existing tests passing.
- Test command: `npx vitest run --exclude "**/.claude/**" --exclude "**/node_modules/**"`
- Build check: `npx vite build`
- Document what you build in `docs/` (one file named for your area).

## STATE.md (shared hand-off log)
- Never edit `STATE.md` freehand. Use `node tools/state.js check`, then `begin <your-agent-name>` (takes the lock and prints the whole file: read it all), then `end <your-agent-name> --status "..." --note "..."`. If someone else is writing, wait and try again.
- The live file and lock are in the main checkout, shared by all worktrees. Never commit `STATE.md`. Save state at milestones.

## Tooling notes
- For long scripts or multi-line edits, create the file with the Write tool and run it. Long Bash heredocs break.
- If you need a browser, start your own dev server on your assigned port (`npm run dev -- --port <port> --strictPort` in the background) and open `http://127.0.0.1:<port>` so your storage is separate from other agents. The shared browser pane may be redirected by other agents, so check the tab before you act.
- The browser pane renders about one frame per second, so drive the game with the `window.__campus` helpers (`setDay`, `setHour`, `enter`, `leave`, `scenes`, `runTalk`, `academics`, `rides.update(0.05)`) and with unit tests, and step time with real midnight crossings (`consume({ minutes })`) rather than only `setDay`.
- Injecting a test save works only on a fresh page with no running game (a running game autosaves over it).
- `window.__campus.state.day` is not the day counter. Use `academics.semDay()` plus `academic.startDay`.

## What you must not do
- Do not do the owner's tasks: deploying, accounts, API keys, the legal review of privacy and terms, testing on a real phone, or marking facts as verified.
- Do not rewrite another agent's area. If you need something from it, write the need in your report.
- Do not expand beyond your assigned section. If you finish early, say so.

## Final report (short)
What changed, files touched, the `// group` hook lines in shared files, tests count, facts you added (counts by confidence), what you could not verify, what is left in your section, and what you need from the owner.
