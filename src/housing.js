/*
 * Hostel life (spec F-100, F-103, F-104): hostel dues, cooking with foodstuff, and room decorations.
 * Pure rules, so they can be tested. State lives in state.meta (bills, pantry, room).
 */

export const HOSTEL_DUES = 10000;
export const LATE_FEE = 1000;
export const PANTRY_PER_PURCHASE = 4;
export const BURN_CHANCE = 0.15;

export const DECOR = {
  poster: { name: 'Room poster', icon: '🖼️' },
  plant:  { name: 'Potted plant', icon: '🪴' },
  lights: { name: 'Fairy lights', icon: '✨' }
};

/** The hostel bill for a semester, due on Friday of the first week. */
export function newBill(year, term, startDay) {
  return { id: `hostel-${year}-${term}`, label: `Hostel dues (${year}00L, semester ${term})`, amount: HOSTEL_DUES, due: startDay + 4, paid: false, late: false, lateFee: LATE_FEE };
}

/** Adds a bill unless one with the same id exists. Returns true if added. */
export function addBill(bills, bill) {
  if (bills.some(b => b.id === bill.id)) return false;
  bills.push(bill);
  return true;
}

export const owed = bill => bill.amount + (bill.late ? bill.lateFee : 0);

/**
 * Call once per game day. Returns events to announce:
 *   { type: 'reminder', bill }  the day before it is due
 *   { type: 'late', bill }      the day after the deadline (a late fee is added once)
 */
export function dailyBillCheck(bills, day) {
  const events = [];
  for (const b of bills) {
    if (b.paid) continue;
    if (day === b.due - 1) events.push({ type: 'reminder', bill: b });
    if (day > b.due && !b.late) { b.late = true; events.push({ type: 'late', bill: b }); }
  }
  return events;
}

/** Pays a bill from `money`. Returns { ok, cost, message }; the caller deducts `cost` when ok. */
export function payBill(bills, id, money) {
  const bill = bills.find(b => b.id === id && !b.paid);
  if (!bill) return { ok: false, cost: 0, message: 'There is nothing to pay.' };
  const cost = owed(bill);
  if (money < cost) return { ok: false, cost, message: `You need ₦${cost.toLocaleString('en-NG')} for that.` };
  bill.paid = true;
  return { ok: true, cost, message: `Paid ₦${cost.toLocaleString('en-NG')}. Receipt saved.` };
}

export const cookBurns = roll => roll < BURN_CHANCE;

/** A nicer room helps you rest: each decoration takes a little stress off after sleeping (up to 9). */
export const restBonus = room => Math.min(9, 3 * Object.keys(room || {}).length);
