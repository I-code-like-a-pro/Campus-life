import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CAMPUSES, CAMPUS_ORDER } from '../src/campuses.js';
import { CUTOFFS, CUTOFF_SOURCE, COURSES } from '../src/admissions.js';
import { FEES } from '../src/money.js';
import { TOWNS } from '../src/towns.js';
import { PACKS, PACK_ORDER, packOf } from '../src/packs/index.js';
import { validatePack, verifiedShare, LIMITS, BUILDING_TYPES } from '../src/packs/schema.js';

const before = JSON.parse(readFileSync(new URL('./fixtures/packs-before.json', import.meta.url), 'utf8'));
const ctx = { courseIds: COURSES.map(c => c.id), townIds: TOWNS.map(t => t.id) };
const clone = o => JSON.parse(JSON.stringify(o));

describe('the pack refactor changed nothing', () => {
  it('builds exactly the campuses the game had before', () => {
    expect(CAMPUS_ORDER).toEqual(before.order);
    expect(clone(CAMPUSES)).toEqual(before.campuses);
  });
  it('keeps cut-offs, fees and travel distances identical', () => {
    expect(clone(CUTOFFS)).toEqual(before.cutoffs);
    expect(clone(CUTOFF_SOURCE)).toEqual(before.cutoffSource);
    expect(clone(FEES)).toEqual(before.fees);
    expect(TOWNS.map(t => ({ id: t.id, name: t.name, km: t.km }))).toEqual(before.towns);
  });
});

describe('the packs we ship', () => {
  it('pass the validator', () => {
    for (const id of PACK_ORDER) expect(validatePack(PACKS[id], ctx), id).toEqual([]);
  });
  it('are found by id', () => {
    expect(packOf('unilag').identity.short).toBe('UNILAG');
    expect(packOf('nope')).toBeNull();
  });
  it('are honest about what is real: fees are placeholders and nothing is verified yet', () => {
    for (const id of PACK_ORDER) {
      expect(PACKS[id].provenance.fees.confidence).toBe('none');
      expect(verifiedShare(PACKS[id])).toBe(0);
    }
    expect(PACKS.ui.provenance.cutoffs.confidence).toBe('low');
  });
});

describe('the validator', () => {
  const fresh = () => clone(PACKS.unilag);
  const problems = p => validatePack(p, ctx);

  it('rejects an unknown building type', () => {
    const p = fresh(); p.campus.buildings[0].type = 'spaceport';
    expect(problems(p).join('\n')).toContain('not a building type the game knows');
    expect(BUILDING_TYPES).toContain('lecture');
  });
  it('keeps fees inside the limits', () => {
    const p = fresh(); p.fees.amount = LIMITS.fee.max + 1;
    expect(problems(p).join('\n')).toContain('fees.amount');
    p.fees.amount = LIMITS.fee.min - 1;
    expect(problems(p).join('\n')).toContain('fees.amount');
  });
  it('needs a cut-off for every course, inside the allowed range', () => {
    const p = fresh(); delete p.admissions.cutoffs.law; p.admissions.cutoffs.cs = 120;
    const text = problems(p).join('\n');
    expect(text).toContain('admissions.cutoffs.law');
    expect(text).toContain('admissions.cutoffs.cs');
  });
  it('needs a travel distance from every home town', () => {
    const p = fresh(); delete p.travel.kano;
    expect(problems(p).join('\n')).toContain('travel.kano');
  });
  it('rejects buildings that overlap, block the main path or leave the map', () => {
    let p = fresh(); p.campus.buildings[1].x = p.campus.buildings[0].x + 3; p.campus.buildings[1].z = p.campus.buildings[0].z;
    expect(problems(p).join('\n')).toContain('overlaps');
    p = fresh(); p.campus.buildings[0].x = 0; p.campus.buildings[0].z = 0;
    expect(problems(p).join('\n')).toContain('blocks the main path');
    p = fresh(); p.campus.buildings[0].x = 70;
    expect(problems(p).join('\n')).toContain('sticks out of the map');
  });
  it('rejects duplicate names and a missing sports field', () => {
    const p = fresh(); p.campus.buildings[1].name = p.campus.buildings[0].name; delete p.campus.field;
    const text = problems(p).join('\n');
    expect(text).toContain('duplicate name');
    expect(text).toContain('campus.field');
  });
  it('requires provenance for every section, so no fact comes without a source', () => {
    const p = fresh(); delete p.provenance.fees; p.provenance.travel.confidence = 'certain';
    const text = problems(p).join('\n');
    expect(text).toContain('provenance.fees');
    expect(text).toContain('provenance.travel.confidence');
  });
  it('rejects a pack that is not an object, or has a bad id or version', () => {
    expect(problems(null)).toEqual(['pack: missing']);
    const p = fresh(); p.id = 'Bad Id!'; p.version = 9;
    const text = problems(p).join('\n');
    expect(text).toContain('id:');
    expect(text).toContain('version:');
  });
  it('measures how much of a pack a human has verified', () => {
    const p = fresh();
    p.provenance.identity.verified = true; p.provenance.travel.verified = true;
    expect(verifiedShare(p)).toBeCloseTo(0.4);
    expect(verifiedShare({})).toBe(0);
  });
});
