import { describe, it, expect } from 'vitest';
import {
  levelIndex, levelOf, getRel, addPoints, dailyChat, traitOf, TRAITS, toneDelta, giftDelta, canAsk, loanBill,
  CLUBS, socialActions, joinClub, leaveClub, MAX_CLUBS, clubSchedule, EVENTS, MAX_POINTS
} from '../src/social.js';

describe('relationship levels', () => {
  it('maps points to levels', () => {
    expect(levelOf(0).name).toBe('Stranger');
    expect(levelOf(8).name).toBe('Acquaintance');
    expect(levelOf(25).name).toBe('Friend');
    expect(levelOf(55).name).toBe('Close friend');
    expect(levelOf(100).name).toBe('Best friend');
    expect(levelIndex(24)).toBe(1);
  });
  it('creates a record per NPC and caps points', () => {
    const rel = {};
    const a = getRel(rel, { id: 'x', name: 'Ada' });
    expect(a).toBe(getRel(rel, { id: 'x', name: 'Ada' }));
    addPoints(a, 9999);
    expect(a.points).toBe(MAX_POINTS);
    addPoints(a, -9999);
    expect(a.points).toBe(0);
  });
  it('reports a level change so a new friendship can be celebrated', () => {
    const rel = getRel({}, { id: 'x', name: 'Ada' });
    addPoints(rel, 20);
    const r = addPoints(rel, 6);
    expect(r).toEqual({ from: 1, to: 2 });
  });
  it('pays out the daily chat only once per day', () => {
    const rel = getRel({}, { id: 'x', name: 'Ada' });
    expect(dailyChat(rel, 5)).toBe(2);
    expect(dailyChat(rel, 5)).toBe(0);
    expect(dailyChat(rel, 6)).toBe(2);
  });
});

describe('personality and tone', () => {
  it('gives every NPC a stable trait', () => {
    for (let i = 0; i < 30; i++) {
      const id = `crowd-${i}`;
      expect(TRAITS).toContain(traitOf(id));
      expect(traitOf(id)).toBe(traitOf(id));
    }
    expect(new Set(Array.from({ length: 60 }, (_, i) => traitOf(`crowd-${i}`))).size).toBeGreaterThan(2);
  });
  it('rewards the tone a trait likes and punishes the one it hates', () => {
    expect(toneDelta('funny', 'joke')).toBe(4);
    expect(toneDelta('funny', 'serious')).toBe(-1);
    expect(toneDelta('serious', 'serious')).toBe(4);
    expect(toneDelta('shy', 'compliment')).toBe(4);
    expect(toneDelta('shy', 'joke')).toBe(-1);
    expect(toneDelta('foodie', 'joke')).toBe(1);
  });
  it('foodies love snacks', () => {
    expect(giftDelta('foodie', 'snack')).toBeGreaterThan(giftDelta('funny', 'snack'));
    expect(giftDelta('funny', 'gift')).toBeGreaterThan(giftDelta('funny', 'snack'));
  });
});

describe('favours', () => {
  it('unlock with friendship', () => {
    expect(canAsk('loan', 10)).toBe(false);
    expect(canAsk('loan', 25)).toBe(true);
    expect(canAsk('notes', 25)).toBe(false);
    expect(canAsk('notes', 55)).toBe(true);
  });
  it('a loan becomes a bill due in a week, tied to the lender', () => {
    const b = loanBill({ id: 'crowd-3', name: 'Kemi' }, 10);
    expect(b).toMatchObject({ amount: 2000, due: 17, npc: 'crowd-3', lateFee: 0, paid: false });
  });
});

describe('clubs and events', () => {
  it('joins up to two clubs and can leave', () => {
    const clubs = [];
    expect(joinClub(clubs, 'debate').ok).toBe(true);
    expect(joinClub(clubs, 'debate').ok).toBe(false);
    expect(joinClub(clubs, 'tech').ok).toBe(true);
    expect(joinClub(clubs, 'drama').ok).toBe(false);
    expect(clubs).toHaveLength(MAX_CLUBS);
    expect(leaveClub(clubs, 'debate')).toBe(true);
    expect(joinClub(clubs, 'drama').ok).toBe(true);
  });
  it('offers a club meeting only at its venue, on its days, in the evening', () => {
    const ids = a => a.map(x => x.id);
    expect(ids(socialActions({ venue: 'auditorium', sd: 2, hour: 17.5, clubs: ['debate'] }))).toContain('club-debate');
    expect(ids(socialActions({ venue: 'field', sd: 2, hour: 17.5, clubs: ['debate'] }))).not.toContain('club-debate');
    expect(ids(socialActions({ venue: 'auditorium', sd: 3, hour: 17.5, clubs: ['debate'] }))).not.toContain('club-debate');
    expect(ids(socialActions({ venue: 'auditorium', sd: 2, hour: 12, clubs: ['debate'] }))).not.toContain('club-debate');
    expect(ids(socialActions({ venue: 'auditorium', sd: 2, hour: 17.5, clubs: [] }))).toEqual([]);
  });
  it('runs the weekly events on their days', () => {
    expect(socialActions({ venue: 'field', sd: 5, hour: 21, clubs: [] }).map(a => a.id)).toEqual(['party']);
    expect(socialActions({ venue: 'field', sd: 6, hour: 17, clubs: [] }).map(a => a.id)).toEqual(['match']);
    expect(socialActions({ venue: 'auditorium', sd: 7, hour: 10, clubs: [] }).map(a => a.id)).toEqual(['fellowship']);
    expect(socialActions({ venue: 'field', sd: 1, hour: 21, clubs: [] })).toEqual([]);
  });
  it('describes every club schedule and gives each club a real venue', () => {
    for (const c of CLUBS) { expect(clubSchedule(c)).toMatch(/at 17:00/); expect(['field', 'auditorium']).toContain(c.venue); }
    for (const e of EVENTS) expect(e.hours[1]).toBeGreaterThan(e.hours[0]);
  });
});
