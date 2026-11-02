import { describe, it, expect } from 'vitest';
import { VEHICLES, pathLength, rideSeconds, turnToward, stepAlong, sideOf, toWorld, stopShort, planeAltitude } from '../src/vehicles.js';
import { MODES } from '../src/transport.js';

describe('moving along a route', () => {
  const path = [{ x: 0, z: 10 }, { x: 10, z: 10 }];
  it('measures a route and how long the ride lasts', () => {
    expect(pathLength({ x: 0, z: 0 }, path)).toBe(20);
    for (const k of ['keke', 'okada']) expect(rideSeconds(k, 150)).toBeLessThan(25);
  });
  it('steps up to a distance along the waypoints and reports when it has finished', () => {
    const a = stepAlong({ x: 0, z: 0 }, path, 0, 4);
    expect(a).toMatchObject({ x: 0, z: 4, i: 0, done: false });
    const b = stepAlong({ x: 0, z: 9 }, path, 0, 4);
    expect(b.i).toBe(1);
    expect(b.x).toBeCloseTo(3);
    expect(b.z).toBe(10);
    const c = stepAlong({ x: 9, z: 10 }, path, 1, 50);
    expect(c.done).toBe(true);
    expect(c.x).toBe(10);
    expect(c.moved).toBeCloseTo(1);
  });
  it('turns the short way round and never by more than allowed', () => {
    expect(turnToward(0, 1, 0.25)).toBeCloseTo(0.25);
    expect(turnToward(0, -1, 0.25)).toBeCloseTo(-0.25);
    expect(turnToward(3, -3, 5)).toBeCloseTo(-3 + 2 * Math.PI);        // across the +-pi seam
    expect(turnToward(0.2, 0.3, 5)).toBeCloseTo(0.3);
  });
  it('stops a vehicle short of the door so the player walks the last bit', () => {
    const route = [{ x: 0, z: 20 }, { x: 0, z: 40 }];
    expect(stopShort({ x: 0, z: 0 }, route, 4)[1]).toEqual({ x: 0, z: 36 });
    expect(stopShort({ x: 0, z: 0 }, [{ x: 0, z: 2 }], 4)).toEqual([{ x: 0, z: 2 }]);
    expect(stopShort({ x: 0, z: 0 }, [{ x: 0, z: 20 }, { x: 0, z: 22 }], 4).length).toBe(1);
  });
  it('places things beside and relative to a vehicle that faces +z or turns', () => {
    expect(toWorld({ x: 0, z: 1 }, 0)).toEqual({ x: 0, z: 1 });
    const f = toWorld({ x: 0, z: 1 }, Math.PI / 2);
    expect(f.x).toBeCloseTo(1); expect(f.z).toBeCloseTo(0);
    const s = sideOf(0, 0, 0, 2);
    expect(s.x).toBeCloseTo(2); expect(s.z).toBeCloseTo(0);
  });
  it('lifts a plane after the first third and brings it down on landing', () => {
    expect(planeAltitude(0.2, 'takeoff')).toBe(0);
    expect(planeAltitude(1, 'takeoff')).toBeGreaterThan(30);
    expect(planeAltitude(0, 'landing')).toBeGreaterThan(30);
    expect(planeAltitude(0.7, 'landing')).toBe(0);
  });
});

describe('vehicle speeds', () => {
  it('make every ride faster than walking, and okada quicker than keke', () => {
    expect(VEHICLES.keke.speed).toBeGreaterThan(9 * 1.25);   // clearly faster than walking (SPEED = 9 in main.js)
    expect(VEHICLES.okada.speed).toBeGreaterThan(VEHICLES.keke.speed);
    expect(VEHICLES.bus.speed).toBeGreaterThan(VEHICLES.okada.speed);
  });
  it('has a vehicle for every paid local mode', () => {
    for (const id of Object.keys(MODES).filter(k => k !== 'walk')) expect(VEHICLES[id]).toBeTruthy();
  });
});
