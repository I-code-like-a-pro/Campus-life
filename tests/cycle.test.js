import { describe, it, expect } from 'vitest';
import { SCENES, sceneById, isOpen, isOverdue, windowsOf, keyOf, nextWindow } from '../src/scenes.js';
import {
  MILESTONES, CONVOCATION, HOME_SCENES, resultTier, lastResult, defenceScore, defenceTier, siwesTier, homeSeason, isFinalYear, RESULT_TIERS
} from '../src/milestones.js';
import { planTrip, homeGate, homeOptions } from '../src/homevisit.js';
import { nextStartDay } from '../src/academics.js';

const course = (code, knowledge = 20, extra = {}) => ({ code, title: code, knowledge, assign: { progress: 0, done: false }, ...extra });
const acad = (extra = {}) => ({ startDay: 10, year: 2, term: 1, phase: 'semester', programmeYears: 4, courses: [course('CSC 211', 10), course('MTH 212', 60)], history: [], carryovers: [], ...extra });
const withResults = (gpa, extra = {}) => acad({
  phase: 'break', cgpa: gpa,
  history: [{ year: 2, term: 1, gpa, rows: [{ code: 'CSC 211', total: 72, grade: 'A', units: 3 }, { code: 'MTH 212', total: 41, grade: 'E', units: 3 }] }], ...extra
});
const ctxFor = a => ({
  a, day: 16, name: 'Ada', campusName: 'UNILAG', courseName: 'Computer Science', courses: ['CSC 211: Data'], weakest: 'CSC 211', flags: {},
  consume: () => {}, give: () => {}, pay: () => true, roll: () => 0.9, boostWeakest: () => {}
});

describe('scene status per semester', () => {
  it('keeps the first-week scenes exactly as they were: year 1 semester 1 only, keyed by id', () => {
    const o = sceneById('orientation');
    expect(keyOf(o, acad())).toBe('orientation');
    expect(windowsOf(o, { startDay: 3, year: 1, term: 1 })).toEqual([{ day: 3, from: 10, to: 13 }]);
    expect(windowsOf(o, acad())).toEqual([]);
    expect(windowsOf(o, { startDay: 3, year: 1, term: 2 })).toEqual([]);
  });
  it('keys repeating scenes by year and term, so each semester has its own status', () => {
    const r = sceneById('examEve');
    expect(keyOf(r, { year: 2, term: 1 })).toBe('examEve@2.1');
    expect(keyOf(r, { year: 2, term: 2 })).toBe('examEve@2.2');
    const a = acad({ scenes: { 'examEve@2.1': { status: 'attended' } } });
    expect(isOpen(r, a, 14, 16)).toBe(false);
    expect(isOpen(r, { ...a, term: 2, startDay: 17 }, 21, 16)).toBe(true);
  });
  it('does not mark old-key records as attended for a repeating scene', () => {
    const r = sceneById('examEve');
    expect(isOpen(r, acad({ scenes: { examEve: { status: 'attended' } } }), 14, 16)).toBe(true);
  });
  it('becomes overdue after the last window like any scene', () => {
    const r = sceneById('examEve');
    expect(isOverdue(r, acad(), 14, 19)).toBe(true);
    expect(isOverdue(r, acad(), 14, 17)).toBe(false);
  });
  it('lists every new scene with a venue, windows, a crowd and enough beats', () => {
    const ids = new Set(SCENES.map(s => s.id));
    for (const m of MILESTONES) expect(ids.has(m.id)).toBe(true);
    expect(new Set(SCENES.map(s => s.id)).size).toBe(SCENES.length);
    for (const m of MILESTONES) {
      const a = withResults(3.2, { year: m.id === 'siwes' ? 3 : 4, term: 2 });
      const ctx = ctxFor(a);
      const beats = m.beats(ctx);
      expect(beats.length, m.id).toBeGreaterThan(2);
      expect(m.crowd.length).toBeGreaterThan(0);
      expect(m.repeat).toBe(true);
      for (const b of beats) {
        const bb = typeof b === 'function' ? b(ctx) : b;
        if (!bb) continue;
        expect(bb.lines.length).toBeGreaterThan(0);
        for (const c of bb.choices || []) expect(c.text, `${m.id}: ${c.label}`).toBeTruthy();
      }
    }
  });
});

