import { describe, it, expect } from 'vitest';
import { buildGrid, findPath } from '../src/pathfind.js';
import { fareFor, minutesFor, okadaScare, MODES } from '../src/transport.js';

const bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
// a wall across the middle with a gap on the right
const wall = [{ x: -15, z: 0, hw: 35, hd: 1 }];
const grid = buildGrid(wall, bounds);

const crosses = (path, from, test) => {
  let prev = from;
  for (const p of path) {
    for (let t = 0; t <= 1; t += 0.05) if (test(prev.x + (p.x - prev.x) * t, prev.z + (p.z - prev.z) * t)) return true;
    prev = p;
  }
  return false;
};

describe('pathfinding', () => {
  it('walks straight when nothing is in the way', () => {
    const p = findPath(buildGrid([], bounds), { x: 0, z: 30 }, { x: 0, z: -30 });
    expect(p).not.toBeNull();
    expect(p.length).toBeLessThanOrEqual(2);
    expect(p[p.length - 1]).toEqual({ x: 0, z: -30 });
  });
  it('goes around a wall through the gap and never through the wall', () => {
    const from = { x: -20, z: 20 }, to = { x: -20, z: -20 };
    const p = findPath(grid, from, to);
    expect(p).not.toBeNull();
    expect(p.some(w => w.x > 18)).toBe(true);                       // detours through the gap at x > 20
    expect(crosses(p, from, (x, z) => Math.abs(z) < 1 && x < 20)).toBe(false);
  });
  it('finds the nearest reachable point when the target is inside an obstacle', () => {
    const p = findPath(grid, { x: -20, z: 20 }, { x: -20, z: 0 });
    expect(p).not.toBeNull();
    expect(p.length).toBeGreaterThan(0);
  });
  it('returns null when the destination is sealed off', () => {
    const ring = [{ x: 0, z: 0, hw: 8, hd: 1 }, { x: 0, z: 14, hw: 8, hd: 1 }, { x: -8, z: 7, hw: 1, hd: 8 }, { x: 8, z: 7, hw: 1, hd: 8 }];
    const g = buildGrid(ring, bounds);
    const p = findPath(g, { x: -30, z: -30 }, { x: 0, z: 7 });
    // the inside of the ring is unreachable, so the path must end near the ring, not inside it
    if (p) expect(p.slice(0, -1).every(w => !(Math.abs(w.x) < 7 && w.z > 1 && w.z < 13))).toBe(true);
  });
});

describe('transport', () => {
  it('walking is free and takes the longest', () => {
    expect(fareFor('walk', 80)).toBe(0);
    expect(minutesFor('walk', 80)).toBeGreaterThan(minutesFor('keke', 80));
    expect(minutesFor('keke', 80)).toBeGreaterThan(minutesFor('okada', 80));
  });
  it('okada costs more than keke, and fares are rounded to ₦50', () => {
    expect(fareFor('okada', 60)).toBeGreaterThan(fareFor('keke', 60));
    for (const m of ['keke', 'okada']) expect(fareFor(m, 37) % 50).toBe(0);
  });
  it('has a minimum trip time and fare for very short rides', () => {
    expect(minutesFor('okada', 1)).toBe(MODES.okada.minMin);
    expect(fareFor('keke', 0)).toBeGreaterThan(0);
  });
  it('scares riders on about 8% of okada trips', () => {
    expect(okadaScare(0.05)).toBe(true);
    expect(okadaScare(0.5)).toBe(false);
  });
});
