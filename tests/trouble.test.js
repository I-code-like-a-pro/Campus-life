import { describe, it, expect } from 'vitest';
import {
  hearingOutcome, needsHearing, warningsPending, rolloverConduct, standingOf, goodStanding, wayBack, troubleOf, book, deanVisitDay,
  needsCounselling, counsellingAdvice, PLANS, nextAssessment, reportEligibility, canDefer, makeupOpen, makeupHold, applyDeferral,
  TROUBLE_SCENES, createTrouble, MAKEUP
} from '../src/trouble.js';
import { floodWindow, isFlooded, lateGraceMinutes, fireAlarm, protestOn, securityAlert, conditions } from '../src/eventengine.js';
import { SCENES, windowsOf, isOverdue } from '../src/scenes.js';

const acad = (o = {}) => ({ year: 1, term: 1, startDay: 8, phase: 'semester', history: [], carryovers: [], integrityWarnings: 0, caTaken: false, examTaken: false, ...o });
const sick = (diagnosed = true) => ({ sick: { id: 'malaria', since: 1, left: 3, diagnosed } });

describe('disciplinary hearings', () => {
  it('two warnings lead to a hearing, and a heard hearing uses them up', () => {
    const a = acad({ integrityWarnings: 1 });
    expect(needsHearing(a)).toBe(false);
    a.integrityWarnings = 2;
    expect(needsHearing(a)).toBe(true);
    troubleOf(a).warningsHeard = 2;
    expect(needsHearing(a)).toBe(false);
    a.integrityWarnings = 3;
    expect(warningsPending(a)).toBe(1);
    a.integrityWarnings = 4;
    expect(needsHearing(a)).toBe(true);
  });
  it('honesty is rewarded and silence is not (first hearing)', () => {
    expect(hearingOutcome({ answer: 'truth', prior: 0 }).tier).toBe('reprimand');
    expect(hearingOutcome({ answer: 'explain', prior: 0 }).tier).toBe('service');
    expect(hearingOutcome({ answer: 'silent', prior: 0 }).tier).toBe('record');
  });
  it('a repeat appearance is stricter, a strong CGPA softens it', () => {
    expect(hearingOutcome({ answer: 'truth', prior: 1 }).tier).toBe('service');
    expect(hearingOutcome({ answer: 'explain', prior: 1 }).tier).toBe('record');
    expect(hearingOutcome({ answer: 'explain', prior: 0, cgpa: 4 }).tier).toBe('reprimand');
  });
  it('there is no expulsion tier and every outcome explains itself and the way back', () => {
    for (const answer of ['truth', 'explain', 'silent', 'nonsense']) for (const prior of [0, 1, 2, 5]) {
      const o = hearingOutcome({ answer, prior });
      expect(['reprimand', 'service', 'record']).toContain(o.tier);
      expect(o.why.length).toBeGreaterThan(0);
      expect(wayBack(o.tier).length).toBeGreaterThan(20);
    }
  });
  it('a note on record is removed after a clean stretch, and kept if a new warning came', () => {
    const T = { record: { warningsAt: 2, clean: 0 } };
    expect(rolloverConduct(T, 3)).toBe('kept');
    expect(T.record).not.toBeNull();
    expect(rolloverConduct(T, 3)).toBe('cleared');
    expect(T.record).toBeNull();
    expect(rolloverConduct({ record: null }, 5)).toBeNull();
  });
  it('standing reflects probation, conduct, CGPA and recovers to good', () => {
    const a = acad({ cgpa: 3.9 });
    expect(standingOf(a)).toBe('strong');
    a.cgpa = 2.5;
    expect(standingOf(a)).toBe('good');
    troubleOf(a).record = { warningsAt: 2, clean: 0 };
    expect(standingOf(a)).toBe('conduct');
    expect(goodStanding(a)).toBe(false);
    a.trouble.record = null;
    expect(goodStanding(a)).toBe(true);
    a.probation = true;
    expect(standingOf(a)).toBe('probation');
    expect(standingOf(null)).toBe('new');
  });
});

