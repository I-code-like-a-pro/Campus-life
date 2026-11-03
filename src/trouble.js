import { showModal } from './modal.js';
import { hash01, floodWindow, isFlooded, fireAlarm, protestOn, securityAlert, seasonFor } from './eventengine.js';

/*
 * Authority and trouble (group trouble). Everything here is fair, explained to the player and recoverable.
 *
 *  1. Disciplinary hearings: two integrity warnings lead to a hearing with the Dean. Outcome tiers: reprimand, community
 *     service, or a note on record. Nobody is ever expelled on this alone, and every tier has a clear way back.
 *  2. Dean's visits: office hours once a semester that react to the player's real standing.
 *  3. Probation counselling: a counselling scene with real advice and a study plan whenever the player is on probation.
 *  4. Medical deferment: if you are sick (and a doctor has seen you) on CA or exam day, a medical report lets you
 *     defer to a make-up day instead of writing sick.
 *  5. Campus events: flood, fire drill or kitchen fire alarm, protest, security alert (seeded triggers in eventengine.js).
 *
 * Pure rules are exported for tests. Scene definitions (TROUBLE_SCENES) are in the format of scenes.js. Runtime wiring is
 * createTrouble(deps). State lives in state.academic.trouble and is saved with the academic record.
 */

export const HEARINGS_AFTER = 2;             // integrity warnings that lead to a hearing
export const REPORT_FEE = 500;
export const SERVICE_HOURS = 3;
export const CA_DAY = 3, EXAM_DAY = 6;
export const MAKEUP = { ca: { day: 5, from: 8, to: 18, label: 'CA test', hall: '📝 Take make-up CA test' }, exam: { day: 7, from: 8, to: 20, label: 'exam', hall: '🧪 Write make-up exam' } };
const WINDOW = { ca: [8, 18], exam: [8, 20] };
const WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const troubleOf = a => a.trouble || (a.trouble = {
  pending: {}, used: {}, heard: 0, warningsHeard: 0, record: null, service: null, deferred: {}, report: null, makeup: null, plan: null, sem: '', seen: {}, alert: null
});
const semKey = a => `${a.year}.${a.term}`;
const naira = n => `₦${n.toLocaleString('en-NG')}`;

/* ============================== 1. hearings ============================== */

export const warningsPending = a => Math.max(0, (a?.integrityWarnings || 0) - (a?.trouble?.warningsHeard || 0));
export const needsHearing = a => !!a && warningsPending(a) >= HEARINGS_AFTER;

export const TIERS = {
  reprimand: { id: 'reprimand', name: 'A reprimand', icon: '📢', stress: 2 },
  service: { id: 'service', name: 'Community service', icon: '🧹', stress: 3 },
  record: { id: 'record', name: 'A note on your record', icon: '📋', stress: 5 }
};
const ANSWER_WEIGHT = { truth: 0, explain: 1.5, silent: 3.5 };

/**
 * The outcome of a hearing. `answer` is 'truth' | 'explain' | 'silent'; `prior` is how many hearings you had before.
 * Honesty counts for you, silence against you, a repeat appearance weighs more, and a strong CGPA is taken into account.
 * There is no tier above "a note on record": nobody is expelled on this alone.
 */
export function hearingOutcome({ answer, prior = 0, cgpa = null }) {
  let s = prior * 2 + (ANSWER_WEIGHT[answer] ?? 1.5);
  const why = [];
  why.push(answer === 'truth' ? 'You told the truth, and the committee noted it.' : answer === 'silent' ? 'You said nothing, so the committee had nothing to weigh in your favour.' : 'You gave an explanation, which counts for something but is not an apology.');
  if (prior > 0) why.push('This is not your first hearing, so the committee is stricter.');
  if (cgpa != null && cgpa >= 3.5) { s -= 1; why.push('Your strong academic record counted in your favour.'); }
  const tier = s <= 1 ? 'reprimand' : s <= 3 ? 'service' : 'record';
  return { tier, score: s, why };
}

/** How each tier is cleared. Always spelled out for the player. */
export function wayBack(tier) {
  if (tier === 'reprimand') return 'A reprimand is spoken only. Nothing stays on your file, as long as you stay out of trouble.';
  if (tier === 'service') return `Finish ${SERVICE_HOURS} hours of community service at the main hall and the matter is closed. Nothing stays on your file.`;
  return 'The note stays on your file until the end of this semester. If you get no new warning before then, it is removed automatically.';
}

/** At a semester rollover: the record is removed after one clean semester. Returns 'cleared', 'kept' or null. */
export function rolloverConduct(T, warningsNow) {
  if (!T.record) return null;
  if (warningsNow > T.record.warningsAt) { T.record.warningsAt = warningsNow; T.record.clean = 0; return 'kept'; }
  T.record.clean = (T.record.clean || 0) + 1;
  if (T.record.clean >= 1) { T.record = null; return 'cleared'; }
  return 'kept';
}

/** The player's standing, for the Dean and for plain-language reports. */
export function standingOf(a) {
  if (!a) return 'new';
  const T = a.trouble;
  if (a.probation) return 'probation';
  if (T?.record || T?.service || warningsPending(a) > 0) return 'conduct';
  if (a.cgpa == null) return 'new';
  if (a.cgpa >= 3.5) return 'strong';
  return 'good';
}
export const goodStanding = a => ['good', 'strong', 'new'].includes(standingOf(a)) && !a?.withdrawn;

/* ============================== scheduling helpers ============================== */

export const nextId = (T, kind) => { T.used[kind] = (T.used[kind] || 0) + 1; return `${kind}-${T.used[kind]}`; };
const MAX_PER_KIND = 8;

