import { describe, it, expect } from 'vitest';
import { createAcademics, degreeClass } from '../src/academics.js';
import { buildCourses, DEPTS } from '../src/courses.js';
import { QUESTIONS } from '../src/questions.js';

function setup(course = 'cs') {
  const clock = { day: 1, minutes: 12 * 60 };
  const state = { course, name: 'Tester', academic: null };
  const ac = createAcademics({
    state, day: () => clock.day, minutes: () => clock.minutes,
    venues: () => ['Hall A', 'Hall B'], consume: () => {}, toast: () => {}
  });
  ac.init();
  return { clock, state, ac };
}
// jump to a semester day (1..7) of the current semester
const goTo = (ctx, sd, minutes = 10 * 60) => { ctx.clock.day = ctx.state.academic.startDay + sd - 1; ctx.clock.minutes = minutes; return ctx.ac.tick(); };

describe('semester structure', () => {
  it('starts the day after init and builds 4 courses with 2 lectures each', () => {
    const ctx = setup();
    const a = ctx.state.academic;
    expect(a.phase).toBe('pre');
    expect(a.startDay).toBe(2);
    expect(a.courses).toHaveLength(4);
    for (const c of a.courses) expect(a.timetable.filter(t => t.code === c.code)).toHaveLength(2);
    goTo(ctx, 1);
    expect(a.phase).toBe('semester');
  });
  it('never double-books a slot', () => {
    const { state } = setup();
    const keys = state.academic.timetable.map(t => `${t.day}|${t.hour}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('offers an attend action only inside the class window, at the right venue', () => {
    const ctx = setup();
    const a = ctx.state.academic;
    goTo(ctx, 1);
    const first = a.timetable.find(t => t.day === 1);
    ctx.clock.minutes = first.hour * 60 + 5;
    expect(ctx.ac.lectureActions(first.venue).actions.map(x => x.id)).toContain('attend');
    expect(ctx.ac.lectureActions(first.venue === 'Hall A' ? 'Hall B' : 'Hall A').actions.map(x => x.id)).not.toContain('attend');
    ctx.clock.minutes = (first.hour + 3) * 60;
    expect(ctx.ac.lectureActions(first.venue).actions.map(x => x.id)).not.toContain('attend');
  });
});

describe('results', () => {
  it('grades on the 5.0 scale and computes GPA by units', () => {
    const ctx = setup();
    const a = ctx.state.academic;
    goTo(ctx, 1);
    // perfect attendance, assignment, CA and exam on the first course; nothing on the others
    const c = a.courses[0];
    c.att.ok = 2; c.assign.done = true; c.ca = 1; c.exam = 1;
    const events = goTo(ctx, 7);
    expect(events).toContain('results');
    const rec = a.history[0];
    expect(rec.rows[0]).toMatchObject({ total: 100, grade: 'A', points: 5 });
    expect(rec.rows.slice(1).every(r => r.grade === 'F')).toBe(true);
    const expected = (5 * 3) / (3 + 3 + 3 + 2);
    expect(rec.gpa).toBeCloseTo(expected, 5);
  });
  it('turns failed courses into carryovers (at most two retaken) and clears them when passed', () => {
    const ctx = setup();
    const a = ctx.state.academic;
    goTo(ctx, 1);
    goTo(ctx, 7);                                   // everything failed
    expect(a.carryovers.length).toBe(4);
    goTo(ctx, 8);                                   // the day after the break: next semester begins
    expect(a.term).toBe(2);
    expect(a.phase).toBe('semester');
    expect(a.courses.filter(c => c.carry)).toHaveLength(2);
    expect(a.courses).toHaveLength(6);
    // pass the carried-over courses
    for (const c of a.courses.filter(x => x.carry)) { c.att.ok = 2; c.assign.done = true; c.ca = 1; c.exam = 1; }
    const carried = a.courses.filter(c => c.carry).map(c => c.code);
    goTo(ctx, 7);
    for (const code of carried) expect(a.carryovers.some(c => c.code === code)).toBe(false);
  });
  it('graduates after the final semester of the degree', () => {
    const ctx = setup('cs');
    const a = ctx.state.academic;
    a.year = DEPTS.cs.years; a.term = 2; a.phase = 'semester';
    const ev = goTo(ctx, 7);
    expect(ev).toContain('graduated');
    expect(a.graduated).toBe(true);
  });
  it('maps CGPA to degree classes', () => {
    expect(degreeClass(4.6)).toBe('First Class');
    expect(degreeClass(3.6)).toBe('Second Class Upper');
    expect(degreeClass(2.5)).toBe('Second Class Lower');
    expect(degreeClass(1.6)).toBe('Third Class');
    expect(degreeClass(1.0)).toBe('Pass');
    expect(degreeClass(0.4)).toBe('Below pass level');
  });
});

describe('course and question data', () => {
  it('builds a GST course in year 1 and an elective after', () => {
    expect(buildCourses('law', 1, 1).some(c => c.bank === 'gst')).toBe(true);
    expect(buildCourses('law', 2, 1).some(c => c.bank === 'gst')).toBe(false);
  });
  it('has a question bank for every department and GST, and each question is well-formed', () => {
    for (const dept of Object.keys(DEPTS)) expect(QUESTIONS[dept]?.length, dept).toBeGreaterThanOrEqual(22);
    expect(QUESTIONS.gst.length).toBeGreaterThanOrEqual(22);
    for (const [bank, list] of Object.entries(QUESTIONS)) {
      for (const [q, right, ...wrong] of list) {
        expect(q.length, bank).toBeGreaterThan(5);
        expect(wrong, `${bank}: ${q}`).toHaveLength(3);
        expect(new Set([right, ...wrong]).size, `${bank}: ${q}`).toBe(4);   // no duplicate options
      }
    }
  });
});

import { semesterHasStrike, strikeDays, conditions, seasonFor, hash01 } from '../src/eventengine.js';

describe('ASUU strike', () => {
  it('never strikes in the very first semester and is deterministic', () => {
    expect(semesterHasStrike(1, 1)).toBe(false);
    for (let y = 1; y <= 5; y++) for (const t of [1, 2]) expect(semesterHasStrike(y, t)).toBe(semesterHasStrike(y, t));
  });
  it('cancels lectures on strike days and awards full attendance when none are held', () => {
    // find a semester with a strike and put the player there
    let year = 1, term = 2;
    outer: for (year = 1; year <= 5; year++) for (term = 1; term <= 2; term++) if (semesterHasStrike(year, term)) break outer;
    const ctx = setup();
    const a = ctx.state.academic;
    a.year = year; a.term = term;
    a.phase = 'pre'; ctx.ac.init;                    // rebuild this semester
    // rebuild by running the next-semester path
    a.startDay = ctx.clock.day; a.phase = 'semester';
    ctx.state.academic = a;
    const fresh = createAcademicsFor(ctx, year, term);
    const cancelled = fresh.timetable.filter(t => t.cancelled);
    expect(cancelled.length).toBeGreaterThan(0);
    expect(cancelled.every(t => t.day >= strikeDays.from && t.day <= strikeDays.to)).toBe(true);
    expect(fresh.timetable.filter(t => !t.cancelled).every(t => t.day < strikeDays.from)).toBe(true);
  });
});

function createAcademicsFor(ctx, year, term) {
  // builds a fresh semester through the public path: finish earlier semesters quickly
  const a = ctx.state.academic;
  a.year = year; a.term = term === 1 ? 2 : 1;       // one step before, then advance
  if (term === 1) { a.year = year - 1; a.term = 2; }
  a.phase = 'semester'; a.startDay = ctx.clock.day - 6;
  if (a.year < 1) { a.year = 1; a.term = 1; a.phase = 'semester'; }
  // advance: finalize then next semester
  ctx.clock.day = a.startDay + 6;
  ctx.ac.tick();                                    // results
  ctx.clock.day = a.startDay + 7;
  ctx.ac.tick();                                    // next semester built
  return ctx.state.academic;
}

describe('world conditions', () => {
  it('is deterministic for a given day and time', () => {
    for (let d = 1; d < 30; d++) expect(conditions({ day: d, minutes: 19 * 60, season: 'rainy' })).toEqual(conditions({ day: d, minutes: 19 * 60, season: 'rainy' }));
    expect(hash01(5, 'x')).toBe(hash01(5, 'x'));
  });
  it('maps terms to seasons', () => {
    expect(seasonFor({ term: 1 })).toBe('harmattan');
    expect(seasonFor({ term: 2 })).toBe('rainy');
    expect(seasonFor({ day: 1 })).toBe('harmattan');
    expect(seasonFor({ day: 15 })).toBe('rainy');
  });
  it('rains only in the rainy season, and haze only in harmattan', () => {
    let rain = 0, haze = 0;
    for (let d = 1; d <= 60; d++) for (let h = 0; h < 24; h++) {
      if (conditions({ day: d, minutes: h * 60, season: 'harmattan' }).raining) rain++;
      if (conditions({ day: d, minutes: h * 60, season: 'rainy' }).haze) haze++;
    }
    expect(rain).toBe(0);
    expect(haze).toBe(0);
  });
  it('has power cuts about 4 evenings in 10, only in the evening', () => {
    let cutDays = 0;
    for (let d = 1; d <= 200; d++) {
      let any = false;
      for (let h = 0; h < 24; h++) {
        const c = conditions({ day: d, minutes: h * 60 + 30, season: 'rainy' }).powerCut;
        if (c) { any = true; expect(h).toBeGreaterThanOrEqual(18); }
      }
      if (any) cutDays++;
    }
    expect(cutDays / 200).toBeGreaterThan(0.25);
    expect(cutDays / 200).toBeLessThan(0.55);
  });
});

import { TITLES, UPPER_QUESTIONS } from '../src/upperlevels.js';

describe('200 to 400 level content', () => {
  it('has four named courses per semester at every level for every department', () => {
    for (const dept of Object.keys(DEPTS)) {
      for (const level of [2, 3, 4]) {
        for (const term of [0, 1]) {
          const list = TITLES[dept]?.[level]?.[term];
          expect(list, `${dept} ${level}00L term ${term + 1}`).toHaveLength(4);
          expect(new Set(list).size).toBe(4);
        }
      }
    }
  });
  it('has a question bank for every department and level', () => {
    for (const dept of Object.keys(DEPTS)) for (const level of [2, 3, 4]) {
      expect(QUESTIONS[`${dept}@${level}`]?.length, `${dept}@${level}`).toBeGreaterThanOrEqual(16);
    }
    expect(Object.keys(UPPER_QUESTIONS)).toHaveLength(27);
  });
  it('builds real courses for upper years and points them at the right bank', () => {
    const c = buildCourses('cs', 3, 1);
    expect(c.map(x => x.title)).toContain('Database Systems');
    expect(c.every(x => x.bank === 'cs@3')).toBe(true);
    expect(c.map(x => x.units)).toEqual([3, 3, 3, 2]);
    const final = buildCourses('law', 5, 2);                       // a 5 year degree reuses the 400 level lists
    expect(final.every(x => x.bank === 'law@4')).toBe(true);
    expect(new Set(final.map(x => x.code)).size).toBe(4);
  });
  it('gives carryovers their original bank', () => {
    const c = buildCourses('cs', 2, 1, [{ code: 'CSC 101', title: 'Introduction to Computer Science', bank: 'cs', units: 3 }]);
    expect(c[c.length - 1]).toMatchObject({ carry: true, bank: 'cs' });
  });
});
