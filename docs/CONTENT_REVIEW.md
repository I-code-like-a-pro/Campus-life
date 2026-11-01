# Content review request

New quiz and flavour content was written quickly and needs a second pair of eyes before release.
Please ask a lecturer, or a senior student in the relevant department, to check the questions.

## What was added

- First-year banks (`src/questions.js`): every department and `gst` now has 22 questions (7 to 12 new each).
- Upper-level banks (`src/upperlevels.js`): all 27 banks (`dept@2`, `dept@3`, `dept@4`) now have 16 questions (8 new each).
- Home towns (`src/towns.js`): each of the 7 towns has `places` and `gist` lines.
  Family, Aunty Sade and campus students now mention the player's home town (`src/dialogues.js`, `src/worlddialogues.js`).
- Tests enforce the minimums and that every town has flavour lines.

## What to check

For each question: is the marked answer correct, is it the only correct option, and is the level right?
Each entry is `[question, rightAnswer, wrong, wrong, wrong]`; the first option after the question is the right one.

| Department | 100 level (`dept`) | 200 level (`dept@2`) | 300 level (`dept@3`) | 400 level (`dept@4`) |
|---|---|---|---|---|
| Medicine | last 7 | last 8 | last 8 | last 8 |
| Law | last 7 | last 8 | last 8 | last 8 |
| Engineering | last 7 | last 8 | last 8 | last 8 |
| Computer Science | last 7 | last 8 | last 8 | last 8 |
| Accounting | last 7 | last 8 | last 8 | last 8 |
| Mass Communication | last 7 | last 8 | last 8 | last 8 |
| Pharmacy | last 7 | last 8 | last 8 | last 8 |
| Economics | last 7 | last 8 | last 8 | last 8 |
| Mathematics | last 7 | last 8 | last 8 | last 8 |
| GST (general studies) | last 12 | n/a | n/a | n/a |

"Last N" means the final N entries of that bank, which are the new ones.

### Items most worth a second look

- Law: Latin maxims, the section number of the 1999 Constitution (s.33, right to life), appeal route to the Supreme Court.
- Medicine 400 level: reference values (fasting glucose range, CPR compression rate).
- Accounting: ICAN and ANAN as professional bodies; the FIFO and break-even items.
- Mass Communication: attribution of theories (Habermas, McLuhan, Lasswell) and the year of the Freedom of Information Act (2011).
- Mathematics and Engineering: notation (Unicode symbols) displays correctly on small phone screens.
- GST: state count (36, not counting the FCT) and the first line of the national anthem.

### Home-town lines

Please check the 21 gist lines and 21 place names in `src/towns.js` for accuracy and tone.
They are meant to be light-hearted and kind, with no stereotypes. Flag anything a person from that town would find unfair.
