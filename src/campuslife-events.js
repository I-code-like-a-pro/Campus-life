import { showModal } from './modal.js';
import { pendingHiccup, resolveHiccup, seedOf } from './clearance.js';

/*
 * Story beats around arrival and results: clearance hiccups, matriculation, orientation week, water shortage effects
 * and the bursary award. Pure rules are exported for tests; createCampusStory() wires them to the game.
 * Everything stored lives in the free-form state.academic object (orient, matric, bursaries) with safe defaults.
 */

/* ---------------- matriculation ---------------- */

export const MATRIC_FX = { fun: 15, stress: -6, energy: -5 };
export const MATRIC_MINUTES = 120;
export const MATRIC_HOUR = 10;

/** Due once, on the second day of the first semester (or any later day of it if the player was busy elsewhere). */
export function matricDue(a, sd, hour) {
  if (!a || a.matric || a.year !== 1 || a.term !== 1 || a.phase !== 'semester') return false;
  return sd > 2 || (sd === 2 && hour >= MATRIC_HOUR);
}

export function matricPages({ name, campus, course }) {
  return [
    { title: '🎩 Matriculation day', lines: [`The Vice-Chancellor's procession enters the hall. Every fresher in white shirt and tie sits straight, ${name}.`, `${campus} is admitting a new set today, and that includes you.`] },
    { title: '📜 The oath', lines: [`Repeat after the Registrar: "I will obey the rules of the university, study hard, and not cheat in exams."`, 'You say the last part loudly. The row behind you giggles.'] },
    { title: '📸 Photo time', lines: [`You sign the register as a ${course} student. A photographer shouts "One more!" nine times.`, 'The gown is two sizes too big. You wear it with pride.'] }
  ];
}

/* ---------------- orientation week ---------------- */

export const ORIENTATION_REWARD = 1500;
export const ORIENTATION_FX = { fun: 8, stress: -4 };
export const ORIENTATION_LAST_DAY = 2;     // before the CA tests on day 3
/** Data-driven: `visit` goals complete when you step into that type of building, `meet` goals count different people. */
export const ORIENTATION_GOALS = [
  { id: 'hall', text: 'Find a lecture hall', kind: 'visit', place: 'lecture', n: 1 },
  { id: 'library', text: 'Visit the library', kind: 'visit', place: 'library', n: 1 },
  { id: 'canteen', text: 'Check out the canteen', kind: 'visit', place: 'canteen', n: 1 },
  { id: 'people', text: 'Meet 2 people', kind: 'meet', n: 2 }
];

export function orientationActive(a, sd) {
  if (!a || a.year !== 1 || a.term !== 1) return false;
  if (a.orient?.rewarded) return false;
  return a.phase === 'pre' || (a.phase === 'semester' && sd <= ORIENTATION_LAST_DAY);
}

const orient = a => a.orient || (a.orient = { visited: {}, met: [], rewarded: false });

export function orientationProgress(a) {
  const o = a?.orient || { visited: {}, met: [] };
  return ORIENTATION_GOALS.map(g => {
    const have = g.kind === 'visit' ? (o.visited?.[g.place] ? 1 : 0) : (o.met?.length ?? 0);
    return { ...g, have: Math.min(have, g.n), done: have >= g.n };
  });
}

export function noteVisit(a, placeType) {
  const o = orient(a);
  o.visited[placeType] = true;
}
export function noteMeet(a, npcId) {
  const o = orient(a);
  if (!o.met.includes(npcId)) o.met.push(npcId);
}

/** Shows the next unfinished goal as a short line, or '' when none is left. */
export function orientationLine(a, sd) {
  if (!orientationActive(a, sd)) return '';
  const prog = orientationProgress(a);
  const next = prog.find(g => !g.done);
  if (!next) return '';
  return `🧭 Orientation ${prog.filter(g => g.done).length}/${prog.length}: ${next.text}`;
}

export const orientationComplete = a => orientationProgress(a).every(g => g.done);

/* ---------------- water shortage ---------------- */

/** In the hostel during a shortage, a bath is a bucket bath: half as clean, a little stressful. */
export function waterAdjust(action, shortage, placeType) {
  if (!shortage || placeType !== 'hostel' || action.id !== 'bathe') return action;
  return { ...action, minutes: action.minutes + 10, fx: { ...action.fx, hygiene: Math.round((action.fx.hygiene || 0) / 2), stress: (action.fx.stress || 0) + 6 }, msg: 'No running water. A bucket bath will have to do.' };
}

