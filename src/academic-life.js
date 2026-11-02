// Academic life: lecturer personalities, handouts, group assignments, lab practicals and weekly tutorials.
// The rules are pure functions (tested in tests/academic-life.test.js). createAcademicLife() wires them to modals and the game.
//
// State lives in state.academic:
//   lecturers[code] = { name, style }, handouts[code] = { bought, chased }, group = { y, t, code, done },
//   labs[code] = true, tutorialDay, tutorials[code] = n, integrityWarnings.
// Per-semester records (handouts, group, labs, tutorials) are reset by resetSemester().

import { showModal } from './modal.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hashStr = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const hash01 = s => (hashStr(s) % 10000) / 10000;

/* ---------------- lecturers ---------------- */

export const STYLES = {
  strict:    { emoji: '📏', label: 'Strict', blurb: 'Takes attendance and notices who comes in late.' },
  funny:     { emoji: '😄', label: 'Funny', blurb: 'Jokes through every topic. The room remembers it.' },
  absent:    { emoji: '🌀', label: 'Absent-minded', blurb: 'Brilliant notes, wandering lectures. Class sometimes ends early.' },
  brilliant: { emoji: '🧠', label: 'Brilliant', blurb: 'Teaches fast and deep. You learn a lot if you keep up.' },
  generous:  { emoji: '📄', label: 'Generous with notes', blurb: 'Shares handouts and slides with the class.' }
};
export const STYLE_IDS = Object.keys(STYLES);

const NAMES = ['Prof. Adeyemi', 'Dr. Okonkwo', 'Dr. Bello', 'Prof. Eze', 'Dr. Ibrahim', 'Dr. Afolabi', 'Prof. Nwosu', 'Dr. Danjuma', 'Dr. Etim', 'Prof. Balogun', 'Dr. Okafor', 'Dr. Musa'];

/** A lecturer is fixed by the course code and the semester, so the same course keeps the same lecturer. */
export function makeLecturer(code, year = 1, term = 1) {
  const h = hashStr(`${code}|${year}|${term}`);
  return { name: NAMES[h % NAMES.length], style: STYLE_IDS[(h >>> 8) % STYLE_IDS.length] };
}

export function lecturerFor(a, code) {
  if (!a) return null;
  a.lecturers = a.lecturers || {};
  return a.lecturers[code] || (a.lecturers[code] = makeLecturer(code, a.year, a.term));
}

/**
 * The small real effect of attending a lecture. `firstTime` is true for the first lecture of the course this semester.
 * Returns { prep, fx, minutesBack, handout, line }.
 */
export function attendEffect(style, late, firstTime = false) {
  const out = { prep: 0, fx: {}, minutesBack: 0, handout: 0, line: '' };
  switch (style) {
    case 'strict':
      out.prep = late ? -2 : 2;
      out.line = late ? 'The lecturer notes your lateness in the register. You miss the opening.' : 'The lecturer takes attendance. Being on time pays off.';
      break;
    case 'funny':
      out.prep = 1; out.fx = { fun: 4, stress: -2 };
      out.line = 'The lecturer\'s joke about the topic gets the whole hall laughing. It sticks.';
      break;
    case 'absent':
      out.prep = -1; out.minutesBack = 30;
      out.line = 'The lecturer loses the thread and ends early. You get half an hour back, but the notes are thin.';
      break;
    case 'brilliant':
      out.prep = late ? 1 : 3; out.fx = { stress: 1 };
      out.line = late ? 'You catch the second half of a very fast lecture.' : 'A fast, deep lecture. Your head is full, in a good way.';
      break;
    case 'generous':
      out.prep = 1; out.handout = firstTime ? 3 : 0;
      out.line = firstTime ? 'The lecturer shares a handout with the class. Free notes!' : 'The lecturer reminds the class that the notes are on the board.';
      break;
    default: break;
  }
  return out;
}

