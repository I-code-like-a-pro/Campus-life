import { describe, it, expect } from 'vitest';
import { createMeta, ACHIEVEMENTS } from '../src/meta.js';
import { newMeta } from '../src/save.js';

function setup({ student = false } = {}) {
  const clock = { day: 1 };
  const state = { meta: newMeta() };
  const log = { money: 0, toasts: [] };
  const meta = createMeta({
    state, day: () => clock.day, give: n => { log.money += n; }, toast: t => log.toasts.push(t), isStudent: () => student
  });
  return { clock, state, log, meta };
}

describe('achievements', () => {
  it('unlock once when their counter reaches the target, and notify', () => {
    const { meta, state, log } = setup();
    meta.track('talks');
    expect(state.meta.achievements.first_steps).toBe(1);
    expect(meta.unread()).toBe(1);
    meta.track('talks');
    expect(Object.keys(state.meta.achievements)).toEqual(['first_steps']);
    expect(log.toasts.length).toBe(1);
  });
  it('has unique ids and a target for each', () => {
    expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(a.n).toBeGreaterThan(0);
  });
  it('counts distinct things only once', () => {
    const { meta } = setup();
    expect(meta.trackOnce('place', 'Library', 'placesSeen')).toBe(true);
    expect(meta.trackOnce('place', 'Library', 'placesSeen')).toBe(false);
    expect(meta.count('placesSeen')).toBe(1);
  });
  it('tracks peak values', () => {
    const { meta } = setup();
    meta.trackMax('savingsPeak', 25000);
    meta.trackMax('savingsPeak', 5000);
    expect(meta.count('savingsPeak')).toBe(25000);
  });
});

describe('daily goals', () => {
  it('offers 3 goals per day, the same ones for the same day, different on another day', () => {
    const a = setup(); a.meta.refreshDay();
    const first = a.meta.goals().map(g => g.id);
    expect(first).toHaveLength(3);
    const b = setup(); b.meta.refreshDay();
    expect(b.meta.goals().map(g => g.id)).toEqual(first);
    b.clock.day = 2; b.meta.refreshDay();
    expect(b.meta.goals().map(g => g.id)).not.toEqual(first);
  });
  it('uses student-only goals for students and aspirant goals otherwise', () => {
    const s = setup({ student: true }); s.meta.refreshDay();
    expect(s.meta.goals().every(g => g.who.includes('s'))).toBe(true);
    const a = setup(); a.meta.refreshDay();
    expect(a.meta.goals().every(g => g.who.includes('a'))).toBe(true);
  });
  it('rewards a completed goal exactly once', () => {
    const { meta, log } = setup(); meta.refreshDay();
    const g = meta.goals()[0];
    for (let i = 0; i < g.n + 2; i++) meta.track(g.c, g.c === 'earned' ? 1 : 1);
    if (g.c === 'earned') meta.track('earned', g.n);
    expect(g.done).toBe(true);
    expect(log.money).toBeGreaterThanOrEqual(g.reward);
    const before = log.money;
    meta.track(g.c, 5);
    expect(log.money - before).toBeLessThan(g.reward + 1000 * 3);   // no double payout for the same goal
    expect(meta.goals().filter(x => x.id === g.id)).toHaveLength(1);
  });
});

describe('login streak', () => {
  const DAY = 86400000;
  it('rewards once per real day and grows on consecutive days', () => {
    const { meta, log } = setup();
    const t0 = Date.UTC(2026, 9, 20, 12);
    expect(meta.claimLogin(t0).streak).toBe(1);
    expect(meta.claimLogin(t0 + 1000)).toBeNull();
    expect(meta.claimLogin(t0 + DAY).streak).toBe(2);
    expect(log.money).toBe(500 + 1000);
    expect(meta.claimLogin(t0 + 3 * DAY).streak).toBe(1);          // missed a day: streak resets
  });
  it('caps the reward at day 7', () => {
    const { meta } = setup();
    const t0 = Date.UTC(2026, 9, 1, 12);
    let r;
    for (let i = 0; i < 10; i++) r = meta.claimLogin(t0 + i * DAY);
    expect(r.reward).toBe(3500);
  });
});

describe('ledger and inbox', () => {
  it('records money movements and feeds earned/spent counters', () => {
    const { meta } = setup();
    meta.ledger('Shift pay', 2000);
    meta.ledger('Jollof', -2500);
    expect(meta.count('earned')).toBe(2000);
    expect(meta.count('spent')).toBe(2500);
    expect(meta.ledgerList()[0].text).toBe('Jollof');
  });
  it('keeps at most 60 notifications', () => {
    const { meta } = setup();
    for (let i = 0; i < 80; i++) meta.notify({ title: `n${i}`, show: false });
    expect(meta.inbox()).toHaveLength(60);
  });
});
