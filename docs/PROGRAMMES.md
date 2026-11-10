# Programmes, faculties and sample courses

A **programme** is a degree a player can choose. The master list is `src/programmes.js` (30 programmes). Each university pack says which ones it **offers** and, where we have researched it, how they group into **faculties**.

## Two kinds of programme
| Kind | What it is | Course titles | Questions |
|---|---|---|---|
| `authored` | The original nine (Medicine, Law, Engineering, Computer Science, Accounting, Mass Communication, Pharmacy, Economics, Mathematics) | Written by hand in `courses.js` and `upperlevels.js` | Their own banks at every level |
| `generic` | 21 sample programmes (for example Nursing Science, Architecture, English, Psychology) | Built from a family template (`genericFirstYear`, `genericTitles`) with the programme's name in the titles | Borrowed from related subject banks, each question once |

Generic programmes are **samples**: the student portal says so on the Courses screen. A real course list replaces a template one programme at a time, and the programme's `status` then changes from `generic` to `authored`.

## Families
A family says which subject banks a generic programme draws on and whether its upper years are labs or seminars: physical sciences and architecture, life and health sciences, engineering, social sciences and planning, management, arts and humanities, creative arts, education. See `FAMILIES` in `src/programmes.js`.

## UNILAG
`src/packs/unilag.js` lists the 19 faculties from the research (`data/unilag/facts.json`, review sheet `docs/review/unilag-structure.md`), the real department names, and which game programmes sit in each faculty. The 30 programmes are placed one to three per faculty, so every faculty is playable. UI and OAU still offer the authored nine and have no faculty structure yet.

- **Cut-offs for the 21 sample programmes are game estimates**, listed in `admissions.estimated`, and shown to the player as "game estimate". The original nine keep their earlier figures.
- **Nothing here is verified yet.** Faculty names and departments are labelled `verified: false` until the owner marks them on the review sheet.
- Several department lists are partial because the official site could not be reached during research. Basic Clinical Sciences has a programme (Medical Microbiology and Parasitology) that still needs checking against what UNILAG really teaches at undergraduate level.

## The start screen
The JAMB form shows only what the chosen university offers. When the pack has faculties, the course list is grouped by faculty. Changing the university rebuilds the list and keeps the choice if it is still offered.

## Adding a programme
1. Add it to `PROGRAMME_LIST` in `src/programmes.js` (a generic one needs a family and a unique prefix).
2. Add it to a university pack's `offers`, `admissions.cutoffs` (and `estimated` if it is a game figure) and to one faculty's `programmes`.
3. Run the tests. `tests/programmes.test.js` checks every programme builds a full degree, has questions at every level, and survives a simulated four years.

## Saves
No ids changed, so old saves load as they are. New programme ids simply become available.
