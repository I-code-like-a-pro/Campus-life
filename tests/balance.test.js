import { describe, it, expect } from 'vitest';
import { summarise, simulate } from '../tools/balance.js';
import { hintCount, EXAM_CURVE } from '../src/academics.js';

// Bots play two full semesters with the game's own rules. These ranges are the intended difficulty: a diligent student does
// well, an average student does fine, a careless one struggles and fails some courses. If a change to costs, scoring or
// energy moves a profile outside its range, this fails so the change is a conscious decision.

describe('difficulty and economy balance', () => {
  const RUNS = 8;
  const result = {};
  for (const profile of ['diligent', 'average', 'careless']) result[profile] = summarise(profile, { runs: RUNS, semesters: 2 });

  it('rewards effort: diligent beats average beats careless', () => {
    expect(result.diligent.cgpa).toBeGreaterThan(result.average.cgpa);
    expect(result.average.cgpa).toBeGreaterThan(result.careless.cgpa);
  });

  it('keeps each style in its intended band', () => {
    expect(result.diligent.cgpa).toBeGreaterThan(3.8);
    expect(result.diligent.cgpa).toBeLessThan(4.9);
    expect(result.average.cgpa).toBeGreaterThan(2.7);
    expect(result.average.cgpa).toBeLessThan(4.2);
    expect(result.careless.cgpa).toBeGreaterThan(1.0);
    expect(result.careless.cgpa).toBeLessThan(2.9);
  });

  it('makes careless play cost something', () => {
    expect(result.careless.fails).toBeGreaterThan(result.diligent.fails);
    expect(result.careless.fails).toBeGreaterThan(1);
  });

  it('does not make a sensible week of play exhausting', () => {
    for (const p of Object.values(result)) expect(p.faints).toBeLessThan(0.5);
  });

  it('never lets money go negative and does not leave a careful player broke', () => {
    for (const p of Object.values(result)) expect(p.minMoney).toBeGreaterThanOrEqual(0);
    expect(result.diligent.brokeDays).toBeLessThan(1);
    expect(result.average.brokeDays).toBeLessThan(2);
  });

  it('keeps hostel dues payable by a student who plays normally', () => {
    expect(result.average.lateBills).toBeLessThan(0.5);
    expect(result.diligent.lateBills).toBe(0);
  });

  it('is deterministic for a seed', () => {
    const a = simulate({ profile: 'average', seed: 5, semesters: 1 });
    const b = simulate({ profile: 'average', seed: 5, semesters: 1 });
    expect(a.cgpa).toBe(b.cgpa);
    expect(a.finalMoney).toBe(b.finalMoney);
  });
});

describe('hints get harder to earn in later years', () => {
  it('needs more preparation for each hint as the year rises', () => {
    expect(hintCount(30, 1)).toBe(1);
    expect(hintCount(30, 3)).toBe(0);
    expect(hintCount(70, 1)).toBe(2);
    expect(hintCount(69, 3)).toBe(1);
    expect(hintCount(70, 3)).toBe(2);
  });
  it('removes a hint when tired, but never goes below zero', () => {
    expect(hintCount(70, 1, true)).toBe(1);
    expect(hintCount(10, 1, true)).toBe(0);
  });
  it('curves exam scores so weak papers lose more than strong ones', () => {
    expect(EXAM_CURVE).toBeGreaterThan(1);
    expect(Math.pow(1, EXAM_CURVE)).toBe(1);
    expect(Math.pow(0.5, EXAM_CURVE)).toBeLessThan(0.5);
  });
});