/* ---------------- bursary award ---------------- */

export const SCHOLARSHIP_GPA = 4.5;
export const SCHOLARSHIP_AMOUNT = 20000;

/** One award per academic year. Returns the amount to pay (0 if not eligible) and records it. */
export function scholarshipAward(a, gpa) {
  if (gpa < SCHOLARSHIP_GPA) return 0;
  const awards = a.bursaries || (a.bursaries = {});
  if (awards[a.year]) return 0;
  awards[a.year] = true;
  return SCHOLARSHIP_AMOUNT;
}

/* ---------------- wiring ---------------- */

/**
 * deps: { state, meta, day(), minutes(), consume({minutes, fx}), give(amount), campus: {name}, courseName() }
 */
export function createCampusStory({ state, meta, day, minutes, consume, give, campusName, courseName }) {
  const semDay = () => (state.academic ? day() - state.academic.startDay + 1 : 0);

  /** Clearance hiccup before a desk conversation. Always resolves; never blocks the clearance. */
  async function clearanceHiccup(npc) {
    const cl = state.clearance;
    const hit = pendingHiccup(cl, npc.id, seedOf(`${state.name || ''}|${state.course || ''}`));
    if (!hit) return;
    const { desk, hiccup } = hit;
    cl.hiccups = cl.hiccups || {};
    cl.hiccups[desk.id] = true;
    const buttons = [{ label: `${hiccup.wait} (about ${hiccup.minutes} min)`, value: false }];
    if (state.money >= hiccup.fee) buttons.push({ label: `${hiccup.feeLabel} (₦${hiccup.fee})`, value: true });
    const payFee = await showModal({ title: `${desk.emoji} ${hiccup.title}`, lines: [hiccup.text], buttons });
    const r = resolveHiccup(hiccup, payFee, state.money);
    if (r.fee) { state.money -= r.fee; meta.ledger(hiccup.feeLabel, -r.fee); }
    consume({ minutes: r.minutes, fx: r.stress ? { stress: r.stress } : {} });
    await showModal({ title: `${desk.emoji} Sorted`, lines: [r.text], buttons: [{ label: 'Continue', value: 1 }] });
  }

  /** Call every frame when nothing else is open. Returns true if it ran a modal sequence. */
  async function matriculation() {
    const a = state.academic;
    if (!matricDue(a, semDay(), minutes() / 60)) return false;
    a.matric = true;
    const pages = matricPages({ name: state.name || 'Fresher', campus: campusName, course: courseName() });
    for (let i = 0; i < pages.length; i++) {
      await showModal({ title: pages[i].title, lines: pages[i].lines, buttons: [{ label: i < pages.length - 1 ? 'Next' : 'Finish', value: 1 }] });
    }
    consume({ minutes: MATRIC_MINUTES, fx: MATRIC_FX });
    meta.track('matriculated');
    meta.notify({ icon: '🎩', title: 'You are now a matriculated student', text: 'Welcome to the university family.' });
    return true;
  }

  function checkOrientation() {
    const a = state.academic;
    if (!orientationActive(a, semDay()) || a.orient?.rewarded || !orientationComplete(a)) return;
    a.orient.rewarded = true;
    give(ORIENTATION_REWARD);
    meta.ledger('Orientation week reward', ORIENTATION_REWARD);
    consume({ minutes: 0, fx: ORIENTATION_FX });
    meta.track('orientationDone');
    meta.notify({ icon: '🧭', title: 'Orientation complete', text: `You know your way around. +₦${ORIENTATION_REWARD.toLocaleString('en-NG')}` });
  }
  function visited(placeType) {
    const a = state.academic;
    if (!orientationActive(a, semDay())) return;
    noteVisit(a, placeType);
    checkOrientation();
  }
  function met(npcId) {
    const a = state.academic;
    if (!orientationActive(a, semDay())) return;
    noteMeet(a, npcId);
    checkOrientation();
  }

  /** After a semester's results. */
  function results(gpa) {
    const a = state.academic;
    const amount = scholarshipAward(a, gpa);
    if (!amount) return;
    give(amount);
    meta.ledger('Bursary award', amount);
    meta.track('scholarships');
    meta.notify({ icon: '🏆', title: 'Bursary award', text: `The university rewards your GPA of ${gpa.toFixed(2)} with ₦${amount.toLocaleString('en-NG')}.` });
  }

  const matricPending = () => matricDue(state.academic, semDay(), minutes() / 60);

  return { clearanceHiccup, matriculation, matricPending, visited, met, results };
}
