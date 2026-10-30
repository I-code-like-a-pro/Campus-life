import { hash01 } from './eventengine.js';

/*
 * Health and sickness (spec F-023, F-021). Once per game day there is a small, deterministic chance of falling ill:
 *  - malaria is a rainy-season risk, catarrh a harmattan risk, typhoid is a small year-round risk
 *  - poor hygiene, hunger, exhaustion and stress raise the risk; a mosquito net cuts the malaria risk
 * Being sick drains energy faster, takes the edge off exams and stops you working. It passes by itself over a few days
 * (sleeping speeds it up), or you can see a doctor and buy the prescribed drugs to recover at once.
 * The state lives in state.meta.health (see newMeta in save.js).
 */

export const ILLNESSES = {
  malaria: { id: 'malaria', name: 'Malaria', icon: '🦟', days: 4, note: 'High fever and weakness.' },
  typhoid: { id: 'typhoid', name: 'Typhoid', icon: '🤢', days: 5, note: 'Stomach pain and fever.' },
  catarrh: { id: 'catarrh', name: 'Cold and catarrh', icon: '🤧', days: 3, note: 'Sneezing and a heavy head.' }
};

const GRACE_DAYS = 2;            // new players are never ill on the first days
const IMMUNITY_DAYS = 3;         // after recovering you are not ill again straight away

export function riskFor(id, { season, needs, net = false }) {
  let p = 0.02;
  if (id === 'malaria') { p = season === 'rainy' ? 0.10 : 0.02; if (net) p *= 0.3; }
  else if (id === 'catarrh') p = season === 'harmattan' ? 0.12 : 0.02;
  if (needs.hygiene < 30) p += id === 'typhoid' ? 0.10 : 0.04;
  if (needs.hunger < 25) p += 0.03;
  if (needs.energy < 25) p += 0.04;
  if (needs.stress > 75) p += 0.03;
  return Math.min(0.6, p);
}

/** The illness (id) that strikes on this day, or null. Same inputs always give the same answer. */
export function rollIllness({ day, season, needs, health }) {
  if (health.sick || day <= GRACE_DAYS || day <= health.immuneUntil) return null;
  for (const id of Object.keys(ILLNESSES)) {
    if (hash01(day, `ill-${id}`) < riskFor(id, { season, needs, net: health.net })) return id;
  }
  return null;
}

export const isSick = health => !!health.sick;

export function fallSick(health, id, day) {
  health.sick = { id, since: day, left: ILLNESSES[id].days, diagnosed: false };
}

export function recover(health, day) {
  health.sick = null;
  health.recovered += 1;
  health.immuneUntil = day + IMMUNITY_DAYS;
}

/** Midnight: an untreated illness runs its course. Returns 'recovered' when it ends. */
export function dayPassed(health, day) {
  if (!health.sick) return null;
  health.sick.left -= 1;
  if (health.sick.left <= 0) { recover(health, day); return 'recovered'; }
  return null;
}

/** Sleeping helps: eight hours takes half a day off. */
export function rest(health, hours) {
  if (health.sick) health.sick.left -= hours / 16;
}

export function diagnose(health) {
  if (health.sick) health.sick.diagnosed = true;
  return health.sick ? ILLNESSES[health.sick.id] : null;
}

export function statusLabel(health) {
  if (!health.sick) return '';
  const ill = ILLNESSES[health.sick.id];
  return health.sick.diagnosed ? `${ill.icon} ${ill.name}` : '🤒 Not feeling well';
}