/** Books a scene (it appears in the scene windows from `day` for `span` days). Returns its id. */
export function book(T, kind, { day, from, to, span = 1, extra = {} }) {
  const id = nextId(T, kind);
  T.pending[id] = { kind, day, from, to, span, ...extra };
  return id;
}
const windowsFor = id => a => {
  const p = a?.trouble?.pending?.[id];
  return p ? Array.from({ length: p.span || 1 }, (_, i) => ({ day: p.day + i, from: p.from, to: p.to })) : [];
};

/** A dean's office hours day for this semester, seeded: Tuesday to Thursday, 11:00 to 15:00. About two semesters in three. */
export function deanVisitDay(a, seed = 0) {
  if (a.year === 1 && a.term === 1) return null;                 // orientation already brought the Dean to the new set
  if (hash01(a.year * 10 + a.term + seed, 'dean-visit') >= 0.67) return null;
  return a.startDay + 1 + Math.floor(hash01(a.year * 10 + a.term, 'dean-day') * 3);
}

/* ============================== 3. probation counselling ============================== */

export const needsCounselling = (a, T) => !!a.probation && T.counselled !== semKey(a);

/** Real advice from the real record. */
export function counsellingAdvice(a) {
  const last = a.history?.[a.history.length - 1];
  const out = [];
  if (last) {
    const worst = [...last.rows].sort((x, y) => x.points - y.points || y.units - x.units).slice(0, 2).filter(r => r.points < 2);
    out.push(`Your GPA last semester was ${last.gpa.toFixed(2)}. Probation starts below ${1}.0, and your CGPA is ${(a.cgpa ?? last.gpa).toFixed(2)}.`);
    if (worst.length) out.push(`The courses that hurt most were ${worst.map(r => `${r.code} (${r.grade})`).join(' and ')}. Start there.`);
  }
  if (a.carryovers?.length) out.push(`You carry ${a.carryovers.length} course${a.carryovers.length > 1 ? 's' : ''} over (${a.carryovers.map(c => c.code).join(', ')}). They are retaken this semester, so give them real time.`);
  out.push('Marks come from four places: attendance 10, assignment 10, CA test 20 and exam 60. The first three are 40 marks you can nearly always collect.');
  out.push('If your GPA is still under 1.0 at the end of this semester you will be asked to withdraw. A GPA of 1.0 or more takes you off probation.');
  return out;
}

export const PLANS = {
  steady: { id: 'steady', label: 'Two hours of study every day', text: 'Steady wins. You commit to a fixed two hours at the library each day.', all: 5, fx: { stress: 2, fun: -2 } },
  weakest: { id: 'weakest', label: 'Fix my weakest course first', text: 'You list your courses from weakest to strongest and attack them in that order.', weakest: 10, fx: { stress: 1 } },
  group: { id: 'group', label: 'Join a study group', text: 'You agree to meet two coursemates twice a week. Explaining things to others is the fastest way to learn them.', all: 3, fx: { fun: 3, stress: -2 } },
  rest: { id: 'rest', label: 'Fix sleep and meals first', text: 'You decide to sleep before midnight and eat properly. A rested head does in one hour what a tired one does in three.', all: 2, fx: { stress: -6, energy: 6 } }
};

/* ============================== 4. medical deferment ============================== */

/** Which assessment a medical report could be for today: the CA on days 2 and 3, the exam on days 5 and 6. */
export function nextAssessment(a, sd) {
  if (!a || a.phase !== 'semester') return null;
  const T = a.trouble || {};
  if (!a.caTaken && !T.deferred?.ca && sd >= CA_DAY - 1 && sd <= CA_DAY) return 'ca';
  if (!a.examTaken && !T.deferred?.exam && sd >= EXAM_DAY - 1 && sd <= EXAM_DAY) return 'exam';
  return null;
}

/** Can the player get a medical report from the Health Centre right now? { ok, kind, reason } */
export function reportEligibility({ a, health, sd }) {
  const kind = nextAssessment(a, sd);
  if (!kind) return { ok: false, kind: null, reason: 'There is no CA test or exam to defer today or tomorrow.' };
  if (a.trouble?.report?.kind === kind) return { ok: false, kind, reason: 'You already have a medical report for it. Take it to the lecture hall on the day.' };
  if (!health?.sick) return { ok: false, kind, reason: 'The doctor finds nothing wrong. A report is only given for a real illness.' };
  if (!health.sick.diagnosed) return { ok: false, kind, reason: 'Please see the doctor first. A report needs a diagnosis.' };
  return { ok: true, kind, reason: '' };
}

/** Can the player present the report at the lecture hall now and defer? { ok, kind, reason } */
export function canDefer({ a, health, sd, hour }) {
  const r = a?.trouble?.report;
  if (!r) return { ok: false, kind: null, reason: '' };
  const kind = r.kind;
  const day = kind === 'ca' ? CA_DAY : EXAM_DAY;
  if (sd !== day) return { ok: false, kind, reason: `Your medical report is for the ${MAKEUP[kind].label} on ${WD[day - 1]}.` };
  if ((kind === 'ca' ? a.caTaken : a.examTaken) || a.trouble.deferred?.[kind]) return { ok: false, kind, reason: '' };
  if (r.sd < day - 1 || r.sd > day) return { ok: false, kind, reason: 'The report is out of date. Reports are valid on the day they are issued and the next day.' };
  if (!health?.sick) return { ok: false, kind, reason: 'You are well again, so there is nothing to defer. Write the paper.' };
  if (hour < WINDOW[kind][0] || hour >= WINDOW[kind][1]) return { ok: false, kind, reason: 'The hall is closed.' };
  return { ok: true, kind, reason: '' };
}

