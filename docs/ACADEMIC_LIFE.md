# Academic life

Rules live in `src/academic-life.js` (pure functions, tested in `tests/academic-life.test.js`). Scenes are in `src/scenes-academic.js`.
Per-semester records are in `state.academic` and are reset when a semester is built (`resetSemester`).

## Lecturers
Each course has a lecturer fixed by code, year and term, with one style:

| Style | Effect when you attend |
|---|---|
| Strict | On time: +2 preparation. Late: -2. |
| Funny | +1 preparation, fun +4, stress -2. |
| Absent-minded | -1 preparation, but class ends 30 minutes early. |
| Brilliant | +3 preparation (+1 if late), stress +1. |
| Generous with notes | +1, and the first lecture shares a handout (+3). |

The toast after a lecture shows the lecturer's name and a line. Lecturers are listed in `academics.facts()` for the AI.

## Handouts
- Business Centre counter: "Buy a course handout" costs 300 naira, +6 preparation, once per course per semester (the older bulk "Buy handouts" action is unchanged).
- Library: "Ask a coursemate for notes" has a 60 percent chance, +5 preparation, two tries per course per semester.

## Group assignments (library)
One course per semester has a group project (Monday to Friday). Pick two of three teammates (skill and reliability), then your contribution:
full, fair share, minimum or copy. Outcome is great, ok or poor. Unreliable teammates may disappear. Copying has a 40 percent chance of
a warning, recorded in `academic.integrityWarnings` (hearings belong to another system).

## Lab practicals (lecture hall)
For PHY, CHM, BIO, ENG, PHA and MED courses: Tuesday to Friday, 10:00 to 17:00. Three steps with one sound choice each. 3 correct is +8 preparation, 2 is +5, 1 is +2.
A first-practical scene also appears in the first semester.

## Tutorials (lecture hall)
Weekday afternoons (16:00 to 18:00), one a day, up to 3 per course per semester. +5 preparation, and nothing once preparation reaches 75.

## Review
A lecturer should review the lab steps for correctness (they are basic safety and method) and the tone of lecturer lines.
