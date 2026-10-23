import { describe, it, expect } from 'vitest';
import { buildReport, VERSION } from '../src/feedback.js';

const base = { userAgent: 'TestPhone/1.0', viewport: '375x812 @2x', errors: [] };

describe('feedback report', () => {
  it('includes the version, device and where the player is, but never the name or money', () => {
    const state = { name: 'SecretName', money: 98765, campusId: 'ui', academic: { year: 2, term: 1 } };
    const r = buildReport(state, { ...base, day: 12 });
    expect(r).toContain(VERSION);
    expect(r).toContain('TestPhone/1.0');
    expect(r).toContain('Student, 200 level, semester 1 at UI');
    expect(r).toContain('Game day: 12');
    expect(r).not.toContain('SecretName');
    expect(r).not.toContain('98765');
  });
  it('describes each stage of the journey', () => {
    expect(buildReport({ aspirant: {}, campusId: 'home' }, base)).toContain('JAMB aspirant at home');
    expect(buildReport({ admission: {}, campusId: 'home' }, base)).toContain('preparing to travel');
    expect(buildReport({ clearance: { done: false }, campusId: 'unilag' }, base)).toContain('Clearance');
  });
  it('lists at most the last three errors, shortened', () => {
    const errors = Array.from({ length: 5 }, (_, i) => ({ kind: 'error', message: `boom ${i} ${'x'.repeat(300)}` }));
    const r = buildReport({ aspirant: {} }, { ...base, errors });
    expect(r).toContain('boom 4');
    expect(r).not.toContain('boom 1');
    expect(r.split('\n').find(l => l.includes('boom 4')).length).toBeLessThan(160);
  });
  it('leaves space for the reviewer to answer', () => {
    const r = buildReport({ aspirant: {} }, base);
    for (const q of ['What I liked:', 'What was confusing or broken:', 'Ideas I would add:']) expect(r).toContain(q);
  });
});