/** The make-up that is open right now, or null. */
export function makeupOpen(a, sd, hour) {
  const m = a?.trouble?.makeup;
  if (!m || m.done || sd !== m.day) return null;
  if ((m.kind === 'ca' ? a.caTaken : a.examTaken)) return null;
  return hour >= m.from && hour < m.to ? m.kind : null;
}

/** An exam make-up on the break day keeps the semester open until that day is over: 1 extra day, else 0. */
export const makeupHold = (a, sd) => {
  const m = a?.trouble?.makeup;
  return m && !m.done && m.kind === 'exam' && !a.examTaken && sd <= m.day ? 1 : 0;
};

/** Records the deferral (the report is used up). */
export function applyDeferral(T, kind, startDay = 1) {
  T.deferred[kind] = true;
  T.makeup = { kind, day: MAKEUP[kind].day, abs: startDay + MAKEUP[kind].day - 1, from: MAKEUP[kind].from, to: MAKEUP[kind].to, done: false };
  T.report = null;
  return T.makeup;
}

/* ============================== scene definitions ============================== */

let B = null;                                   // runtime deps, bound by createTrouble
const here = () => B?.state?.academic || {};

const deanCrowd = [{ id: 'dean', name: 'Dean of Student Affairs', role: 'Dean', emoji: '🎓', dx: 0, dz: -5.2, shirt: 0x1f2a44, skin: 0x5a3a26, dialogue: 'dean' }];

const DEAN_TALK = {
  probation: ctx => ({
    lines: [`"${ctx.name}, I asked to see you because your results worry me. I would rather help you now than sign a letter later."`, 'He opens a folder and turns it so you can see your own record.'],
    choices: [
      { label: 'Ask what you should do first', text: '"Attend every lecture and submit every assignment. That is forty marks you control. Then fix your weakest course."', fx: { stress: -3 } },
      { label: 'Admit it has been hard', text: '"Honesty is a good start. Use the counselling office and the study plan they offered. Come back and show me the next result."', fx: { stress: -4 } },
      { label: 'Say you will do better', text: '"Promises are cheap, I want to see your attendance sheet. But I believe you can do it."', fx: { stress: -1 } }
    ]
  }),
  conduct: () => ({
    lines: ['"You have been before the committee. I want you to hear this from me: it is not the end of anything."', 'He explains how the matter is closed.'],
    choices: [
      { label: 'Ask how to clear your file', text: `"${wayBack(here().trouble?.record ? 'record' : here().trouble?.service ? 'service' : 'reprimand')}"`, fx: { stress: -3 } },
      { label: 'Apologise properly', text: '"Thank you. That took courage. Cheating helps nobody, least of all the person who does it."', fx: { stress: -4 } },
      { label: 'Ask about the next CA test', text: '"Prepare early, sit where you can concentrate, and do not look sideways. Your own answers are worth more."', fx: { stress: -2 } }
    ]
  }),
  strong: () => ({
    lines: [`"Your CGPA of ${(here().cgpa ?? 0).toFixed(2)} is excellent. I wanted to say well done in person."`, 'He asks what you plan to do with your degree.'],
    choices: [
      { label: 'Ask about the bursary award', text: '"A CGPA of 4.50 or higher at the end of the year earns a bursary. Keep going and it could be yours."', fx: { fun: 3 } },
      { label: 'Ask for study advice for juniors', text: '"Teaching others helps you more than them. Consider leading a study group."', fx: { fun: 2, stress: -2 } },
      { label: 'Ask about research and internships', text: '"Lecturers notice good students. Visit them in office hours and ask for projects."', fx: { fun: 2 } }
    ]
  }),
  good: () => ({
    lines: ['"Open office hours. Students rarely come unless there is trouble, so I like to say hello before there is any."'],
    choices: [
      { label: 'Ask how to improve your CGPA', text: '"Consistency. Every semester a few marks more from attendance and assignments, and your CGPA climbs."', fx: { stress: -2 } },
      { label: 'Ask about clubs and leadership', text: '"Join one club properly rather than five loosely. Employers read leadership more than membership lists."', fx: { fun: 2 } },
      { label: 'Just say thank you', text: '"You are welcome. Come back any time."', fx: { stress: -2 } }
    ]
  })
};
DEAN_TALK.new = DEAN_TALK.good;

function deanBeats(ctx) {
  const kind = here().trouble?.pending?.[ctx.sceneId]?.standing || standingOf(here());
  return [
    { title: "🎓 The Dean's office hours", lines: ['A queue of students waits outside a door marked "Dean of Student Affairs". When it is your turn the secretary waves you in.'] },
    ctx2 => {
      const t = (DEAN_TALK[kind] || DEAN_TALK.good)(ctx2);
      return { title: "🎓 A word with the Dean", lines: t.lines, choices: t.choices };
    },
    { title: '🚪 Leaving the office', lines: ['The Dean stands and shakes your hand. "My door is open during office hours. Use it before you need it."', kind === 'probation' ? 'The counselling office can help with a study plan if you have not been yet.' : kind === 'conduct' ? 'Keep your file clean and it will not follow you.' : 'You walk out into the corridor, a little taller.'] }
  ];
}

const finish = (T, id) => { delete T.pending[id]; };

