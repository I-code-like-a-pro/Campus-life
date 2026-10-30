import { describe, it, expect } from 'vitest';
import { riskFor, rollIllness, fallSick, dayPassed, rest, diagnose, recover, statusLabel, ILLNESSES } from '../src/health.js';
import { newMeta } from '../src/save.js';
import { newNeeds, tickNeeds, setSickness } from '../src/needs.js';

const fit = () => ({ hunger: 80, energy: 80, fun: 70, hygiene: 80, stress: 15 });
const fresh = () => newMeta().health;

describe('illness risk', () => {
  it('malaria is a rainy-season problem and a net cuts it', () => {
    expect(riskFor('malaria', { season: 'rainy', needs: fit() })).toBeGreaterThan(riskFor('malaria', { season: 'harmattan', needs: fit() }));
    expect(riskFor('malaria', { season: 'rainy', needs: fit(), net: true })).toBeLessThan(riskFor('malaria', { season: 'rainy', needs: fit() }));
  });
  it('catarrh is a harmattan problem', () => {
    expect(riskFor('catarrh', { season: 'harmattan', needs: fit() })).toBeGreaterThan(riskFor('catarrh', { season: 'rainy', needs: fit() }));
  });
  it('bad habits raise every risk, but never above 60%', () => {
    const bad = { hunger: 10, energy: 10, fun: 10, hygiene: 10, stress: 95 };
    for (const id of Object.keys(ILLNESSES)) {
      expect(riskFor(id, { season: 'rainy', needs: bad })).toBeGreaterThan(riskFor(id, { season: 'rainy', needs: fit() }));
      expect(riskFor(id, { season: 'rainy', needs: bad })).toBeLessThanOrEqual(0.6);
    }
  });
});

describe('falling ill', () => {
  it('is deterministic and never happens in the first days or while already sick', () => {
    const h = fresh();
    for (let d = 1; d <= 2; d++) expect(rollIllness({ day: d, season: 'rainy', needs: fit(), health: h })).toBeNull();
    expect(rollIllness({ day: 20, season: 'rainy', needs: fit(), health: h })).toBe(rollIllness({ day: 20, season: 'rainy', needs: fit(), health: h }));
    fallSick(h, 'malaria', 10);
    for (let d = 11; d < 60; d++) expect(rollIllness({ day: d, season: 'rainy', needs: fit(), health: h })).toBeNull();
  });
  it('strikes a careless player much more often than a careful one', () => {
    const count = needs => { let n = 0; for (let d = 3; d < 600; d++) if (rollIllness({ day: d, season: 'rainy', needs, health: fresh() })) n++; return n; };
    const careful = count(fit()), careless = count({ hunger: 10, energy: 10, fun: 10, hygiene: 10, stress: 95 });
    expect(careless).toBeGreaterThan(careful * 2);
    expect(careful).toBeGreaterThan(0);
  });
  it('does not strike again straight after recovering', () => {
    const h = fresh();
    recover(h, 30);
    for (let d = 31; d <= 33; d++) expect(rollIllness({ day: d, season: 'rainy', needs: { hunger: 5, energy: 5, fun: 5, hygiene: 5, stress: 99 }, health: h })).toBeNull();
  });
});

describe('being sick', () => {
  it('passes by itself after the illness runs its course', () => {
    const h = fresh();
    fallSick(h, 'catarrh', 5);
    const results = [];
    for (let i = 0; i < ILLNESSES.catarrh.days; i++) results.push(dayPassed(h, 6 + i));
    expect(results.at(-1)).toBe('recovered');
    expect(h.sick).toBeNull();
    expect(h.recovered).toBe(1);
  });
  it('sleep shortens it', () => {
    const h = fresh();
    fallSick(h, 'typhoid', 5);
    const before = h.sick.left;
    rest(h, 8);
    expect(h.sick.left).toBe(before - 0.5);
  });
  it('shows "not feeling well" until diagnosed', () => {
    const h = fresh();
    fallSick(h, 'malaria', 5);
    expect(statusLabel(h)).toContain('Not feeling well');
    expect(diagnose(h).name).toBe('Malaria');
    expect(statusLabel(h)).toContain('Malaria');
    recover(h, 6);
    expect(statusLabel(h)).toBe('');
  });
  it('drains energy faster while sick', () => {
    const well = newNeeds(), ill = newNeeds();
    setSickness(0); tickNeeds(well, 120);
    setSickness(1); tickNeeds(ill, 120);
    setSickness(0);
    expect(ill.energy).toBeLessThan(well.energy);
    expect(ill.stress).toBeGreaterThan(well.stress);
  });
});