describe('results day', () => {
  it('maps the real GPA to a tier at the boundaries', () => {
    expect(resultTier(5).id).toBe('first');
    expect(resultTier(4.5).id).toBe('first');
    expect(resultTier(4.49).id).toBe('upper');
    expect(resultTier(3.5).id).toBe('upper');
    expect(resultTier(2.4).id).toBe('lower');
    expect(resultTier(1.5).id).toBe('third');
    expect(resultTier(1).id).toBe('pass');
    expect(resultTier(0.99).id).toBe('danger');
    expect(RESULT_TIERS.length).toBe(6);
  });
  it('opens only after the results are released, on the break day, and not after graduating', () => {
    const r = sceneById('results');
    expect(windowsOf(r, acad())).toEqual([]);
    expect(windowsOf(r, withResults(3))).toEqual([{ day: 16, from: 8, to: 22 }]);
    expect(windowsOf(r, withResults(3, { graduated: true }))).toEqual([]);
    expect(isOpen(r, withResults(3), 16, 9)).toBe(true);
    expect(isOpen(r, withResults(3, { scenes: { 'results@2.1': { status: 'missed' } } }), 16, 9)).toBe(false);
  });
  it('shows the real rows and GPA and applies the tier effects', () => {
    const a = withResults(4.6);
    const beats = sceneById('results').beats(ctxFor(a));
    expect(beats[1].lines.join(' ')).toContain('CSC 211: 72 (A)');
    expect(beats[1].lines.join(' ')).toContain('GPA: 4.60');
    expect(beats[1].fx.fun).toBeGreaterThan(0);
    const bad = sceneById('results').beats(ctxFor(withResults(0.6, { probation: true })));
    expect(bad[1].fx.stress).toBeGreaterThan(0);
    expect(bad[1].lines.join(' ')).toContain('probation');
    expect(bad[3](ctxFor(withResults(0.6))).title).toContain('department');
    expect(beats[3](ctxFor(a))).toBeNull();
  });
  it('lets the player make a study plan that the next semester uses, and Mum sends money for good results', () => {
    const a = withResults(3.8);
    const beats = sceneById('results').beats(ctxFor(a));
    const choices = beats[2].choices;
    expect(choices.map(c => c.label)).toEqual(expect.arrayContaining(['Call Mum', 'Console a friend']));
    expect(choices.find(c => c.label === 'Call Mum').give).toBe(2000);
    choices.find(c => c.label.startsWith('Make a study plan')).run(ctxFor(a));
    expect(a.studyPlan).toBe(4);
    expect(lastResult(a).gpa).toBe(3.8);
  });
});

describe('resumption and registration', () => {
  it('welcomes a new session from year two, semester two every year, and re-registers in every later semester', () => {
    const s = sceneById('session'), s2 = sceneById('resumeS2'), reg = sceneById('reReg');
    expect(windowsOf(s, acad({ year: 1 }))).toEqual([]);
    expect(windowsOf(s, acad({ year: 3 })).map(w => w.day)).toEqual([10]);
    expect(windowsOf(s, acad({ term: 2 }))).toEqual([]);
    expect(windowsOf(s2, acad({ year: 1, term: 2 })).length).toBe(1);
    expect(windowsOf(s2, acad())).toEqual([]);
    expect(windowsOf(reg, acad({ year: 1, term: 1 }))).toEqual([]);
    expect(windowsOf(reg, acad({ year: 1, term: 2 })).map(w => w.day)).toEqual([10, 11]);
    expect(windowsOf(reg, acad({ year: 4, term: 1 })).map(w => w.day)).toEqual([10, 11]);
    expect(reg.missFx.stress).toBeGreaterThan(0);
  });
  it('lists the real course list and carryovers at registration', () => {
    const a = acad({ carryovers: [{ code: 'MTH 111' }] });
    const lines = sceneById('reReg').beats(ctxFor(a))[1].lines.join(' ');
    expect(lines).toContain('CSC 211: Data');
    expect(lines).toContain('MTH 111');
  });
});

