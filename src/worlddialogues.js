import { converse, asks, tip } from './dialogues.js';

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
  if (w.powerCut) lines.push('NEPA don take light again. This country sha!');
  if (w.raining) lines.push('This rain no gree person waka. Find shelter o.');
  if (w.season === 'harmattan' && !w.raining) lines.push('Harmattan dey wound me. My lips are drier than the Sahara.');
  if (w.season === 'rainy' && !w.raining) lines.push('Rain dey come anytime this season. Carry umbrella.');
  if (n.hunger < 30) lines.push('Ehn, you look hungry. Go and chop something before you faint.');
  if (n.energy < 25) lines.push('Your eyes are red. When last did you sleep?');
  if (n.hygiene < 25) lines.push('Abeg, go and bathe first. I say this with love.');
  if (n.stress > 75) lines.push('You dey too stress. Rest small, the work will wait.');
  if (c.state.money < 1500) lines.push('Sapa don catch you? Look for small work. Everybody has been there.');
  if (a && a.phase === 'semester') {
    const sd = c.day() - a.startDay + 1;
    if (a.strike && sd >= a.strike.from && sd <= a.strike.to) lines.push('ASUU don strike again. No lectures till Saturday!');
    if (sd === 2) lines.push('CA tests are tomorrow. You don read?');
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
  'Do not leave your phone charging in the lecture hall. People dey watch.',
  'The cyber cafe near the motor park is useful when your data finishes.',
  'I switched my study time to the morning. Now I am sleepy and informed.',
  'Group assignments are only fair when everybody shows up. Spoiler: they do not.',
  'My CGPA and I are in a complicated relationship.',
  'Take the first lecture seriously. Lecturers remember faces.',
  'I borrowed money from my friend. Now I dodge him like a bad exam question.'
];

const gistOrSituation = c => pickLine('gist-or-sit', [...situationLines(c), ...GIST]);

export async function student(c, npc) {
  const sit = situationLines(c);
  const open = sit.length && Math.random() < 0.65 ? pickLine(`sit-${npc.id}`, sit) : pickLine('gist', GIST);
  await converse(c, npc, `Hey! ${open}`, () => [
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
      const ok = c.doAction({ id: 'shareFood', label: 'Share noodles', minutes: 15, fx: { hunger: 12, fun: 8, stress: -4 }, limit: 1, msg: 'You shared noodles with your roommate. Good vibes.' });
      if (!ok) return 'You already shared today. Do not finish my food!';
      c.meta.track('friendly');
      return 'Haha, thanks! You are a real one.';
    } },
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
    : sit.length ? pickLine('vendor', sit) : 'Welcome, my pikin. What will you eat?';
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
