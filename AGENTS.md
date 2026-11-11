# Campus Life — Agent Guidelines & Project Instructions

This repository is **Campus Life**, a phone-first 3D simulation of Nigerian university life built with Three.js and Vite.

Other documents: [STATE.md](STATE.md) (live hand-off log), [docs/FULL_SCHOOL_PLAN.md](docs/FULL_SCHOOL_PLAN.md) (the plan and who owns which files), [docs/AGENT_RULES.md](docs/AGENT_RULES.md) (detailed rules for the parallel section agents). If a document disagrees with this file, **this file wins**.

## Essential Commands

* `npm test` — Run unit tests (`vitest run`).
  * Note: when running locally, exclude `.claude` worktrees (they hold duplicate copies of the tests): `npx vitest run --exclude "**/.claude/**" --exclude "**/node_modules/**"`
* `npm run dev` — Start the Vite development server at `http://localhost:5173` (use `-- --port <n> --strictPort` for another port).
* `npm run build` — Build the production bundle in `dist/`.
* `npm run preview` — Preview the production build.
* `node tools/state.js check | begin <agent> | end <agent> …` — the `STATE.md` write protocol (section 7).

## Core Architectural Rules & Standards

### 1. Mobile Performance & Budgets ([docs/PERFORMANCE.md](docs/PERFORMANCE.md))
* **Phone-first:** aim for mid-range mobile browsers on limited data.
* **Two sets of numbers, with different jobs:**
  * **Targets** (what we build to):
    * Outdoor campus: at most 90 draw calls, 100,000 triangles, at least 40 FPS.
    * Enterable interiors: at most 40 draw calls, 20,000 triangles, at least 50 FPS.
  * **Alarm thresholds** (what the `?perf=1` overlay flags as OVER BUDGET): the looser numbers kept in `src/perf.js` and in the table in `docs/PERFORMANCE.md`; a test keeps those two in step. The original spec ceiling is 150 draw calls, 250,000 triangles, 30 FPS.
  * Stay at or under the targets. The alarm thresholds only exist to catch a serious regression.
* **Bundle size:** the initial bundle limit is **350 KB gzipped** (today about 332 KB; about half is three.js). Warn at 300 KB. Above the limit, split rarely used content (later-year scenes, question banks, the GLTF loader) before adding more. The spec's hard limit is under 5 MB first load.
* **Instancing:** reusable world objects (trees, street lamps, windows) must use instanced meshes. Do not create separate geometries for repeated decorative elements.

### 2. University Packs ([src/packs/](src/packs/))
* A pack is **data only** (see [docs/PACKS.md](docs/PACKS.md)). Every new or updated campus must validate against [`src/packs/schema.js`](src/packs/schema.js).
* Register new packs in [`src/packs/index.js`](src/packs/index.js). Building coordinates must not collide with the pedestrian paths (x = 0, z = 0), the map edge, or other buildings. The validator checks this.
* Real facts carry provenance (source, confidence, verified). Game estimates are labelled as estimates on screen.

### 3. Academics & Question Banks ([src/questions.js](src/questions.js), [src/academics.js](src/academics.js))
* Questions must include exactly one correct answer and three distinct, plausible distractors.
* Academic scoring uses a 5.0 GPA scale with standard grade boundaries.

### 4. Save Versioning & Migrations ([src/save.js](src/save.js))
* Never make **breaking** state changes without a version migration. A breaking change renames or removes a field, or changes what a field means.
* For a breaking change, bump `SCHEMA_VERSION` in [`src/save.js`](src/save.js) (currently 3) and add an upgrade function in `MIGRATIONS`.
* **Additive** changes (new optional data with safe defaults, merged through `newMeta()` or created when first used) do not need a version bump. Old saves must still load. Test it.

### 5. Language & Dialogue
* The target voice is the authentic Nigerian university student voice, with **standard English as the default** and **Nigerian Pidgin and campus slang also accepted**.
* **Standard English is required** for: menus and buttons, the student portal, clearance and the Registry, fees and bills, results and CGPA, hearings and official notices, the privacy, terms and About pages, and every researched fact in the data files.
* **Pidgin and slang are welcome** in informal NPC dialogue, banter, gist and rumours, student chatter, market and motor-park characters, and flavour text. Pidgin must never carry a factual claim (a date, a fee, a rule): state the fact in standard English and let the character react to it in Pidgin.
* Always: teen-safe, kind (never mocking a language, accent or group), short lines that read well on a phone, and consistent spelling of common Pidgin words (for example "wetin", "abeg", "no wahala", "how far"). NEPA, harmattan, ASUU and jollof are fine anywhere.
* Known follow-up: the AI NPC prompt in `server/npc-core.js` and the check in `tools/ai-smoke.js` still require standard English. Changing them is a separate decision and needs an explicit go-ahead.

### 6. Testing Requirements
* Maintain coverage across admissions, academics, saves, economy, packs and balance. The suite is large (hundreds of tests): always run it, with the worktree exclude above, and run `npm run build`, before you finish any work.
* Add tests for every new pure rule. Do not lower a threshold to make a test pass.

### 7. Agent State & Continuity ([STATE.md](STATE.md))
* **Read [`STATE.md`](STATE.md) at the start of a session** to see where the previous agent stopped and where to continue.
* **Never edit `STATE.md` freehand.** Before any state save, every agent follows this protocol, using `tools/state.js`:
  1. **Check** that no other agent is writing: `node tools/state.js check`.
  2. If nobody is, **begin**: `node tools/state.js begin <agent>` takes the lock and prints the whole current file. **Read through it** before deciding what to write. If someone else is writing, do not write: wait and try `begin` again.
  3. **Update**: `node tools/state.js end <agent> --status "…" --note "…"` updates your row and the change log and releases the lock.
* The live `STATE.md` and its lock sit in the **main checkout**, shared by every worktree. Agents never commit `STATE.md`; the lead commits it.
* Save state at milestones (a step is done, tests are green, or you are stopping), not after every edit. Update the active goal and checklist in `STATE.md` when a plan changes.

## 8. Repo Activity Standards

### Git & Pull Request Workflow
When completing a task that modifies code, always follow these steps:
1. **Sync Base Branch:** make sure you start from an up-to-date `main` (`git checkout main && git pull origin main`).
2. **Create a Dedicated Branch:** never commit directly to `main`. Use a descriptive branch with a prefix such as `feat/`, `fix/` or `chore/` (for example `git checkout -b feat/short-task-description`).
3. **Commit Atomic Changes, After Every Change:** stage only relevant files and write clear, imperative commit messages. Commit as soon as a coherent change works and the tests pass; do not batch everything into one commit at the end. Never commit secrets, `.env` files, or the local tooling folders (`.agents/`, `.claude/`).
4. **Push the Branch:** `git push -u origin <branch-name>`.
5. **Open a Draft Pull Request:** use the GitHub CLI (`gh pr create --draft`) or the GitHub tools to open a draft PR targeting `main`, with a clear summary, the motivation, and how it was tested.
6. **Do Not Self-Merge:** stop after opening the PR and wait for human review.

**Parallel section agents:** each agent works in its own git worktree on its own branch and commits there after every change. Agents do not push or merge; the lead pushes each branch and opens its draft pull request. Nobody merges to `main` without human review. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
