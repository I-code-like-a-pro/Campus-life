import { describe, it, expect } from 'vitest';
import {
  STYLE_IDS, STYLES, makeLecturer, lecturerFor, attendEffect, lecturerLine,
  canBuyHandout, canChase, chaseSucceeds, handoutRec,
  candidates, groupOutcome, applyGroup, groupCourse, groupRec,
  isLabCourse, labSteps, labResult, labAvailable, tutorialBoost, tutorialOpen, resetSemester
} from '../src/academic-life.js';
import { ACADEMIC_SCENES } from '../src/scenes-academic.js';
import { SCENES } from '../src/scenes.js';
import { buildCourses } from '../src/courses.js';

const acad = (extra = {}) => ({ year: 1, term: 1, phase: 'semester', courses: buildCourses('cs', 1, 1), ...extra });

describe('lecturers', () => {
  it('are deterministic and use a known style', () => {
    const l = makeLecturer('CSC 101', 1, 1);
    expect(l).toEqual(makeLecturer('CSC 101', 1, 1));
    expect(STYLE_IDS).toContain(l.style);
    const a = acad();
    expect(lecturerFor(a, 'CSC 101')).toBe(lecturerFor(a, 'CSC 101'));
  });
  it('all five styles appear across the catalogue', () => {
    const seen = new Set();
    for (const code of ['CSC 101', 'MTH 101', 'PHY 101', 'STA 102', 'LAW 101', 'BIO 101', 'CHM 101', 'ECO 101', 'ACC 101', 'BUS 101', 'MAC 101', 'PHA 101']) seen.add(makeLecturer(code, 1, 1).style);
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
  it('style effects differ in a real way', () => {
    expect(attendEffect('strict', false).prep).toBeGreaterThan(0);
    expect(attendEffect('strict', true).prep).toBeLessThan(0);
    expect(attendEffect('absent', false).minutesBack).toBeGreaterThan(0);
    expect(attendEffect('generous', false, true).handout).toBeGreaterThan(0);
    expect(attendEffect('generous', false, false).handout).toBe(0);
    expect(attendEffect('brilliant', false).prep).toBeGreaterThan(attendEffect('funny', false).prep);
    expect(attendEffect('funny', false).fx.fun).toBeGreaterThan(0);
  });
  it('every style has dialogue and a description', () => {
    for (const s of STYLE_IDS) { expect(lecturerLine(s, 0.5).length).toBeGreaterThan(5); expect(STYLES[s].blurb.length).toBeGreaterThan(5); }
  });
});

describe('handouts', () => {
  it('can be bought once per course and chased twice', () => {
    const a = acad();
    expect(canBuyHandout(a, 'CSC 101')).toBe(true);
    handoutRec(a, 'CSC 101').bought = true;
    expect(canBuyHandout(a, 'CSC 101')).toBe(false);
    expect(canChase(a, 'MTH 101')).toBe(true);
    handoutRec(a, 'MTH 101').chased = 2;
    expect(canChase(a, 'MTH 101')).toBe(false);
    expect(chaseSucceeds(0.1)).toBe(true);
    expect(chaseSucceeds(0.9)).toBe(false);
  });
});

describe('group assignments', () => {
  const good = { skill: 5, reliability: 5, name: 'A' }, good2 = { skill: 4, reliability: 5, name: 'B' };
  const flaky = { skill: 5, reliability: 1, name: 'F' };
  it('offers three distinct candidates', () => {
    const c = candidates('1|1|CSC 101');
    expect(new Set(c.map(m => m.name)).size).toBe(3);
  });
  it('your contribution changes the outcome', () => {
    expect(groupOutcome([good, good2], 'full', 0.5).tier).toBe('great');
    expect(groupOutcome([good, good2], 'coast', 0.5).tier).not.toBe('great');
    expect(groupOutcome([{ skill: 1, reliability: 3, name: 'X' }, { skill: 1, reliability: 3, name: 'Y' }], 'coast', 0.5).tier).toBe('poor');
  });
  it('an unreliable teammate may ghost you', () => {
    expect(groupOutcome([flaky, good], 'share', 0.1).ghosted).toBe('F');
    expect(groupOutcome([flaky, good], 'share', 0.9).ghosted).toBe(null);
  });
  it('copying can be caught and records a warning', () => {
    const a = acad();
    const c = a.courses[0];
    const out = groupOutcome([good, good2], 'copy', 0.5, 0.1);
    expect(out.caught).toBe(true);
    applyGroup(a, c, out);
    expect(a.integrityWarnings).toBe(1);
    expect(groupOutcome([good, good2], 'copy', 0.5, 0.9).caught).toBe(false);
  });
  it('a great result completes the assignment, a poor one does not', () => {
    const a = acad();
    applyGroup(a, a.courses[0], { tier: 'great', ghosted: null, caught: false });
    expect(a.courses[0].assign.done).toBe(true);
    applyGroup(a, a.courses[1], { tier: 'poor', ghosted: null, caught: false });
    expect(a.courses[1].assign.done).toBe(false);
  });
  it('the group course is stable within a semester', () => {
    const a = acad();
    expect(groupCourse(a)).toBe(groupRec(a).code);
    expect(a.courses.find(c => c.code === groupCourse(a))).toBeTruthy();
  });
});

describe('lab practicals', () => {
  it('apply to science and engineering courses', () => {
    for (const c of ['PHY 101', 'CHM 102', 'BIO 101', 'ENG 101', 'PHA 211']) expect(isLabCourse(c)).toBe(true);
    for (const c of ['CSC 101', 'LAW 101', 'MTH 101', 'GST 111']) expect(isLabCourse(c)).toBe(false);
  });
  it('each lab course has 3 steps with exactly one good choice each', () => {
    for (const code of ['PHY 101', 'CHM 101', 'BIO 101', 'ENG 101', 'PHA 102', 'MED 211']) {
      const steps = labSteps(code);
      expect(steps.length).toBe(3);
      for (const s of steps) {
        expect(s.choices.length).toBe(3);
        expect(s.choices.filter(c => c.good).length).toBe(1);
      }
    }
    expect(labSteps('CSC 101')).toEqual([]);
  });
  it('results scale with correct steps', () => {
    expect(labResult(3).prep).toBeGreaterThan(labResult(2).prep);
    expect(labResult(2).prep).toBeGreaterThan(labResult(1).prep);
    expect(labResult(0).prep).toBe(0);
  });
  it('is available Tuesday to Friday at midday when a lab course has not been done', () => {
    const a = acad();
    expect(labAvailable(a, 3, 12)).toBe(true);
    expect(labAvailable(a, 1, 12)).toBe(false);
    expect(labAvailable(a, 3, 8)).toBe(false);
    a.labs = { 'PHY 101': true };
    expect(labAvailable(a, 3, 12)).toBe(false);
  });
});

describe('tutorials', () => {
  it('give a limited boost', () => {
    expect(tutorialBoost(20, 0)).toBe(5);
    expect(tutorialBoost(72, 0)).toBe(3);
    expect(tutorialBoost(80, 0)).toBe(0);
    expect(tutorialBoost(20, 3)).toBe(0);
  });
  it('are open weekday afternoons, once a day', () => {
    const a = acad();
    expect(tutorialOpen(a, 2, 16.5)).toBe(true);
    expect(tutorialOpen(a, 2, 12)).toBe(false);
    expect(tutorialOpen(a, 6, 16.5)).toBe(false);
    a.tutorialDay = 2;
    expect(tutorialOpen(a, 2, 16.5)).toBe(false);
  });
  it('semester reset clears the records', () => {
    const a = acad({ labs: { x: 1 }, tutorials: { x: 1 }, handouts: { x: 1 }, group: { y: 1 } });
    resetSemester(a);
    expect(a.labs).toEqual({}); expect(a.group).toBe(null);
  });
});

describe('academic scenes', () => {
  it('are included in the scene list with unique ids', () => {
    const ids = SCENES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of ACADEMIC_SCENES) expect(ids).toContain(s.id);
  });
  it('the lab scene only appears with a lab course and has beats', () => {
    const lab = ACADEMIC_SCENES.find(s => s.id === 'firstLab');
    expect(lab.windows(acad({ startDay: 1 })).length).toBe(1);
    expect(lab.windows(acad({ startDay: 1, courses: buildCourses('law', 1, 1) })).length).toBe(0);
    const beats = lab.beats({ courses: ['CSC 101: x', 'PHY 101: y'] });
    expect(beats.length).toBe(4);
  });
});
