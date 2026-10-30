import { describe, it, expect } from 'vitest';
import { stepBall, touchBall, footballersPresent } from '../src/football.js';

const pitch = { x: 42, z: 0, hw: 10, hd: 7 };

describe('football', () => {
  it('rolls to a stop with friction', () => {
    const ball = { x: 42, z: 0, vx: 8, vz: 0 };
    for (let i = 0; i < 600; i++) stepBall(ball, 0.016, { ...pitch, x: 0 });
    expect(Math.hypot(ball.vx, ball.vz)).toBe(0);
  });

  it('bounces off the side lines and stays on the pitch', () => {
    const ball = { x: 42, z: 0, vx: 0, vz: 25 };
    for (let i = 0; i < 100; i++) stepBall(ball, 0.016, pitch);
    expect(Math.abs(ball.z)).toBeLessThanOrEqual(pitch.hd);
  });

  it('scores in the east and west goals, but not past the posts', () => {
    const east = { x: 42 + 9.2, z: 1, vx: 12, vz: 0 };
    expect(stepBall(east, 0.05, pitch)).toBe('east');
    const west = { x: 42 - 9.2, z: -1, vx: -12, vz: 0 };
    expect(stepBall(west, 0.05, pitch)).toBe('west');
    const wide = { x: 42 + 9.2, z: 5, vx: 12, vz: 0 };
    expect(stepBall(wide, 0.05, pitch)).toBeNull();
    expect(wide.x).toBeLessThan(42 + 10);
  });

  it('is pushed along by a running player, but only nudged by a standing one', () => {
    const ball = { x: 1, z: 0, vx: 0, vz: 0 };
    expect(touchBall(ball, { x: 0, z: 0 }, 9, 0)).toBe(true);
    expect(ball.vx).toBeGreaterThan(8);
    const still = { x: 1, z: 0, vx: 0, vz: 0 };
    touchBall(still, { x: 0, z: 0 }, 0, 0);
    expect(still.vx).toBeLessThan(2);
    const far = { x: 5, z: 0, vx: 0, vz: 0 };
    expect(touchBall(far, { x: 0, z: 0 }, 9, 0)).toBe(false);
  });

  it('has people playing in the evening and at weekends, rarely in the morning', () => {
    let evening = 0, morning = 0, weekend = 0;
    for (let day = 1; day <= 28; day++) {
      if ((day - 1) % 7 < 5 && footballersPresent(day, 17)) evening++;
      if ((day - 1) % 7 < 5 && footballersPresent(day, 9)) morning++;
      if ((day - 1) % 7 >= 5 && footballersPresent(day, 12)) weekend++;
    }
    expect(morning).toBe(0);
    expect(evening).toBeGreaterThan(12);
    expect(evening).toBeLessThan(20);                      // some empty evenings
    expect(weekend).toBeGreaterThanOrEqual(4);
  });
});
