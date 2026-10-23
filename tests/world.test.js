import { describe, it, expect } from 'vitest';
import { crowdDefs } from '../src/npcs.js';
import { situationLines, pickLine, GIST } from '../src/worlddialogues.js';
import { CAMPUSES, CAMPUS_ORDER } from '../src/campuses.js';
import { ACTIONS } from '../src/actions.js';
import { pixelRatioFor } from '../src/settings.js';
import { ENTERABLE } from '../src/interiors.js';

describe('crowd', () => {
  it('is deterministic for a seed and sized as requested', () => {
    const a = crowdDefs(CAMPUSES.ui, 8, 42), b = crowdDefs(CAMPUSES.ui, 8, 42), c = crowdDefs(CAMPUSES.ui, 8, 43);
    expect(a).toHaveLength(8);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
  it('creates cheap characters with unique ids that all use the student dialogue', () => {
    const defs = crowdDefs(CAMPUSES.unilag, 12, 7);
    expect(new Set(defs.map(d => d.id)).size).toBe(12);
    expect(defs.every(d => d.lite && d.dialogue === 'student')).toBe(true);
  });
});

describe('campus content', () => {
  it('has a Business Centre and the key building types on every campus', () => {
    for (const id of CAMPUS_ORDER) {
      const types = new Set(CAMPUSES[id].buildings.map(b => b.type));
      for (const t of ['hostel', 'canteen', 'library', 'lecture', 'biz']) expect(types.has(t), `${id} has ${t}`).toBe(true);
    }
  });
  it('keeps every building clear of the main path and the registration desks', () => {
    for (const id of CAMPUS_ORDER) for (const b of CAMPUSES[id].buildings) {
      expect(Math.abs(b.x) - b.w / 2 > 4 || Math.abs(b.z - 0) > 6, `${id}/${b.name} on the path`).toBe(true);
    }
  });
  it('gives every job a daily limit and a pay amount', () => {
    for (const list of Object.values(ACTIONS)) for (const a of list) if (a.pay) {
      expect(a.limit, a.id).toBeGreaterThan(0);
      expect(a.minutes, a.id).toBeGreaterThan(0);
    }
  });
  it('requires power for appliances', () => {
    const all = Object.values(ACTIONS).flat();
    for (const id of ['phone', 'freelance', 'browse', 'print']) expect(all.find(a => a.id === id)?.needsPower, id).toBe(true);
  });
  it('can enter every building type that has an interior', () => {
    for (const t of ['hostel', 'home', 'cafe', 'canteen', 'library', 'lecture', 'biz']) expect(ENTERABLE.has(t)).toBe(true);
  });
});

describe('reactive dialogue', () => {
  const ctx = (over = {}) => ({
    state: { needs: { hunger: 80, energy: 80, fun: 80, hygiene: 80, stress: 10 }, money: 50000, academic: null, ...over.state },
    world: () => ({ season: 'harmattan', raining: false, powerCut: false, ...over.world }),
    day: () => 5
  });
  it('mentions the power cut, rain and hunger when they apply', () => {
    expect(situationLines(ctx({ world: { powerCut: true } })).join(' ')).toMatch(/NEPA/);
    expect(situationLines(ctx({ world: { raining: true } })).join(' ')).toMatch(/rain/i);
    expect(situationLines(ctx({ state: { needs: { hunger: 10, energy: 80, fun: 80, hygiene: 80, stress: 10 } } })).join(' ')).toMatch(/hungry/i);
  });
  it('knows about strikes and exam days', () => {
    const academic = { phase: 'semester', startDay: 1, strike: { from: 4, to: 5 } };
    expect(situationLines(ctx({ state: { academic } })).length).toBeGreaterThanOrEqual(1);   // day 5 is exam eve, inside the strike
    const strikeLines = situationLines({ ...ctx({ state: { academic } }), day: () => 4 });
    expect(strikeLines.join(' ')).toMatch(/strike/i);
  });
  it('does not repeat the same line twice in a row', () => {
    let repeats = 0, prev = null;
    for (let i = 0; i < 200; i++) { const l = pickLine('t', GIST); if (l === prev) repeats++; prev = l; }
    expect(repeats).toBe(0);
  });
});

describe('settings', () => {
  it('caps the render resolution by quality', () => {
    expect(pixelRatioFor('low', 3)).toBe(1);
    expect(pixelRatioFor('medium', 3)).toBe(1.5);
    expect(pixelRatioFor('high', 3)).toBe(2);
    expect(pixelRatioFor('high', 1)).toBe(1);
  });
});
