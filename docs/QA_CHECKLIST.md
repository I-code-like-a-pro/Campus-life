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
| Performance overlay (`?perf=1`) on a real phone: fill the table in PERFORMANCE.md for campus and each interior | 🧪 tooling ready |
| High contrast on, text size 130%, at 375x812, 320x568 and 667x375: nothing overlaps, targets stay 44px | 🧪 desktop-checked only |
| Frame rate on a mid-range Android on mobile data | Worst case measured on UNILAG is now 88 draw calls (it was 115 before static scenery was baked into one mesh); the phone number is unknown |
| iPhone Safari: audio starts after the first tap, joystick works, safe areas respected | 🧪 |
| Samsung Internet and Chrome on Android | 🧪 |
| Low-end phone with the Low graphics setting | 🧪 |
| Landscape and portrait, and rotating mid-game | 🧪 |
| Installing to the home screen (PWA) and playing offline | 🧪 |
| One-thumb reach of all buttons, text readable outdoors | 🧪 |
| A full playthrough by a first-time player, without help | 🧪 |
| Guided first day: five tap-through steps (walk, talk, enter, phone, sleep at night), Skip tour works, tour never shows over a dialog, the phone, the map or the start screen, and does not return after a reload once finished | 🧪 |
| Landmark badges: far buildings show only their emoji badge, names appear when you get close, nothing flickers at the switch distance, badges stay readable in rain and haze | 🧪 |
| Neighbourhood props (stepping stones, flower beds, benches, noticeboards, washing lines, Family House fence, Sports Centre benches and scoreboard): none of them block a doorway or trap an NPC | 🧪 |
| Warm light at sunrise and sunset, bluish night, rooms stay warm at night | 🧪 |

## How to run the checks yourself
```bash
npm test                  # all unit and balance tests
node tools/balance.js     # prints the balance table for the three bot styles
npm run build             # production build
```

## Mobile-first rule
The game is designed for phones first, desktop second. Every UI change must be checked at 375x812 (portrait), 320x568 (small phone) and 667x375 (landscape): no horizontal scroll, no overlapping HUD elements (joystick, action panel, Kick button, minimap, needs), touch targets at least 44px, and inputs at 16px font size.
