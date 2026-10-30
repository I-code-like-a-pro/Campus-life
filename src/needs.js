// Needs run 0..100. Hunger/energy/fun/hygiene drain over time; stress rises (lower is better).
export const NEEDS = [
  { key: 'hunger',  icon: '🍛', label: 'Hunger' },
  { key: 'energy',  icon: '⚡', label: 'Energy' },
  { key: 'fun',     icon: '🎉', label: 'Fun' },
  { key: 'hygiene', icon: '🧼', label: 'Hygiene' },
  { key: 'stress',  icon: '😰', label: 'Stress', bad: true }
];

// change per game minute
const RATE = { hunger: -0.035, energy: -0.02, fun: -0.03, hygiene: -0.018, stress: 0.012 };

export const clamp = v => Math.max(0, Math.min(100, v));

export function newNeeds() {
  return { hunger: 85, energy: 90, fun: 70, hygiene: 85, stress: 15 };
}

// While the player is ill (see health.js) energy and fun drain faster and stress climbs.
let sickLevel = 0;
export const setSickness = level => { sickLevel = level; };

export function tickNeeds(needs, minutes) {
  for (const k of Object.keys(RATE)) {
    let r = RATE[k];
    if (k === 'stress' && needs.hunger < 15) r += 0.02;     // hungry people get stressed
    if (sickLevel) { if (k === 'energy') r -= 0.03 * sickLevel; if (k === 'fun') r -= 0.015 * sickLevel; if (k === 'stress') r += 0.015 * sickLevel; }
    needs[k] = clamp(needs[k] + r * minutes);
  }
}

export function applyEffects(needs, fx = {}) {
  for (const k of Object.keys(fx)) needs[k] = clamp(needs[k] + fx[k]);
}

export function mood(needs) {
  const score = (needs.hunger + needs.energy + needs.fun + needs.hygiene + (100 - needs.stress)) / 5;
  if (needs.energy < 8 || needs.hunger < 8) return { icon: '😫', label: 'Suffering', score };
  if (score < 35) return { icon: '😩', label: 'Dull sef', score };
  if (score < 55) return { icon: '😐', label: 'Okay-ish', score };
  if (score < 78) return { icon: '😎', label: 'Vibing', score };
  return { icon: '😄', label: 'Very happy', score };
}

export const naira = n => '₦' + Math.round(n).toLocaleString('en-NG');
