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
- Scenes only run in the first semester of year 1 (`windowsOf`), so older saves are never flooded with missed scenes.
- Scene facts are given to the AI, so NPCs can answer "when is matriculation?".

## AI in these scenes
- Officers, the Dean and the Registrar have personas and quick questions ("What am I missing?"). See `docs/AI_NPCS.md`.
- For clearance the AI receives `clearanceFacts()`: counters finished, papers present or MISSING, fees, office hours. It describes them in its own words. The server prompt forbids approving clearance, money or grades; the game code decides.
- The server prompt also carries a short primer on Nigerian university life (clearance, matriculation, CA, CGPA, carryover).
- Without AI, the scripted officer lines say the same things.

## Adding a scene
Add an entry to `SCENES` with `venue`, `windows(a)`, `crowd`, `beats(ctx)`, `minutes` and `fx`. Each beat is `{ title, lines, choices? }`; each choice is `{ label, text, fx?, cost?, poor?, meet? }`. Add a test row in `tests/scenes.test.js` if the timing is new.
