import { describe, it, expect } from 'vitest';
import { engineParams, ENGINES, hornFor, ambienceFor, footstepGap, nextChirpIn } from '../src/soundlogic.js';

describe('engine pitch and volume', () => {
  it('rises with speed for every vehicle and stays quiet', () => {
    for (const kind of Object.keys(ENGINES)) {
      const idle = engineParams(kind, 0, 10), mid = engineParams(kind, 5, 10), top = engineParams(kind, 10, 10);
      expect(mid.freq).toBeGreaterThan(idle.freq);
      expect(top.freq).toBeGreaterThan(mid.freq);
      expect(top.gain).toBeGreaterThan(idle.gain);
      expect(top.gain).toBeLessThanOrEqual(0.05);
      expect(idle.gain).toBeGreaterThan(0);
    }
  });
  it('clamps speed outside 0..top and survives a zero top speed or unknown kind', () => {
    expect(engineParams('bus', 99, 10)).toEqual(engineParams('bus', 10, 10));
    expect(engineParams('bus', -4, 10)).toEqual(engineParams('bus', 0, 10));
    expect(engineParams('bus', 3, 0).freq).toBe(ENGINES.bus.idle);
    expect(engineParams('rocket', 1, 1).freq).toBeGreaterThan(0);
  });
});

describe('horns', () => {
  it('keke and bus honk on departure, okada only on a scare ride, plane never', () => {
    expect(hornFor('keke')).toBe('keke');
    expect(hornFor('bus')).toBe('bus');
    expect(hornFor('okada', 0)).toBeNull();
    expect(hornFor('okada', 2.4)).toBe('swerve');
    expect(hornFor('plane')).toBeNull();
  });
});

describe('ambience for the hour and place', () => {
  it('birds by day and crickets at night outdoors', () => {
    expect(ambienceFor({ hour: 6 })).toBe('birds');
    expect(ambienceFor({ hour: 12 })).toBe('birds');
    expect(ambienceFor({ hour: 17.9 })).toBe('birds');
    expect(ambienceFor({ hour: 18 })).toBe('crickets');
    expect(ambienceFor({ hour: 2 })).toBe('crickets');
    expect(ambienceFor({ hour: 5.9 })).toBe('crickets');
  });
  it('crowd only inside the auditorium while a scene is on', () => {
    expect(ambienceFor({ inside: true, placeType: 'auditorium', sceneOn: true })).toBe('crowd');
    expect(ambienceFor({ inside: true, placeType: 'auditorium', sceneOn: false })).toBeNull();
    expect(ambienceFor({ inside: true, placeType: 'library', sceneOn: true })).toBeNull();
  });
  it('silent while riding and hushed by rain', () => {
    expect(ambienceFor({ hour: 12, riding: true })).toBeNull();
    expect(ambienceFor({ hour: 12, raining: true })).toBeNull();
  });
});

describe('footsteps', () => {
  it('only on foot outdoors, never with reduced motion', () => {
    expect(footstepGap({ walking: true })).toBeGreaterThan(0);
    expect(footstepGap({ walking: false })).toBe(0);
    expect(footstepGap({ walking: true, inside: true })).toBe(0);
    expect(footstepGap({ walking: true, riding: true })).toBe(0);
    expect(footstepGap({ walking: true, reducedMotion: true })).toBe(0);
  });
  it('quickens with a longer stride but stays within a gentle range', () => {
    expect(footstepGap({ walking: true, stride: 1 })).toBeLessThanOrEqual(footstepGap({ walking: true, stride: 0.5 }));
    expect(footstepGap({ walking: true, stride: 50 })).toBeGreaterThanOrEqual(0.28);
  });
  it('chirp timing is positive for birds and crickets', () => {
    expect(nextChirpIn('birds', 0)).toBeGreaterThan(1);
    expect(nextChirpIn('crickets', 1)).toBeLessThan(2);
    expect(nextChirpIn('crowd')).toBe(0);
  });
});