const LINES = {
  strict: ['"Attendance is not optional. I count heads."', '"Late again? The door is behind you."', '"Read before you come. I will ask."'],
  funny: ['"Why did the function cross the road? To reach a return value."', '"This topic is easy, it is only the exam that is difficult."', '"If you fall asleep, at least snore in tune."'],
  absent: ['"Now, where did I put my marker? It was in my hand."', '"Where were we? Ah, never mind, read page forty."', '"I think this is the right room. Is it Tuesday?"'],
  brilliant: ['"Follow the logic, not the formula. The formula is a shadow."', '"This will appear in your exam in a disguise. Spot it."', '"Questions? Good ones only, please."'],
  generous: ['"I have photocopied the notes. Take one and pass it on."', '"Handouts are on the table. Please do not fight."', '"If you struggle, come to my office. Bring the handout."']
};
export function lecturerLine(style, roll = 0) {
  const list = LINES[style] || LINES.strict;
  return list[Math.floor(clamp(roll, 0, 0.9999) * list.length)];
}

/** Facts for the AI and the portal: "CSC 101: Dr. Bello (Strict)". */
export function lecturerFacts(a) {
  if (!a?.courses) return [];
  return a.courses.map(c => { const l = lecturerFor(a, c.code); return `${c.code}: ${l.name} (${STYLES[l.style].label})`; });
}

/* ---------------- handouts ---------------- */

export const HANDOUT_PRICE = 300;
export const HANDOUT_PREP = 6;
export const CHASE_PREP = 5;
export const CHASE_CHANCE = 0.6;

export const handoutRec = (a, code) => { a.handouts = a.handouts || {}; return a.handouts[code] || (a.handouts[code] = { bought: false, chased: 0 }); };

/** Can a handout for this course be bought from the Business Centre (once per course per semester)? */
export const canBuyHandout = (a, code) => !handoutRec(a, code).bought;
/** Chasing a coursemate for notes: at most two attempts per course per semester, and not after one worked. */
export const canChase = (a, code) => { const r = handoutRec(a, code); return !r.gotCopy && r.chased < 2; };
export const chaseSucceeds = roll => roll < CHASE_CHANCE;

/* ---------------- group assignments ---------------- */

const MATE_POOL = [
  { name: 'Tolu', skill: 5, reliability: 2, blurb: 'Sharp, but replies to messages on Thursdays.' },
  { name: 'Amaka', skill: 4, reliability: 4, blurb: 'Organised. Keeps a shared notes file.' },
  { name: 'Yusuf', skill: 3, reliability: 5, blurb: 'Always on time. Never skips a meeting.' },
  { name: 'Chioma', skill: 4, reliability: 3, blurb: 'Good ideas, late starter.' },
  { name: 'Bayo', skill: 2, reliability: 4, blurb: 'Works hard, still learning the topic.' },
  { name: 'Ngozi', skill: 5, reliability: 4, blurb: 'The class genius, and busy with two clubs.' },
  { name: 'Femi', skill: 2, reliability: 2, blurb: 'Friendly, but disappears when work starts.' },
  { name: 'Halima', skill: 3, reliability: 3, blurb: 'Steady and calm under deadlines.' }
];

/** Three teammate candidates for this semester's group assignment (deterministic for a given seed). */
export function candidates(seed) {
  const start = hashStr(seed) % MATE_POOL.length;
  return [0, 3, 5].map(k => MATE_POOL[(start + k) % MATE_POOL.length]);
}

export const CONTRIBUTIONS = {
  full:  { label: 'Do your full share and more', effort: 3, minutes: 180, fx: { energy: -12, stress: 4, hunger: -6 } },
  share: { label: 'Do your fair share', effort: 2, minutes: 120, fx: { energy: -8, stress: 2, hunger: -4 } },
  coast: { label: 'Do the minimum', effort: 1, minutes: 45, fx: { energy: -3, stress: -1 } },
  copy:  { label: 'Copy a section from an old project', effort: 2, minutes: 60, fx: { energy: -4, stress: 3 } }
};
export const COPY_CAUGHT_CHANCE = 0.4;

/**
 * Outcome of a group assignment. `roll` and `roll2` are random numbers in [0, 1) (injected so tests are exact).
 * Returns { tier: 'great' | 'ok' | 'poor', score, ghosted: name | null, caught: boolean }.
 */
