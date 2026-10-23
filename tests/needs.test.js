import { describe, it, expect } from 'vitest';
import { newNeeds, tickNeeds, applyEffects, mood, clamp, naira } from '../src/needs.js';

describe('needs', () => {
  it('drains hunger, energy, fun and hygiene and raises stress over time', () => {
    const n = newNeeds();
    const before = { ...n };
    tickNeeds(n, 100);
    expect(n.hunger).toBeLessThan(before.hunger);
    expect(n.energy).toBeLessThan(before.energy);
    expect(n.fun).toBeLessThan(before.fun);
    expect(n.hygiene).toBeLessThan(before.hygiene);
    expect(n.stress).toBeGreaterThan(before.stress);
  });
  it('clamps to 0..100', () => {
    const n = newNeeds();
    applyEffects(n, { hunger: 500, stress: -500 });
    expect(n.hunger).toBe(100);
    expect(n.stress).toBe(0);
    expect(clamp(-5)).toBe(0);
  });
  it('maps needs to a mood', () => {
    expect(mood({ hunger: 100, energy: 100, fun: 100, hygiene: 100, stress: 0 }).label).toBe('Very happy');
    expect(mood({ hunger: 5, energy: 50, fun: 50, hygiene: 50, stress: 50 }).label).toBe('Suffering');
  });
  it('formats naira', () => {
    expect(naira(1500)).toBe('₦1,500');
  });
});
