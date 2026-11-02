# Scenes and the Registry

Story events are real places and real times. The player is told when and where, can attend or skip, and nothing blocks progress.

## Clearance at the Registry
- A walk-in **Registry** building (`src/interiors.js` `registry`) on every campus, open **8:00 to 17:00**.
- Four counters in order: Admissions, Bursary, Medical, Hostel. Officers are indoor NPCs (`src/npcs.js`).
- At Admissions and Medical the player chooses **Present my details and documents**. The officer reads back name, course, university and home town, then checks the papers for that counter.
- Papers are in `src/documents.js`. Which ones are missing is decided by a seeded roll (at most two), so a save always has the same story. The game, not the AI, decides what is missing.
- Missing papers are fixed at the **Business Centre** (photocopy, declaration of age, passport photographs, ₦200 to ₦600). If the player is short, Mum can send a small transfer. Clearance can never be blocked.
- Old saves without the record get it rolled on first use.

## Scenes (`src/scenes.js`)
| Scene | Where | When (semester day, 1 = Monday) |
|---|---|---|
| Freshers' orientation | Main auditorium | Day 1, 10:00 to 13:00 |
| Hall meeting | The player's hostel | Days 1 and 2, 17:00 to 19:30 |
| Matriculation | Main auditorium | Days 2 and 3, 10:00 to 13:00 |
| Course registration | Your department's first lecture hall | Days 1 and 2, 14:00 to 17:30 |
| Hostel inspection | The player's hostel | Days 3 and 4, 15:00 to 18:00 |
| Freshers' night (party) | Main auditorium | Day 5 (Friday), 19:00 to 23:00 |
| Club fair | Main auditorium | Days 2 and 4, 14:00 to 17:00 |
| Your first CA test | The hall of your first class | Day 3 (Wednesday), 08:00 to 18:00 |
| Your first lecture | The hall of your first timetable class | From 15 minutes before that class until one hour after it starts |

- A notification appears when a scene opens. The HUD goal line shows what is on now or coming up.
- Walking in during the window shows **Attend or Not now**. Attending plays the beats (dialogs with choices), spends time, applies effects, and fills the room with NPCs you can talk to. Talking to them counts toward the orientation "meet people" goal.
- If every window passes, the scene is marked **missed** with a short notice. State is stored in `state.academic.scenes[id]`.
- Matriculation sets `academic.matric` when attended. Course registration sets `academic.registered`; skipping it adds a little stress and a notice to visit the department office.
- The first lecture counts as real attendance for that class (`academics.attendEntry`), with preparation gained from where you sit, a warm-up question from the course's own bank, and how you take notes. If you attend the class the normal way first, the scene closes itself, so nothing is counted twice.
- The hostel inspection judges your real room: hygiene, decorations bought, whether you tidied, and whether you hid or handed in the banned heater. The verdict (commended with a ₦1,000 prize, satisfactory, or warning with possible ₦500 fine) comes from code, not chance.
- Freshers' night costs ₦1,000 (or carry chairs instead). A late-night choice comes with the exam the next morning: leave at once, or stay another hour for fun at the price of energy.
- Beats may be functions (decided when reached), choices may carry `flag`, `minutes` and `prep`, and beats may `give`, `cost` or apply `fx`.
- The club fair lets you visit up to two stalls and join clubs for real (₦500 dues, two clubs maximum, existing club rules). Joining uses the same data as the phone's Clubs app.
- The first CA test lets you prepare first (revising your weakest course adds preparation that really changes the quiz hints), then a cheating dilemma (a seeded 50% chance of being caught; a warning is recorded in `academic.integrityWarnings`), then the real CA quiz from `academics.run`. If you take the CA the normal way, the scene closes itself.
- The nine scenes above run in year 1, semester 1 only (`windowsOf`), so older saves are never flooded with missed scenes. Their status key is the scene id, exactly as before.
- Scene facts are given to the AI, so NPCs can answer "when is matriculation?".

## The rhythm of the year (`src/milestones.js`, `src/homevisit.js`)
Scenes with `repeat: true` run in later semesters. `active(a)` says in which semesters, and their status is stored per semester under `state.academic.scenes["id@year.term"]`, so every semester starts fresh. A repeating scene that passes without ever having been announced (an older save, or a night spent asleep) is marked missed **silently**, so older saves are never flooded with notices. `academic.programmeYears` is stamped from the course on first tick so final-year scenes know the last year. The scene engine also supports `closing` (text or function), `noDrain` (long scenes skip the need drain), choice `give`, choice or beat `run(ctx)` hooks, and `ctx.a`, the real academic record.

