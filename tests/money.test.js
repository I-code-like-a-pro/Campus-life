import { describe, it, expect } from 'vitest';
import { addBill, dailyBillCheck, payBill, owed } from '../src/housing.js';
import {
  FEES, feeBill, examBlock, instalmentCost, payInstalment, mumFeeHelp, hasEscape, feeNotes, isFee,
  ensureMoney, shopFor, buyTextbook, buyStationery, TEXTBOOK, deposit, withdraw, mumTransfersLeft, requestMum, MUM_WEEKLY_LIMIT, MUM_TRANSFER, weekOf
} from '../src/money.js';
import { CAMPUSES, CAMPUS_ORDER } from '../src/campuses.js';
import { ACTIONS } from '../src/actions.js';
import { ENTERABLE } from '../src/interiors.js';
import { interiorNpcDefs } from '../src/npcs.js';
import { newMeta } from '../src/save.js';

describe('school fees', () => {
  it('has a labelled placeholder amount for each university', () => {
    for (const id of CAMPUS_ORDER) { expect(FEES[id].amount).toBeGreaterThan(0); expect(FEES[id].lateFee).toBeGreaterThan(0); }
  });
  it('is not charged in the very first semester (clearance already covered it)', () => {
    expect(feeBill('ui', 1, 1, 10)).toBeNull();
    expect(feeBill('ui', 1, 2, 20)).toMatchObject({ id: 'fees-1-2', kind: 'fees', amount: FEES.ui.amount, due: 23 });
  });
  it('reuses the bills system: one bill per semester, reminder, then a late fee', () => {
    const bills = [];
    expect(addBill(bills, feeBill('oau', 2, 1, 30))).toBe(true);
    expect(addBill(bills, feeBill('oau', 2, 1, 30))).toBe(false);
    expect(dailyBillCheck(bills, 32).map(e => e.type)).toEqual(['reminder']);
    expect(dailyBillCheck(bills, 34).map(e => e.type)).toEqual(['late']);
    expect(owed(bills[0])).toBe(FEES.oau.amount + FEES.oau.lateFee);
  });
  it('blocks exams only once the fee is overdue and nothing has been paid', () => {
    const bills = [feeBill('ui', 2, 1, 30)];
    expect(examBlock(bills)).toBeNull();
    dailyBillCheck(bills, 34);
    expect(examBlock(bills)?.id).toBe('fees-2-1');
    expect(payBill(bills, 'fees-2-1', 99999).ok).toBe(true);
    expect(examBlock(bills)).toBeNull();
  });
  it('lets a half payment clear the player for exams and waives the late fee', () => {
    const bills = [feeBill('unilag', 2, 1, 30)];
    dailyBillCheck(bills, 34);
    const half = instalmentCost(bills[0]);
    expect(half).toBe(Math.ceil((FEES.unilag.amount + FEES.unilag.lateFee) / 2));
    expect(payInstalment(bills, bills[0].id, half - 1, 34).ok).toBe(false);
    const r = payInstalment(bills, bills[0].id, half, 34);
    expect(r.ok).toBe(true);
    expect(examBlock(bills)).toBeNull();
    expect(bills[0].late).toBe(false);
    expect(bills[0].due).toBe(41);
    expect(owed(bills[0])).toBe(FEES.unilag.amount + FEES.unilag.lateFee - half);
    expect(payInstalment(bills, bills[0].id, 99999, 34).ok).toBe(false);          // only one instalment
    expect(dailyBillCheck(bills, 38)).toEqual([]);
  });
  it('never soft-locks: with any amount of cash the player can reach exam clearance', () => {
    for (const cash of [0, 1, 500, 5000, 14999, 15000, 40000]) {
      const bills = [feeBill('unilag', 2, 1, 30)];
      dailyBillCheck(bills, 34);
      expect(hasEscape(bills[0], cash)).toBe(true);
      let money = cash;
      let r = payInstalment(bills, bills[0].id, money, 34);
      if (!r.ok) {
        const help = mumFeeHelp(bills, bills[0].id, money);
        expect(help.ok).toBe(true);
        money += help.amount;
        r = payInstalment(bills, bills[0].id, money, 34);
      }
      expect(r.ok, `cash ${cash}`).toBe(true);
      expect(examBlock(bills)).toBeNull();
    }
  });
  it('limits Mum fee help to once per bill and never more than the shortfall', () => {
    const bills = [feeBill('ui', 2, 1, 30)];
    const need = instalmentCost(bills[0]);
    const h = mumFeeHelp(bills, bills[0].id, 1000);
    expect(h).toMatchObject({ ok: true, amount: need - 1000 });
    expect(mumFeeHelp(bills, bills[0].id, 0).ok).toBe(false);
    expect(hasEscape(bills[0], 0)).toBe(false);                 // helped once and still broke: the bill-specific escape is used up...
    expect(isFee(bills[0])).toBe(true);
  });
  it('sends fee reminders on the due day and the evening before exams', () => {
    const bills = [feeBill('ui', 2, 1, 30)];
    expect(feeNotes(bills, 33).map(n => n.title)).toEqual(['Fees are due today']);
    expect(feeNotes(bills, 34).map(n => n.title)).toEqual(['Exams need your fees']);
    bills[0].cleared = true;
    expect(feeNotes(bills, 33)).toEqual([]);
  });
});

