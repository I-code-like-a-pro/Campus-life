/*
 * Getting around (spec F-046). Walking is free; keke and okada cost naira and save real time.
 * `dist` is in world units (the campus is about 120 across).
 */

export const MODES = {
  walk:  { id: 'walk',  icon: '🚶', name: 'Walk',  base: 0,   perUnit: 0,   minMin: 0, minPerUnit: 0.22 },
  keke:  { id: 'keke',  icon: '🛺', name: 'Keke',  base: 100, perUnit: 3,   minMin: 5, minPerUnit: 0.14 },
  okada: { id: 'okada', icon: '🛵', name: 'Okada', base: 200, perUnit: 5,   minMin: 3, minPerUnit: 0.09 }
};

const round50 = n => Math.round(n / 50) * 50;

export const fareFor = (mode, dist) => (MODES[mode].base ? round50(MODES[mode].base + MODES[mode].perUnit * dist) : 0);

/** Game minutes the trip takes. */
export const minutesFor = (mode, dist) => Math.max(MODES[mode].minMin, Math.round(dist * MODES[mode].minPerUnit));

/** Small chance of a scary ride on an okada (decided by a roll in [0,1) so it is testable). */
export const okadaScare = roll => roll < 0.08;
