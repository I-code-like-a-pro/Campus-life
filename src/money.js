/*
 * The money rhythm (see docs/MONEY.md): school fees each semester, the bookshop, and the bank / ATM.
 * Pure rules only, so they can be tested. State lives in state.meta (bills, savings) and state.meta.money (shop and Mum limits).
 * Fee bills reuse the hostel bills system in housing.js: same list, same reminders, same phone screen.
 */
import { owed } from './housing.js';
import { PACKS, PACK_ORDER } from './packs/index.js';

/* ---------------- school fees ---------------- */

// PLACEHOLDER amounts per university (game values, not the real fees of any school). They live in each university pack (src/packs); change them there.
export const FEES = Object.fromEntries(PACK_ORDER.map(id => [id, { ...PACKS[id].fees }]));
export const FEE_DUE_OFFSET = 3;              // due on semester day 4 (Thursday): startDay + 3
export const EXAM_OFFSET_FROM_DUE = 2;        // exams are on Saturday, two days after the due day
export const INSTALMENT_SHARE = 0.5;          // paying half now clears you to write exams
export const INSTALMENT_EXTENSION = 7;        // the rest is due a week later

export const isFee = b => !!b && b.kind === 'fees';

/**
 * The fee bill for a semester, or null. The first semester of first year is already covered by the clearance fee paid at
 * the Bursary, so fees start from the second semester.
 */
export function feeBill(uni, year, term, startDay) {
  if (year === 1 && term === 1) return null;
  const f = FEES[uni] || FEES.unilag;
  return {
    id: `fees-${year}-${term}`, kind: 'fees', label: `School fees (${year}00L, semester ${term})`,
    amount: f.amount, due: startDay + FEE_DUE_OFFSET, paid: false, late: false, lateFee: f.lateFee, cleared: false, mumHelped: false
  };
}

/** The unpaid fee bill that stops the player writing exams (overdue and no instalment paid), or null. */
export function examBlock(bills) {
  return (bills || []).find(b => isFee(b) && !b.paid && !b.cleared && b.late) || null;
}

export const examBlockMessage = bill =>
  `🚫 You cannot write exams until your ${bill.label.charAt(0).toLowerCase()}${bill.label.slice(1)} is settled. Pay in full, or pay half now as an instalment, in your phone under My room and bills or at the Bursary counter in the Registry.`;

/** What paying half now costs. */
export const instalmentCost = bill => Math.ceil(owed(bill) * INSTALMENT_SHARE);

/** Pays half of what is owed. Clears the bill for exams, waives the late fee and moves the deadline for the rest. */
export function payInstalment(bills, id, money, day) {
  const bill = bills.find(b => b.id === id && !b.paid && isFee(b));
  if (!bill) return { ok: false, cost: 0, message: 'There is nothing to pay.' };
  if (bill.cleared) return { ok: false, cost: 0, message: 'You already paid an instalment. Pay the rest in full when you can.' };
  const cost = instalmentCost(bill);
  if (money < cost) return { ok: false, cost, message: `The instalment is ${fmt(cost)}. You need ${fmt(cost - money)} more. Ask Mum for help with fees.` };
  bill.amount = owed(bill) - cost;
  bill.lateFee = 0;
  bill.late = false;
  bill.cleared = true;
  bill.due = Math.max(bill.due, day) + INSTALMENT_EXTENSION;
  return { ok: true, cost, message: `Paid ${fmt(cost)} as an instalment. You are cleared for exams. ${fmt(bill.amount)} is still due on Day ${bill.due}.` };
}

/** Mum can help once per fee bill: she sends exactly what is missing for the instalment (never more than half the fee). */
export function mumFeeHelp(bills, id, money) {
  const bill = bills.find(b => b.id === id && !b.paid && isFee(b));
  if (!bill) return { ok: false, amount: 0, message: 'There are no fees to ask about.' };
  if (bill.mumHelped) return { ok: false, amount: 0, message: '"My child, I already helped with this one. Try the instalment."' };
  const need = bill.cleared ? 0 : instalmentCost(bill);
  const amount = Math.max(0, need - money);
  bill.mumHelped = true;
  if (!amount) return { ok: true, amount: 0, message: '"You can already afford the instalment, my child. Go and pay it."' };
  return { ok: true, amount, message: `"Fees again? Okay. I have sent ${fmt(amount)} for the instalment. Please pay it today."` };
}

/** True when the player can always do something about this fee bill (pay half, or get Mum's help). Used by tests. */
export function hasEscape(bill, money) {
  if (!isFee(bill) || bill.paid || bill.cleared) return true;
  return money >= instalmentCost(bill) || !bill.mumHelped;
}

/** Extra reminders for fee bills (the day-before reminder and the late fee come from housing.dailyBillCheck). */
export function feeNotes(bills, day) {
  const notes = [];
  for (const b of bills) {
    if (!isFee(b) || b.paid) continue;
    if (day === b.due && !b.cleared) notes.push({ icon: '⏰', title: 'Fees are due today', text: `Pay ${fmt(owed(b))} today to avoid a late fee. Half now is allowed.` });
    if (day === b.due + 1 && !b.cleared) notes.push({ icon: '🚫', title: 'Exams need your fees', text: 'Exams are tomorrow. You cannot write them until your school fees are settled. Pay half as an instalment, or ask Mum for help.' });
  }
  return notes;
}