describe('bookshop', () => {
  it('sells one textbook per course per semester and two a day', () => {
    const meta = newMeta();
    const shop = shopFor(meta, '1-1');
    expect(buyTextbook(shop, 'GST101', 5, 100000)).toMatchObject({ ok: true, cost: TEXTBOOK.price, boost: TEXTBOOK.boost });
    expect(buyTextbook(shop, 'GST101', 5, 100000).ok).toBe(false);
    expect(buyTextbook(shop, 'MTH101', 5, 100000).ok).toBe(true);
    expect(buyTextbook(shop, 'PHY101', 5, 100000).ok).toBe(false);          // third today
    expect(buyTextbook(shop, 'PHY101', 6, 100000).ok).toBe(true);           // fine tomorrow
  });
  it('needs enough money and resets each semester', () => {
    const meta = newMeta();
    expect(buyTextbook(shopFor(meta, '1-1'), 'GST101', 5, 100).ok).toBe(false);
    expect(buyStationery(shopFor(meta, '1-1'), 100000).ok).toBe(true);
    expect(buyStationery(shopFor(meta, '1-1'), 100000).ok).toBe(false);
    expect(buyStationery(shopFor(meta, '1-2'), 100000).ok).toBe(true);
  });
});

describe('bank and ATM', () => {
  it('moves cash to savings and back, never more than is available', () => {
    const meta = newMeta();
    expect(deposit(meta, 3000, 5000)).toBe(3000);
    expect(meta.savings).toBe(3000);
    expect(withdraw(meta, 5000)).toBe(3000);
    expect(meta.savings).toBe(0);
  });
  it('limits Mum transfers per week', () => {
    const meta = newMeta();
    expect(weekOf(1)).toBe(0);
    expect(weekOf(8)).toBe(1);
    for (let i = 0; i < MUM_WEEKLY_LIMIT; i++) expect(requestMum(meta, 3)).toMatchObject({ ok: true, amount: MUM_TRANSFER });
    expect(requestMum(meta, 7).ok).toBe(false);
    expect(mumTransfersLeft(meta, 7)).toBe(0);
    expect(mumTransfersLeft(meta, 8)).toBe(MUM_WEEKLY_LIMIT);
    expect(requestMum(meta, 8).ok).toBe(true);
  });
  it('creates its state lazily for older saves', () => {
    const meta = { savings: 0 };
    expect(ensureMoney(meta).shop.books).toEqual([]);
  });
});

describe('new places', () => {
  const rect = b => ({ x0: b.x - b.w / 2 - 1.5, x1: b.x + b.w / 2 + 1.5, z0: b.z - b.d / 2 - 1.5, z1: b.z + b.d / 2 + 1.5 });
  const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
  it('puts a bookshop and a bank on every campus without overlapping anything', () => {
    for (const id of CAMPUS_ORDER) {
      const c = CAMPUSES[id];
      const types = new Set(c.buildings.map(b => b.type));
      expect(types.has('books') && types.has('bank'), id).toBe(true);
      const boxes = c.buildings.map(b => [b.name, rect(b)]);
      if (c.field) boxes.push(['field', { x0: c.field.x - c.field.w / 2, x1: c.field.x + c.field.w / 2, z0: c.field.z - c.field.d / 2, z1: c.field.z + c.field.d / 2 }]);
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (/Bookshop|Bank/.test(boxes[i][0] + boxes[j][0])) expect(overlap(boxes[i][1], boxes[j][1]), `${id}: ${boxes[i][0]} vs ${boxes[j][0]}`).toBe(false);
      for (const b of c.buildings) {                     // stays inside the fence and off the lagoon
        expect(b.x - b.w / 2).toBeGreaterThan(-46); expect(Math.abs(b.z) + b.d / 2).toBeLessThan(55);
      }
    }
  });
  it('can enter the new buildings and finds a worker in each', () => {
    expect(ENTERABLE.has('books') && ENTERABLE.has('bank')).toBe(true);
    for (const type of ['books', 'bank']) {
      const defs = interiorNpcDefs({ type, name: `T ${type}` }, { npcAnchor: { x: 0, z: 0 }, ox: 0 });
      expect(defs).toHaveLength(1);
      expect(defs[0].dialogue).toBeTruthy();
    }
  });
  it('adds two more part-time jobs with a pay, a limit and minutes', () => {
    const jobs = Object.values(ACTIONS).flat().filter(a => a.pay).map(a => a.id);
    expect(jobs).toEqual(expect.arrayContaining(['tutor', 'libassist']));
    expect(ACTIONS.registry.some(a => a.money === 'fees')).toBe(true);
    expect(ACTIONS.bank.some(a => a.money === 'atm')).toBe(true);
  });
});
