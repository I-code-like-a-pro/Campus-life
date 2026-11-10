import { describe, it, expect } from 'vitest';
import { aggregate, decide, rollScores, cutoff, COURSES, CUTOFFS, offeredCourses, cutoffIsEstimate } from '../src/admissions.js';

const choices = [{ uni: 'unilag', course: 'cs' }, { uni: 'ui', course: 'law' }];

describe('admissions', () => {
  it('computes the aggregate out of 100', () => {
    expect(aggregate(400, 100)).toBe(100);
    expect(aggregate(240, 60)).toBe(60);
  });
  it('admits to the first choice at or above its cut-off', () => {
    expect(decide(choices, cutoff('unilag', 'cs')).kind).toBe('first');
  });
  it('falls back to the second choice', () => {
    const agg = cutoff('ui', 'law') + 0.1;
    expect(agg).toBeLessThan(cutoff('unilag', 'cs'));
    expect(decide(choices, agg).kind).toBe('second');
  });
  it('offers another course or school when you miss both choices', () => {
    const r = decide(choices, 70);
    expect(r.kind).toBe('offer');
    expect(cutoff(r.uni, r.course)).toBeLessThanOrEqual(70);
  });
  it('gives no admission below every cut-off', () => {
    const lowest = Math.min(...Object.values(CUTOFFS).flatMap(c => Object.values(c)));
    expect(decide(choices, lowest - 1).kind).toBe('none');
  });
  it('has a cut-off for every course a university offers', () => {
    for (const uni of Object.keys(CUTOFFS)) {
      expect(offeredCourses(uni).length).toBeGreaterThan(0);
      for (const c of offeredCourses(uni)) expect(CUTOFFS[uni][c.id]).toBeTypeOf('number');
    }
    expect(offeredCourses('ui')).toHaveLength(9);
    expect(offeredCourses('unilag').length).toBeGreaterThan(9);
    expect(cutoff('ui', 'nursing')).toBeUndefined();
  });
  it('says which cut-offs are game estimates', () => {
    expect(cutoffIsEstimate('ui', 'law')).toBe(true);
    expect(cutoffIsEstimate('unilag', 'law')).toBe(false);
    expect(cutoffIsEstimate('unilag', 'nursing')).toBe(true);
  });
  it('rolls scores in range and improves on retakes on average', () => {
    const avg = n => Array.from({ length: 400 }, () => rollScores('average', n).jamb).reduce((a, b) => a + b) / 400;
    for (let i = 0; i < 100; i++) { const s = rollScores('lazy', 1); expect(s.jamb).toBeGreaterThanOrEqual(140); expect(s.jamb).toBeLessThanOrEqual(380); }
    expect(avg(2)).toBeGreaterThan(avg(1));
  });
});
