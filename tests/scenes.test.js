import { describe, it, expect } from 'vitest';
import { DOCS, docsFor, rollMissing, ensureDocs, checkDesk, fixDoc, allMissing, clearanceFacts, detailsCard, OFFICE_HOURS } from '../src/documents.js';
import { seedOf } from '../src/clearance.js';
import { SCENES, sceneById, isOpen, isOverdue, nextWindow, windowsOf, clock } from '../src/scenes.js';

describe('clearance documents', () => {
  it('rolls the same missing papers for the same seed, never more than two, never the always-held ones', () => {
    expect(rollMissing(seedOf('Ada|cs'))).toEqual(rollMissing(seedOf('Ada|cs')));
    let some = 0, none = 0;
    for (let i = 0; i < 80; i++) {
      const m = rollMissing(seedOf('p' + i));
      expect(m.length).toBeLessThanOrEqual(2);
      for (const id of m) expect(DOCS.find(d => d.id === id).missChance).toBeGreaterThan(0);
      m.length ? some++ : none++;
    }
    expect(some).toBeGreaterThan(20);
    expect(none).toBeGreaterThan(5);
  });
  it('every document a player can lack can be fixed for a small fee', () => {
    for (const d of DOCS.filter(x => x.missChance > 0)) { expect(d.fix.cost).toBeGreaterThan(0); expect(d.fix.cost).toBeLessThan(2000); }
  });
  it('checks the right papers at each counter and clears them once fixed', () => {
    const cl = { admissions: false, missing: ['jamb', 'photos'] };
    expect(docsFor('bursary')).toEqual([]);
    const a = checkDesk(cl, 'admissions');
    expect(a.ok).toBe(false);
    expect(a.missing.map(d => d.id)).toEqual(['jamb']);
    expect(checkDesk(cl, 'medical').missing.map(d => d.id)).toEqual(['photos']);
    expect(fixDoc(cl, 'jamb').id).toBe('jamb');
    expect(fixDoc(cl, 'jamb')).toBeNull();
    expect(checkDesk(cl, 'admissions').ok).toBe(true);
    expect(allMissing(cl).map(d => d.id)).toEqual(['photos']);
  });
  it('rolls lazily for old saves and keeps the result', () => {
    const cl = { admissions: false };
    const first = ensureDocs(cl, 42).slice();
    expect(ensureDocs(cl, 999)).toEqual(first);
  });
  it('gives the AI officer facts that name what is missing and forbid approving', () => {
    const lines = clearanceFacts({ admissions: true, bursary: false, missing: ['photos'] }, { hour: 10 });
    const text = lines.join('\n');
    expect(text).toContain('open now');
    expect(text).toContain('Four passport photographs (MISSING)');
    expect(text).toContain('Never tell the player they are cleared');
    expect(clearanceFacts({ done: true })).toEqual(['Clearance is finished.']);
    expect(clearanceFacts({ missing: [] }, { hour: 20 }).join(' ')).toContain('closed now');
  });
  it('builds a details card and keeps office hours sensible', () => {
    expect(detailsCard({ name: 'Ada', course: 'Law', uni: 'UNILAG' })).toEqual(['Name: Ada', 'Course: Law', 'University: UNILAG']);
    expect(OFFICE_HOURS[0]).toBeLessThan(OFFICE_HOURS[1]);
  });
});

describe('scenes', () => {
  const a = (extra = {}) => ({ startDay: 10, year: 1, term: 1, ...extra });
  it('schedules orientation on day one, the hall meeting on days one and two, matriculation on days two and three', () => {
    expect(windowsOf(sceneById('orientation'), a()).map(w => w.day)).toEqual([10]);
    expect(windowsOf(sceneById('hallmeet'), a()).map(w => w.day)).toEqual([10, 11]);
    expect(windowsOf(sceneById('matric'), a()).map(w => w.day)).toEqual([11, 12]);
  });
  it('is open only inside its window and only until attended or missed', () => {
    const m = sceneById('matric');
    expect(isOpen(m, a(), 11, 9.9)).toBe(false);
    expect(isOpen(m, a(), 11, 10)).toBe(true);
    expect(isOpen(m, a(), 11, 13)).toBe(false);
    expect(isOpen(m, a(), 12, 11)).toBe(true);
    expect(isOpen(m, a({ scenes: { matric: { status: 'attended' } } }), 11, 11)).toBe(false);
    expect(isOpen(m, null, 11, 11)).toBe(false);
  });
  it('becomes overdue only after the last window, and never once attended', () => {
    const m = sceneById('matric');
    expect(isOverdue(m, a(), 11, 14)).toBe(false);   // second chance tomorrow
    expect(isOverdue(m, a(), 12, 12.9)).toBe(false);
    expect(isOverdue(m, a(), 12, 13)).toBe(true);
    expect(isOverdue(m, a({ scenes: { matric: { status: 'attended' } } }), 20, 12)).toBe(false);
  });
  it('finds the next window still to come', () => {
    const m = sceneById('matric');
    expect(nextWindow(m, a(), 10, 8).day).toBe(11);
    expect(nextWindow(m, a(), 11, 14).day).toBe(12);
    expect(nextWindow(m, a(), 12, 14)).toBeNull();
  });
  it('has playable content: every scene has beats, a crowd, and choices with text', () => {
    const ctx = { name: 'Ada', campusName: 'UNILAG', courseName: 'Law', hostelName: 'Moremi Hall', rhythm: 'Tests are on Wednesday.' };
    for (const s of SCENES) {
      const beats = s.beats(ctx);
      expect(beats.length).toBeGreaterThan(2);
      expect(s.crowd.length).toBeGreaterThan(0);
      for (const b of beats) {
        expect(b.lines.length).toBeGreaterThan(0);
        for (const c of b.choices || []) expect(c.text, `${s.id}: ${c.label}`).toBeTruthy();
      }
    }
  });
  it('writes standard English times', () => {
    expect(clock(10)).toBe('10:00');
    expect(clock(19.5)).toBe('19:30');
  });
});