function hearingBeats(ctx) {
  const a = here(), T = troubleOf(a);
  return [
    { title: '⚖️ Disciplinary hearing', lines: ['A short letter asked you to appear before the Dean and two lecturers.', `The letter says there are ${a.integrityWarnings || HEARINGS_AFTER} integrity warnings on your file. The committee wants to hear your side.`, 'This is a hearing, not a trial. Nobody is going to expel you for this.'] },
    {
      title: '🗣️ What do you say?', lines: ['The Dean reads the reports on your file aloud: sharing answers in a test counts as exam malpractice. "Is there anything you wish to say?"'],
      choices: [
        { label: 'Tell the truth and accept it', text: 'You say you helped a classmate and that it was wrong. The Dean writes something down and nods once.', fx: { stress: 2 }, flag: 'truth' },
        { label: 'Explain the pressure you were under', text: 'You explain that you were nervous and did not think. The committee listens, but the rule is the rule.', fx: { stress: 1 }, flag: 'explain' },
        { label: 'Stay silent', text: 'You look at the floor. The silence in the room is long.', fx: { stress: 4 }, flag: 'silent' }
      ]
    },
    c => {
      const answer = c.flags.truth ? 'truth' : c.flags.silent ? 'silent' : 'explain';
      const o = hearingOutcome({ answer, prior: T.heard, cgpa: a.cgpa ?? null });
      c.flags.tier = o.tier;
      T.heard += 1;
      T.warningsHeard = a.integrityWarnings || 0;
      const t = TIERS[o.tier];
      if (o.tier === 'record') T.record = { sinceYear: a.year, sinceTerm: a.term, warningsAt: a.integrityWarnings || 0, clean: 0 };
      B?.meta?.notify({ icon: t.icon, title: `Hearing result: ${t.name}`, text: wayBack(o.tier) });
      return { title: `${t.icon} The decision: ${t.name.toLowerCase()}`, lines: [...o.why, `Decision: ${t.name}.`, wayBack(o.tier)], fx: { stress: t.stress } };
    },
    c => {
      if (c.flags.tier !== 'service') return null;
      return {
        title: '🧹 Your community service', lines: [`The Dean says service means ${SERVICE_HOURS} hours of tidying the main hall. You may start now, or come tomorrow afternoon.`],
        choices: [
          { label: `Start now (${SERVICE_HOURS} hours)`, text: 'The porter hands you a broom and a bucket. It is dull work, and strangely calming.', fx: { energy: -10, hygiene: -10, fun: -4, hunger: -6 }, minutes: SERVICE_HOURS * 60, flag: 'serviceNow' },
          { label: 'Come back tomorrow afternoon', text: 'The Dean says the assistant will expect you tomorrow from two to six. Do not miss it twice.', fx: {} }
        ]
      };
    },
    c => {
      const tier = c.flags.tier;
      if (tier === 'service') {
        if (c.flags.serviceNow) { T.service = null; B?.meta?.notify({ icon: '✅', title: 'Community service complete', text: 'The matter is closed and your file is clean.' }); }
        else { const today = B?.day?.() ?? 0; T.service = { due: today + 1 }; book(T, 'service', { day: today + 1, from: 14, to: 18, span: 2 }); }
      }
      finish(T, ctx.sceneId);
      return { title: '🛤️ The way back', lines: [wayBack(tier), 'You can stand with a clean file again. Prepare early for the next CA test and keep your eyes on your own paper.'] };
    }
  ];
}

function serviceBeats(ctx) {
  const a = here(), T = troubleOf(a);
  return [
    { title: '🧹 Community service', lines: ['The Dean\'s assistant meets you at the main hall with a list: sweep, wipe, arrange chairs.', `You have ${SERVICE_HOURS} hours to complete it.`] },
    {
      title: '🪑 Where do you start?', lines: ['Three jobs are on the list.'],
      choices: [
        { label: 'Sweep the floor', text: 'Dust rises in the afternoon light. You sneeze twice and keep going.', fx: { energy: -4 } },
        { label: 'Arrange the chairs', text: 'Four hundred chairs, in straight rows. Your back remembers every one.', fx: { energy: -6 } },
        { label: 'Wipe the boards and windows', text: 'The windows come out cleaner than they have been in years.', fx: { energy: -3 } }
      ]
    },
    c => {
      T.service = null;
      finish(T, ctx.sceneId);
      B?.meta?.notify({ icon: '✅', title: 'Community service complete', text: 'The matter is closed and your file is clean.' });
      return { title: '✅ Service complete', lines: ['The assistant ticks the last box and signs your form.', 'The matter is closed. Nothing stays on your file.'], fx: { stress: -3 } };
    }
  ];
}

function counselBeats(ctx) {
  const a = here(), T = troubleOf(a);
  return [
    { title: '🧭 Academic counselling', lines: ['The university counsellor offers you a chair and a cup of water.', '"Probation sounds frightening," she says, "but it is a signal, not a sentence. Let us look at what happened."'] },
    { title: '📊 What the record says', lines: counsellingAdvice(a) },
    {
      title: '📅 Choose a study plan', lines: ['"A plan you will follow beats a perfect plan you will not. Which one fits you?"'],
      choices: Object.values(PLANS).map(p => ({ label: p.label, text: p.text, fx: p.fx, flag: `plan_${p.id}` }))
    },
    c => {
      const p = Object.values(PLANS).find(x => c.flags[`plan_${x.id}`]) || PLANS.steady;
      T.plan = { id: p.id, sem: semKey(a) };
      T.counselled = semKey(a);
      if (p.all) B?.boostAll(p.all);
      if (p.weakest) B?.boostWeakest(p.weakest);
      finish(T, ctx.sceneId);
      return { title: '🗒️ Your plan', lines: [`Plan: ${p.label}.`, 'The counsellor writes it on a card and signs it.', 'To leave probation you need a semester GPA of at least 1.0. Attendance, assignments and the CA test give you up to 40 marks before the exam even starts.'] };
    }
  ];
}