export function groupOutcome(mates, contribution, roll, roll2 = 1) {
  const c = CONTRIBUTIONS[contribution] || CONTRIBUTIONS.share;
  const ghosted = mates.find(m => m.reliability <= 2 && roll < 0.3)?.name || null;
  const active = mates.filter(m => m.name !== ghosted);
  const strength = active.length ? active.reduce((s, m) => s + (m.skill + m.reliability) / 2, 0) / active.length : 1;
  const teamSize = active.length / Math.max(1, mates.length);
  const score = c.effort * 1.2 + strength * teamSize + (roll - 0.5) * 1.5;
  const tier = score >= 6.5 ? 'great' : score >= 4.5 ? 'ok' : 'poor';
  return { tier, score, ghosted, caught: contribution === 'copy' && roll2 < COPY_CAUGHT_CHANCE };
}

/** Which course has the group assignment this semester (a regular course, chosen from the semester). */
export function groupCourse(a) {
  const list = (a?.courses || []).filter(c => !c.carry);
  return list.length ? list[(a.year + a.term) % list.length].code : null;
}
export function groupRec(a) {
  if (!a.group || a.group.y !== a.year || a.group.t !== a.term) a.group = { y: a.year, t: a.term, code: groupCourse(a), done: false };
  return a.group;
}

/** Applies a group result to the course. Returns the lines to show. */
export function applyGroup(a, course, outcome) {
  const lines = [];
  if (outcome.ghosted) lines.push(`${outcome.ghosted} stopped replying, so you covered their part.`);
  if (outcome.tier === 'great') {
    course.assign.done = true; course.assign.progress = 2;
    course.knowledge = clamp(course.knowledge + 4, 0, 100);
    lines.push('The group submits a strong report. The lecturer calls it the best of the batch.');
  } else if (outcome.tier === 'ok') {
    course.assign.progress = Math.min(2, course.assign.progress + 1);
    if (course.assign.progress >= 2) course.assign.done = true;
    lines.push(course.assign.done ? 'The group submits a decent report.' : 'The group submits an uneven report. Half the marks are safe; finish your own part later.');
  } else {
    lines.push('The report is thin and late. No marks for the group assignment this time.');
  }
  if (outcome.caught) {
    a.integrityWarnings = (a.integrityWarnings || 0) + 1;
    lines.push('The lecturer spots the copied section and issues a formal warning. It goes on your record.');
  }
  return lines;
}

/* ---------------- lab practicals ---------------- */

const LAB_PREFIXES = ['PHY', 'CHM', 'BIO', 'ENG', 'PHA', 'MED'];
export const isLabCourse = code => LAB_PREFIXES.includes(String(code).split(' ')[0]);
export const labSubject = code => ({ PHY: 'physics', CHM: 'chemistry', BIO: 'biology', ENG: 'engineering', PHA: 'chemistry', MED: 'biology' }[String(code).split(' ')[0]] || null);

