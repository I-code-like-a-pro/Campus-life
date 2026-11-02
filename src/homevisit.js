import { showModal } from './modal.js';
import { playScene } from './scenes.js';
import { HOME_SCENES, homeSeason } from './milestones.js';
import { travelOptions, townOf, distanceKm, roadEvent, durationText } from './towns.js';

/*
 * Going home for the break. Students can travel home from the student portal during the break between semesters, spend a day
 * with Mama and Tobi (a festive dinner at Christmas, a quiet harvest weekend after second semester) and return to the campus.
 *
 * Safety: no world change and no reload. The player rides out of the main gate, a journey card and the home scene play as
 * dialogs, game time is skipped in one step, and the bus or plane brings them back through the gate on the same save.
 * The break is stretched (`academic.breakUntil`) so that the next semester always starts after the player is back.
 * One visit per break (`academic.homeVisits["year.term"]`). The pre-admission home world is untouched.
 */

export const STAY_MINUTES = 24 * 60;

/** Pure: how long the trip takes and when the next semester must start. */
export function planTrip({ day, minutes, oneWay, startDay, stay = STAY_MINUTES }) {
  const total = 2 * oneWay + stay;
  const endDay = day + Math.floor((minutes + total) / 1440);
  return { total, endDay, nextStart: Math.max(startDay + 7, endDay + 1) };
}

/** Pure: may the player travel home now? */
export function homeGate(a) {
  if (!a) return { ok: false, why: 'You are not a student yet.' };
  if (a.graduated || a.withdrawn) return { ok: false, why: 'Your studies are over.' };
  if (a.phase !== 'break') return { ok: false, why: 'You can only go home during the break between semesters.' };
  if (a.homeVisits?.[`${a.year}.${a.term}`]) return { ok: false, why: 'You have already been home this break.' };
  return { ok: true, why: '' };
}

/** Pure: the ways home with round-trip fares and one-way minutes. */
export function homeOptions(town, uni) {
  return travelOptions(town, uni).map(o => ({ ...o, fare: o.fare * 2 }));
}

const INTRO = {
  christmas: 'The first semester is over. Mama has been calling every day: "Come home for Christmas!" The whole family will be at the table.',
  harvest: 'The session is over and the long vacation is near. Mama says the new yams are ready, and Tobi has been asking when you are coming.'
};

/**
 * deps: { state, meta, day(), minutes(), uni, naira, campusName, leave(kind), back(kind), skipTime(minutes), consume({minutes, fx}), give(n), pay(n), name(), met(id) }
 * `leave(kind)` rides out of the gate and fades to black; `back(kind)` fades in and rides back through the gate.
 */
export function createHomeVisit(deps) {
  const { state } = deps;
  const a = () => state.academic;

  async function start() {
    const gate = homeGate(a());
    if (!gate.ok) { await showModal({ title: '🏠 Going home', lines: [gate.why], buttons: [{ label: 'OK', value: 1 }] }); return false; }
    const A = a(), town = state.hometown || 'lagos';
    const opts = homeOptions(town, deps.uni), km = distanceKm(town, deps.uni), season = homeSeason(A);
    const pick = await showModal({
      title: season === 'christmas' ? '🎄 Home for Christmas?' : '🍠 Home for the long vacation?',
      lines: [INTRO[season], `${townOf(town).name} is about ${km} km away. You will spend about a day there and the next semester will wait until you are back.`, 'Round-trip fares:'],
      buttons: [...opts.map(o => ({ label: `${o.emoji} ${o.label}: ${deps.naira(o.fare)}, about ${durationText(o.minutes)} each way`, value: o.mode })), { label: 'Stay on campus', value: 'no', secondary: true }]
    });
    if (pick === 'no') return false;
    const o = opts.find(x => x.mode === pick);
    if (!o) return false;
    if (state.money < o.fare) {
      await showModal({ title: '🏠 Going home', lines: [`The round trip costs ${deps.naira(o.fare)} and you have ${deps.naira(state.money)}. Mama says to save your money and visit another time.`], buttons: [{ label: 'OK', value: 1 }] });
      return false;
    }
    state.money -= o.fare;
    deps.meta.ledger(o.mode === 'flight' ? 'Flight home (return)' : 'Bus fare home (return)', -o.fare);
    const kind = o.mode === 'flight' ? 'plane' : 'bus';
    const plan = planTrip({ day: deps.day(), minutes: deps.minutes(), oneWay: o.minutes, startDay: A.startDay });

    await deps.leave(kind);
    const ev = roadEvent(o.mode, Math.random());
    await showModal({
      title: o.mode === 'flight' ? '✈️ On the way home' : '🚌 On the road',
      lines: [ev.text, `${durationText(o.minutes)} later you reach ${townOf(town).name}. The family house comes into view.`],
      buttons: [{ label: 'Get down 🧳', value: 1 }]
    });
    if (ev.fx) deps.consume({ minutes: 0, fx: ev.fx });
    if (ev.cost) deps.pay(ev.cost);

    const ctx = {
      name: deps.name(), flags: {}, a: A, day: deps.day(), pay: deps.pay, give: deps.give, consume: deps.consume, met: deps.met,
      roll: () => Math.random(), boostWeakest: () => {}, warn: () => {}
    };
    await playScene(HOME_SCENES[season], ctx);

    A.homeVisits = { ...(A.homeVisits || {}), [`${A.year}.${A.term}`]: true };
    A.breakUntil = Math.max(A.breakUntil || 0, plan.nextStart);
    deps.skipTime(plan.total);
    deps.consume({ minutes: 0, fx: { stress: 4 } });
    await showModal({ title: '🧳 Back to campus', lines: [`You say goodbye to Mama and Tobi. The ${kind === 'plane' ? 'flight' : 'bus'} brings you back to ${deps.campusName || 'campus'}.`, `The next semester begins on Day ${A.breakUntil}.`], buttons: [{ label: 'Return', value: 1 }] });
    await deps.back(kind);
    deps.meta.notify({ icon: '🏠', title: 'You are back on campus', text: `Next semester starts on Day ${A.breakUntil}. Settle in and check the portal.` });
    return true;
  }

  return { start, gate: () => homeGate(a()) };
}
