/*
 * Balance simulator: bots play whole semesters using the game's own rules (needs, jobs, bills, illness, academics)
 * so difficulty and the economy can be measured instead of guessed. Used by tests/balance.test.js and run directly
 * with `node tools/balance.js` to print a table.
 *
 * The bot's quiz skill is modelled as the chance it already knows an answer; wrong guesses use the same hint mechanic
 * as the game (preparation removes wrong options).
 */
import { newNeeds, tickNeeds, applyEffects, setSickness } from '../src/needs.js';
import { createAcademics } from '../src/academics.js';
import { ACTIONS } from '../src/actions.js';
import { newMeta } from '../src/save.js';
import { rollIllness, fallSick, dayPassed, recover, rest, diagnose } from '../src/health.js';
import { seasonFor } from '../src/eventengine.js';
import { newBill, addBill, dailyBillCheck, payBill, HOSTEL_DUES } from '../src/housing.js';
import { ALLOWANCE } from '../src/economy.js';
import { hintCount } from '../src/academics.js';

export const PROFILES = {
  diligent: { pAttend: 0.95, study: 2, pAssign: 0.95, pExam: 1.0, skill: 0.72, jobs: 1, treats: true },
  average:  { pAttend: 0.7,  study: 1, pAssign: 0.75, pExam: 1.0, skill: 0.52, jobs: 1, treats: true },
  careless: { pAttend: 0.35, study: 0, pAssign: 0.4,  pExam: 0.85, skill: 0.3, jobs: 0, treats: false }
};

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const find = (type, id) => ACTIONS[type].find(a => a.id === id);
const JOB_CHOICES = [['biz', 'pos'], ['biz', 'print'], ['canteen', 'canteenjob'], ['library', 'shelve']];