| Scene | Where | When (semester day, 1 = Monday) | Runs in |
|---|---|---|---|
| Results day | Your department's lecture hall (notice board) | Day 7 (break day), 08:00 to 22:00 | Every semester, once results are released |
| New session welcome | Main auditorium | Day 1, 10:00 to 13:00 | Semester 1 of years 2 to 4 |
| Second semester resumption | Main auditorium | Day 1, 10:00 to 13:00 | Every semester 2 |
| Course registration (later semesters) | Department lecture hall, with the level adviser | Days 1 and 2, 14:00 to 17:30 | Every semester except year 1 semester 1 |
| Revision night | Library | Day 5 (Friday), 15:00 to 19:00 | Every semester |
| Exam morning | A lecture hall | Day 6 (Saturday), 06:30 to 09:00 | Every semester |
| Assignment deadline | Business Centre | Day 5 (Friday), 09:00 to 17:00 | Every semester, until all assignments are submitted |
| Faculty week | Main auditorium | Days 3 and 4, 14:00 to 18:00 | Semester 1 of years 2 to 4 |
| Departmental dinner | Main auditorium | Day 4 (Thursday), 18:00 to 22:00 | Semester 2 of years 2 to 4 |
| SIWES attachment | A lecture hall (SIWES coordinator) | Day 7, 08:00 to 22:00 | After year 3, semester 2 results |
| Project topic and supervisor | A lecture hall | Days 2 and 3, 14:00 to 17:00 | Final year, semester 1 |
| Project defence | A lecture hall | Day 5 (Friday), 10:00 to 15:00 | Final year, semester 2 |
| Convocation | Played before the story card (`scenes.convocation()`) | At graduation | Once |

- **Results day** reads the real record (`academic.history`): the GPA tier (First class standard down to Below pass level) sets what coursemates do, the fun and stress effects, and Mum's reply and gift (₦3,000 down to nothing). Choices: celebrate (₦1,500), call Mum, console a friend, or make a study plan (`academic.studyPlan`, a head start in every course of the next semester). Weak results add a word from the department. Skipping it changes nothing; the portal still shows everything.
- **Resumption scenes** welcome the new session by level, describe the rainy season, and re-register using the real course list for that level (carryovers included). The level adviser answers from the real CGPA and carryovers. Skipping registration adds a little stress.
- **Revision night and exam morning** change real preparation (`course.knowledge`), which feeds the hints in the real exam. They close themselves once the exam is written.
- **Assignment deadline** reads `course.assign`: print a draft (partial marks), finish the started ones, ask for an extension (a seeded 50% roll), or let it go. It closes itself when every assignment is submitted.
- **SIWES** stretches the break (`academic.breakUntil`) by about five days, scores punctuality, work and honesty into a tier, and pays a stipend (₦6,000 to ₦25,000). **The project** has a topic scene (final year, semester 1) and a defence (semester 2) whose tier (Distinction, minor corrections, major corrections, defend again) comes from effort, rehearsal, answers, CGPA and preparation (`defenceScore`). It does not change a grade or block graduation.
- **Convocation** (gown, procession, name called with the real degree class, family photo with Mama and Tobi) plays before the existing "Your story" card, which is unchanged.

### Breaks and going home
- During the break (`phase: 'break'`) the **Student portal** offers **Go home for the break** once per break (`academic.homeVisits["year.term"]`).
- The player rides out of the main gate by bus or plane (fares and distance from `src/towns.js`, doubled for the round trip), sees a journey card and a seasonal home scene with Mama and Tobi: a festive Christmas dinner after semester 1, a quiet harvest weekend after semester 2. Game time then jumps in one step and the same vehicle brings the player back through the gate.
- **Trade-off for safety:** no world change and no reload. The home town is not a playable map during the student years, so the visit is a sequence of dialogs on the same save. Pre-admission home flow is untouched (`arrivalRide` is not used for the return).
- The break is stretched with `academic.breakUntil` (read by `nextStartDay` in `src/academics.js`) so the next semester always starts after the player is back. Older saves have no `breakUntil`, so the old "a week after the semester began" rule applies unchanged. Hostel bills, health, allowance and the daily checks run for every skipped day.

## AI in these scenes
- Officers, the Dean and the Registrar have personas and quick questions ("What am I missing?"). See `docs/AI_NPCS.md`.
- For clearance the AI receives `clearanceFacts()`: counters finished, papers present or MISSING, fees, office hours. It describes them in its own words. The server prompt forbids approving clearance, money or grades; the game code decides.
- The server prompt also carries a short primer on Nigerian university life (clearance, matriculation, CA, CGPA, carryover).
- Without AI, the scripted officer lines say the same things.

## Adding a scene
Add an entry to `SCENES` with `venue`, `windows(a)`, `crowd`, `beats(ctx)`, `minutes` and `fx`. Each beat is `{ title, lines, choices? }`; each choice is `{ label, text, fx?, cost?, poor?, meet? }`. Add a test row in `tests/scenes.test.js` if the timing is new.
