import { settings } from './settings.js';

/*
 * Tutorial hints (spec F-005): short, non-blocking cards that appear the first time the player meets a
 * mechanic. Each one is shown once (remembered in the save) and can be switched off in settings.
 */

export const HINTS = {
  move:     'Drag the joystick (or use WASD / arrow keys) to walk around.',
  goal:     'The green line at the top is your current goal. It always tells you what to do next.',
  needs:    'These bars are your needs. Eat, sleep and bathe before they run out, or you may faint.',
  talk:     'Tap 💬 Talk to chat with someone. Many people can give you directions.',
  enter:    'Tap 🚪 Enter to go inside a building. Inside, walk up to furniture to use it.',
  phone:    'Your 📱 phone has your bank, messages, daily goals and settings. A red dot means something new.',
  portal:   'Open 📱 then Student portal to see your timetable, courses and results.',
  lecture:  'Lectures run at set times. Go to the right lecture hall and tap Attend before it ends.',
  library:  'Study at the library to raise your preparation. Better preparation rules out wrong answers in tests.',
  work:     'Jobs pay naira but cost energy. Watch your needs, and check the limit per day.',
  social:   'Tap 💞 Spend time together to pick a tone, share a snack or ask a favour. Friends can lend money and study with you.',
  health:   'You are not feeling well. See a doctor at the Health Centre (or the Chemist at home), or rest and sleep to get better.',
  power:    'NEPA took the light. Phones, printers and browsing wait until power returns.'
};

/*
 * Guided first day: a short, skippable, tap-through tour for brand-new players. Data-driven: each step has the text,
 * an optional `when` (the step waits, hidden, until this is true) and a `done` test on what the player has done.
 * The card is small, sits in the HUD column (never over the joystick or action panel), never blocks input and is hidden
 * while any dialog, the map or the start screen is open. Progress is stored in meta.tutorial.tour.
 *
 * ctx (sent every frame by main.js): { x, z, paused, npc, inside, hour, day }
 */
export const TOUR = [
  { id: 'move',  text: 'Welcome! Drag the joystick (or use WASD or the arrow keys) to walk around.',
    done: c => c.moved > 8 },
  { id: 'talk',  text: 'Walk up to someone and tap 💬 Talk. Neighbours can point you in the right direction.',
    done: c => c.talked },
  { id: 'enter', text: 'Walk to a building door and tap 🚪 Enter. Inside, step up to furniture to use it.',
    done: c => c.inside },
  { id: 'phone', text: 'Tap 📱 at the top right. Your bank, messages and daily goals are all in your phone.',
    done: c => c.phone },
  { id: 'sleep', text: 'Night is coming. Find a bed (your room at home or in your hostel) and tap Sleep to rest.',
    when: c => c.hour >= 19.5 || c.hour < 5, done: c => c.slept || c.day > c.startDay }
];

const TOUR_HINTS = new Set(['move', 'goal', 'talk', 'enter', 'phone']);   // hints the tour covers: held back while it runs
export const tourState = { active: false };

export function createTour({ meta }) {
  const $ = id => document.getElementById(id);
  const el = $('tour');
  if (!el) return { update() {}, skip() {} };
  const text = $('tourText'), count = $('tourCount'), next = $('tourNext'), skipBtn = $('tourSkip');

  // brand-new players only: if any hint was already shown this is an older save, so no tour
  const t = meta.tutorial.tour ??= Object.keys(meta.tutorial).length ? { done: true } : { i: 0 };
  tourState.active = !t.done;
  let origin = null, talked = false, phone = false, slept = false, shownStep = -1;

  $('portalbtn')?.addEventListener('click', () => { phone = true; });
  $('acts')?.addEventListener('click', e => { if (/sleep/i.test(e.target.closest('button')?.textContent || '')) slept = true; });

  function finish() {
    t.done = true; tourState.active = false; el.hidden = true;
    for (const s of TOUR) if (TOUR_HINTS.has(s.id)) meta.tutorial[s.id] = true;   // do not repeat them as hints
  }
  function advance() {
    const s = TOUR[t.i];
    if (TOUR_HINTS.has(s.id)) meta.tutorial[s.id] = true;
    t.i++; delete t.day;
    talked = phone = slept = false;
    if (t.i >= TOUR.length) finish();
  }
  next.addEventListener('click', advance);
  skipBtn.addEventListener('click', finish);

  function update(ctx) {
    if (t.done) return;
    if (!settings.hints) { el.hidden = true; return; }
    const blocked = ctx.paused || !$('start').classList.contains('gone') || !$('maplayer').hidden;
    if (!origin && !blocked) origin = { x: ctx.x, z: ctx.z };
    if (!origin) { el.hidden = true; return; }
    if (ctx.npc && ctx.paused) talked = true;               // a dialog opened while someone was next to you
    const s = TOUR[t.i];
    const c = { ...ctx, moved: Math.hypot(ctx.x - origin.x, ctx.z - origin.z), talked, phone, slept, startDay: t.day ??= ctx.day };
    if (!blocked && (!s.when || s.when(c)) && s.done(c)) { advance(); return; }
    const show = !blocked && !t.done && (!TOUR[t.i].when || TOUR[t.i].when(c));
    el.hidden = !show;
    if (show && shownStep !== t.i) {
      shownStep = t.i;
      text.textContent = TOUR[t.i].text;
      count.textContent = `Tour ${t.i + 1}/${TOUR.length}`;
      next.textContent = t.i === TOUR.length - 1 ? 'Got it' : 'Next';
    }
  }

  return { update, skip: finish };
}

export function createHints({ meta }) {
  const el = document.getElementById('tip');
  let timer = null;
  const tour = createTour({ meta });

  function hide() { el.hidden = true; clearTimeout(timer); }
  el.addEventListener('click', hide);

  /** Shows a hint once. Returns true if it was shown. */
  function show(id, ms = 7000) {
    if (!settings.hints || !HINTS[id] || meta.tutorial[id]) return false;
    if (tourState.active && TOUR_HINTS.has(id)) return false;      // the guided tour is teaching this right now
    meta.tutorial[id] = true;
    el.textContent = `💡 ${HINTS[id]}`;
    el.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(hide, ms);
    return true;
  }

  return { show, hide, tour };
}
