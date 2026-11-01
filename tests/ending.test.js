import { describe, it, expect } from 'vitest';
import { applyStanding, degreeClass } from '../src/academics.js';
import { buildStory, honoursText } from '../src/ending.js';

describe('academic standing', () => {
  it('puts a student on probation after one very low semester, and withdraws them after two in a row', () => {
    const a = {};
    expect(applyStanding(a, 0.8)).toEqual({ probation: true, withdrawn: false });
    expect(applyStanding(a, 0.5)).toEqual({ probation: false, withdrawn: true });
  });

  it('forgives a bad semester followed by a recovery', () => {
    const a = {};
    applyStanding(a, 0.4);
    expect(applyStanding(a, 2.5)).toEqual({ probation: false, withdrawn: false });
    expect(a.lowStreak).toBe(0);
    expect(applyStanding(a, 0.9).withdrawn).toBe(false);          // streak restarted at one
  });
});

describe('the ending story', () => {
  const state = {
    name: 'Tunde',
    meta: { counters: { gradeA: 6, carryPassed: 1, friendsMade: 3, footballMatches: 2 } },
    academic: { cgpa: 4.62, withdrawn: false, history: [{ year: 1, term: 1, gpa: 4.1 }, { year: 1, term: 2, gpa: 4.9 }] }
  };

  it('summarises a graduate', () => {
    const s = buildStory({ state, campus: 'University of Lagos', course: 'Computer Science', day: 60, achievements: 12 });
    expect(s.degree).toBe('First Class');
    expect(s.title).toBe('Graduated');
    expect(s.lines.join(' ')).toMatch(/Best semester: 100 Level, Semester 2/);
    expect(s.lines.join(' ')).toMatch(/6 A grades/);
    expect(s.lines.join(' ')).toMatch(/12 achievements/);
  });

  it('tells a withdrawal honestly', () => {
    const s = buildStory({ state: { ...state, academic: { ...state.academic, withdrawn: true, cgpa: 0.7 } }, campus: 'UI', course: 'Law', day: 30 });
    expect(s.withdrawn).toBe(true);
    expect(s.degree).toBe('Withdrawn');
  });

  it('has a line of honours for every class', () => {
    for (const cgpa of [4.8, 4.0, 3.0, 2.0, 1.2, 0.5]) expect(honoursText(cgpa).length).toBeGreaterThan(20);
    expect(degreeClass(4.8)).toBe('First Class');
  });
});