const CLOSING = { hearing: 'The hearing is over. You walk out into the sunlight, slightly lighter.', service: 'The work is done and your hands are tired but your file is cleaner.', deanvisit: 'You thank the Dean and step back outside.', counsel: 'You leave with a plan and a lighter step.' };

const KINDS = {
  hearing: { emoji: '⚖️', title: 'Disciplinary hearing', short: 'Disciplinary hearing', minutes: 30, fx: {}, beats: hearingBeats, crowd: deanCrowd },
  service: { emoji: '🧹', title: 'Community service', short: 'Community service', minutes: SERVICE_HOURS * 60, fx: { energy: -8, hygiene: -8 }, beats: serviceBeats,
    crowd: [{ id: 'asst', name: "Dean's assistant", role: 'Dean\'s assistant', emoji: '📋', dx: 0, dz: -4.5, shirt: 0x34495e, skin: 0x5a3a26, dialogue: 'porter' }] },
  deanvisit: { emoji: '🎓', title: "Dean's office hours", short: "Dean's office hours", minutes: 30, fx: {}, beats: deanBeats, crowd: deanCrowd },
  counsel: { emoji: '🧭', title: 'Academic counselling', short: 'Counselling', minutes: 45, fx: { stress: -2 }, beats: counselBeats,
    crowd: [{ id: 'cn', name: 'University Counsellor', role: 'Counsellor', emoji: '🧭', dx: 0, dz: -4.5, shirt: 0x16a085, skin: 0x5a3a26, dialogue: 'deptofficer' }] }
};

/** `n` numbered scenes of each kind, so every occurrence has its own id (and its own attended/missed status). */
export const TROUBLE_SCENES = Object.entries(KINDS).flatMap(([kind, k]) => Array.from({ length: MAX_PER_KIND }, (_, i) => {
  const id = `${kind}-${i + 1}`;
  return {
    id, repeat: true, closing: CLOSING[kind], emoji: k.emoji, title: k.title, short: k.short, venue: 'auditorium', minutes: k.minutes, fx: k.fx,     // repeat: runs in any semester (timing comes from absolute days)
    windows: windowsFor(id), crowd: k.crowd,
    beats: ctx => k.beats({ ...ctx, sceneId: id })
  };
}));

/* ============================== runtime ============================== */

/**
 * deps: { state, meta, day(), minutes(), consume({minutes, fx}), pay(n), give(n), hostelName(), atHostel(), sendHome(), boostAll(n), boostWeakest(n), health() }
 * Call tick() every frame (cheap). If hasPrompt() is true and no dialog is open, call prompt() inside the dialog runner.
 */
