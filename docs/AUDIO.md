# Audio

Everything is synthesised with the Web Audio API (no audio files). Audio starts after the first tap, is suspended when the tab is hidden, and is always quiet.

Code: `src/audio.js` (context, effects, music), `src/soundscape.js` (engines, horns, ambience, footsteps), `src/soundlogic.js` (pure rules, tested in `tests/soundlogic.test.js`).

| Sound | When | Setting |
|---|---|---|
| Music loop | After the first tap | Music |
| `click`, `coin`, `success`, `fail`, `unlock`, `power`, `bell` | UI and game events | Sound effects |
| `toast` (soft two-note chime) | A new notification arrives | Sound effects |
| `doorOpen` / `doorShut` | Entering / leaving a building | Sound effects |
| `door` (thud) | Climbing into or out of a vehicle | Sound effects |
| Engine loop | From boarding until you step out or skip. Pitch and volume follow the speed (`engineParams`) | Sound effects |
| Horn | Keke and bus departures; okada only on a scare ride (swerve) | Sound effects |
| Birds | Outdoors from 06:00 to 18:00, not in rain | Sound effects |
| Crickets | Outdoors from 18:00 to 06:00, not in rain | Sound effects |
| Crowd murmur | Inside the auditorium while a scene is on | Sound effects |
| Footsteps | Walking outdoors only; off with Reduced motion | Sound effects, Reduced motion |

Ambience is silent while riding. Turning Sound effects off stops every sound above except music, which has its own switch. Vibration is separate and only affects haptics.

To add a sound: put the numbers or decision in `soundlogic.js` with a test, then make the Web Audio nodes in `soundscape.js`. Keep gains small (engines never above 0.05).
