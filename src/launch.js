import { applyDom } from './i18n.js';
import { createPerfOverlay, perfFromSearch } from './perf.js';
import { settings, setSetting, onSettingChange } from './settings.js';
import { setSignContrast } from './world.js';

/*
 * Launch-readiness glue, kept out of main.js so that file only needs a few marked hook lines (`// group launch`):
 *   initLaunch()                       once at start-up: translates the static screens and applies ?perf= from the address
 *   createLaunch(engine, getPlace)     after the renderer exists: performance overlay, high-contrast signs
 *   launch.frame(now, inside, interiors)  once per frame after render
 */

export function initLaunch() {
  const fromUrl = perfFromSearch(typeof location !== 'undefined' ? location.search : '');
  if (fromUrl !== null && settings.perfOverlay !== fromUrl) setSetting('perfOverlay', fromUrl);
  if (fromUrl) { try { localStorage.setItem('campuslife.perfUnlocked', '1'); } catch { /* ignore */ } }
  applyDom();
}

/** Settings shows the performance toggle only after ?perf=1 has been used once on this device (it is a developer tool). */
export function perfToggleUnlocked() {
  try { return localStorage.getItem('campuslife.perfUnlocked') === '1' || settings.perfOverlay; } catch { return settings.perfOverlay; }
}

export function createLaunch(engine, getPlace) {
  const overlay = createPerfOverlay({ renderer: engine.renderer, getPlace });
  overlay.setVisible(settings.perfOverlay);
  setSignContrast(settings.highContrast);
  onSettingChange(key => {
    if (key === 'perfOverlay') overlay.setVisible(settings.perfOverlay);
    if (key === 'highContrast') setSignContrast(settings.highContrast);
    if (key === 'language') applyDom();
  });

  let lastInside = null;
  return {
    overlay,
    /** Call after renderer.render(). Only the room you are standing in stays visible, so other interiors cost nothing. */
    frame(now, inside, interiors) {
      overlay.frame(now);
      const current = inside ? inside.interior : null;
      if (current !== lastInside) {
        lastInside = current;
        for (const it of interiors.values()) if (it.group) it.group.visible = it === current;
      }
    },
    /** For the console on a phone: __campus.launch.report() prints a row for docs/PERFORMANCE.md. */
    report: () => overlay.report()
  };
}