/** Plays `semesters` semesters and returns the results. */
export function simulate({ course = 'cs', profile = 'average', seed = 1, semesters = 2, startMoney = 35000 } = {}) {
  const P = PROFILES[profile];
  setSickness(0);   // the sickness level is module-global; a previous run must not leak into this one
  const rand = rng(seed * 7919 + 13);
  const state = { course, name: 'Sim', money: startMoney, needs: newNeeds(), academic: null, meta: newMeta(), hostel: 'Hostel' };
  const clock = { t: 7 * 60 };                                    // day 1, 07:00
  const day = () => Math.floor(clock.t / 1440) + 1;
  const minutes = () => clock.t % 1440;
  const log = { trace: [], semesters: [], faints: 0, sickDays: 0, broke: 0, lateBills: 0, minMoney: startMoney, jobsDone: 0 };
  const jobDay = {};

  let lastDay = 1;
  function dayHook(d) {
    if ((d - 1) % 7 === 0) state.money += ALLOWANCE;              // weekly allowance
    const h = state.meta.health;
    dayPassed(h, d);
    if (!h.sick) {
      const id = rollIllness({ day: d, season: seasonFor({ term: state.academic?.term ?? null, day: d }), needs: state.needs, health: h });
      if (id) fallSick(h, id, d);
    }
    if (h.sick) log.sickDays++;
    for (const ev of dailyBillCheck(state.meta.bills, d)) if (ev.type === 'late') log.lateBills++;
    if (state.money < 300) log.broke++;
    setSickness(h.sick ? 1 : 0);
  }

  function advance(m, fx, sleep) {
    if (!sleep) tickNeeds(state.needs, m);
    applyEffects(state.needs, fx);
    if (log.trace.length < 4000) log.trace.push({ day: Math.floor(clock.t / 1440) + 1, hour: +((clock.t % 1440) / 60).toFixed(1), m, sleep: !!sleep, energy: +state.needs.energy.toFixed(1), fx: fx && fx.energy });
    clock.t += m;
    while (lastDay < day()) { lastDay++; dayHook(lastDay); }
    for (const ev of academics.tick()) {
      if (ev === 'results') {
        const rec = state.academic.history[state.academic.history.length - 1];
        log.semesters.push({ year: rec.year, term: rec.term, gpa: rec.gpa, fails: rec.rows.filter(r => r.grade === 'F').length, cgpa: state.academic.cgpa });
      }
    }
    log.minMoney = Math.min(log.minMoney, state.money);
    if (state.needs.energy <= 0.5) {                              // faint
      log.faints++;
      state.money -= Math.min(state.money, 1500);
      state.needs.energy = 40;
      clock.t += 360;
    }
  }

  const academics = createAcademics({
    state, day, minutes,
    venues: () => ['Hall A', 'Hall B'],
    consume: ({ minutes: m, fx, sleep }) => advance(m, fx, sleep),
    toast: () => {},
    onEvent: () => {}
  });
  academics.init();

  /* ---- what the bot does ---- */
  function eat() {
    const pantry = state.meta.pantry;
    if (pantry > 0) { state.meta.pantry--; advance(45, { hunger: 48, fun: 5, stress: -2 }); return; }
    if (state.money >= 5500 && rand() < 0.5) { state.money -= 3000; state.meta.pantry += 4; advance(15, {}); return; }   // stock up
    const choice = [find('canteen', 'jollof'), find('canteen', 'pie'), find('canteen', 'zobo')].find(a => state.money >= a.cost);
    if (!choice) { advance(30, {}); return; }                      // goes hungry
    state.money -= choice.cost;
    advance(choice.minutes, choice.fx);
  }

  function tryJob() {
    if (state.meta.health.sick) return false;
    for (const [type, id] of JOB_CHOICES) {
      const a = find(type, id);
      const j = jobDay[id] || (jobDay[id] = { day: 0, n: 0 });
      if (j.day !== day()) { j.day = day(); j.n = 0; }
      if (j.n >= a.limit || state.needs.energy < (a.needs?.energy ?? 0)) continue;
      j.n++;
      state.money += a.pay;
      log.jobsDone++;
      advance(a.minutes, a.fx);
      return true;
    }
    return false;
  }

  function liveLecture() {
    const a = state.academic;
    if (!a || a.phase !== 'semester') return null;
    for (const venue of ['Hall A', 'Hall B']) {
      const r = academics.lectureActions(venue).actions.find(x => x.id === 'attend');
      if (r) return r;
    }
    return null;
  }

  function quiz(kind) {
    const a = state.academic, n = kind === 'ca' ? 3 : 5;
    const tired = state.needs.energy < 20 || state.needs.stress > 85 || !!state.meta.health.sick;
    for (const c of a.courses) {
      const hide = hintCount(c.knowledge, a.year, tired);
      const p = P.skill + (1 - P.skill) / (4 - hide);
      let right = 0; for (let i = 0; i < n; i++) if (rand() < p) right++;
      c[kind === 'ca' ? 'ca' : 'exam'] = right / n;
    }
    advance(kind === 'ca' ? 90 : 180, { energy: kind === 'ca' ? -8 : -15, stress: kind === 'ca' ? 6 : 10, hunger: -6 });
    a[kind === 'ca' ? 'caTaken' : 'examTaken'] = true;
  }

  function playDay() {
    const startDay = day();
    let guard = 0;
    while (day() === startDay && minutes() < 23 * 60 && guard++ < 60) {
      const a = state.academic;
      const sd = a && a.phase === 'semester' ? academics.semDay() : 0;
      const h = state.needs;

      // pay bills
      for (const b of state.meta.bills.filter(x => !x.paid)) {
        const r = payBill(state.meta.bills, b.id, state.money);
        if (r.ok) state.money -= r.cost;
      }
      if (state.money < 2000 && day() % 3 === 0) state.money += 3000;          // ask Mum (cooldown approximated)
      if (state.meta.health.sick && P.treats && state.money >= 4500 && minutes() >= 480) {
        state.money -= 4500; advance(60, {}); recover(state.meta.health, day()); setSickness(0); continue;
      }

      // tired: nap when low during the day, and go to bed early if exhausted in the evening
      const naps = (playDay.naps = playDay.naps || {});
      if (naps.day !== startDay) { naps.day = startDay; naps.n = 0; }
      if (h.energy < 22 && minutes() >= 21 * 60) break;
      if (h.energy < 25 && naps.n < 2) {
        naps.n++;
        const nap = find('hostel', 'nap');
        if (state.meta.health.sick) rest(state.meta.health, 1);
        advance(nap.minutes, nap.fx, true);
        continue;
      }

      if (h.hunger < 40) { eat(); continue; }
      if (h.hygiene < 35) { advance(15, { hygiene: 65, stress: -3 }); continue; }

      const live = liveLecture();
      if (live && rand() < P.pAttend && h.energy > 15) { academics.run(live); continue; }

      if (sd === 3 && !a.caTaken && minutes() >= 8 * 60 && minutes() < 17 * 60 && rand() < P.pExam) { quiz('ca'); continue; }
      if (sd === 6 && !a.examTaken && minutes() >= 8 * 60 && minutes() < 18 * 60 && rand() < P.pExam) { quiz('exam'); continue; }

      if (a && a.phase !== 'break') {
        if (sd >= 1 && sd <= 5 && rand() < P.pAssign * 0.5) {
          const c = a.courses.find(x => !x.assign.done);
          if (c) { c.assign.progress++; if (c.assign.progress >= 2) c.assign.done = true; advance(120, { energy: -10, fun: -8, stress: 4, hunger: -6 }); continue; }
        }
        const studied = (playDay.studied = playDay.studied || {});
        if (studied.day !== startDay) { studied.day = startDay; studied.n = 0; }
        if (studied.n < P.study && h.energy > 30) {
          const c = a.courses.slice().sort((x, y) => x.knowledge - y.knowledge)[0];
          c.knowledge = Math.min(100, c.knowledge + 12); studied.n++;
          advance(120, { energy: -12, fun: -8, stress: 5, hunger: -8 });
          continue;
        }
      }

      const jobs = (playDay.jobs = playDay.jobs || {});
      if (jobs.day !== startDay) { jobs.day = startDay; jobs.n = 0; }
      if (jobs.n < P.jobs && h.energy > 40 && minutes() > 9 * 60 && tryJob()) { jobs.n++; continue; }

      if (h.fun < 35) { advance(60, { fun: 22, energy: -4, stress: -4 }); continue; }
      advance(60, {});                                                     // idle
    }
    // sleep
    const toBed = (day() === startDay) ? Math.max(0, (24 * 60 + 7 * 60) - minutes()) : Math.max(0, 7 * 60 - minutes());
    if (toBed > 0) {
      const hours = Math.min(8, toBed / 60);
      if (state.meta.health.sick) rest(state.meta.health, hours);
      advance(toBed, { energy: Math.min(85, hours * 10.6), stress: -15, hunger: -22 * (hours / 8), hygiene: -8 * (hours / 8) }, true);
    }
  }

  // bills for the semester start are created by the game; mirror that here
  const seen = new Set();
  const maxDays = semesters * 7 + 3;
  while (day() <= maxDays + 1) {
    const a = state.academic;
    if (a && a.phase === 'semester' && !seen.has(`${a.year}-${a.term}`)) {
      seen.add(`${a.year}-${a.term}`);
      addBill(state.meta.bills, newBill(a.year, a.term, a.startDay));
    }
    playDay();
    if (log.semesters.length >= semesters) break;
  }
  log.finalMoney = state.money;
  log.cgpa = state.academic.cgpa;
  log.hostelDues = HOSTEL_DUES;
  return log;
}

