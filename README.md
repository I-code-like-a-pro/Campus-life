# Campus Life

A phone-first 3D campus life game (three.js + Vite).

## Documents
- [docs/GAME_SPEC.md](docs/GAME_SPEC.md): the full product and technical specification
- [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md): what is built, what is partial and what is blocked

## Run
```
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm test         # unit tests (vitest)
```

## Structure
- `src/main.js`      game loop and wiring
- `src/world.js`     campus: buildings, paths, trees, lamps, collisions
- `src/character.js` characters (placeholder human, or a .glb model)
- `src/daynight.js`  clock, sky/lighting, scheduled announcements
- `src/events.js`    random events: NEPA blackout, rain, harmattan, ASUU strike
- `src/hud.js`       clock, banner, gist log
- `src/input.js`     joystick + keyboard
- `src/academics.js` semesters, lectures, quizzes, grades, portal
- `src/eventengine.js` condition-driven world events (seasons, rain, NEPA, ASUU strike)
- `src/meta.js`      achievements, daily goals, inbox, money ledger, login streak
- `src/phone.js`     the in-game phone (portal, bank, messages, goals, settings)
- `src/npcs.js`, `src/dialogues.js`, `src/worlddialogues.js` NPCs and conversations
- `src/settings.js`, `src/audio.js`, `src/telemetry.js` player settings, procedural sound, opt-in analytics
- `src/save.js`      versioned saves with migrations

## Adding 3D assets
Put `.glb` files in `public/assets/models/` and reference them as `/assets/models/<name>.glb`, e.g.
`createCharacter({ modelUrl: '/assets/models/student.glb' })`. Clips whose names contain "idle" / "walk" are played automatically.