const LAB = {
  physics: [
    { title: 'Set up the circuit', lines: ['Your bench has a battery, a resistor, an ammeter and a voltmeter.'], choices: [
      ['Connect the ammeter in series and the voltmeter across the resistor', true, 'The readings are steady.'],
      ['Put the ammeter across the resistor', false, 'The reading is absurd and the fuse complains.'],
      ['Skip checking the connections', false, 'One loose lead ruins the first set of readings.']] },
    { title: 'Take the readings', lines: ['You vary the voltage and record the current.'], choices: [
      ['Repeat each reading and take an average', true, 'Your table is neat and consistent.'],
      ['Record one reading each and move on', false, 'The graph has scatter you cannot explain.'],
      ['Copy your neighbour\'s table', false, 'The demonstrator notices the identical decimals.']] },
    { title: 'Draw the graph', lines: ['The demonstrator wants a voltage-current graph.'], choices: [
      ['Plot with labelled axes and units, and a line of best fit', true, 'The gradient gives the resistance.'],
      ['Join the dots with a ruler', false, 'The line zigzags and loses marks.'],
      ['Skip units and labels', false, 'The graph is hard to read.']] }
  ],
  chemistry: [
    { title: 'Before you begin', lines: ['The bench has acid, a base, an indicator and glassware.'], choices: [
      ['Put on your lab coat and goggles first', true, 'The demonstrator nods.'],
      ['Start now and find the goggles later', false, 'The demonstrator sends you back to fetch them.'],
      ['Taste a drop to identify the liquid', false, 'Never taste chemicals. A stern lecture follows.']] },
    { title: 'The titration', lines: ['You add acid to the base, drop by drop.'], choices: [
      ['Swirl and add slowly near the end point', true, 'You hit the colour change cleanly.'],
      ['Pour in quickly to save time', false, 'You overshoot the end point.'],
      ['Guess the volume without reading the burette', false, 'Your result is far from the true value.']] },
    { title: 'Clean up', lines: ['Time is nearly up.'], choices: [
      ['Wash the glassware and wipe the bench', true, 'The bench is spotless.'],
      ['Leave the mess for the technician', false, 'The technician is not pleased.'],
      ['Pour leftover acid into the sink', false, 'The demonstrator stops you and explains the disposal bin.']] }
  ],
  biology: [
    { title: 'The microscope', lines: ['A prepared slide of plant cells waits on your bench.'], choices: [
      ['Start on low power, then increase the magnification', true, 'The cells come into sharp focus.'],
      ['Jump straight to the highest power', false, 'You see only a blur and nearly touch the slide.'],
      ['Shove the slide in without a cover slip check', false, 'The slide is cracked.']] },
    { title: 'Draw what you see', lines: ['The demonstrator wants a labelled diagram.'], choices: [
      ['Draw in pencil with clear labels and a title', true, 'A tidy, accurate drawing.'],
      ['Sketch quickly without labels', false, 'The marks drop sharply.'],
      ['Photograph the neighbour\'s drawing', false, 'The demonstrator frowns at the matching smudges.']] },
    { title: 'Specimen care', lines: ['A specimen needs to be stored properly.'], choices: [
      ['Label it and return it to the tray', true, 'Everything is in order.'],
      ['Leave it on the bench', false, 'It dries out before the next class.'],
      ['Take it home as a souvenir', false, 'The technician asks for it back.']] }
  ],
  engineering: [
    { title: 'Workshop safety', lines: ['The workshop has a lathe, a vice and a row of hand tools.'], choices: [
      ['Put on safety boots, glasses and gloves', true, 'The supervisor lets you in.'],
      ['Wear sandals, the floor looks clean', false, 'You are sent out to change.'],
      ['Skip the safety talk', false, 'You are told off and sent to the back of the queue.']] },
    { title: 'Measure and mark', lines: ['You must cut a metal piece to size.'], choices: [
      ['Measure twice, mark clearly, then cut', true, 'The piece fits.'],
      ['Eyeball it', false, 'It is two millimetres short.'],
      ['Borrow a classmate\'s piece', false, 'The supervisor asks to see your own work.']] },
    { title: 'The report', lines: ['A short write-up is due at the end of the session.'], choices: [
      ['Record the method and the measured dimensions', true, 'A clear, usable log.'],
      ['Promise to write it later', false, 'Later never comes.'],
      ['Write only the title', false, 'A very short report.']] }
  ]
};

/** Three steps for this course's practical: [{ title, lines, choices: [{ label, good, text }] }]. */
export function labSteps(code) {
  const subject = labSubject(code);
  const steps = LAB[subject];
  if (!steps) return [];
  return steps.map(s => ({ title: s.title, lines: s.lines, choices: s.choices.map(([label, good, text]) => ({ label, good, text })) }));
}

/** Result of a practical by number of correct steps (0 to 3). */
export function labResult(good) {
  if (good >= 3) return { prep: 8, fx: { stress: -2, fun: 3 }, line: 'Full marks for the practical. You understand the topic better.' };
  if (good === 2) return { prep: 5, fx: { stress: 1 }, line: 'A good practical with one slip.' };
  if (good === 1) return { prep: 2, fx: { stress: 3 }, line: 'The practical was messy. You learn from the mistakes.' };
  return { prep: 0, fx: { stress: 5 }, line: 'The demonstrator asks you to repeat the practical next time.' };
}

export const labAvailable = (a, sd, hour) => !!a && sd >= 2 && sd <= 5 && hour >= 10 && hour < 17 && (a.courses || []).some(c => isLabCourse(c.code) && !a.labs?.[c.code]);

/* ---------------- weekly tutorials ---------------- */

