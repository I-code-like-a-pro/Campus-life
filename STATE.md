# Agent State & Hand-off Log (STATE.md)

This file tracks the active plan, work accomplished, current progress, and exact continuation instructions across agent sessions.

**Read this first, and follow the write protocol in section 8 before you change it.**

---

## 1. Current Session & Status

* **Status:** 🟡 In progress. The full-UNILAG plan is running; the eleven section agents were stopped by a usage limit and have not been resumed yet.
* **Last Updated:** 2026-11-11
* **Active Goal / Mission:** Build UNILAG as the richest, most faithful campus, then carry the lessons to UI and OAU (plan: [docs/FULL_SCHOOL_PLAN.md](docs/FULL_SCHOOL_PLAN.md)).
* **Test Suite Status:** Passing: 396 tests in 32 files at the last merge to `main` (`npx vitest run --exclude "**/.claude/**" --exclude "**/node_modules/**"`). The production build is about 332 KB gzipped.

---

## 2. Where the Previous Agent Stopped

* **Done on `main`:** university packs and validator, 30 programmes and UNILAG's 19 faculties, the research facts and review sheet for UNILAG structure, the plan and agent rules documents, the sound, rides, scenes, money, people, trouble and launch-tooling work.
* **Done on agent branches (not merged):** eleven agents each hold saved commits (see section 7). Some also have uncommitted work in their own worktree folders.
* **Exact point of hand-off:** the agents stopped when the usage limit was hit. Nothing from them has been merged. The lead has not yet snapshot-committed their uncommitted work or resumed them.

---

## 3. Where to Continue From (Next Steps)

1. Snapshot-commit each agent's uncommitted work on its own branch (safe, does not touch `main`).
2. Resume the agents in waves: (1) world-zones, transport, data-verification; (2) hostels, people-union, calendar-year; (3) admissions-arrival, academics-content, money-research; (4) trouble-playtest, launch-prep.
3. As each agent finishes: push its branch, open a **draft pull request** to `main`, run the tests and build, and wait for human review. Never self-merge.
4. Resolve merge conflicts one branch at a time. Shared hot files: `src/main.js`, `src/scenes.js`, `src/campuses.js`, `src/academics.js`, `src/packs/schema.js`, `src/packs/unilag.js`.
5. After the zone engine merges, integrate the zone graph with the transport agent's route code and the hostel agent's hall data.

---

## 4. Plan & Task Checklist

- [x] Packs, validator and provenance ([docs/PACKS.md](docs/PACKS.md)).
- [x] Programme catalogue and UNILAG faculties ([docs/PROGRAMMES.md](docs/PROGRAMMES.md)).
- [x] UNILAG structure research and review sheet ([docs/review/unilag-structure.md](docs/review/unilag-structure.md)).
- [x] Plan, section ownership and agent rules ([docs/FULL_SCHOOL_PLAN.md](docs/FULL_SCHOOL_PLAN.md), [docs/AGENT_RULES.md](docs/AGENT_RULES.md)).
- [ ] Section 1 world: zones, faculty buildings, eateries, security post, lagoon front.
- [ ] Section 2 admissions and arrival.
- [ ] Section 3 academics: real course lists and questions.
- [ ] Section 4 calendar and the year.
- [ ] Section 5 money: real fees and prices.
- [ ] Section 6 hostels: halls, ballot, rules.
- [ ] Section 7 people: Students' Union and storyline play-testing.
- [ ] Section 8 trouble: play-test and fixes.
- [ ] Section 9 transport: zone-aware rides and the shuttle.
- [ ] Section 10 data and verification: review tools, About this campus, UI and OAU research.
- [ ] Section 11 launch prep (owner checklist, preview labelling, soak test).
- [ ] Owner: verify facts on the review sheets (target: at least 80% of shown facts).

---

## 5. Architectural Context & Decisions

* **Vitest execution:** always exclude worktrees, otherwise Vitest also runs the duplicate tests inside `.claude/worktrees`:
  ```bash
  npx vitest run --exclude "**/.claude/**" --exclude "**/node_modules/**"
  ```
* **Language policy (decided 2026-11-11):** standard English is the default and is **required** for menus, the portal, clearance, fees, results, hearings, the privacy and terms pages and every researched fact. **Nigerian Pidgin and campus slang are also accepted** in informal NPC dialogue, banter, gist and flavour text. Keep it teen-safe, kind (never mocking), short and readable on a phone, and spell common words the same way every time. Pidgin never carries a factual claim. (Note: the AI NPC prompt in `server/npc-core.js` and the check in `tools/ai-smoke.js` still forbid Pidgin; changing them needs a separate, explicit decision.)
* **Performance:** two sets of numbers, with different jobs.
  * **Targets** (what we build to): outdoor campus at most 90 draw calls, 100,000 triangles, at least 40 FPS; enterable interiors at most 40 draw calls, 20,000 triangles, at least 50 FPS.
  * **Alarm thresholds** (what `?perf=1` flags as OVER BUDGET, kept in `src/perf.js`, checked by a test): the looser numbers in [docs/PERFORMANCE.md](docs/PERFORMANCE.md). The spec ceiling is 150 draw calls, 250,000 triangles, 30 FPS.
  * Repeated items must use `InstancedMesh`.