describe('the Dean and counselling', () => {
  it('office hours are seeded, midweek, and never in the very first semester', () => {
    expect(deanVisitDay(acad())).toBeNull();
    let some = 0;
    for (let y = 1; y <= 4; y++) for (const t of [1, 2]) {
      if (y === 1 && t === 1) continue;
      const a = acad({ year: y, term: t, startDay: 50 });
      const d = deanVisitDay(a);
      expect(deanVisitDay(a)).toBe(d);
      if (d) { some++; expect(d).toBeGreaterThanOrEqual(51); expect(d).toBeLessThanOrEqual(53); }
    }
    expect(some).toBeGreaterThan(1);
  });
  it('probation needs counselling once per semester and the advice uses the real record', () => {
    const a = acad({ year: 2, probation: true, cgpa: 0.8, carryovers: [{ code: 'MTH101' }], history: [{ gpa: 0.8, rows: [{ code: 'MTH101', grade: 'F', points: 0, units: 3 }, { code: 'ENG101', grade: 'C', points: 3, units: 2 }] }] });
    const T = troubleOf(a);
    expect(needsCounselling(a, T)).toBe(true);
    T.counselled = `${a.year}.${a.term}`;
    expect(needsCounselling(a, T)).toBe(false);
    const text = counsellingAdvice(a).join(' ');
    expect(text).toContain('0.80');
    expect(text).toContain('MTH101 (F)');
    expect(text).toContain('withdraw');
    expect(Object.keys(PLANS).length).toBe(4);
  });
});

describe('medical deferment', () => {
  it('a report needs real illness and a diagnosis, on the days before an assessment', () => {
    const a = acad();
    expect(nextAssessment(a, 1)).toBeNull();
    expect(nextAssessment(a, 3)).toBe('ca');
    expect(nextAssessment(a, 6)).toBe('exam');
    expect(nextAssessment({ ...a, caTaken: true }, 3)).toBeNull();
    expect(reportEligibility({ a, health: {}, sd: 3 }).ok).toBe(false);
    expect(reportEligibility({ a, health: sick(false), sd: 3 }).reason).toMatch(/see the doctor/i);
    expect(reportEligibility({ a, health: sick(), sd: 3 })).toMatchObject({ ok: true, kind: 'ca' });
    expect(reportEligibility({ a, health: sick(), sd: 4 }).ok).toBe(false);
  });
  it('the report can be presented on the day, only while ill, and only once', () => {
    const a = acad();
    const T = troubleOf(a);
    T.report = { kind: 'ca', day: 9, sd: 2 };
    expect(canDefer({ a, health: sick(), sd: 3, hour: 9 })).toMatchObject({ ok: true, kind: 'ca' });
    expect(canDefer({ a, health: {}, sd: 3, hour: 9 }).ok).toBe(false);               // well again: write it
    expect(canDefer({ a, health: sick(), sd: 3, hour: 19 }).ok).toBe(false);          // hall closed
    expect(canDefer({ a, health: sick(), sd: 2, hour: 9 }).ok).toBe(false);           // not the day yet
    const m = applyDeferral(T, 'ca', a.startDay);
    expect(m).toMatchObject({ kind: 'ca', day: 5, abs: 12 });
    expect(T.report).toBeNull();
    expect(nextAssessment(a, 3)).toBeNull();                                           // no second deferral
  });
  it('the make-up is open on its own day only, until it is written', () => {
    const a = acad();
    applyDeferral(troubleOf(a), 'ca', a.startDay);
    expect(makeupOpen(a, 4, 10)).toBeNull();
    expect(makeupOpen(a, 5, 10)).toBe('ca');
    expect(makeupOpen(a, 5, 19)).toBeNull();
    a.caTaken = true;
    expect(makeupOpen(a, 5, 10)).toBeNull();
  });
  it('an exam make-up on the break day holds the results back one day, and no longer', () => {
    const a = acad();
    expect(makeupHold(a, 7)).toBe(0);
    applyDeferral(troubleOf(a), 'exam', a.startDay);
    expect(MAKEUP.exam.day).toBe(7);
    expect(makeupHold(a, 6)).toBe(1);
    expect(makeupHold(a, 7)).toBe(1);
    expect(makeupHold(a, 8)).toBe(0);
    a.examTaken = true;
    expect(makeupHold(a, 7)).toBe(0);
  });
});