export const TUTORIAL_CAP = 75;     // a tutorial only helps up to this preparation level
export const TUTORIAL_MAX = 3;      // per course per semester
export function tutorialBoost(knowledge, taken) {
  if (taken >= TUTORIAL_MAX || knowledge >= TUTORIAL_CAP) return 0;
  return Math.min(5, TUTORIAL_CAP - knowledge);
}
export const tutorialOpen = (a, sd, hour) => !!a && a.phase === 'semester' && sd >= 1 && sd <= 5 && hour >= 16 && hour < 18 && a.tutorialDay !== sd;

/** Clears the per-semester records. Called when a new semester is built. */
export function ensureRecords(a) {
  a.handouts = a.handouts || {}; a.labs = a.labs || {}; a.tutorials = a.tutorials || {}; a.lecturers = a.lecturers || {};
}
export function resetSemester(a) {
  a.handouts = {}; a.labs = {}; a.tutorials = {}; a.tutorialDay = 0; a.group = null; a.lecturers = {};
}

/* ---------------- wiring ---------------- */

/**
 * deps: { A(), consume({minutes, fx}), toast(text), pay(n) -> bool, boost(code, n), minutes(), semDay(), roll() }
 * Returns { actions(place, kind), run(action), attendHook(c, late) }.
 */
