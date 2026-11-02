// Player settings (spec F-007). Stored separately from the game save so they survive "New game".

const KEY = 'campuslife.settings.v1';

export const DEFAULTS = {
  sound: true,
  music: true,
  vibration: true,
  quality: 'medium',        // low | medium | high (render resolution)
  textSize: 1,              // UI scale: 0.9 | 1 | 1.15 | 1.3
  leftHanded: false,        // joystick on the right, action panel on the left
  reducedMotion: false,     // no UI animations
  hints: true,              // in-game tutorial hints
  minimap: true,            // small map in the corner
  crushes: false,           // light, age-appropriate crush storyline (group people), off until the player opts in
  aiChat: true,             // NPCs can answer typed questions with AI (only if the game has an AI server configured)
  analytics: false          // anonymous usage and crash data (off until the player opts in)
};

function read() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

export const settings = read();
const listeners = new Set();

export function setSetting(key, value) {
  if (!(key in DEFAULTS)) return;
  settings[key] = value;
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
  root.style.setProperty('--ui-scale', String(settings.textSize));
  document.body.style.zoom = settings.textSize === 1 ? '' : String(settings.textSize);
  if (engine?.renderer) {
    engine.renderer.setPixelRatio(pixelRatioFor(settings.quality, window.devicePixelRatio || 1));
    engine.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