/** Runs many seeds and summarises. */
export function summarise(profile, { runs = 20, semesters = 2, course = 'cs' } = {}) {
  const rows = Array.from({ length: runs }, (_, i) => simulate({ profile, seed: i + 1, semesters, course }));
  const avg = f => rows.reduce((s, r) => s + f(r), 0) / rows.length;
  return {
    profile, runs,
    cgpa: avg(r => r.cgpa ?? 0),
    cgpaMin: Math.min(...rows.map(r => r.cgpa ?? 0)),
    cgpaMax: Math.max(...rows.map(r => r.cgpa ?? 0)),
    fails: avg(r => r.semesters.reduce((s, x) => s + x.fails, 0)),
    faints: avg(r => r.faints),
    sickDays: avg(r => r.sickDays),
    brokeDays: avg(r => r.broke),
    minMoney: Math.min(...rows.map(r => r.minMoney)),
    finalMoney: avg(r => r.finalMoney),
    jobs: avg(r => r.jobsDone),
    lateBills: avg(r => r.lateBills)
  };
}

// `node tools/balance.js` prints a table
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('balance.js')) {
  const f = n => Number(n).toFixed(2);
  console.log('profile    | CGPA (min-max)      | fails | faints | sick days | broke days | money end | late bills');
  for (const p of Object.keys(PROFILES)) {
    const s = summarise(p, { runs: 30, semesters: 2 });
    console.log(`${p.padEnd(10)} | ${f(s.cgpa)} (${f(s.cgpaMin)}-${f(s.cgpaMax)})`.padEnd(34) + `| ${f(s.fails)}  | ${f(s.faints)}   | ${f(s.sickDays)}      | ${f(s.brokeDays)}       | ${Math.round(s.finalMoney)}   | ${f(s.lateBills)}`);
  }
}
