# Performance: tools, budgets and how to measure on a phone

**Status: tooling is built and tested; NO measurement has been taken on a real phone yet.** Every "result" cell below is empty on purpose. Do not read the budgets as measured facts.

## 1. The debug overlay

A small readout at the bottom-left of the screen: place, FPS, draw calls, triangles (thousands), geometries, textures and, on Chrome, JS heap. It adds the words `OVER BUDGET` when the current place exceeds the table below. It is off by default and costs almost nothing when off.

| Turn it on | How |
|---|---|
| Address | Add `?perf=1` to the game address, for example `https://yourgame.vercel.app/?perf=1`. `?perf=0` turns it off. |
| Settings | After `?perf=1` has been used once on a device, Settings shows **Performance overlay: On/Off**. A normal player never sees this row. |
| Console | `__campus.launch.report()` returns a ready-to-paste table row for the place you are in. `__campus.launch.overlay.peak` holds the worst frame seen. |

Numbers come from `renderer.info` read right after each render. FPS is a rolling average over half a second.

## 2. Measuring on a real phone (procedure)

Use the **production build** (`npm run build` then `npm run preview`, or the deployed link). The dev server is slower and not representative.

1. Charge the phone, close other apps, turn off battery saver, and let it cool for a few minutes. Note the model, Android or iOS version and browser version.
2. Open the game with `?perf=1` and play normally for a minute to warm up.
3. **Android with USB debugging** (best): enable Developer options and USB debugging on the phone, connect it, open `chrome://inspect/#devices` on a computer, press **inspect** next to the page. The console works against the phone. Run `__campus.launch.report()` and read `performance.memory`. The Performance panel can record a trace.
4. **Without a cable** (ngrok or the deployed link): open the link on the phone and read the overlay by eye. Take a screenshot of each place with the overlay visible (side button combo) and copy the numbers into the table. This gives FPS, draw calls and triangles; it does not give memory or traces.
5. **iPhone**: Safari's Web Inspector needs a Mac and a cable. Otherwise use the overlay and screenshots as in step 4.
6. For each place in the table: stand in it for 20 seconds with NPCs in view, record the **lowest** FPS you see and the overlay's calls and triangles. Do the campus once in daytime and once at night or in rain (more overlays).
7. Repeat on **Low** graphics (Settings, Graphics) for the weakest phone.
8. Fill the table in section 3 (or a copy), mark pass or fail, and note the phone model.

First-load time: with the remote console open, `performance.getEntriesByType('navigation')[0].duration` after a hard reload on mobile data. The release checklist target is under 10 seconds.

## 3. Budgets and results

Spec ceiling (docs/GAME_SPEC.md): at most 150 draw calls, 250 000 triangles, 30 fps floor on a low-end Android. The budgets here are tighter so there is headroom for NPCs, weather and events. Values are kept in `src/perf.js` and a test fails if this table and the code disagree.

| Place | Max draw calls | Max triangles | Min FPS | Result on phone (fps / calls / tris) | Phone and date |
|---|---|---|---|---|---|
| campus | 120 | 250000 | 30 |  |  |
| hostel | 80 | 80000 | 30 |  |  |
| home | 80 | 80000 | 30 |  |  |
| cafe | 80 | 80000 | 30 |  |  |
| canteen | 80 | 80000 | 30 |  |  |
| library | 80 | 80000 | 30 |  |  |
| lecture | 80 | 80000 | 30 |  |  |
| biz | 80 | 80000 | 30 |  |  |
| clinic | 80 | 80000 | 30 |  |  |
| registry | 80 | 80000 | 30 |  |  |
| auditorium | 100 | 120000 | 30 |  |  |

Earlier desktop notes (not phone results): worst campus measured at 87 to 88 draw calls (UNILAG), interiors about 40, bundle about 208 KB gzipped.

## 4. Optimisations already in the code

| Change | Effect | Verified? |
|---|---|---|
| Interiors you are not standing in are hidden (`visible = false`) every frame check, so the renderer skips them entirely | Fewer objects to traverse when many rooms have been visited | Logic reviewed; no phone data |
| Low graphics starts on weak devices: the first run picks **Low** when the browser reports 2 GB or less memory, 4 cores or fewer together with 4 GB or less memory, or Data Saver. A saved player choice always wins | Fewer pixels to draw | Rule unit tested; real effect unmeasured |
| Low graphics also switches off anti-aliasing (applies after the next page load) and requests the high-performance GPU | Cheaper edges | Unmeasured |
| Pixel ratio is capped by quality: Low 1.0, Medium 1.5, High 2.0 (already present) | Caps fill cost on high-density screens | Already in place |
| Trees, lamps, windows instanced; static scenery baked into one mesh (already present) | Draw calls 115 to 88 | Desktop count only |

Ideas not done (need phone data first): lower the draw distance on Low, drop NPC count on Low, texture or label atlas for signs, render at half rate when the tab is idle.

## 5. What is unverified

Everything about real devices: actual FPS, thermal throttling, memory on 2 GB phones, load time on mobile data, and whether the `OVER BUDGET` limits are realistic. The overlay was checked in a desktop browser only (campus and Family House readings there: about 70 draw calls and 23k triangles at 60 fps, which says nothing about a phone). High contrast and the largest text size were checked at 375x812, 320x568 and 667x375 in a desktop browser with emulated sizes.
