# University packs

Everything specific to one university lives in one **pack** file in `src/packs/` (`unilag.js`, `ui.js`, `oau.js`). The rest of the game reads from the packs. It has no copy of its own.

| Pack section | What it holds | Read by |
|---|---|---|
| `identity` | short name, full name, tagline, accent colour | `campuses.js` |
| `campus` | ground colour, trees, features, the university-specific buildings, sports field | `campuses.js` |
| `admissions` | cut-off per course, and whether they are `official` or an `estimate` | `admissions.js` |
| `fees` | school fee and late fee | `money.js` |
| `travel` | road distance in km from each home town | `towns.js` |
| `provenance` | for each section above: source, confidence, verified, note | the review tools |

The buildings every campus shares (Registry, Business Centre, Health Centre, Market, Bookshop, Bank, Chapel, Mosque) stay in `campuses.js` as templates.

## Rules (`src/packs/schema.js`)
- A pack is **data only**. It may set numbers inside the limits in `LIMITS` and use only the building types in `BUILDING_TYPES`. It can never add or change game logic, so results stay comparable between universities.
- `validatePack(pack, { courseIds, townIds })` returns a list of problems. An empty list means the pack is valid. It checks: building types, sizes, overlaps, the main path, the map edge, a cut-off for every course, a distance from every home town, fee limits, and provenance on every section.
- Nothing in `schema.js` imports game code, so a generated pack can be checked without starting the game.

## Provenance
Every section says where its facts came from (`source`), how sure we are (`confidence`: high, medium, low or none) and whether a person has verified it (`verified`). Today every pack is `verified: false`, fees are `none` (game placeholders) and UI and OAU cut-offs are `low` (estimates). The game must never present an unverified fact as real.

## Adding a university
1. Copy `unilag.js` to a new file and fill it in, with a source for each section.
2. Import it in `src/packs/index.js` and add it to `PACKS` and `PACK_ORDER`.
3. Run the tests. `tests/packs.test.js` validates every pack in `PACK_ORDER`.

## Safety net
`tests/fixtures/packs-before.json` is a snapshot of the data from before the packs existed. `tests/packs.test.js` checks the packs still produce exactly that, so moving data into packs could not change the game.
