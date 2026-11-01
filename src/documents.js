import { hash01 } from './eventengine.js';
import { CLEARANCE_FEE } from './clearance.js';

/*
 * Clearance paperwork. The player carries a folder of documents; some may be missing (decided by a seeded roll, so a save
 * always has the same story). Officers at the Registry ask for what their counter needs, and the code (not the AI) decides
 * what is missing. Missing papers are fixed at the Business Centre for a small fee, which keeps clearance from ever blocking.
 */

export const OFFICE_HOURS = [8, 17];

/** `desk` is the counter that needs the document. `missChance` 0 means you always have it. */
export const DOCS = [
  { id: 'letter', name: 'Admission letter', desk: 'admissions', missChance: 0 },
  { id: 'olevel', name: "O'level result", desk: 'admissions', missChance: 0 },
  { id: 'jamb', name: 'Two photocopies of your JAMB result slip', desk: 'admissions', missChance: 0.45, fix: { cost: 200, label: 'Photocopy the slip', done: 'Madam Ify made two clear copies for you.' } },
  { id: 'birth', name: 'Birth certificate or declaration of age', desk: 'admissions', missChance: 0.3, fix: { cost: 500, label: 'Get a declaration of age printed', done: 'The declaration of age is printed, signed and stamped.' } },
  { id: 'photos', name: 'Four passport photographs', desk: 'medical', missChance: 0.45, fix: { cost: 600, label: 'Take passport photographs', done: 'The camera flashed twice. Four clean photographs, still warm.' } }
];

export const docsFor = deskId => DOCS.filter(d => d.desk === deskId);
export const docById = id => DOCS.find(d => d.id === id);

/** Rolls which documents are missing for this save: at most two, always the same for the same seed. */
export function rollMissing(seed) {
  const ids = DOCS.filter(d => d.missChance > 0 && hash01(seed, `doc-${d.id}`) < d.missChance).map(d => d.id);
  return ids.slice(0, 2);
}

/** Makes sure the clearance record knows what is missing. Safe to call any time, and for saves made before documents existed. */
export function ensureDocs(clearance, seed) {
  if (!clearance) return [];
  if (!Array.isArray(clearance.missing)) clearance.missing = rollMissing(seed);
  return clearance.missing;
}

/** What a counter asks for and what the player has. */
export function checkDesk(clearance, deskId) {
  const missing = clearance?.missing || [];
  const items = docsFor(deskId).map(d => ({ doc: d, have: !missing.includes(d.id) }));
  return { items, missing: items.filter(i => !i.have).map(i => i.doc), ok: items.every(i => i.have) };
}

/** Everything the player still lacks across all counters (used by the Business Centre and by the AI facts). */
export function allMissing(clearance) {
  return (clearance?.missing || []).map(docById).filter(Boolean);
}

/** Marks a document as sorted out. Returns the document, or null if it was not missing. */
export function fixDoc(clearance, id) {
  const i = (clearance?.missing || []).indexOf(id);
  if (i < 0) return null;
  clearance.missing.splice(i, 1);
  return docById(id);
}

/** The details card an officer reads back before checking papers. */
export function detailsCard({ name, course, uni, jamb, hometown }) {
  return [`Name: ${name || 'Student'}`, `Course: ${course}`, `University: ${uni}`, ...(jamb ? [`JAMB score: ${jamb}`] : []), ...(hometown ? [`Home town: ${hometown}`] : [])];
}

/** Plain-text facts for the AI officer. The AI describes these in its own words; it never decides who is cleared. */
export function clearanceFacts(clearance, { hour = 12 } = {}) {
  if (!clearance || clearance.done) return ['Clearance is finished.'];
  const lines = [
    `The Registry is open from ${OFFICE_HOURS[0]}:00 to ${OFFICE_HOURS[1]}:00 (${hour >= OFFICE_HOURS[0] && hour < OFFICE_HOURS[1] ? 'open now' : 'closed now'}).`,
    'Clearance has four counters, always in this order: Admissions, Bursary, Medical Screening, Hostel Allocation.',
    `Counters finished: ${['admissions', 'bursary', 'medical', 'hostel'].filter(id => clearance[id]).join(', ') || 'none yet'}.`,
    `Acceptance and registration fee at the Bursary: ₦${CLEARANCE_FEE.toLocaleString('en-NG')}.`
  ];
  for (const id of ['admissions', 'medical']) {
    const c = checkDesk(clearance, id);
    lines.push(`${id === 'admissions' ? 'Admissions' : 'Medical'} counter needs: ${c.items.map(i => `${i.doc.name} (${i.have ? 'player has it' : 'MISSING'})`).join('; ')}.`);
  }
  const miss = allMissing(clearance).filter(d => d.fix);
  if (miss.length) lines.push(`Missing papers can be sorted at the Business Centre: ${miss.map(d => `${d.name.toLowerCase()} costs ₦${d.fix.cost}`).join('; ')}.`);
  lines.push('Only the game decides whether a counter is finished. Never tell the player they are cleared unless the counter is listed as finished.');
  return lines;
}
