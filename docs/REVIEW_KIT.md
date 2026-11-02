# Content review kit

For the lecturer, senior student or native speaker who is helping check Campus Life. You do not need to install anything if the owner sends you the exported file.

## What the owner or developer does

```bash
node tools/export-content.js                    # writes content-review.md (read in any editor, or paste into a doc)
node tools/export-content.js --format csv       # writes content-review.csv (open in Excel or Google Sheets)
```

The file contains:

1. All exam and test questions, 100 to 400 level and general studies (about 1 000 questions). The marked correct answer is in bold, followed by the wrong options.
2. Every spoken line of the story characters and of students, lecturers, vendors and the nurse.
3. Scene text (orientation, hall meeting, first lecture and more), campus events, tutorial hints, home town flavour and the graduation text.
4. The list of characters with their roles.
5. The AI character personas and the rules the AI is always given (short replies, standard English, never reveal exam answers).

Some lines contain `${...}`. Those are placeholders the game fills in (a name, a course, a day). Leave them as they are.

## What the reviewer does

For each row, fill two columns:

- **Verdict**: `OK` or `FIX` (leave blank if you are happy).
- **Correction**: the corrected text. For a question, say which part is wrong: the question, the marked answer, or a wrong option that is actually also correct.

Please check:

- **Questions**: Is the marked answer correct? Is it the only correct option? Is the level right for the course year? Is the wording clear to a first-year student?
- **Dialogue and scenes**: Does it sound like real Nigerian university life? Are the rules, offices, fees and procedures plausible? Is the English standard (no Pidgin) and suitable for teenagers?
- **AI personas and rules**: Do the characters sound right? Is any rule missing?

Add your name, department, and the date at the top. If you ran out of time, say which sections you did not cover.

## How to return corrections

Send back the same file (Markdown or CSV) with your columns filled in, by email or the chat the owner gave you. A photo of a printed page is fine if you have no computer. Do not edit the code; the line reference in the first column (for example `scenes:42`) tells the developer where each line lives.

The developer applies the fixes, runs the tests (`npx vitest run`), and records the sign-off in [CONTENT_REVIEW.md](CONTENT_REVIEW.md) and the release checklist (section 3).

## Language reviewers (Yoruba, Igbo, Hausa)

Stub files exist in `src/lang/` (`yo.js`, `ig.js`, `ha.js`) and the languages are hidden from the picker. A native speaker must write each string (no machine translation, no Pidgin) from `src/lang/en.js`, and another native speaker should check it. Only then does the developer set `reviewed: true` for that language in `src/i18n.js`. Strings you leave out simply show in English.
