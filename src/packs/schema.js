/*
 * The university pack format, and the rules a pack must pass before the game will use it.
 *
 * A pack is DATA only. It may set numbers inside the limits below and choose from the building types the engine knows. It can
 * never add or change game logic, so results stay comparable between universities. Every section carries provenance: where the
 * facts came from, how sure we are, and whether a human has verified them. Nothing here imports game code, so a generated
 * pack can be checked without starting the game.
 */

export const PACK_VERSION = 1;

export const LIMITS = {
  fee: { min: 5000, max: 300000 },
  lateFee: { min: 0, max: 50000 },
  cutoff: { min: 40, max: 100 },
  trees: { min: 0, max: 150 },
  km: { min: 1, max: 3000 },
  building: { w: [4, 24], d: [4, 20], h: [3, 16] },
  coord: 56,                // buildings stay inside the map (the world is 114 units across)
  gap: 2,                   // minimum space between two buildings
  mainPath: 4               // keep clear of the main path (half width plus a margin)
};

/** Building types the engine can draw and enter. A pack may only use these. */
export const BUILDING_TYPES = ['lecture', 'library', 'hostel', 'canteen', 'auditorium', 'biz', 'clinic', 'shop', 'registry', 'books', 'bank', 'chapel', 'mosque', 'cafe', 'park', 'home'];
/** Ground features the engine knows how to build. */
export const FEATURES = ['lagoon', 'amphitheatre'];
export const CONFIDENCE = ['high', 'medium', 'low', 'none'];
export const PROVENANCE_SECTIONS = ['identity', 'campus', 'cutoffs', 'fees', 'travel'];

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const inRange = (v, [lo, hi]) => isNum(v) && v >= lo && v <= hi;
const isColor = v => Number.isInteger(v) && v >= 0 && v <= 0xffffff;

/**
 * Returns a list of problems (an empty list means the pack is valid).
 * `courseIds` are the course ids the game knows; `townIds` are the home towns the game knows.
 */
