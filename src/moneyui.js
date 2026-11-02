import { showModal } from './modal.js';
import { owed } from './housing.js';
import {
  isFee, feeBill, examBlock, examBlockMessage, instalmentCost, payInstalment, mumFeeHelp, feeNotes, feeEventNote, feeIssuedNote,
  shopFor, buyTextbook, buyStationery, TEXTBOOK, STATIONERY, ATM_STEP, deposit, withdraw, mumTransfersLeft, requestMum, MUM_TRANSFER, MUM_WEEKLY_LIMIT, money as naira
} from './money.js';
import { addBill } from './housing.js';

/**
 * Dialogs and wiring for the money rhythm: the Bursary counter, the Bookshop and the ATM (spec F-080 to F-084).
 * deps: { state, meta, academics, day(), give(n), spend(n) -> boolean, notify(note), toast(text), sfx(name), save() }
 */
export function createMoney({ state, meta, academics, day, give, toast, sfx, save }) {
  const back = [{ label: '← Back', value: 'b', secondary: true }];
  const bills = () => state.meta.bills;
  const feeBills = () => bills().filter(b => isFee(b) && !b.paid);

  /* ---- called by the game loop ---- */
  function semesterStart(info) {
    const bill = feeBill(state.campusId, info.year, info.term, info.startDay);
    if (bill && addBill(bills(), bill)) meta.notify(feeIssuedNote(bill));
  }
  function billEvent(ev) { meta.notify(feeEventNote(ev)); }
  function daily(d) { for (const n of feeNotes(bills(), d)) meta.notify(n); }
  /** Returns true (and tells the player) when school fees stop them writing exams. */
  function blockExam() {
    const b = examBlock(bills());
    if (!b) return false;
    toast(examBlockMessage(b));
    return true;
  }

  /* ---- bills: full payment is handled by the game's payBill; these are the fee extras ---- */
  function billAction(id) {
    const [kind, billId] = id.split(':');
    if (kind === 'part') {
      const r = payInstalment(bills(), billId, state.money, day());
      if (r.ok) { state.money -= r.cost; meta.ledger('School fees (instalment)', -r.cost, { count: false }); sfx('coin'); save(); }
      return r.message;
    }
    if (kind === 'mum') {
      const r = mumFeeHelp(bills(), billId, state.money);
      if (r.ok && r.amount) { give(r.amount); meta.ledger('Mum sent money for fees', r.amount, { count: false }); sfx('coin'); }
      save();
      return r.message;
    }
    return 'Not available.';
  }

  /* ---- Bursary counter ---- */
  async function bursary() {
    for (;;) {
      const open = feeBills();
      if (!open.length) {
        await showModal({ title: '💳 Bursary counter', lines: ['"Your school fees are fully paid. Keep your receipt safe."', 'Fees fall due near the start of each semester.'], buttons: back });
        return;
      }
      const buttons = [];
      for (const b of open) {
        buttons.push({ label: `Pay in full (${naira(owed(b))})`, value: b.id });
        if (!b.cleared) buttons.push({ label: `Pay half now (${naira(instalmentCost(b))})`, value: `part:${b.id}` });
        if (!b.mumHelped && !b.cleared && state.money < instalmentCost(b)) buttons.push({ label: '📞 Ask Mum for help', value: `mum:${b.id}` });
      }
      const pick = await showModal({
        title: '💳 Bursary counter',
        lines: [`Cash: ${naira(state.money)}`, ...open.map(b => `• ${b.label}: ${naira(owed(b))}, due Day ${b.due}${b.late ? ' (late fee added)' : ''}${b.cleared ? ' (instalment paid)' : ''}`), 'Fees that are overdue stop you writing exams. Paying half is enough to be cleared.'],
        buttons: [...buttons, ...back]
      });
      if (pick === 'b') return;
      const msg = /^(part|mum):/.test(pick) ? billAction(pick) : payFull(pick);
      await showModal({ title: '💳 Bursary counter', lines: [msg], buttons: back });
    }
  }
  function payFull(id) {
    const bill = bills().find(b => b.id === id && !b.paid);
    if (!bill) return 'There is nothing to pay.';
    const cost = owed(bill);
    if (state.money < cost) return `You need ${naira(cost)}. You have ${naira(state.money)}. You can pay half now instead.`;
    bill.paid = true;
    state.money -= cost;
    meta.ledger(bill.label, -cost, { count: false });
    meta.track('billsPaid');
    sfx('coin');
    save();
    return `Paid ${naira(cost)}. Receipt saved.`;
  }

  /* ---- Bookshop ---- */
  async function textbooks() {
    const a = state.academic;
    if (!a || !a.courses?.length) { toast('Textbooks are for enrolled students.'); return; }
    for (;;) {
      const shop = shopFor(state.meta, `${a.year}-${a.term}`);
      const pick = await showModal({
        title: '📚 Textbooks',
        lines: [`Each textbook costs ${naira(TEXTBOOK.price)} and adds ${TEXTBOOK.boost} points of preparation to one course. One per course each semester, ${TEXTBOOK.perDay} a day at most.`, `Cash: ${naira(state.money)}`],
        buttons: [...a.courses.map(c => ({ label: `${shop.books.includes(c.code) ? '✅ ' : ''}${c.code} · ${c.title} (${c.knowledge}%)`, value: c.code })), ...back]
      });
      if (pick === 'b') return;
      const r = buyTextbook(shop, pick, day(), state.money);
      if (r.ok) {
        state.money -= r.cost;
        meta.ledger(`Textbook ${pick}`, -r.cost, { count: false });
        academics.boostCourse(pick, r.boost);
        meta.track('booksBought');
        sfx('coin');
        save();
      }
      await showModal({ title: '📚 Textbooks', lines: [r.message], buttons: back });
    }
  }
  function stationery() {
    const a = state.academic;
    if (!a) { toast('Stationery is for enrolled students.'); return; }
    const r = buyStationery(shopFor(state.meta, `${a.year}-${a.term}`), state.money);
    if (r.ok) {
      state.money -= r.cost;
      meta.ledger('Stationery pack', -r.cost, { count: false });
      academics.boostAll(r.boost);
      sfx('coin');
      save();
    }
    toast(r.message);
  }

  /* ---- ATM ---- */
  async function atm() {
    for (;;) {
      const left = mumTransfersLeft(state.meta, day());
      const pick = await showModal({
        title: '🏧 ATM',
        lines: [`Cash: ${naira(state.money)}`, `Savings: ${naira(state.meta.savings)}`, `Mum transfers left this week: ${left} of ${MUM_WEEKLY_LIMIT} (${naira(MUM_TRANSFER)} each)`],
        buttons: [
          { label: `💾 Save ${naira(ATM_STEP)}`, value: 'in' },
          { label: '💾 Save all my cash', value: 'inall' },
          { label: `💸 Withdraw ${naira(ATM_STEP)}`, value: 'out' },
          { label: '💸 Withdraw all savings', value: 'outall' },
          { label: left ? '📞 Ask Mum to send money' : '📞 Mum (no more this week)', value: 'mum' },
          ...back
        ]
      });
      if (pick === 'b') return;
      let msg;
      if (pick === 'in' || pick === 'inall') {
        if (pick === 'in' && state.money < ATM_STEP) msg = 'You do not have enough cash for that.';
        else {
          const n = deposit(state.meta, state.money, pick === 'in' ? ATM_STEP : state.money);
          if (!n) msg = 'You have no cash to save.';
          else { state.money -= n; meta.ledger('Moved to savings', -n, { count: false }); meta.trackMax('savingsPeak', state.meta.savings); msg = `Saved ${naira(n)}. Savings: ${naira(state.meta.savings)}.`; }
        }
      } else if (pick === 'out' || pick === 'outall') {
        if (pick === 'out' && state.meta.savings < ATM_STEP) msg = 'You do not have that much in savings.';
        else {
          const n = withdraw(state.meta, pick === 'out' ? ATM_STEP : state.meta.savings);
          if (!n) msg = 'Your savings are empty.';
          else { give(n); meta.ledger('Withdrew from savings', n, { count: false }); msg = `Withdrew ${naira(n)}.`; }
        }
      } else {
        const r = requestMum(state.meta, day());
        if (r.ok) { give(r.amount); meta.ledger('Mum sent money', r.amount, { count: false }); sfx('coin'); }
        msg = r.message;
      }
      save();
      await showModal({ title: '🏧 ATM', lines: [msg], buttons: back });
    }
  }

  /** Handles a building action that carries a `money` marker (see actions.js). */
  async function run(a) {
    if (a.money === 'fees') return bursary();
    if (a.money === 'textbooks') return textbooks();
    if (a.money === 'stationery') return stationery();
    if (a.money === 'atm') return atm();
  }

  return { run, semesterStart, billEvent, daily, blockExam, billAction };
}
