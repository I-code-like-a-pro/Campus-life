# QA checklist

✅ = checked automatically (unit tests or the scripted full-journey run) · 🧪 = needs a person on a real device · ⬜ = not yet checked

## Automated: 117 unit tests
Admissions and cut-offs · grading, GPA, carryovers and graduation · saves, migrations, backup recovery, export and import · needs and mood · illness rules · hostel bills, cooking and decorations · NPC working hours · friendship, tones, favours, clubs and events · pathfinding and fares · world conditions (weather, NEPA, strike) · feedback report privacy · **balance** (bots playing two semesters in three styles).

## Scripted full journey (real game in a browser, no errors)
New game → JAMB form → home → JAMB result → admission list → Mum's gift → bus → clearance (4 desks) → hostel and dues → first semester (8 lectures, study, assignments, CA, exam) → results with probation notice and carryovers → second semester.

## Soft-lock and edge cases
| Scenario | Status |
|---|---|
| Money hits zero (jobs, Mum's help every 3 days, cooking keep you going) | ✅ simulated, never negative |
| Energy runs out (nap and sleep recover it; fainting is rare for sensible play) | ✅ simulated |
| Retake loop after "no admission" (form reopens with choices kept, new result days) | ✅ played |
| Sleeping through an exam window (zero for that paper, carryover next semester) | ✅ by design, tested |
| Reload at every stage (home, after admission, mid-clearance, in a building, in a semester) | ✅ saves restore position and state |
| Damaged save (falls back to backup, notifies the player) | ✅ unit test |
| Storage full (warning with the export instructions) | ✅ unit test |
| Import a wrong, cut-off or tampered save code | ✅ unit test |
| Import a save from a newer game version | ✅ unit test (rejected) |
| NEPA during a job or browsing (blocked with a message, resumes after) | ✅ played |
| ASUU strike semester (lectures cancelled, attendance fair) | ✅ unit test |
| Sick during an exam (one less hint, shown to the player) | ✅ unit test |
| Graduation after the final semester | ✅ unit test |
| Unpaid hostel dues and unpaid loans | ✅ unit test and played |
| Auto-walk blocked by a building (finds a path or says there is none) | ✅ unit test |

## Needs a real phone (🧪)
| Check | Notes |
|---|---|
| Frame rate on a mid-range Android on mobile data | Worst case is now 87 draw calls and about 2 ms of CPU render time on a desktop; the phone number is unknown |
| iPhone Safari: audio starts after the first tap, joystick works, safe areas respected | 🧪 |
| Samsung Internet and Chrome on Android | 🧪 |
| Low-end phone with the Low graphics setting | 🧪 |
| Landscape and portrait, and rotating mid-game | 🧪 |
| Installing to the home screen (PWA) and playing offline | 🧪 |
| One-thumb reach of all buttons, text readable outdoors | 🧪 |
| A full playthrough by a first-time player, without help | 🧪 |

## How to run the checks yourself
```bash
npm test                  # all unit and balance tests
node tools/balance.js     # prints the balance table for the three bot styles
npm run build             # production build
```