export function validatePack(pack, { courseIds = [], townIds = [] } = {}) {
  const out = [];
  const bad = (path, msg) => out.push(`${path}: ${msg}`);
  if (!pack || typeof pack !== 'object') return ['pack: missing'];

  if (!/^[a-z][a-z0-9-]{1,19}$/.test(pack.id || '')) bad('id', 'must be 2 to 20 lowercase letters, digits or hyphens');
  if (pack.version !== PACK_VERSION) bad('version', `must be ${PACK_VERSION}`);

  const id = pack.identity || {};
  for (const k of ['short', 'name', 'tagline']) if (typeof id[k] !== 'string' || !id[k].trim()) bad(`identity.${k}`, 'text is required');
  if (typeof id.short === 'string' && id.short.length > 10) bad('identity.short', 'at most 10 characters');
  if (typeof id.tagline === 'string' && id.tagline.length > 90) bad('identity.tagline', 'at most 90 characters');
  if (!/^#[0-9a-fA-F]{6}$/.test(id.accent || '')) bad('identity.accent', 'must be a #rrggbb colour');

  const c = pack.campus || {};
  if (!isColor(c.ground)) bad('campus.ground', 'must be a colour number');
  if (!inRange(c.trees, [LIMITS.trees.min, LIMITS.trees.max]) || !Number.isInteger(c.trees)) bad('campus.trees', `whole number ${LIMITS.trees.min} to ${LIMITS.trees.max}`);
  if (!Array.isArray(c.features) || c.features.some(f => !FEATURES.includes(f))) bad('campus.features', `only ${FEATURES.join(', ')} are allowed`);
  if (Array.isArray(c.features) && c.features.includes('amphitheatre') && !(c.amphitheatre && isNum(c.amphitheatre.x) && isNum(c.amphitheatre.z))) bad('campus.amphitheatre', 'needed when the feature is used');

  const buildings = Array.isArray(c.buildings) ? c.buildings : [];
  if (!buildings.length) bad('campus.buildings', 'at least one building is required');
  const names = new Set();
  buildings.forEach((b, i) => {
    const at = `campus.buildings[${i}]`;
    if (typeof b.name !== 'string' || !b.name.trim()) bad(`${at}.name`, 'text is required');
    else if (names.has(b.name)) bad(`${at}.name`, `duplicate name "${b.name}"`);
    else names.add(b.name);
    if (typeof b.emoji !== 'string' || !b.emoji) bad(`${at}.emoji`, 'required');
    if (!BUILDING_TYPES.includes(b.type)) bad(`${at}.type`, `"${b.type}" is not a building type the game knows`);
    if (!inRange(b.w, LIMITS.building.w)) bad(`${at}.w`, `${LIMITS.building.w.join(' to ')}`);
    if (!inRange(b.d, LIMITS.building.d)) bad(`${at}.d`, `${LIMITS.building.d.join(' to ')}`);
    if (!inRange(b.h, LIMITS.building.h)) bad(`${at}.h`, `${LIMITS.building.h.join(' to ')}`);
    if (!isNum(b.x) || !isNum(b.z)) bad(`${at}`, 'x and z are required numbers');
    else if (isNum(b.w) && isNum(b.d)) {
      if (Math.abs(b.x) + b.w / 2 > LIMITS.coord || Math.abs(b.z) + b.d / 2 > LIMITS.coord) bad(at, 'sticks out of the map');
      if (!(Math.abs(b.x) - b.w / 2 > LIMITS.mainPath || Math.abs(b.z) > 6)) bad(at, 'blocks the main path');
    }
    if (!isColor(b.color) || !isColor(b.roof)) bad(at, 'colour and roof must be colour numbers');
  });
  const field = c.field;
  if (!field || !isNum(field.x) || !isNum(field.z) || !isNum(field.w) || !isNum(field.d) || typeof field.name !== 'string') bad('campus.field', 'name, x, z, w and d are required');
  const boxes = [...buildings, ...(field ? [{ name: field.name, ...field }] : [])];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if ([a.x, a.z, a.w, a.d, b.x, b.z, b.w, b.d].every(isNum)
      && Math.abs(a.x - b.x) < (a.w + b.w) / 2 + LIMITS.gap && Math.abs(a.z - b.z) < (a.d + b.d) / 2 + LIMITS.gap) bad('campus.buildings', `"${a.name}" overlaps "${b.name}"`);
  }

  const ad = pack.admissions || {};
  const cuts = ad.cutoffs || {};
  for (const course of courseIds) {
    if (!inRange(cuts[course], [LIMITS.cutoff.min, LIMITS.cutoff.max])) bad(`admissions.cutoffs.${course}`, `number ${LIMITS.cutoff.min} to ${LIMITS.cutoff.max} is required`);
  }
  for (const k of Object.keys(cuts)) if (courseIds.length && !courseIds.includes(k)) bad(`admissions.cutoffs.${k}`, 'unknown course');
  if (!['official', 'estimate'].includes(ad.cutoffSource)) bad('admissions.cutoffSource', 'must be "official" or "estimate"');

  const fees = pack.fees || {};
  if (!inRange(fees.amount, [LIMITS.fee.min, LIMITS.fee.max])) bad('fees.amount', `${LIMITS.fee.min} to ${LIMITS.fee.max}`);
  if (!inRange(fees.lateFee, [LIMITS.lateFee.min, LIMITS.lateFee.max])) bad('fees.lateFee', `${LIMITS.lateFee.min} to ${LIMITS.lateFee.max}`);

  const travel = pack.travel || {};
  for (const town of townIds) if (!inRange(travel[town], [LIMITS.km.min, LIMITS.km.max])) bad(`travel.${town}`, `kilometres ${LIMITS.km.min} to ${LIMITS.km.max} are required`);

  const prov = pack.provenance || {};
  for (const s of PROVENANCE_SECTIONS) {
    const p = prov[s];
    if (!p) { bad(`provenance.${s}`, 'missing: every section must say where its facts came from'); continue; }
    if (typeof p.source !== 'string' || !p.source) bad(`provenance.${s}.source`, 'required');
    if (!CONFIDENCE.includes(p.confidence)) bad(`provenance.${s}.confidence`, `one of ${CONFIDENCE.join(', ')}`);
    if (typeof p.verified !== 'boolean') bad(`provenance.${s}.verified`, 'true or false');
  }
  return out;
}

/** How much of a pack a human has verified (0 to 1), for the review-coverage target. */
export function verifiedShare(pack) {
  const prov = pack?.provenance || {};
  const rows = PROVENANCE_SECTIONS.map(s => prov[s]).filter(Boolean);
  return rows.length ? rows.filter(r => r.verified).length / rows.length : 0;
}
