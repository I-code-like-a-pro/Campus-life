# Authority and Trouble

Everything here is fair, explained to the player, and recoverable. Code: `src/trouble.js` (rules, scenes, runtime), seeded triggers in `src/eventengine.js`, visuals in `src/events.js`. State: `state.academic.trouble`. Tests: `tests/trouble.test.js`.

## Disciplinary hearings
- Each exam-malpractice warning is `academic.integrityWarnings` (the first CA test records one). Two unheard warnings book a hearing: a letter arrives and the scene is open the next two days, 09:00 to 17:00, at the main hall.
- The player answers with the truth, an explanation, or silence. `hearingOutcome` decides the tier from the answer, earlier hearings and CGPA (3.5 or higher counts in your favour):
  reprimand (spoken only), community service (3 hours, now or tomorrow afternoon), or a note on record (removed at the end of the semester if no new warning comes).
- The result screen lists why, and `wayBack` spells out how it is closed. There is no expulsion tier. A missed hearing is rebooked once; missing both gives a note on record.
- Unfinished community service also becomes a note on record, never anything worse.

## Dean's visits and counselling
- Office hours scene once in about two semesters in three (never the first semester), Tuesday to Thursday 11:00 to 15:00. The talk depends on standing: probation, conduct (record or warnings), strong (CGPA 3.5+), or good.
- On probation (`academic.probation`, set by `applyStanding`) a counselling scene is booked for Tuesday of the semester. It shows the real GPA, weakest courses and carryovers, the withdrawal rule, then a study plan (steady, weakest first, study group, sleep and meals) that gives real preparation or stress changes.

## Medical deferment
- At the Health Centre consulting room, a sick, diagnosed player on the day before or the day of a CA test or exam can buy a medical report (₦500). Not sick or not diagnosed: the game explains why not.
- At a lecture hall on the CA day (Wednesday) or exam day (Saturday), a still-sick player can present the report to defer instead of writing sick.
- Make-up days: CA on Friday 08:00 to 18:00; exam on Sunday (the break day) 08:00 to 20:00. Make-ups reuse the normal `ca` and `exam` actions, so `caTaken` and `examTaken` work unchanged. An exam make-up holds results back by one day (`makeupHold` in `academics.tick`). Missing a make-up counts as zero. One deferral per kind per semester.

## Campus events (all seeded by day, announced by notification, with a clear end)
| Event | Trigger | What happens |
|---|---|---|
| Flood | Rainy season, about 1 day in 5, four hours starting an hour into the shower | Water sheet on the ground, lecture lateness grace of 60 minutes, a choice to help clear a drain, take a dry detour, or stay dry. |
| Fire drill / kitchen fire alarm | About 1 evening in 16 (21:00) / 1 in 25 (22:30) | Evacuate, grab belongings first, help, or stay in. Non-graphic; nobody is hurt; staying in a drill costs a small fine. |
| Student union protest | About 1 lecture day in 12 (not CA or exam day), 11:00 to 14:00, about fees or NEPA | Peaceful march: join (2 hours), watch, or avoid. |
| Security alert | About 1 evening in 25, notice 18:30, curfew 20:00 to 06:00 | An unconfirmed security report. Go home now, finish up, or ignore; anyone outside at curfew is politely walked back to the hostel. Lifted at 06:00. No details are given. |

## Hooks
`// group trouble` lines in `src/main.js`: import, `createTrouble(...)`, per-frame `trouble.tick()` with the prompt runner, the `medreport`/`defer` actions in `perform`, lecture-hall and consulting-room action lists, the goal line, and AI facts. `scenes.js` imports `TROUBLE_SCENES`; `academics.js` has the flood lateness grace and the exam make-up hold.
