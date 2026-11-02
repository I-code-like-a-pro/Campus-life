# Rides

Every way of getting around is something you see and ride, not a fade and a jump.

| Mode | How you use it | What you see |
|---|---|---|
| Walk | Tap a place on the map, choose Walk | Your character walks the route |
| Keke (₦, quick) | Map, choose Keke | A yellow keke appears beside you, you climb in (the roof is see-through), a driver takes you along the road and you step out at the door |
| Okada (₦, quickest) | Map, choose Okada | A motorbike with a rider in front and you behind. A scare ride swerves from side to side |
| Bus to university | Conductor Bala at the Motor Park, choose the bus | You board a yellow danfo with a black stripe, it drives off along the main road, then a black screen with the journey card. On arrival the bus drives in through the campus gate and you step out |
| Flight to university | Same, choose the flight | A plane taxis, lifts off and climbs. On arrival it lands, rolls to the gate and you step out |

- **Skip ride** (top of the screen) jumps straight to the end. You always end up at the destination.
- Game time and fares are charged when the ride starts, as before. Only the picture changed.
- Nothing else can start while you ride (no talking, no doors). A save made mid-ride records the destination, never a spot on the road.
- If there is no route to the destination, the old quick hop is used instead.

## Code
- `src/vehicles.js`: the models (all face +z like characters) and pure route maths (`stepAlong`, `turnToward`, `stopShort`, `planeAltitude`).
- `src/rides.js`: boarding, driving, stepping out, camera, Skip button. `start()` for a ride from here, `arrive()` for riding in.
- `src/main.js`: `rideTo()` (keke, okada), `rideAway()` and `travel()` (bus, plane), and the arrival at startup (`arrivalRide` in the save, used once).
- To add a vehicle: add a builder and a `VEHICLES` entry, then a row in `tests/vehicles.test.js`.
