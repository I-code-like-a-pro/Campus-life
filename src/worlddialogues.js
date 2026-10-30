import { converse, asks, tip } from './dialogues.js';
import { traitOf, levelOf, TONES, toneDelta, toneReply, GIFTS, giftDelta, FAVOURS, canAsk } from './social.js';

/*
 * Dialogue for the living world: students, roommates, lecturers, the librarian, vendors and the Business Centre.
 * These react to what is happening right now (weather, power, strike, the player's needs, the exam calendar).
 * Extra context used here (see talkContext in main.js):
 *   c.world() -> { season, raining, powerCut }, c.meta, c.day(), c.doAction(action) -> boolean, c.directionsTo(name)
 */

const lastLine = new Map();           // key -> last index used, so NPCs don't repeat themselves back to back
export function pickLine(key, list) {
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === lastLine.get(key)) i = (i + 1) % list.length;
  lastLine.set(key, i);
  return list[i];
}

/** Lines that depend on what is happening right now: weather, power, strike, needs and the exam calendar. */
export function situationLines(c) {
  const lines = [];
  const w = (c.world && c.world()) || {};
  const n = c.state.needs;
  const a = c.state.academic;
  if (w.powerCut) lines.push('NEPA has taken the light again. This is exhausting!');
  if (w.raining) lines.push('This rain will not let anyone walk. Find shelter.');
  if (w.season === 'harmattan' && !w.raining) lines.push('The harmattan is wearing me out. My lips are drier than the Sahara.');
  if (w.season === 'rainy' && !w.raining) lines.push('It can rain at any time this season. Carry an umbrella.');
  if (n.hunger < 30) lines.push('You look hungry. Go and eat something before you faint.');
  if (n.energy < 25) lines.push('Your eyes are red. When last did you sleep?');
  if (n.hygiene < 25) lines.push('Please go and bathe first. I say this with love.');
  if (n.stress > 75) lines.push('You look very stressed. Rest a little, the work will wait.');
  if (c.state.money < 1500) lines.push('Running out of money? Look for a small job. Everybody has been there.');
  if (a && a.phase === 'semester') {
    const sd = c.day() - a.startDay + 1;
    if (a.strike && sd >= a.strike.from && sd <= a.strike.to) lines.push('ASUU is on strike again. No lectures until Saturday!');
    if (sd === 2) lines.push('CA tests are tomorrow. Have you read?');
    if (sd === 5) lines.push('Exams are tomorrow! Pray and revise.');
    if (sd === 6) lines.push('Exam day. May the odds be ever in your favour.');
  }
  return lines;
}

export const GIST = [
  'Did you hear? The canteen is bringing new jollof prices. Student discount, they say.',
  'My roommate snores like a generator. I need a new hostel.',
  'I submitted my assignment three minutes before the deadline. Pure adrenaline.',
  'The library has the fastest Wi-Fi on campus, but everyone knows it. Come early.',
  'The senior students say the first year is the hardest. They also say that about every year.',
  'My lecturer said the exam will be "fair". That is exactly what I am afraid of.',
  'Someone is selling handouts at the Business Centre. They save lives.',
  'If you see a long queue, just join it. Ask questions later. That is how we do it here.',
  'They say the best suya spot is by the gate. I say the best suya spot is wherever I am hungry.',
  'I tried to wake up early for the 9AM class. The bed won.',
  'Carry a power bank. NEPA does not respect your assignment deadline.',
  'Football on the field at evening? Count me in, if my legs agree.',
  'Everybody is hustling something here. Even the guy who sells pens sells pens with passion.',
  'Do not leave your phone charging in the lecture hall. People are watching.',
  'The cyber cafe near the motor park is useful when your data finishes.',
  'I switched my study time to the morning. Now I am sleepy and informed.',
  'Group assignments are only fair when everybody shows up. Spoiler: they do not.',
  'My CGPA and I are in a complicated relationship.',
  'Take the first lecture seriously. Lecturers remember faces.',
  'I borrowed money from my friend. Now I dodge him like a bad exam question.'
];

const gistOrSituation = c => pickLine('gist-or-sit', [...situationLines(c), ...GIST]);

/**
 * "Spend time together": pick a tone, share a gift, or ask a favour once you are friends.
 * Needs c.relation(npc), c.addRelation(npc, n), c.addLoan(npc), c.studyTogether(npc), c.borrowNotes(npc).
 */