export function createTrouble(deps) {
  const { state, meta } = deps;
  B = deps;
  const A = () => state.academic;
  const hour = () => deps.minutes() / 60;
  const queue = [];
  const sd = () => { const a = A(); return a ? deps.day() - a.startDay + 1 : 0; };
  const once = (T, key) => { if (T.seen[key]) return false; T.seen[key] = true; return true; };
  const note = (icon, title, text) => meta.notify({ icon, title, text });
  const season = a => seasonFor({ term: a.term, day: deps.day() });

  function semesterStart(a, T) {
    T.sem = semKey(a);
    T.seen = {};
    T.deferred = {}; T.report = null;
    T.makeup = null;
    const r = rolloverConduct(T, a.integrityWarnings || 0);
    if (r === 'cleared') note('🧼', 'Your record is clean', 'A full semester without a new warning. The note on your file has been removed.');
    for (const [id, p] of Object.entries(T.pending)) if (p.day + (p.span || 1) < a.startDay) delete T.pending[id];     // stale from earlier
    if (needsCounselling(a, T) && !Object.values(T.pending).some(p => p.kind === 'counsel') && (T.used.counsel || 0) < MAX_PER_KIND) {
      book(T, 'counsel', { day: a.startDay + 1, from: 10, to: 16, span: 2 });
      note('🧭', 'Counselling invitation', "You are on academic probation. The counsellor's office has an appointment for you on Tuesday. It is optional but strongly recommended.");
    } else {
      const dd = deanVisitDay(a);
      if (dd && (T.used.deanvisit || 0) < MAX_PER_KIND) {
        book(T, 'deanvisit', { day: dd, from: 11, to: 15, extra: { standing: standingOf(a) } });
        note('🎓', "Dean's office hours", `The Dean holds open office hours on ${WD[Math.min(6, dd - a.startDay)]}, 11:00 to 15:00, at the main hall.`);
      }
    }
  }

  function overdue(a, T) {
    const d = deps.day();
    for (const [id, p] of Object.entries(T.pending)) {
      if (d < p.day + (p.span || 1)) continue;                  // not over yet (days run p.day .. p.day + span - 1)
      delete T.pending[id];
      if (p.kind === 'hearing') {
        if ((p.attempt || 0) < 1 && (T.used.hearing || 0) < MAX_PER_KIND) {
          book(T, 'hearing', { day: d + 1, from: 9, to: 17, span: 2, extra: { attempt: 1 } });
          note('⚖️', 'Hearing rescheduled', 'You did not attend your hearing. The Dean\'s office has booked a new date. Please attend, since it is your chance to speak.');
        } else {
          T.heard += 1; T.warningsHeard = a.integrityWarnings || 0;
          T.record = { sinceYear: a.year, sinceTerm: a.term, warningsAt: a.integrityWarnings || 0, clean: 0 };
          note('📋', 'Hearing held without you', `You missed both hearings, so the committee decided in your absence: a note on your record. ${wayBack('record')}`);
        }
      } else if (p.kind === 'service') {
        T.service = null;
        T.record = T.record || { sinceYear: a.year, sinceTerm: a.term, warningsAt: a.integrityWarnings || 0, clean: 0 };
        note('📋', 'Community service not done', `Your service was not completed, so a note was placed on your record. ${wayBack('record')}`);
      } else if (p.kind === 'counsel') {
        T.counselled = semKey(a);
        note('🧭', 'Counselling missed', 'You can still ask for study advice from the Dean or your level adviser. Withdrawal follows a second bad semester, so make this one count.');
      }
    }
  }

  /* ---- events: each is announced once with a notification and a choice; the end is announced too ---- */
  function events(a, T) {
    const d = deps.day(), h = hour(), s = sd();
    const abs = d * 24 + h;

    // flood (the visual and the "water is draining" notice come from eventengine.js)
    const fw = floodWindow(d, season(a));
    if (fw && h >= fw.from && h < fw.to && once(T, `flood-${d}`)) queue.push(() => floodPrompt());

    // fire drill or kitchen fire alarm
    const fa = fireAlarm(d);
    if (fa && a.phase !== 'pre' && h >= fa.hour && h < fa.hour + 1.5 && once(T, `fire-${d}`)) queue.push(() => firePrompt(fa.kind));

    // protest
    const pr = a.phase === 'semester' ? protestOn(d, s) : null;
    if (pr && h >= pr.from && h < pr.to && once(T, `protest-${d}`)) queue.push(() => protestPrompt(pr));
    if (pr && h >= pr.to && T.seen[`protest-${d}`] && once(T, `protest-end-${d}`)) note('📣', 'The protest has ended', 'The march ended peacefully. Management promised to meet student leaders. Classes continue as normal.');

    // security alert
    for (const k of [0, -1]) {
      const al = securityAlert(d + k);
      if (!al) continue;
      const start = (d + k) * 24 + al.notice, curfew = (d + k) * 24 + al.curfew, end = (d + k) * 24 + 24 + al.end;
      if (abs >= start && abs < end && once(T, `alert-${d + k}`)) queue.push(() => alertPrompt(d + k, abs >= curfew));
      if (abs >= curfew && abs < end && T.seen[`alert-${d + k}`] && once(T, `curfew-${d + k}`)) enforceCurfew();
      if (abs >= end && T.seen[`alert-${d + k}`] && once(T, `alert-end-${d + k}`)) note('✅', 'Security alert lifted', 'The security office says the unconfirmed report led to nothing. Normal movement is allowed again.');
    }
  }

  async function floodPrompt() {
    const pick = await showModal({
      title: '🌊 Flooding on campus',
      lines: ['The afternoon downpour was heavy and water is lying across the main paths. Lectures are starting about an hour behind, and nobody will be marked late.', 'A group of students is clearing a blocked drain near the lecture halls. What do you do?'],
      buttons: [{ label: 'Help clear the drain (45 min)', value: 'help' }, { label: 'Take the dry route round (15 min)', value: 'detour' }, { label: 'Stay dry indoors', value: 'stay', secondary: true }]
    });
    if (pick === 'help') {
      deps.consume({ minutes: 45, fx: { hygiene: -22, energy: -6, fun: 4, stress: -2 } });
      await showModal({ title: '🌊 Drain cleared', lines: ['Six of you clear the leaves and plastic, and the water starts to drain. You are muddy to the knees, and everyone cheers.', 'Floodwater is dirty. Wash up and change soon, or you could fall ill.'], buttons: [{ label: 'Continue', value: 1 }] });
    } else if (pick === 'detour') {
      deps.consume({ minutes: 15, fx: { energy: -2 } });
      await showModal({ title: '🌊 The long way round', lines: ['The dry route through the back road is longer, but your shoes are fine.'], buttons: [{ label: 'Continue', value: 1 }] });
    } else {
      await showModal({ title: '🌊 Staying dry', lines: ['You watch the water from a doorway. Sensible, if a little guilty.'], buttons: [{ label: 'Continue', value: 1 }] });
    }
  }

  async function firePrompt(kind) {
    const hall = deps.hostelName() || 'your hostel';
    if (kind === 'drill') {
      const pick = await showModal({
        title: '🔔 Fire drill',
        lines: [`A siren sounds at ${hall}: the scheduled fire drill. In a real fire, the first minute matters more than anything you own.`, 'Residents must walk to the assembly point on the field.'],
        buttons: [{ label: 'Leave at once by the stairs', value: 'go' }, { label: 'Grab your phone and wallet first', value: 'grab' }, { label: 'Ignore it and stay in your room', value: 'stay', secondary: true }]
      });
      let lines;
      if (pick === 'go') { deps.consume({ minutes: 20, fx: { stress: -1, fun: 1 } }); lines = ['You walk out calmly with the rest. The warden counts heads and thanks the hall for being quick.']; }
      else if (pick === 'grab') { deps.consume({ minutes: 25, fx: { stress: 2 } }); lines = ['You make it out, but the warden says that two extra minutes would be a real danger in a real fire.']; }
      else { deps.consume({ minutes: 30, fx: { stress: 4 } }); const paid = deps.pay(300); lines = ['The warden knocks on your door and walks you out personally.', paid ? 'Staying in during a drill earns a ₦300 fine. Next time, go straight away.' : 'You cannot pay the ₦300 fine today, so it goes on your hall record. Next time, go straight away.']; }
      await showModal({ title: '🔔 Drill complete', lines, buttons: [{ label: 'Continue', value: 1 }] });
    } else {
      const pick = await showModal({
        title: '🔥 Kitchen fire alarm',
        lines: [`The alarm goes off at ${hall}. Someone left oil on a stove in the shared kitchen and smoke is drifting down the corridor. It looks small, but nobody is certain.`],
        buttons: [{ label: 'Leave and raise the alarm', value: 'leave' }, { label: 'Help with the fire blanket', value: 'help' }, { label: 'Stay in your room', value: 'stay', secondary: true }]
      });
      let lines;
      if (pick === 'leave') { deps.consume({ minutes: 30, fx: { stress: 2 } }); lines = ['You walk out, tell the porter which floor, and wait on the field. The fire service arrives and confirms it was only oil. Everyone is fine.']; }
      else if (pick === 'help') { deps.consume({ minutes: 25, fx: { stress: 4, hygiene: -8, energy: -4 } }); lines = ['With a fire blanket and the porter beside you, the stove fire is put out in seconds.', 'The porter says it went well, and that next time the first job is still to get out and raise the alarm.']; }
      else { deps.consume({ minutes: 30, fx: { stress: 5 } }); lines = ['The porter bangs on your door and tells you to get out right now. Smoke is not a thing to wait on, he says.', 'It was a small fire and everyone is fine, but you have been told off in front of the whole floor.']; }
      await showModal({ title: '🔥 All clear', lines, buttons: [{ label: 'Continue', value: 1 }] });
    }
  }

  async function protestPrompt(pr) {
    const fees = pr.topic === 'fees';
    const pick = await showModal({
      title: '📣 Student union protest',
      lines: [fees ? 'Students are gathering outside the main building with placards about a proposed rise in school fees.' : 'Students are gathering outside the main building with placards about the constant power cuts in the halls.', 'It is a peaceful march organised by the student union and cleared by the security office. Classes still hold, but the main road will be busy until 14:00.'],
      buttons: [{ label: 'Join the march (2 hours)', value: 'join' }, { label: 'Watch from the edge (30 min)', value: 'watch' }, { label: 'Avoid it and carry on', value: 'avoid', secondary: true }]
    });
    let lines;
    if (pick === 'join') { deps.consume({ minutes: 120, fx: { fun: 5, stress: -3, energy: -8, hunger: -8 } }); lines = [fees ? 'You chant and walk with the crowd. The Dean receives a letter from the union. No one is hurt, no property is damaged.' : 'You walk with the crowd to the facilities office. The manager promises to look at the generators.', 'Two hours passed. If a lecture was on in that time, you missed it.']; }
    else if (pick === 'watch') { deps.consume({ minutes: 30, fx: { fun: 1 } }); lines = ['From the edge you hear every speech. Both sides sound reasonable, and you leave knowing the facts.']; }
    else { deps.consume({ minutes: 15, fx: { energy: -1 } }); lines = ['You take the back path and miss the noise. Your day goes on as planned.']; }
    await showModal({ title: '📣 The march', lines, buttons: [{ label: 'Continue', value: 1 }] });
  }

  async function alertPrompt(alertDay, alreadyCurfew) {
    const hall = deps.hostelName() || 'home';
    const pick = await showModal({
      title: '🚨 Security notice',
      lines: ['The security office has circulated an unconfirmed security report. There are no details and no one has been hurt, but as a precaution:', `Students are asked to stay in their hostels from 20:00 tonight until 06:00. Please go back to ${hall} and stay in.`, alreadyCurfew ? 'The curfew has already started.' : 'The curfew starts at 20:00.'],
      buttons: [{ label: `Go back to ${hall} now`, value: 'now' }, { label: 'Finish up first, then head back', value: 'later' }, { label: 'Ignore it', value: 'ignore', secondary: true }]
    });
    if (pick === 'now') { deps.sendHome(); deps.consume({ minutes: 10, fx: { stress: -1 } }); note('🚨', 'Safe in your hostel', 'You are indoors. The curfew ends at 06:00.'); }
    else if (pick === 'later') note('🚨', 'Curfew at 20:00', `Be inside ${hall} by 20:00. Security will walk anyone still outside back to their hostel.`);
    else note('🚨', 'Curfew at 20:00', 'Ignoring a safety notice is unwise. Security will walk anyone still outside back to their hostel.');
  }

  /** At curfew time: anyone still outside is walked back by security. Mild, polite and a little time lost. */
  function enforceCurfew() {
    if (deps.atHostel()) return;
    deps.sendHome();
    deps.consume({ minutes: 20, fx: { stress: 2 } });
    note('🚨', 'Escorted to your hostel', 'It is past curfew, so a security officer walked you back politely. Stay in until 06:00.');
  }

  /** A pending event prompt, run inside the game's dialog runner. */
  const hasPrompt = () => queue.length > 0;
  async function prompt() { const f = queue.shift(); if (f) await f(); }

  function tick() {
    const a = A();
    if (!a || a.graduated || a.withdrawn) return;
    const T = troubleOf(a);
    if (T.makeup && !T.makeup.done && (T.makeup.kind === 'ca' ? a.caTaken : a.examTaken)) { T.makeup.done = true; note('✅', 'Make-up written', `Your make-up ${MAKEUP[T.makeup.kind].label} is done. It counts like the original.`); }
    if (T.makeup && !T.makeup.done && deps.day() > T.makeup.abs) { T.makeup.done = true; note('⏱️', 'Make-up missed', `The make-up ${MAKEUP[T.makeup.kind].label} day has passed, so that paper counts as zero. A failed course is retaken next semester.`); }
    if (a.phase === 'semester' && T.sem !== semKey(a)) semesterStart(a, T);
    if (needsHearing(a) && !Object.values(T.pending).some(p => p.kind === 'hearing') && (T.used.hearing || 0) < MAX_PER_KIND) {
      book(T, 'hearing', { day: deps.day() + 1, from: 9, to: 17, span: 2 });
      note('⚖️', 'Letter from the Dean', `You have ${a.integrityWarnings} integrity warnings. A short hearing is set for tomorrow at the main hall, 09:00 to 17:00. Come and tell your side.`);
    }
    overdue(a, T);
    if (a.phase !== 'pre') events(a, T);
  }

  /* ---- medical report and deferment (actions shown at the Health Centre and the lecture halls) ---- */
  const health = () => state.meta.health;
  function clinicActions(placeType) {
    const a = A();
    if (placeType !== 'clinic' || !a) return [];
    const r = reportEligibility({ a, health: health(), sd: sd() });
    return r.kind && !(a.trouble?.report?.kind === r.kind) && health().sick ? [{ id: 'medreport', label: `📋 Medical report (${naira(REPORT_FEE)})`, cost: REPORT_FEE, minutes: 20 }] : [];
  }
  function hallActions() {
    const a = A();
    if (!a) return [];
    const out = [];
    const mk = makeupOpen(a, sd(), hour());
    if (mk) out.push({ id: mk, label: MAKEUP[mk].hall });
    if (canDefer({ a, health: health(), sd: sd(), hour: hour() }).ok) out.push({ id: 'defer', label: `📋 Present report: defer the ${MAKEUP[a.trouble.report.kind].label}` });
    return out;
  }

  async function run(action) {
    const a = A();
    if (!a) return;
    const T = troubleOf(a);
    if (action.id === 'medreport') {
      const r = reportEligibility({ a, health: health(), sd: sd() });
      if (!r.ok) { await showModal({ title: '📋 Medical report', lines: [r.reason], buttons: [{ label: 'OK', value: 1 }] }); return; }
      if (!deps.pay(REPORT_FEE)) { await showModal({ title: '📋 Medical report', lines: [`The report costs ${naira(REPORT_FEE)} and you do not have it. Come back when you can.`], buttons: [{ label: 'OK', value: 1 }] }); return; }
      const ill = health().sick.id;
      T.report = { kind: r.kind, day: deps.day(), sd: sd(), illness: ill };
      deps.consume({ minutes: 20, fx: {} });
      const when = r.kind === 'ca' ? 'Wednesday' : 'Saturday';
      await showModal({
        title: '📋 Medical report issued',
        lines: [`The doctor signs a report confirming your illness. It is valid for your ${MAKEUP[r.kind].label} on ${when}, and for the day before.`, `Take it to any lecture hall on ${when}. If you are still unwell, you can defer to ${r.kind === 'ca' ? 'Friday' : 'Sunday'}, 08:00 to ${MAKEUP[r.kind].to}:00. If you are well, simply write the paper.`],
        buttons: [{ label: 'Continue', value: 1 }]
      });
      return;
    }
    if (action.id === 'defer') {
      const c = canDefer({ a, health: health(), sd: sd(), hour: hour() });
      if (!c.ok) { await showModal({ title: '📋 Defer', lines: [c.reason || 'You cannot defer now.'], buttons: [{ label: 'OK', value: 1 }] }); return; }
      const m = applyDeferral(T, c.kind, a.startDay);
      deps.consume({ minutes: 15, fx: {} });
      const when = c.kind === 'ca' ? 'Friday' : 'Sunday (the break day)';
      note('📋', 'Deferment approved', `Your ${MAKEUP[c.kind].label} is moved to ${when}, ${m.from}:00 to ${m.to}:00, at any lecture hall.${c.kind === 'exam' ? ' Results come out after that day.' : ''}`);
      await showModal({ title: '📋 Deferment approved', lines: [`The invigilator accepts your medical report and signs the deferral. You do not need to write sick.`, `Your make-up ${MAKEUP[c.kind].label} is on ${when}, ${m.from}:00 to ${m.to}:00. Rest, recover and revise. If you miss it, that paper counts as zero.`], buttons: [{ label: 'Continue', value: 1 }] });
    }
  }

  /** The HUD line for something time-critical in this module ('' when none). */
  function goalLine() {
    const a = A();
    if (!a) return '';
    const mk = makeupOpen(a, sd(), hour());
    if (mk) return `${mk === 'ca' ? '📝' : '🧪'} Make-up ${MAKEUP[mk].label} today at any lecture hall (until ${MAKEUP[mk].to}:00)`;
    const T = a.trouble;
    if (T && Object.values(T.pending).some(p => p.kind === 'hearing' && deps.day() >= p.day && deps.day() < p.day + (p.span || 1))) return '⚖️ Hearing with the Dean at the main hall (09:00 to 17:00)';
    return '';
  }

  function facts() {
    const a = A();
    if (!a) return [];
    const T = a.trouble || {};
    const out = [];
    if (a.integrityWarnings) out.push(`The player has ${a.integrityWarnings} exam integrity warning${a.integrityWarnings > 1 ? 's' : ''}. Two lead to a hearing with the Dean, never to expulsion.`);
    if (T.record) out.push('The player has a note on their record that clears after one semester without a new warning.');
    if (T.service) out.push(`The player owes ${SERVICE_HOURS} hours of community service.`);
    if (a.probation) out.push('The player is on academic probation. A second semester with a GPA below 1.0 means withdrawal; 1.0 or more clears probation.');
    if (T.makeup && !T.makeup.done) out.push(`The player has a make-up ${MAKEUP[T.makeup.kind].label} (medical deferment) on semester day ${T.makeup.day}.`);
    return out;
  }

  return { tick, hasPrompt, prompt, clinicActions, hallActions, run, goalLine, facts };
}

export { isFlooded };
