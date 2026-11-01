import { describe, it, expect } from 'vitest';
import {
  matricDue, matricPages, orientationActive, orientationProgress, noteVisit, noteMeet, orientationLine, orientationComplete,
  waterAdjust, scholarshipAward, SCHOLARSHIP_AMOUNT, ORIENTATION_GOALS
} from '../src/campuslife-events.js';
import { HICCUPS, rollHiccup, pendingHiccup, resolveHiccup, seedOf, DESKS } from '../src/clearance.js';
import { EVENTS, socialActions } from '../src/social.js';
import { waterShortage, conditions } from '../src/eventengine.js';
import { ACHIEVEMENTS } from '../src/meta.js';

const acad = (over = {}) => ({ year: 1, term: 1, phase: 'semester', ...over });

describe('matriculation', () => {
  it('is due once, from the second morning of the first semester', () => {
    expect(matricDue(acad(), 1, 12)).toBe(false);
    expect(matricDue(acad(), 2, 9)).toBe(false);
    expect(matricDue(acad(), 2, 10)).toBe(true);
    expect(matricDue(acad(), 4, 8)).toBe(true);
    expect(matricDue(acad({ matric: true }), 3, 12)).toBe(false);
    expect(matricDue(acad({ year: 2 }), 3, 12)).toBe(false);
    expect(matricDue(acad({ phase: 'pre' }), 3, 12)).toBe(false);
    expect(matricDue(null, 3, 12)).toBe(false);
  });
  it('has short pages and an achievement', () => {
    const pages = matricPages({ name: 'Ada', campus: 'UNILAG', course: 'Law' });
    expect(pages.length).toBe(3);
    expect(ACHIEVEMENTS.find(a => a.id === 'matriculated').c).toBe('matriculated');
  });
});

describe('orientation week', () => {
  it('runs in the first days of the first semester only', () => {
    expect(orientationActive(acad({ phase: 'pre' }), 0)).toBe(true);
    expect(orientationActive(acad(), 2)).toBe(true);
    expect(orientationActive(acad(), 3)).toBe(false);
    expect(orientationActive(acad({ term: 2 }), 1)).toBe(false);
  });
  it('tracks visits and distinct people, and completes', () => {
    const a = acad();
    expect(orientationComplete(a)).toBe(false);
    expect(orientationLine(a, 1)).toContain('0/4');
    noteVisit(a, 'lecture'); noteVisit(a, 'library'); noteVisit(a, 'canteen');
    noteMeet(a, 'x'); noteMeet(a, 'x');
    expect(orientationProgress(a).filter(g => g.done).length).toBe(3);
    expect(orientationLine(a, 1)).toContain('Meet 2 people');
    noteMeet(a, 'y');
    expect(orientationComplete(a)).toBe(true);
    expect(orientationLine(a, 1)).toBe('');
    expect(ORIENTATION_GOALS.length).toBe(4);
  });
});

describe('clearance hiccups', () => {
  it('has hiccups for every desk, each with a fee and a wait option', () => {
    for (const d of DESKS) {
      expect(HICCUPS[d.id].length).toBeGreaterThan(0);
      for (const h of HICCUPS[d.id]) { expect(h.fee).toBeGreaterThan(0); expect(h.minutes).toBeGreaterThan(0); }
    }
  });
  it('is deterministic per seed and sometimes absent', () => {
    expect(rollHiccup(seedOf('Ada|law'), 'bursary')).toEqual(rollHiccup(seedOf('Ada|law'), 'bursary'));
    let some = 0, none = 0;
    for (let i = 0; i < 60; i++) rollHiccup(seedOf('p' + i), 'medical') ? some++ : none++;
    expect(some).toBeGreaterThan(10);
    expect(none).toBeGreaterThan(5);
  });
  it('only fires at the current desk, once', () => {
    let seed = 0;
    while (!rollHiccup(seed, 'admissions')) seed++;
    const cl = { admissions: false, bursary: false, medical: false, hostel: false, done: false };
    expect(pendingHiccup(cl, 'desk-admissions', seed)?.hiccup).toBeTruthy();
    expect(pendingHiccup(cl, 'desk-bursary', seed)).toBeNull();
    cl.hiccups = { admissions: true };
    expect(pendingHiccup(cl, 'desk-admissions', seed)).toBeNull();
  });
  it('can always be resolved, even when broke', () => {
    const h = HICCUPS.bursary[0];
    expect(resolveHiccup(h, true, 0).fee).toBe(0);
    expect(resolveHiccup(h, true, 10000).fee).toBe(h.fee);
    expect(resolveHiccup(h, false, 10000).minutes).toBe(h.minutes);
  });
});

describe('campus events', () => {
  it('adds four new events with valid fields', () => {
    for (const id of ['deptweek', 'cultural', 'fellownight', 'carnival']) {
      const e = EVENTS.find(x => x.id === id);
      expect(e).toBeTruthy();
      expect(e.day).toBeGreaterThanOrEqual(1);
      expect(e.day).toBeLessThanOrEqual(7);
      expect(e.hours[1]).toBeGreaterThan(e.hours[0]);
    }
  });
  it('seasonal events respect the term', () => {
    const at = term => socialActions({ venue: 'auditorium', sd: 6, hour: 20, clubs: [], term }).map(a => a.id);
    expect(at(1)).toContain('cultural');
    expect(at(2)).not.toContain('cultural');
    expect(socialActions({ venue: 'auditorium', sd: 5, hour: 18, clubs: [] }).map(a => a.id)).toContain('fellownight');
  });
  it('water shortage is deterministic and occasional, and turns baths into bucket baths in hostels', () => {
    let days = 0;
    for (let d = 1; d <= 200; d++) {
      expect(waterShortage(d, 10)).toBe(waterShortage(d, 10));
      expect(conditions({ day: d, minutes: 600, season: 'rainy' }).waterShort).toBe(waterShortage(d, 10));
      if (waterShortage(d, 10)) days++;
      expect(waterShortage(d, 20)).toBe(false);
    }
    expect(days).toBeGreaterThan(10);
    expect(days).toBeLessThan(80);
    const bath = { id: 'bathe', minutes: 15, fx: { hygiene: 65, stress: -3 } };
    const b = waterAdjust(bath, true, 'hostel');
    expect(b.fx.hygiene).toBeLessThan(65);
    expect(waterAdjust(bath, true, 'home')).toBe(bath);
    expect(waterAdjust(bath, false, 'hostel')).toBe(bath);
  });
});

describe('bursary award', () => {
  it('pays once per year for a GPA of 4.5 or more', () => {
    const a = acad();
    expect(scholarshipAward(a, 4.4)).toBe(0);
    expect(scholarshipAward(a, 4.6)).toBe(SCHOLARSHIP_AMOUNT);
    expect(scholarshipAward(a, 4.9)).toBe(0);
    a.year = 2;
    expect(scholarshipAward(a, 4.5)).toBe(SCHOLARSHIP_AMOUNT);
  });
});