describe('campus events', () => {
  const days = Array.from({ length: 300 }, (_, i) => i + 1);
  it('floods are a rainy-season thing, seeded, and delay lectures', () => {
    expect(days.some(d => floodWindow(d, 'harmattan'))).toBe(false);
    const flooded = days.filter(d => floodWindow(d, 'rainy'));
    expect(flooded.length).toBeGreaterThan(15);
    expect(flooded.length).toBeLessThan(120);
    const d = flooded[0], w = floodWindow(d, 'rainy');
    expect(floodWindow(d, 'rainy')).toEqual(w);
    expect(w.to - w.from).toBe(4);
    expect(isFlooded(d, w.from + 1, 'rainy')).toBe(true);
    expect(isFlooded(d, w.to + 0.5, 'rainy')).toBe(false);
    expect(lateGraceMinutes(d, w.from + 1, 'rainy')).toBe(60);
    expect(lateGraceMinutes(d, 6, 'rainy')).toBe(0);
    expect(conditions({ day: d, minutes: (w.from + 1) * 60, season: 'rainy' }).flooded).toBe(true);
  });
  it('fire alarms are rare, at night, and never in the first days', () => {
    const fires = days.map(fireAlarm).filter(Boolean);
    expect(fires.length).toBeGreaterThan(5);
    expect(fires.length).toBeLessThan(60);
    for (const f of fires) { expect(['drill', 'kitchen']).toContain(f.kind); expect(f.hour).toBeGreaterThanOrEqual(21); }
    for (let d = 1; d < 4; d++) expect(fireAlarm(d)).toBeNull();
  });
  it('protests fall on lecture days only (never CA or exam day) and are about fees or NEPA', () => {
    for (const sdDay of [3, 6, 7]) expect(days.some(d => protestOn(d, sdDay))).toBe(false);
    const ps = days.map(d => protestOn(d, 1)).filter(Boolean);
    expect(ps.length).toBeGreaterThan(5);
    expect(new Set(ps.map(p => p.topic))).toEqual(new Set(['fees', 'nepa']));
  });
  it('security alerts are rare, seeded, and always end in the morning', () => {
    const al = days.map(securityAlert).filter(Boolean);
    expect(al.length).toBeGreaterThan(2);
    expect(al.length).toBeLessThan(30);
    expect(al[0]).toEqual({ notice: 18.5, curfew: 20, end: 6 });
    for (let d = 1; d < 5; d++) expect(securityAlert(d)).toBeNull();
  });
});

describe('trouble scenes and scheduling', () => {
  it('are registered with unique ids and only open when booked', () => {
    const ids = SCENES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TROUBLE_SCENES.length).toBeGreaterThan(20);
    const a = acad();
    for (const s of TROUBLE_SCENES) expect(s.windows(a)).toEqual([]);
    const id = book(troubleOf(a), 'hearing', { day: 10, from: 9, to: 17, span: 2 });
    const def = SCENES.find(s => s.id === id);
    expect(def.windows(a)).toEqual([{ day: 10, from: 9, to: 17 }, { day: 11, from: 9, to: 17 }]);
    expect(windowsOf(def, a)).toHaveLength(2);
    expect(isOverdue(def, a, 12, 8)).toBe(true);
    expect(def.beats({ flags: {}, name: 'Ada' }).length).toBeGreaterThan(2);
  });
  it('tick books a hearing at two warnings, reschedules a missed one once, then decides without expelling', () => {
    const notes = [];
    const state = { academic: acad({ integrityWarnings: 2 }), meta: { health: {} } };
    let day = 10;
    const t = createTrouble({ state, meta: { notify: n => notes.push(n.title) }, day: () => day, minutes: () => 600, consume() {}, pay: () => true, hostelName: () => 'Hall', atHostel: () => true, sendHome() {}, boostAll() {}, boostWeakest() {} });
    t.tick();
    expect(Object.keys(state.academic.trouble.pending)).toEqual(['hearing-1']);
    expect(notes).toContain('Letter from the Dean');
    day = 13; t.tick();                                   // both days passed: a new date, once
    expect(notes).toContain('Hearing rescheduled');
    expect(Object.keys(state.academic.trouble.pending)).toEqual(['hearing-2']);
    day = 17; t.tick();
    expect(notes).toContain('Hearing held without you');
    expect(state.academic.trouble.record).not.toBeNull();
    expect(state.academic.withdrawn).toBeUndefined();
    expect(needsHearing(state.academic)).toBe(false);
  });
  it('tick books counselling on probation and a sick make-up goes through the actions', () => {
    const state = { academic: acad({ year: 2, term: 1, startDay: 8, probation: true, history: [], cgpa: 0.7 }), meta: { health: sick() } };
    const t = createTrouble({ state, meta: { notify() {} }, day: () => 9, minutes: () => 600, consume() {}, pay: () => true, hostelName: () => 'Hall', atHostel: () => true, sendHome() {}, boostAll() {}, boostWeakest() {} });
    t.tick();
    expect(Object.keys(state.academic.trouble.pending)).toEqual(['counsel-1']);
    state.academic.trouble.pending = {};
    state.academic.trouble.report = { kind: 'ca', day: 10, sd: 3 };
    const t2 = createTrouble({ state, meta: { notify() {} }, day: () => 10, minutes: () => 600, consume() {}, pay: () => true, hostelName: () => 'Hall', atHostel: () => true, sendHome() {}, boostAll() {}, boostWeakest() {} });
    expect(t2.hallActions().map(x => x.id)).toEqual(['defer']);
  });
});