describe('exam week and assignments', () => {
  it('ties revision night and exam morning to the real exam day and closes once the exam is written', () => {
    const eve = sceneById('examEve'), morning = sceneById('examMorning');
    expect(windowsOf(eve, acad()).map(w => w.day)).toEqual([14]);
    expect(windowsOf(morning, acad()).map(w => w.day)).toEqual([15]);
    expect(eve.done(acad({ examTaken: true }))).toBe(true);
    const a = acad();
    const study = eve.beats(ctxFor(a))[1].choices[0];
    study.run(ctxFor(a));
    expect(a.courses[0].knowledge).toBe(18);
    expect(a.courses[1].knowledge).toBe(68);
  });
  it('is finished when every assignment is submitted, and lets the player finish or draft the open ones', () => {
    const asg = sceneById('assignment');
    expect(asg.done(acad())).toBe(false);
    expect(asg.done(acad({ courses: [course('A', 0, { assign: { progress: 2, done: true } })] }))).toBe(true);
    const a = acad({ courses: [course('A', 0, { assign: { progress: 1, done: false } }), course('B', 0)] });
    const [print, finish] = asg.beats(ctxFor(a))[1].choices;
    finish.run(ctxFor(a));
    expect(a.courses[0].assign.done).toBe(true);
    expect(a.courses[1].assign).toEqual({ progress: 1, done: false });
    const b = acad({ courses: [course('C', 0)] });
    print.run(ctxFor(b));
    expect(b.courses[0].assign.progress).toBe(1);
  });
});

describe('years two to four, SIWES, project and convocation', () => {
  it('runs faculty week in the first semester and the dinner in the second, from year two', () => {
    expect(windowsOf(sceneById('facultyWeek'), acad({ year: 1 }))).toEqual([]);
    expect(windowsOf(sceneById('facultyWeek'), acad()).length).toBe(2);
    expect(windowsOf(sceneById('deptDinner'), acad())).toEqual([]);
    expect(windowsOf(sceneById('deptDinner'), acad({ term: 2 })).length).toBe(1);
  });
  it('runs SIWES only after year-three results and stretches the break', () => {
    const s = sceneById('siwes');
    expect(windowsOf(s, withResults(3, { year: 3, term: 2, history: [{ year: 3, term: 2, gpa: 3, rows: [] }] })).length).toBe(1);
    expect(windowsOf(s, withResults(3, { year: 2, term: 2 }))).toEqual([]);
    const a = withResults(3, { year: 3, term: 2, history: [{ year: 3, term: 2, gpa: 3, rows: [] }] });
    s.beats(ctxFor(a))[0].run({ ...ctxFor(a), day: 16 });
    expect(a.breakUntil).toBe(21);
    expect(nextStartDay(a)).toBe(21);
  });
  it('grades SIWES and the defence by points', () => {
    expect(siwesTier(8).id).toBe('excellent');
    expect(siwesTier(5).id).toBe('good');
    expect(siwesTier(3).id).toBe('fair');
    expect(siwesTier(0).id).toBe('weak');
    expect(siwesTier(0).stipend).toBeGreaterThan(0);
    expect(defenceTier(defenceScore({ effort: 4, rehearsal: 2, answers: 2, cgpa: 4.2, avgKnowledge: 60 })).id).toBe('distinction');
    expect(defenceTier(defenceScore({ effort: 2, rehearsal: 1, answers: 2, cgpa: 3.2 })).id).toBe('pass');
    expect(defenceTier(defenceScore({ effort: 1, rehearsal: 1, answers: 1, cgpa: 2.5 })).id).toBe('major');
    expect(defenceTier(defenceScore({ effort: 0, rehearsal: 0, answers: -2, cgpa: 1.2 })).id).toBe('redo');
  });
  it('schedules the project in the final year only, using the programme length', () => {
    expect(isFinalYear(acad({ year: 4 }))).toBe(true);
    expect(isFinalYear(acad({ year: 4, programmeYears: 5 }))).toBe(false);
    expect(windowsOf(sceneById('projectTopic'), acad({ year: 3 }))).toEqual([]);
    expect(windowsOf(sceneById('projectTopic'), acad({ year: 4 })).length).toBe(2);
    expect(windowsOf(sceneById('projectDefence'), acad({ year: 4, term: 2 })).length).toBe(1);
    expect(windowsOf(sceneById('projectDefence'), acad({ year: 4, term: 1 }))).toEqual([]);
  });
  it('records the defence result on the player and has a convocation with a gown and the family', () => {
    const a = acad({ year: 4, term: 2, project: { approach: 'practical', effort: 4 } });
    const ctx = { ...ctxFor(a), flags: { rehearsal: 2, answers: 2 } };
    const last = sceneById('projectDefence').beats(ctx).pop()(ctx);
    expect(last.title).toBeTruthy();
    expect(a.project.result).toBeTruthy();
    const beats = CONVOCATION.beats(ctxFor({ ...a, cgpa: 4.7 }));
    expect(beats.length).toBeGreaterThan(3);
    expect(beats.map(b => b.title).join(' ')).toContain('Mama and Tobi');
  });
});

