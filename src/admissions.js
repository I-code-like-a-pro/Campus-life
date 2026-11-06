// Admission rules: courses, cut-offs, backgrounds, score rolling and the admission decision.
//
// Scores: JAMB (UTME) is out of 400, post-UTME out of 100. Aggregate (out of 100) = JAMB / 8 + post-UTME / 2.
// Cut-offs are on that aggregate scale.
//   UNILAG: official 2025/2026 merit cut-offs (unilag.edu.ng). Engineering uses Civil Engineering.
//   UI and OAU: no official per-course figures were available, so these are GAME ESTIMATES anchored to
//   what was reported (UI/OAU general minimum 200; Medicine, Law, Pharmacy and Engineering most competitive).

import { PACKS, PACK_ORDER } from './packs/index.js';

export const COURSES = [
  { id: 'medicine',    name: 'Medicine & Surgery', emoji: '🩺' },
  { id: 'law',         name: 'Law',                emoji: '⚖️' },
  { id: 'engineering', name: 'Engineering',        emoji: '⚙️' },
  { id: 'cs',          name: 'Computer Science',   emoji: '💻' },
  { id: 'accounting',  name: 'Accounting',         emoji: '📊' },
  { id: 'masscomm',    name: 'Mass Communication', emoji: '🎙️' },
  { id: 'pharmacy',    name: 'Pharmacy',           emoji: '💊' },
  { id: 'economics',   name: 'Economics',          emoji: '📈' },
  { id: 'maths',       name: 'Mathematics',        emoji: '➗' }
];

export const CUTOFFS = Object.fromEntries(PACK_ORDER.map(id => [id, { ...PACKS[id].admissions.cutoffs }]));
export const CUTOFF_SOURCE = Object.fromEntries(PACK_ORDER.map(id => [id, PACKS[id].admissions.cutoffSource]));

// jamb / post: [mean, spread]. money: starting naira.
export const BACKGROUNDS = [
  { id: 'brilliant', emoji: '📚', name: 'Brilliant',   blurb: 'Always top of the class. High scores, modest pocket money.', jamb: [310, 25], post: [82, 6],  money: 20000 },
  { id: 'average',   emoji: '🙂', name: 'Average',     blurb: 'Did your best. Decent scores, a bit of luck needed.',        jamb: [255, 30], post: [66, 9],  money: 30000 },
  { id: 'lazy',      emoji: '😴', name: 'Lazy',        blurb: 'Read small, prayed plenty. Low scores, but you get by.',     jamb: [205, 35], post: [50, 12], money: 30000 },
  { id: 'rich',      emoji: '💰', name: 'Rich family', blurb: 'Lessons, extra tutors and plenty of money. Solid scores.',   jamb: [270, 30], post: [70, 8],  money: 120000 }
];

const gauss = () => {                       // Box-Muller
  const u = 1 - Math.random(), v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const clampInt = (v, lo, hi) => Math.round(Math.max(lo, Math.min(hi, v)));

/** Rolls the hidden JAMB and post-UTME scores. Each retake adds a small bonus (you study harder). */
export function rollScores(backgroundId, attempt = 1) {
  const bg = BACKGROUNDS.find(b => b.id === backgroundId) || BACKGROUNDS[1];
  const bonus = (attempt - 1);
  return {
    jamb: clampInt(bg.jamb[0] + gauss() * bg.jamb[1] + bonus * 20, 140, 380),
    post: clampInt(bg.post[0] + gauss() * bg.post[1] + bonus * 6, 20, 98)
  };
}

export const aggregate = (jamb, post) => jamb / 8 + post / 2;
export const courseOf = id => COURSES.find(c => c.id === id);
export const cutoff = (uni, course) => CUTOFFS[uni][course];

/**
 * Decides the outcome for an aggregate score.
 * choices: [{ uni, course }, { uni, course }]
 * Returns { kind: 'first' | 'second' | 'offer' | 'none', uni?, course? }.
 */
export function decide(choices, agg) {
  const [first, second] = choices;
  if (agg >= cutoff(first.uni, first.course)) return { kind: 'first', ...first };
  if (agg >= cutoff(second.uni, second.course)) return { kind: 'second', ...second };

  // change of institution / course: everything you qualify for, closest to what you wanted first
  const options = [];
  for (const uni of Object.keys(CUTOFFS)) {
    for (const c of COURSES) {
      if (agg >= cutoff(uni, c.id)) options.push({ uni, course: c.id });
    }
  }
  if (!options.length) return { kind: 'none' };
  const score = o => {
    if (o.course === first.course) return 0;              // same course, other university
    if (o.course === second.course) return 1;
    if (o.uni === first.uni) return 2 + (100 - cutoff(o.uni, o.course)) / 100;  // same school, nearest-by-difficulty course
    return 4 + (100 - cutoff(o.uni, o.course)) / 100;
  };
  options.sort((a, b) => score(a) - score(b));
  return { kind: 'offer', ...options[0] };
}
