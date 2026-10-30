import { describe, it, expect } from 'vitest';
import { resolveCollisions, BOUNDS } from '../src/world.js';

const wall = { x: 0, z: 0, hw: 0.1, hd: 5 };           // a thin wall, like a shower screen
const house = { x: 0, z: 0, hw: 8, hd: 6 };            // a big building

const inside = (p, c) => Math.abs(p.x - c.x) < c.hw && Math.abs(p.z - c.z) < c.hd;

function walk(from, dir, steps, step, colliders) {
  const p = { ...from };
  for (let i = 0; i < steps; i++) { p.x += dir.x * step; p.z += dir.z * step; resolveCollisions(p, colliders); }
  return p;
}

describe('collisions', () => {
  it('stops a player walking into a building from every side', () => {
    for (const dir of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }, { x: 0.7, z: 0.7 }, { x: -0.7, z: -0.7 }]) {
      const p = walk({ x: -dir.x * 30, z: -dir.z * 30 }, dir, 200, 0.3, [house]);
      expect(inside(p, house)).toBe(false);
    }
  });

  it('stops a thin wall even with big steps', () => {
    for (const step of [0.3, 0.45, 0.6, 0.74]) {
      const p = walk({ x: -10, z: 0 }, { x: 1, z: 0 }, 100, step, [wall]);
      expect(p.x).toBeLessThan(0);                        // never reaches the far side
      expect(inside(p, wall)).toBe(false);
    }
  });

  it('pushes a player who is already inside out through the nearest face, not always the same way', () => {
    const nearLeft = { x: -7.5, z: 0 };
    resolveCollisions(nearLeft, [house]);
    expect(nearLeft.x).toBeLessThan(-8);                  // left side, not teleported to the right
    const nearBack = { x: 0, z: -5.5 };
    resolveCollisions(nearBack, [house]);
    expect(nearBack.z).toBeLessThan(-6);
    const nearRight = { x: 7.8, z: 1 };
    resolveCollisions(nearRight, [house]);
    expect(nearRight.x).toBeGreaterThan(8);
  });

  it('keeps a player in a corridor between two boxes without pushing them into either', () => {
    const a = { x: -2, z: 0, hw: 1, hd: 4 };
    const b = { x: 2, z: 0, hw: 1, hd: 4 };               // a 2-unit corridor, wider than the player
    for (const startX of [0.5, -0.5, 0.2]) {
      const p = { x: startX, z: 0 };
      resolveCollisions(p, [a, b]);
      expect(inside(p, a)).toBe(false);
      expect(inside(p, b)).toBe(false);
      expect(Math.abs(p.x)).toBeLessThan(1);
    }
    const walker = walk({ x: 0, z: -20 }, { x: 0, z: 1 }, 100, 0.3, [a, b]);   // walks straight down the corridor
    expect(walker.z).toBeGreaterThan(5);
  });

  it('slides along a wall instead of sticking to it', () => {
    const p = { x: -2, z: -20 };
    for (let i = 0; i < 100; i++) { p.x += 0.2; p.z += 0.3; resolveCollisions(p, [house]); }
    expect(p.z).toBeGreaterThan(-20 + 5);                 // kept moving along the wall
  });

  it('keeps everyone inside the playable bounds', () => {
    const p = { x: 500, z: -500 };
    resolveCollisions(p, []);
    expect(p.x).toBe(BOUNDS.maxX);
    expect(p.z).toBe(BOUNDS.minZ);
  });
});
