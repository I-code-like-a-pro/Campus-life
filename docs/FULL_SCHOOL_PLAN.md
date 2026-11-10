# Full UNILAG: the plan, the sections and who owns what

Goal: build UNILAG as the richest, most faithful campus first, then carry what we learn to UI and OAU. This is the plan agreed with the owner.

## Decisions already made
| # | Decision |
|---|---|
| 1 | UNILAG first and richest, then UI and OAU |
| 2 | Real facts are researched with a citation each. The owner reviews and corrects. Unverified facts are labelled "inspired by" |
| 3 | Zones instead of one huge map (academic core, hostels, then lagoon front and student union area), to stay within the phone performance budget (about 90 draw calls) |
| 4 | Priority: real faculties, departments and course names; then hostels with their own character; then the Students' Union with elections. Shuttle, eateries and lagoon front come after |
| 5 | Each university has its own faculty, department and programme list. Programmes use verified courses where we have them, a generic template where we do not, and each is marked which |
| 6 | First pass: every faculty present, one or two departments each (done: 30 programmes) |
| 7 | Two zones first: academic core, then hostels |
| 8 | Walk through a gate between zones, plus keke or bus rides between them, with time and fare by distance |
| 9 | Old saves must keep loading (save migration only if ids change) |
| 10 | One facts file per university (value, source, confidence, verified), plus a review sheet the owner fills in |
| 11 | Structural work is done carefully step by step; research and content work runs in parallel |
| 12 | Finished means: every faculty present; hostel zone and Students' Union playable; a zero-error four-year run for every programme; zone budgets and phone layouts passing; at least 80% of shown facts verified |
| 13 | Real institutions, faculties, halls and landmarks only. Fictional staff, student leaders and parties |
| 14 | The current build soft-launches as an early preview around 21 November. The full UNILAG ships as the next major update |

## What exists today
Packs (`docs/PACKS.md`), 30 programmes and UNILAG's 19 faculties (`docs/PROGRAMMES.md`), the research facts (`data/unilag/facts.json`, review sheet `docs/review/unilag-structure.md`), scenes (`docs/SCENES.md`), rides (`docs/RIDES.md`), money (`docs/MONEY.md`), people (`docs/PEOPLE.md`), trouble (`docs/TROUBLE.md`), audio, launch tooling.

## The eleven sections and their agents
| # | Section | Agent | Main files it owns | Must not touch |
|---|---|---|---|---|
| 1 | World: zones, faculty buildings, eateries, lagoon front, security post | world-zones | `src/zones*.js`, `src/world.js`, `src/interiors.js` (new builders), `src/packs/*` (campus part), `docs/ZONES.md` | hostels' data, shuttle |
| 2 | Admission and arrival | admissions-arrival | `data/unilag/admissions.json`, `src/admissions.js`, `src/clearance.js`, `src/documents.js`, `docs/ADMISSIONS.md` | fees |
| 3 | Academics and course content | academics-content | `data/unilag/courses/*.json`, `src/programmes.js`, `src/courses.js`, `src/upperlevels.js`, `src/questions.js`, `src/academic-life.js`, `docs/COURSES.md` | calendar |
| 4 | The year and the calendar | calendar-year | `data/unilag/calendar.json`, `src/milestones.js`, `src/packs/*` (calendar section), `docs/CALENDAR.md` | scenes of other areas |
| 5 | Money | money-research | `data/unilag/fees.json`, `src/money.js`, `src/packs/*` (fees), `docs/MONEY.md` | admissions cut-offs |
| 6 | Hostels and daily life | hostels | `data/unilag/halls.json`, `src/hostels*.js`, `src/housing.js`, `docs/HOSTELS.md` | zone engine |
| 7 | People and community | people-union | `src/union*.js`, `src/people.js`, `src/peopledialogues.js`, `docs/UNION.md` | hostel rules |
| 8 | Authority and trouble | trouble-playtest | `src/trouble.js`, `tests/trouble*.js`, `docs/TROUBLE.md` | new features outside trouble |
| 9 | Getting around | transport | `src/transport.js`, `src/rides.js`, `src/vehicles.js`, `src/shuttle*.js`, `docs/RIDES.md` | zone engine |
| 10 | Data, research and verification | data-verification | `data/**`, `tools/*review*.js`, `src/packs/{ui,oau}.js`, `docs/review/**`, `docs/VERIFICATION.md` | UNILAG-specific content owned by others |
| 11 | Launch and platform | launch-prep | `docs/RELEASE_CHECKLIST.md`, `docs/OWNER_TODO.md`, `about.html`, `terms.html`, `privacy.html`, `src/hints.js`, `src/style.css` (hint fix) | gameplay |

## Contracts between agents (agents run in parallel, so these keep the pieces compatible)
- **Zones:** the world agent defines the zone engine. Other agents must NOT assume it exists. They build data, rules and pure functions now, and the lead integrates after merging. Hostel halls are data in `data/unilag/halls.json` and in the pack (`halls`), not buildings placed by the hostel agent.
- **Transport:** the transport agent builds pure route, fare and time functions for an abstract graph of zones (nodes with distances) plus multi-leg ride support, so it works with whatever zones the world agent builds.
- **Packs:** any new pack section must come with validator rules in `src/packs/schema.js`, tests, and a provenance entry. Add new sections without renaming existing ones.
- **Facts:** each area keeps its facts in its own `data/unilag/<area>.json`, using the format in `docs/AGENT_RULES.md`. The data-verification agent builds the tools that turn the owner's filled review sheets into `verified: true`.

## Browser and ports
Each agent uses its own port: world-zones 5191, admissions-arrival 5192, academics-content 5193, calendar-year 5194, money-research 5195, hostels 5196, people-union 5197, trouble-playtest 5198, transport 5199, data-verification 5200, launch-prep 5201.

## Owner-only tasks (agents never do these)
Deploying, feedback form, AI key and spending cap, legal review of privacy and terms, testing on a real phone, and verifying facts on the review sheets.