export function createAcademicLife(deps) {
  const { A, consume, toast, pay, boost } = deps;
  const roll = deps.roll || Math.random;
  const ok = [{ label: 'Continue', value: 1 }];
  const say = (title, lines) => showModal({ title, lines, buttons: ok });
  const pickCourse = async (title, intro, list, describe) => {
    const i = await showModal({ title, lines: [intro], buttons: [...list.map((c, k) => ({ label: describe(c), value: k })), { label: 'Cancel', value: -1, secondary: true }] });
    return i >= 0 ? list[i] : null;
  };

  /** Extra effect when a lecture is attended (preparation applied here): returns { fx, minutesBack, line }. */
  function attendHook(c, late) {
    const a = A();
    const lec = lecturerFor(a, c.code);
    const first = c.att.ok + c.att.late <= 1;
    const e = attendEffect(lec.style, late, first);
    c.knowledge = clamp(c.knowledge + e.prep + e.handout, 0, 100);
    return { fx: e.fx, minutesBack: e.minutesBack, line: `${STYLES[lec.style].emoji} ${lec.name}: ${e.line}` };
  }

  /** Extra actions for a building. kind is 'lecture' or 'library'. */
  function actions(kind) {
    const a = A();
    if (!a || a.phase !== 'semester') return [];
    ensureRecords(a);
    const sd = deps.semDay(), hour = deps.minutes() / 60, out = [];
    if (kind === 'lecture') {
      if (tutorialOpen(a, sd, hour)) out.push({ id: 'tutorial', label: '🧑‍🏫 Join the tutorial' });
      if (labAvailable(a, sd, hour)) out.push({ id: 'practical', label: '🧪 Lab practical' });
    } else if (kind === 'library') {
      const g = groupRec(a);
      if (g.code && !g.done && sd >= 1 && sd <= 5) out.push({ id: 'group', label: '👥 Group assignment' });
      if (a.courses.some(c => canChase(a, c.code))) out.push({ id: 'handoutchase', label: '📄 Ask a coursemate for notes' });
    }
    return out;
  }

  async function run(action) {
    const a = A();
    if (!a) return false;
    ensureRecords(a);
    if (action.id === 'tutorial') {
      const list = a.courses.filter(c => tutorialBoost(c.knowledge, a.tutorials[c.code] || 0) > 0);
      if (!list.length) { await say('🧑‍🏫 Tutorial', ['You are already well prepared in every course. The tutor says to save your seat for someone who needs it.']); return true; }
      const c = await pickCourse('🧑‍🏫 Tutorial', 'Which course tutorial do you want to join?', list, x => `${x.code} (${x.knowledge}%)`);
      if (!c) return true;
      const n = tutorialBoost(c.knowledge, a.tutorials[c.code] || 0);
      a.tutorials[c.code] = (a.tutorials[c.code] || 0) + 1; a.tutorialDay = deps.semDay();
      boost(c.code, n);
      consume({ minutes: 60, fx: { energy: -5, stress: -1, hunger: -3 } });
      toast(`🧑‍🏫 ${c.code} tutorial: preparation +${n}.`);
      return true;
    }
    if (action.id === 'practical') {
      const list = a.courses.filter(c => isLabCourse(c.code) && !a.labs[c.code]);
      const c = list.length === 1 ? list[0] : await pickCourse('🧪 Lab practical', 'Which practical?', list, x => `${x.code} · ${x.title}`);
      if (!c) return true;
      a.labs[c.code] = true;
      let good = 0;
      for (const step of labSteps(c.code)) {
        const i = await showModal({ title: `🧪 ${step.title}`, lines: step.lines, buttons: step.choices.map((ch, k) => ({ label: ch.label, value: k })) });
        const ch = step.choices[i] ?? step.choices[step.choices.length - 1];
        if (ch.good) good += 1;
        await say(`🧪 ${step.title}`, [ch.text]);
      }
      const r = labResult(good);
      boost(c.code, r.prep);
      consume({ minutes: 120, fx: { energy: -8, hunger: -6, ...r.fx } });
      await say('🧪 Practical done', [r.line, `${c.code} preparation +${r.prep}.`]);
      return true;
    }
    if (action.id === 'group') {
      const g = groupRec(a);
      const c = a.courses.find(x => x.code === g.code);
      if (!c || g.done) return true;
      const pool = candidates(`${a.year}|${a.term}|${c.code}`);
      const picks = [];
      for (let n = 0; n < 2; n++) {
        const left = pool.filter(m => !picks.includes(m));
        const i = await showModal({ title: `👥 ${c.code} group project`, lines: [n ? 'Pick your second teammate.' : 'Your lecturer lets you pick two teammates.'], buttons: left.map((m, k) => ({ label: `${m.name}: ${m.blurb}`, value: k })) });
        picks.push(left[i] ?? left[0]);
      }
      const keys = Object.keys(CONTRIBUTIONS);
      const ci = await showModal({ title: '👥 Your contribution', lines: [`Team: ${picks.map(m => m.name).join(' and ')}. How much will you put in?`], buttons: keys.map((k, i) => ({ label: CONTRIBUTIONS[k].label, value: i })) });
      const key = keys[ci] || 'share';
      const out = groupOutcome(picks, key, roll(), roll());
      g.done = true;
      consume({ minutes: CONTRIBUTIONS[key].minutes, fx: CONTRIBUTIONS[key].fx });
      await say('👥 The result', applyGroup(a, c, out));
      return true;
    }
    if (action.id === 'handoutchase') {
      const list = a.courses.filter(c => canChase(a, c.code));
      const c = await pickCourse('📄 Notes', 'Which course notes do you need?', list, x => `${x.code} · ${x.title}`);
      if (!c) return true;
      const r = handoutRec(a, c.code);
      r.chased += 1;
      if (chaseSucceeds(roll())) {
        r.gotCopy = true; boost(c.code, CHASE_PREP);
        consume({ minutes: 60, fx: { energy: -3, fun: 2 } });
        await say('📄 Notes', ['A coursemate lets you photograph their notes. You owe them a snack.', `${c.code} preparation +${CHASE_PREP}.`]);
      } else {
        consume({ minutes: 45, fx: { stress: 2 } });
        await say('📄 Notes', ['Your coursemate is not around, and the other one says the notes are "still being typed". Try again later.']);
      }
      return true;
    }
    if (action.id === 'handoutcopy') {
      const list = a.courses.filter(c => canBuyHandout(a, c.code));
      if (!list.length) { await say('📄 Handouts', ['You already own handouts for every course this semester.']); return false; }
      const c = await pickCourse('📄 Course handout', `A photocopied handout costs ₦${HANDOUT_PRICE}.`, list, x => `${x.code} · ${x.title}`);
      if (!c) return false;
      if (!pay(HANDOUT_PRICE)) { await say('📄 Handouts', ['You do not have enough money for that.']); return false; }
      handoutRec(a, c.code).bought = true; boost(c.code, HANDOUT_PREP);
      consume({ minutes: 10, fx: {} });
      toast(`📄 ${c.code} handout bought: preparation +${HANDOUT_PREP}.`);
      return true;
    }
    return false;
  }

  const IDS = new Set(['tutorial', 'practical', 'group', 'handoutchase', 'handoutcopy']);
  return { actions, run, attendHook, handles: id => IDS.has(id) };
}