export async function socialMenu(c, npc) {
  const trait = traitOf(npc.id);
  for (;;) {
    const rel = c.relation(npc);
    const lvl = levelOf(rel.points);
    const buttons = [
      ...Object.entries(TONES).map(([k, t]) => ({ label: t.label, value: `tone:${k}` })),
      ...Object.entries(GIFTS).map(([k, g]) => ({ label: `${g.label} (₦${g.cost.toLocaleString('en-NG')})`, value: `gift:${k}` })),
      ...(canAsk('study', rel.points) && c.state.academic ? [{ label: FAVOURS.study.label, value: 'study' }] : []),
      ...(canAsk('loan', rel.points) ? [{ label: FAVOURS.loan.label, value: 'loan' }] : []),
      ...(canAsk('notes', rel.points) && c.state.academic ? [{ label: FAVOURS.notes.label, value: 'notes' }] : []),
      { label: '← Back', value: 'back', secondary: true }
    ];
    const pick = await c.say(npc, `${lvl.icon} ${lvl.name} (${rel.points} points). What would you like to do?`, buttons);
    if (pick === 'back') return;

    let reply = '';
    if (pick.startsWith('tone:')) {
      const tone = pick.slice(5);
      if (!c.meta.trackOnce(`tone-${c.day()}`, npc.id, 'toneChats')) reply = 'We already had a long chat today. Let us talk tomorrow.';
      else { c.addRelation(npc, toneDelta(trait, tone)); reply = toneReply(trait, tone); }
    } else if (pick.startsWith('gift:')) {
      const key = pick.slice(5);
      const g = GIFTS[key];
      const ok = c.doAction({ id: `gift-${key}-${npc.id}`, label: g.label, cost: g.cost, minutes: 5, limit: 1, msg: `You gave ${npc.name} a ${key === 'snack' ? 'snack' : 'gift'}.` });
      if (ok) { c.addRelation(npc, giftDelta(trait, key)); c.meta.track('gifts'); reply = trait === 'foodie' && key === 'snack' ? 'Food! You really know me. Thank you!' : 'That is so kind. Thank you!'; }
      else reply = 'You can only give me one of those a day, and you must have enough money.';
    } else if (pick === 'study') reply = c.studyTogether(npc);
    else if (pick === 'loan') reply = c.addLoan(npc);
    else if (pick === 'notes') reply = c.borrowNotes(npc);
    await c.say(npc, reply, [{ label: 'OK', value: 'ok' }]);
  }
}

export async function student(c, npc) {
  const sit = situationLines(c);
  const open = sit.length && Math.random() < 0.65 ? pickLine(`sit-${npc.id}`, sit) : pickLine('gist', GIST);
  await converse(c, npc, `Hey! ${open}`, () => [
    { label: '💞 Spend time together', run: async () => { await socialMenu(c, npc); } },
    { label: '💬 Any more gist?', run: () => gistOrSituation(c) },
    asks(c)(npc),
    { label: '📚 Any study tips?', run: () => `Sure. ${tip()}` }
  ]);
}

export async function roommate(c, npc) {
  const sit = situationLines(c);
  const open = sit.length ? pickLine(`room-${npc.id}`, sit) : 'Ah, my roommate! How was your day?';
  await converse(c, npc, open, () => [
    { label: '🍜 Share some noodles', run: () => {
      const ok = c.doAction({ id: 'shareFood', label: 'Share noodles', minutes: 15, fx: { hunger: 12, fun: 8, stress: -4 }, limit: 1, msg: 'You shared noodles with your roommate. Good company.' });
      if (!ok) return 'You already shared today. Do not finish my food!';
      c.meta.track('friendly');
      return 'Haha, thanks! You are a real one.';
    } },
    { label: '💞 Spend time together', run: async () => { await socialMenu(c, npc); } },
    { label: '💬 Gist me', run: () => gistOrSituation(c) },
    asks(c)(npc)
  ]);
}

export async function lecturer(c, npc) {
  const a = c.state.academic;
  const mine = a ? a.courses.filter(x => a.timetable.some(t => t.code === x.code && t.venue === npc.where)) : [];
  const course = mine[0];
  const sd = a ? c.day() - a.startDay + 1 : 0;
  const held = course ? a.timetable.filter(t => t.code === course.code && !t.cancelled && t.day < sd).length : 0;
  const weak = !!course && held > 0 && (course.att.ok + course.att.late) < held * 0.5;

  let open = `Good day. I am ${npc.name}.`;
  if (!a) open += ' You are not enrolled in my class yet.';
  else if (course) open += weak ? ` I noticed you missed some of my ${course.code} classes. Do not let it become a habit.` : ` How are you finding ${course.code} so far?`;
  else open += ' Is there anything I can help you with?';

  await converse(c, npc, open, () => [
    ...(course ? [{ label: '💡 Could you give me a hint?', run: () => {
      if (!c.meta.trackOnce(`hint-${c.day()}`, course.code, 'lecturerHints')) return 'I already helped you today. Go and read.';
      course.knowledge = Math.min(100, course.knowledge + 4);
      return `Focus on the fundamentals of ${course.title}. Understand, do not cram. (Preparation +4%)`;
    } }] : []),
    { label: '😅 Sorry I missed a class', run: () => (weak ? 'Apology accepted, but attendance is part of your marks. Come on time.' : 'Hmm, you have been good. No problem.') },
    { label: '📅 When are the tests and exams?', run: () => 'CA tests hold on Wednesday. Assignments are due Friday. Exams hold on Saturday. All at the lecture halls.' },
    { label: '📖 Where can I get handouts?', run: () => c.directionsTo('Business Centre') }
  ]);
}

