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
| Your first lecture | The hall of your first timetable class | From 15 minutes before that class until one hour after it starts |

- A notification appears when a scene opens. The HUD goal line shows what is on now or coming up.
- Walking in during the window shows **Attend or Not now**. Attending plays the beats (dialogs with choices), spends time, applies effects, and fills the room with NPCs you can talk to. Talking to them counts toward the orientation "meet people" goal.
- If every window passes, the scene is marked **missed** with a short notice. State is stored in `state.academic.scenes[id]`.
- Matriculation sets `academic.matric` when attended. Course registration sets `academic.registered`; skipping it adds a little stress and a notice to visit the department office.
- The first lecture counts as real attendance for that class (`academics.attendEntry`), with preparation gained from where you sit, a warm-up question from the course's own bank, and how you take notes. If you attend the class the normal way first, the scene closes itself, so nothing is counted twice.
- Scene facts are given to the AI, so NPCs can answer "when is matriculation?".

## AI in these scenes
- Officers, the Dean and the Registrar have personas and quick questions ("What am I missing?"). See `docs/AI_NPCS.md`.
- For clearance the AI receives `clearanceFacts()`: counters finished, papers present or MISSING, fees, office hours. It describes them in its own words. The server prompt forbids approving clearance, money or grades; the game code decides.
- The server prompt also carries a short primer on Nigerian university life (clearance, matriculation, CA, CGPA, carryover).
- Without AI, the scripted officer lines say the same things.

## Adding a scene
Add an entry to `SCENES` with `venue`, `windows(a)`, `crowd`, `beats(ctx)`, `minutes` and `fx`. Each beat is `{ title, lines, choices? }`; each choice is `{ label, text, fx?, cost?, poor?, meet? }`. Add a test row in `tests/scenes.test.js` if the timing is new.
