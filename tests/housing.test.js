import { describe, it, expect } from 'vitest';
import { newBill, addBill, owed, dailyBillCheck, payBill, cookBurns, restBonus, HOSTEL_DUES, LATE_FEE, DECOR } from '../src/housing.js';
import { isPresent } from '../src/npcs.js';
import { ACTIONS } from '../src/actions.js';

describe('hostel bills', () => {
  it('creates one bill per semester, due on Friday of week one', () => {
    const bills = [];
    const b = newBill(1, 1, 10);
    expect(addBill(bills, b)).toBe(true);
    expect(addBill(bills, newBill(1, 1, 10))).toBe(false);
    expect(b.due).toBe(14);
    expect(owed(b)).toBe(HOSTEL_DUES);
  });
  it('reminds the day before and adds a late fee once after the deadline', () => {
    const bills = [newBill(1, 1, 10)];
    expect(dailyBillCheck(bills, 12)).toEqual([]);
    expect(dailyBillCheck(bills, 13).map(e => e.type)).toEqual(['reminder']);
    expect(dailyBillCheck(bills, 14)).toEqual([]);
    expect(dailyBillCheck(bills, 15).map(e => e.type)).toEqual(['late']);
    expect(dailyBillCheck(bills, 16)).toEqual([]);
    expect(owed(bills[0])).toBe(HOSTEL_DUES + LATE_FEE);
  });
  it('pays only when you can afford it, and only once', () => {
    const bills = [newBill(1, 1, 10)];
    expect(payBill(bills, bills[0].id, 100).ok).toBe(false);
    expect(bills[0].paid).toBe(false);
    const r = payBill(bills, bills[0].id, 50000);
    expect(r).toMatchObject({ ok: true, cost: HOSTEL_DUES });
    expect(payBill(bills, bills[0].id, 50000).ok).toBe(false);
    expect(dailyBillCheck(bills, 20)).toEqual([]);                    // paid bills are left alone
  });
  it('charges the late fee if you pay late', () => {
    const bills = [newBill(1, 1, 10)];
    dailyBillCheck(bills, 16);
    expect(payBill(bills, bills[0].id, 50000).cost).toBe(HOSTEL_DUES + LATE_FEE);
  });
});

describe('cooking and room', () => {
  it('burns about 15% of the time', () => {
    expect(cookBurns(0.1)).toBe(true);
    expect(cookBurns(0.4)).toBe(false);
  });
  it('rewards decorations with better rest, capped at 9', () => {
    expect(restBonus({})).toBe(0);
    expect(restBonus({ poster: true })).toBe(3);
    expect(restBonus({ poster: true, plant: true, lights: true, extra: true })).toBe(9);
  });
  it('sells every decoration the interior knows how to draw', () => {
    const sold = ACTIONS.shop.filter(a => a.decor).map(a => a.decor).sort();
    expect(sold).toEqual(Object.keys(DECOR).sort());
  });
  it('lets you cook where you live and buy foodstuff in shops', () => {
    expect(ACTIONS.hostel.some(a => a.id === 'cook')).toBe(true);
    expect(ACTIONS.home.some(a => a.id === 'cook')).toBe(true);
    expect(ACTIONS.shop.some(a => a.id === 'foodstuff')).toBe(true);
  });
});

describe('working hours', () => {
  it('knows when staff are at their posts', () => {
    expect(isPresent([[8, 18]], 12)).toBe(true);
    expect(isPresent([[8, 18]], 20)).toBe(false);
    expect(isPresent([[8, 18]], 18)).toBe(false);
    expect(isPresent(undefined, 3)).toBe(true);
  });
  it('supports a split day, like a roommate who is out at class', () => {
    const roommate = [[0, 9], [16, 24]];
    expect(isPresent(roommate, 7)).toBe(true);
    expect(isPresent(roommate, 12)).toBe(false);
    expect(isPresent(roommate, 22)).toBe(true);
  });
});