export async function librarian(c, npc) {
  const a = c.state.academic;
  await converse(c, npc, a ? 'Welcome to the library. Please keep it quiet.' : 'Welcome. Students only, please.', () => [
    ...(a ? [{ label: '📚 Recommend something to read', run: () => {
      const weakest = a.courses.slice().sort((x, y) => x.knowledge - y.knowledge)[0];
      if (!c.meta.trackOnce(`lib-${c.day()}`, 'rec', 'libraryTips')) return 'I already gave you a recommendation today. Read it first.';
      weakest.knowledge = Math.min(100, weakest.knowledge + 3);
      return `Try the reference shelf for ${weakest.code}. (Preparation +3%)`;
    } }] : []),
    { label: '🤫 Can I study here?', run: () => 'Of course. The study desks are in the middle of the room.' },
    { label: '🧭 Where is the Business Centre?', run: () => c.directionsTo('Business Centre') }
  ]);
}

export async function vendor(c, npc) {
  const sit = situationLines(c).filter(l => !l.includes('lectures'));
  const open = c.state.needs.hunger < 40 ? 'Ah, you look hungry! Come, come. I will give you something good.'
    : sit.length ? pickLine('vendor', sit) : 'Welcome, my dear. What will you eat?';
  await converse(c, npc, open, () => [
    { label: '🍚 Student half-portion (₦1,200)', run: () => {
      const ok = c.doAction({ id: 'vendorhalf', label: 'Half portion', cost: 1200, minutes: 15, fx: { hunger: 30, fun: 3 }, limit: 1, msg: 'Mama Put gave you a student portion.' });
      return ok ? 'Eat well! Education is hungry work.' : 'One discount a day, my dear. Come tomorrow.';
    } },
    { label: '💬 Any gist?', run: () => gistOrSituation(c) }
  ]);
}

export async function bizmanager(c, npc) {
  await converse(c, npc, 'Welcome to the Business Centre! We print, we scan, we help with POS. Need work or handouts?', () => [
    { label: '💼 Is there work for me?', run: () => 'Yes! The printing desk pays ₦3,000 for 2 hours (up to twice a day). A POS shift pays ₦4,500 for 3 hours. The printers need light, so no work during a NEPA cut.' },
    { label: '📖 What handouts do you have?', run: () => 'Past questions and handouts for all courses: ₦1,500 and your preparation improves. Use the counter.' },
    asks(c)(npc)
  ]);
}

export const WORLD_DIALOGUES = { student, roommate, lecturer, librarian, vendor, bizmanager };

/* ------------------------------ the nurse ------------------------------ */
import { ILLNESSES } from './health.js';

export async function nurse(c, npc) {
  const h = c.state.meta.health;
  const sick = h.sick;
  let open = 'Welcome to the clinic. How are you feeling today?';
  if (sick && !sick.diagnosed) open = 'You do not look well. Please see the doctor in the consulting room so we can find out what is wrong.';
  else if (sick) open = `The doctor says you have ${ILLNESSES[sick.id].name.toLowerCase()}. Buy the prescribed drugs at the pharmacy counter and you will recover quickly.`;
  else open = 'You look healthy. Keep it that way: eat well, sleep well and keep clean.';
  await converse(c, npc, open, () => [
    { label: '🦟 How do I avoid malaria?', run: () => 'Sleep under a mosquito net, especially in the rainy season. You can buy one at the market for ₦2,500. It cuts your risk a lot.' },
    { label: '🧼 How do I stay healthy?', run: () => 'Bathe regularly, eat proper meals, sleep enough and do not let stress pile up. When your bars run low, you fall ill more easily.' },
    { label: '🌫️ Why do I catch cold in harmattan?', run: () => 'The dry, dusty air and cold mornings. Eat well, keep warm and do not skip sleep.' },
    { label: '🧭 Where is the market?', run: () => c.directionsTo('Campus Market') }
  ]);
}

WORLD_DIALOGUES.nurse = nurse;