describe('breaks and going home', () => {
  it('picks the season from the semester that just ended', () => {
    expect(homeSeason({ term: 1 })).toBe('christmas');
    expect(homeSeason({ term: 2 })).toBe('harvest');
    for (const k of ['christmas', 'harvest']) {
      const beats = HOME_SCENES[k].beats(ctxFor(withResults(3)));
      expect(beats.length).toBeGreaterThan(3);
      expect(beats.some(b => /Mama|Tobi/.test(b.lines.join(' ') + b.title))).toBe(true);
    }
  });
  it('only allows one visit, during the break, for students still studying', () => {
    expect(homeGate(null).ok).toBe(false);
    expect(homeGate(acad()).ok).toBe(false);
    expect(homeGate(withResults(3)).ok).toBe(true);
    expect(homeGate(withResults(3, { homeVisits: { '2.1': true } })).ok).toBe(false);
    expect(homeGate(withResults(3, { graduated: true })).ok).toBe(false);
  });
  it('plans a return before the next semester and never shortens it', () => {
    const near = planTrip({ day: 16, minutes: 600, oneWay: 75, startDay: 10 });
    expect(near.nextStart).toBeGreaterThanOrEqual(17);
    expect(near.endDay).toBe(17);
    expect(near.nextStart).toBe(18);
    const far = planTrip({ day: 16, minutes: 600, oneWay: 1020, startDay: 10 });
    expect(far.nextStart).toBeGreaterThan(near.nextStart);
    expect(planTrip({ day: 16, minutes: 0, oneWay: 0, stay: 0, startDay: 10 }).nextStart).toBe(17);
  });
  it('doubles the fare for the round trip', () => {
    const opts = homeOptions('lagos', 'unilag');
    expect(opts[0].fare).toBe(3000);
    expect(homeOptions('kano', 'unilag').some(o => o.mode === 'flight')).toBe(true);
  });
  it('extends the break only when a trip asks for it (older saves are unchanged)', () => {
    expect(nextStartDay({ startDay: 10 })).toBe(17);
    expect(nextStartDay({ startDay: 10, breakUntil: 0 })).toBe(17);
    expect(nextStartDay({ startDay: 10, breakUntil: 20 })).toBe(20);
    expect(nextWindow(sceneById('results'), withResults(3), 16, 5).day).toBe(16);
  });
});
