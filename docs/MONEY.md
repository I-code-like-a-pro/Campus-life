# Money rhythm and places

How money moves in Campus Life. Rules live in `src/money.js` (pure, tested in `tests/money.test.js`); dialogs in `src/moneyui.js`.
All amounts marked placeholder are game values, not real school fees.

## School fees (each semester)
- A fee bill is added to the same `meta.bills` list as hostel dues when a semester starts (`semesterStart`). The first semester of first year is skipped: the clearance fee already covered it.
- Placeholder amounts (`FEES` in `src/money.js`): UNILAG 30,000 (late fee 2,500), UI 24,000 (2,000), OAU 27,000 (2,000).
- Due on semester day 4 (Thursday). Reminders in the notification centre: when issued, the day before, on the due day, and the day before exams. The day after the due date a late fee is added once.
- Pay at the **Bursary counter** inside the Registry (spot "Pay school fees") or in the phone under **My room and bills**.
- Consequence: while a fee bill is overdue and unpaid, **exams cannot be written** (a toast explains how to fix it).
- Never a soft-lock. Escapes:
  - **Pay half now** (instalment): clears you for exams, waives the late fee, and the rest is due a week later.
  - **Ask Mum for help**: once per bill, Mum sends exactly the shortfall for the instalment. Test: with any amount of cash the player can reach clearance.

## Bookshop (every campus, north-west)
- Textbook: 3,500, +9 preparation in one course (`academics.boostCourse`); one per course per semester, two per day.
- Stationery pack: 1,500, +3 preparation in every course (`boostAll`); once per semester.
- Job at the tutoring table: **Tutor juniors**, 3,000 for 2 hours, once a day.

## Bank (every campus, south-west)
- ATM: save 5,000 or all cash, withdraw 5,000 or all savings (uses `meta.savings`, the same pot as the phone's bank).
- Ask Mum for 4,000, at most twice per calendar week (days 1-7, 8-14, ...).

## Jobs added
- `tutor` (Bookshop): 3,000, 2 hrs, limit 1/day.
- `libassist` (Library): 3,500, 3 hrs, limit 1/day, needs 25 energy.

## Where things are
- Buildings: `src/campuses.js` (Campus Bookshop at x -40 z -9, Campus Bank at x -40 z 9 on all three campuses). Interiors: `books()` and `bank()` in `src/interiors.js`; staff in `interiorNpcDefs` (`src/npcs.js`); dialogue in `src/moneydialogues.js`.
- State: `meta.money = { shop, mum }` is created on first use, so old saves need no migration.
- Hooks in `src/main.js` are marked `// group money`.
- Draw calls: each building adds a door mesh and a sign, so the worst case is about 4 above the 87 measured before (about 91). Not re-measured on a device.
