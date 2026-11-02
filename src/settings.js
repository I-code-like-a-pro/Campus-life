// Player settings (spec F-007). Stored separately from the game save so they survive "New game".
import { suggestQuality } from './perf.js';
import { setLanguage } from './i18n.js';

const KEY = 'campuslife.settings.v1';

export const DEFAULTS = {
  sound: true,
  music: true,
  vibration: true,
  quality: 'medium',        // low | medium | high (render resolution)
  textSize: 1,              // UI scale: 0.9 | 1 | 1.15 | 1.3
  highContrast: false,      // brighter text, solid panels, stronger borders
  language: 'en',           // only languages that have been reviewed can be chosen (src/i18n.js)
  leftHanded: false,        // joystick on the right, action panel on the left
  reducedMotion: false,     // no UI animations
  hints: true,              // in-game tutorial hints
  minimap: true,            // small map in the corner
  aiChat: true,             // NPCs can answer typed questions with AI (only if the game has an AI server configured)
  analytics: false,         // anonymous usage and crash data (off until the player opts in)
  perfOverlay: false        // developer overlay: FPS, draw calls, triangles (also ?perf=1 in the address)
};

/** On a first run, weak phones start on Low graphics. Anything the player has saved wins. */
function deviceDefaults() {
  try {
    const n = globalThis.navigator || {};
    return { quality: suggestQuality({ deviceMemory: n.deviceMemory, hardwareConcurrency: n.hardwareConcurrency, saveData: n.connection?.saveData }) };
  } catch { return {}; }
}

function read() {
  try { return { ...DEFAULTS, ...deviceDefaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

export const settings = read();
if (!setLanguage(settings.language)) settings.language = 'en';
const listeners = new Set();

export function setSetting(key, value) {
  if (!(key in DEFAULTS)) return;
  settings[key] = value;
  if (key === 'language' && !setLanguage(value)) settings.language = 'en';
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage unavailable */ }
  listeners.forEach(fn => fn(key, value));
}
export const onSettingChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export const QUALITY_PIXEL_RATIO = { low: 1, medium: 1.5, high: 2 };
export const pixelRatioFor = (quality, dpr = 1) => Math.min(dpr, QUALITY_PIXEL_RATIO[quality] ?? 1.5);

/** Applies the settings that touch the page. `engine` may be omitted before the renderer exists. */
export function applySettings(engine) {
  const root = document.documentElement;
  root.classList.toggle('left-handed', settings.leftHanded);
  root.classList.toggle('reduced-motion', settings.reducedMotion);
  root.classList.toggle('high-contrast', settings.highContrast);
  root.classList.toggle('text-large', settings.textSize >= 1.15);
  root.lang = settings.language || 'en';
  root.style.setProperty('--ui-scale', String(settings.textSize));
  document.body.style.zoom = settings.textSize === 1 ? '' : String(settings.textSize);
  if (engine?.renderer) {
    engine.renderer.setPixelRatio(pixelRatioFor(settings.quality, window.devicePixelRatio || 1));
    engine.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