* **Bundle size:** limit **350 KB gzipped** for the initial bundle (today about 332 KB; about half is three.js). Warning at 300 KB. Above the limit, split rarely used content (later-year scenes, question banks, the GLTF loader) before adding more. The spec's hard limit is under 5 MB first load.
* **University packs:** data only. Every pack must pass `src/packs/schema.js` and be registered in `src/packs/index.js`. Buildings stay off the main path (x = 0, z = 0).
* **Save versioning:** the constant is `SCHEMA_VERSION` in `src/save.js` (currently 3). **Breaking** changes (renamed or removed fields, changed meaning) need a version bump and a function in `MIGRATIONS`. **Additive** changes (new optional data with safe defaults, merged through `newMeta()` or lazily created) do not need a bump.
* **Facts:** every real fact has a source, a confidence and `verified: false` until the owner marks it. Game estimates are labelled as such on screen. No real people or real political groups.
* **Git workflow (decided 2026-11-11):** branch, commit, push the branch, open a **draft pull request**, wait for human review, never self-merge. Details in [AGENTS.md](AGENTS.md).

---

## 6. Log of Changes

| Date | Agent / Action | Summary of Changes |
| :--- | :--- | :--- |
| 2026-11-11 | Antigravity | Initialized `AGENTS.md` and `STATE.md`; verified test suites and documented repo architecture. |
| 2026-11-11 | lead | Updated `AGENTS.md` and `STATE.md` with the owner's decisions: Pidgin accommodated, pull-request workflow, performance targets versus alarms, 350 KB bundle limit, and the locked write protocol (`tools/state.js`). |
| 2026-11-11 | lead | Protocol verified on the live STATE.md: check, begin, refuse while held, end. |

---

## 7. Agents (live)

| Agent | Status | Last note | Updated |
| :--- | :--- | :--- | :--- |
| world-zones | stopped (usage limit) | 2 commits: UNILAG zone data, zone graph and pack validation; gates and rendering not done | 2026-11-11 |
| admissions-arrival | stopped (usage limit) | 2 commits: sourced cut-offs, post-UTME step, clearance notes, docs | 2026-11-11 |
| academics-content | stopped (usage limit) | 2 commits: extra banks for 8 programmes; no UNILAG-specific course lists found for most | 2026-11-11 |
| calendar-year | stopped (usage limit) | 2 commits: research, pack calendar section, session in portal; scenes uncommitted | 2026-11-11 |
| money-research | stopped (usage limit) | 1 commit: fees research; pack and price changes uncommitted | 2026-11-11 |
| hostels | stopped (usage limit) | 2 commits: 12 halls as pack data and research; ballot and rules not done | 2026-11-11 |
| people-union | stopped (usage limit) | 1 commit: union research; union code uncommitted | 2026-11-11 |
| trouble-playtest | stopped (usage limit) | no commits | 2026-11-11 |
| transport | stopped (usage limit) | 1 commit: zone route graph, multi-leg rides, shuttle rules | 2026-11-11 |
| data-verification | stopped (usage limit) | 1 commit: review tools and provenance links | 2026-11-11 |
| launch-prep | stopped (usage limit) | no commits | 2026-11-11 |
| lead | active | Protocol verified on the live STATE.md: check, begin, refuse while held, end. | 2026-11-11 |

---

## 8. Write Protocol for STATE.md (mandatory)

Several agents may work at the same time, so nobody edits this file freehand. Use the tool, from any worktree:

1. **Check:** `node tools/state.js check` tells you whether another agent is writing right now.
2. **Begin:** `node tools/state.js begin <your-agent-name>` waits until nobody is writing, takes the lock, and **prints the whole current file**. Read it all before you decide what to say. If it reports that someone is still writing, do **not** write: wait and run `begin` again.
3. **End:** `node tools/state.js end <your-agent-name> --status "<short status>" --note "<what you did, what is left>"` updates your row in section 7, adds a line to section 6, and releases the lock.
4. If you started but will not write, run `node tools/state.js release <your-agent-name>`. A lock older than 10 minutes counts as abandoned and is taken over automatically.

Rules: the live file and its lock are in the **main checkout** (shared by every worktree), not in your worktree. **Agents never commit `STATE.md`; the lead commits it.** Save state at milestones (a section step finished, tests green, or you are stopping), not after every edit.