/** The announcement when a semester's fee bill is issued. */
export const feeIssuedNote = b => ({ icon: '🎓', title: 'School fees are due', text: `${b.label}: ${fmt(owed(b))}, due on Day ${b.due}. Pay at the Bursary counter in the Registry or in your phone. Late payment adds a fee and blocks exams.` });

/** Notice for a billing event on a fee bill (from housing.dailyBillCheck). */
export function feeEventNote(ev) {
  const b = ev.bill;
  if (ev.type === 'reminder') return { icon: '💳', title: 'School fees due tomorrow', text: `${fmt(owed(b))} is due tomorrow. Pay at the Bursary counter or in your phone.` };
  return { icon: '⚠️', title: 'Late fee added', text: `Your school fees are overdue. A late fee was added: ${fmt(owed(b))} now. You cannot write exams until you pay, or pay half as an instalment.` };
}

/* ---------------- shared helpers ---------------- */

const fmt = n => `₦${Math.round(n).toLocaleString('en-NG')}`;
export const money = fmt;

/** The extra state kept in meta, created on first use (older saves have none). */
export function ensureMoney(meta) {
  if (!meta.money || typeof meta.money !== 'object') meta.money = {};
  const m = meta.money;
  if (!m.shop) m.shop = { sem: '', books: [], stationery: false, day: 0, today: 0 };
  if (!m.mum) m.mum = { week: -1, n: 0 };
  return m;
}

export const weekOf = day => Math.floor((day - 1) / 7);

/* ---------------- bookshop ---------------- */

export const TEXTBOOK = { price: 3500, boost: 9, perDay: 2 };      // one per course per semester, two per day
export const STATIONERY = { price: 1500, boost: 3 };               // one pack per semester, helps every course

/** Resets the shop record when the semester changes. */
export function shopFor(meta, semKey) {
  const s = ensureMoney(meta).shop;
  if (s.sem !== semKey) { s.sem = semKey; s.books = []; s.stationery = false; }
  return s;
}

export function buyTextbook(shop, code, day, cash) {
  if (shop.books.includes(code)) return { ok: false, cost: 0, message: 'You already have the textbook for that course this semester.' };
  if (shop.day !== day) { shop.day = day; shop.today = 0; }
  if (shop.today >= TEXTBOOK.perDay) return { ok: false, cost: 0, message: `The shop limits you to ${TEXTBOOK.perDay} textbooks a day. Come back tomorrow.` };
  if (cash < TEXTBOOK.price) return { ok: false, cost: TEXTBOOK.price, message: `A textbook costs ${fmt(TEXTBOOK.price)}. You do not have enough.` };
  shop.books.push(code);
  shop.today += 1;
  return { ok: true, cost: TEXTBOOK.price, boost: TEXTBOOK.boost, message: `Textbook bought. Your preparation for ${code} improved.` };
}

export function buyStationery(shop, cash) {
  if (shop.stationery) return { ok: false, cost: 0, message: 'You already bought your stationery pack this semester.' };
  if (cash < STATIONERY.price) return { ok: false, cost: STATIONERY.price, message: `The stationery pack costs ${fmt(STATIONERY.price)}. You do not have enough.` };
  shop.stationery = true;
  return { ok: true, cost: STATIONERY.price, boost: STATIONERY.boost, message: 'Notebooks, pens and highlighters. Your notes are neater and your preparation improved a little.' };
}

/* ---------------- bank / ATM ---------------- */

export const ATM_STEP = 5000;
export const MUM_TRANSFER = 4000;
export const MUM_WEEKLY_LIMIT = 2;

/** Moves up to `amount` of cash into savings. Returns the amount moved. */
export function deposit(meta, cash, amount) {
  const n = Math.max(0, Math.min(amount, cash));
  meta.savings += n;
  return n;
}
export function withdraw(meta, amount) {
  const n = Math.max(0, Math.min(amount, meta.savings));
  meta.savings -= n;
  return n;
}

/** How many Mum transfers are left this week. */
export function mumTransfersLeft(meta, day) {
  const mum = ensureMoney(meta).mum;
  return mum.week === weekOf(day) ? Math.max(0, MUM_WEEKLY_LIMIT - mum.n) : MUM_WEEKLY_LIMIT;
}
export function requestMum(meta, day) {
  const mum = ensureMoney(meta).mum;
  if (mum.week !== weekOf(day)) { mum.week = weekOf(day); mum.n = 0; }
  if (mum.n >= MUM_WEEKLY_LIMIT) return { ok: false, amount: 0, message: '"My child, I have sent you enough this week. We will talk next week."' };
  mum.n += 1;
  return { ok: true, amount: MUM_TRANSFER, message: `"Okay. I have sent ${fmt(MUM_TRANSFER)}. Spend it wisely."` };
}
