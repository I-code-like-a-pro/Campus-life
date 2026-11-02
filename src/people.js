import { hash01 } from './eventengine.js';

/*
 * People and community (group "people"). Pure rules and data; the dialogue lives in peopledialogues.js.
 * State is state.meta.people (see newPeople). Everything here is suitable for teenagers: nothing physical,
 * nothing that pressures the player, and every invitation has an easy, kind way to say no.
 *
 *  1. Roommate stories (a few short arcs, each with 2 to 3 choices)
 *  2. Mentors (a senior who gives a weekly tip and sometimes notes)
 *  3. Study groups (up to three coursemates, one boosted session a week)
 *  4. A friendly rival (gist about scores after CA tests and results)
 *  5. Club storylines (three short chapters per club)
 *  6. Friendship events (cultural night, a birthday, helping someone move in)
 *  7. Faith and community spaces (chapel and mosque service times and quiet reflection)
 *  8. An optional light "crush" storyline (off by default, strictly PG)
 */

export const weekOf = day => Math.floor(day / 7);
/** Monday = 1 ... Sunday = 7, from a semester day (also works during breaks and before the semester starts). */
export const weekdayOf = sd => (((Math.round(sd) - 1) % 7) + 7) % 7 + 1;
const strHash = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function newPeople() {
  return {
    v: 1,
    since: null,                                                    // day the first story started
    roommate: { done: {}, mood: 0, lastArcDay: -1 },
    mentor: { id: null, name: null, since: -1, lastTip: -1, tips: 0 },
    group: { members: [], formed: -1, lastSession: -1, sessions: 0 },
    rival: { met: false, wins: 0, losses: 0, lastNews: '' },
    story: {},                                                      // club id -> { chapter, last, pts }
    events: { done: {} },
    crush: { id: null, name: null, step: 0, status: 'none', last: -2 },
    reflect: { count: 0 }
  };
}

/** Makes sure meta.people exists and has every key (older saves and partial data are repaired, never lost). */
export function ensurePeople(meta) {
  const base = newPeople(), cur = meta.people && typeof meta.people === 'object' ? meta.people : {};
  const out = { ...base, ...cur };
  for (const k of ['roommate', 'mentor', 'group', 'rival', 'events', 'crush', 'reflect']) out[k] = { ...base[k], ...(cur[k] || {}) };
  if (!Array.isArray(out.group.members)) out.group.members = [];
  if (!out.story || typeof out.story !== 'object') out.story = {};
  meta.people = out;
  return out;
}

/* ---------------------------------------- 1. roommate stories ---------------------------------------- */

export const ROOMMATE_NAMES = ['Emeka', 'Dami', 'Kunle', 'Chuka'];
/** Same pick the hostel interior always used, so the name never changes. */
export const roommateNameFor = placeName => ROOMMATE_NAMES[String(placeName || '').length % ROOMMATE_NAMES.length];

export const MOOD_MIN = -3, MOOD_MAX = 3;
export const moodLabel = m => (m >= 2 ? 'Very happy with you' : m >= 1 ? 'Happy' : m <= -2 ? 'Upset' : m <= -1 ? 'A bit annoyed' : 'Fine');

/*
 * Each arc has an `after` (days since the first story began) and 2 to 3 choices.
 * A choice: { id, label, reply, rel, mood, cost?, fx?, prep? }  (cost in naira, fx = need changes, prep = preparation percent)
 */
export const ROOMMATE_ARCS = [
  {
    id: 'borrow', after: 0, title: 'Borrowed without asking',
    open: n => `${n} used your charger and your detergent without asking. Now ${n} looks a little guilty.`,
    choices: [
      { id: 'talk', label: '🗣️ Talk about it calmly', reply: 'You are right. I should have asked. Sorry. I will ask first next time.', rel: 5, mood: 1, fx: { stress: -2 } },
      { id: 'rule', label: '😄 Laugh and agree a house rule', reply: 'Ha! Deal. Ask first, and I will buy the next detergent.', rel: 4, mood: 1, fx: { fun: 3 } },
      { id: 'quiet', label: '😐 Say nothing and stay annoyed', reply: 'Okay... I can tell something is wrong. We can talk later.', rel: -2, mood: -1, fx: { stress: 3 } }
    ]
  },
  {
    id: 'clean', after: 2, title: 'The untidy room',
    open: n => `The room is untidy again. ${n} says it is your side. You think it is theirs.`,
    choices: [
      { id: 'rota', label: '📋 Make a cleaning rota together', reply: 'A rota works for me. You sweep on odd days. I will do even days.', rel: 5, mood: 1, fx: { stress: -2, hygiene: 4 } },
      { id: 'tidy', label: '🧹 Just tidy up now (20 minutes)', reply: 'Thanks. That was kind of you. I will do the next round.', rel: 3, mood: 1, fx: { energy: -4, hygiene: 6, stress: -2 } },
      { id: 'argue', label: '🙄 Argue about whose mess it is', reply: 'Let us not shout. We both live here.', rel: -3, mood: -1, fx: { stress: 4 } }
    ]
  },
  {
    id: 'exam', after: 4, title: 'Exam stress',
    open: n => `${n} has been awake all night, staring at the notes. "I think I will fail everything."`,
    choices: [
      { id: 'study', label: '📚 Offer to revise together', reply: 'Thank you. I understand it much better when we go through it together.', rel: 5, mood: 1, prep: 4, fx: { energy: -6, stress: -2 }, minutes: 90 },
      { id: 'tea', label: '🍵 Make tea and talk it through', reply: 'That helped. I feel calmer. Thanks for listening.', rel: 4, mood: 1, cost: 300, fx: { stress: -4, fun: 2 }, minutes: 20 },
      { id: 'relax', label: '🙂 Say they should rest and try again', reply: 'You are right. A short sleep will help me more than panic.', rel: 2, mood: 0 }
    ]
  },
  {
    id: 'birthday', after: 6, title: 'A birthday',
    open: n => `Today is ${n}'s birthday, and ${n} did not mention it. Quiet day, quiet face.`,
    choices: [
      { id: 'cake', label: '🎂 Buy a small cake (₦1,500)', reply: 'You remembered! This is the nicest surprise. Thank you.', rel: 8, mood: 2, cost: 1500, fx: { fun: 8, stress: -3 }, minutes: 20 },
      { id: 'card', label: '💌 Write a card and sing quietly', reply: 'A card! I am keeping this. You are a great roommate.', rel: 6, mood: 2, fx: { fun: 5 }, minutes: 10 },
      { id: 'later', label: '👋 Just say happy birthday', reply: 'Thank you! That is enough for me.', rel: 2, mood: 0 }
    ]
  }
];

/** The next roommate arc waiting to happen, or null. One arc a day, in order. */
export function nextRoommateArc(people, day) {
  const r = people.roommate;
  if (people.since == null || r.lastArcDay === day) return null;
  return ROOMMATE_ARCS.find(a => !r.done[a.id] && day - people.since >= a.after) || null;
}
/** Starts the clock the first time a roommate story is checked. */
export function startStories(people, day) { if (people.since == null) people.since = day; }

/** Records the player's choice. Returns the choice (for the dialogue to apply), or null if it does not exist or is done. */
export function resolveRoommateArc(people, arcId, choiceId, day) {
  const arc = ROOMMATE_ARCS.find(a => a.id === arcId), r = people.roommate;
  const ch = arc && arc.choices.find(c => c.id === choiceId);
  if (!ch || r.done[arcId]) return null;
  r.done[arcId] = { choice: choiceId, day };
  r.lastArcDay = day;
  r.mood = clamp(r.mood + ch.mood, MOOD_MIN, MOOD_MAX);
  return ch;
}

/* ---------------------------------------- 2. mentors ---------------------------------------- */

export const MENTOR_MIN_POINTS = 4;       // you must at least be acquaintances
export const MENTOR_TIPS = [
  'Read small every day. A little each evening beats one big night before the test.',
  'Sit near the front in lectures. You will ask better questions and fall asleep less.',
  'Join a study group early. Explaining a topic to someone else is the best revision.',
  'Do your assignment on the day it is given, then relax on Friday.',
  'Past questions show how lecturers think. Practise them with a timer.',
  'Keep a small emergency fund. Light goes off, data finishes, and nobody warns you.',
  'Eat before you read. A hungry brain forgets quickly.',
  'Visit your lecturer during office hours. Most of them like students who ask.',
  'Sleep before an exam, not after. Tired minds make silly mistakes.',
  'Make one friend outside your department. It makes campus feel bigger and kinder.'
];

export function canAskMentor(people, relPoints) {
  if (people.mentor.id) return { ok: false, why: `${people.mentor.name} is already your mentor.` };
  if (relPoints < MENTOR_MIN_POINTS) return { ok: false, why: 'Let us chat a few more times first. Then I will gladly help.' };
  return { ok: true };
}
export function chooseMentor(people, npc, day) {
  const chk = canAskMentor(people, 999);
  if (!chk.ok) return chk;
  Object.assign(people.mentor, { id: npc.id, name: npc.name, since: day, lastTip: -1 });
  return { ok: true };
}
export function releaseMentor(people) { Object.assign(people.mentor, { id: null, name: null, since: -1, lastTip: -1 }); }

/** One tip a week. Sometimes (about four weeks in ten) the mentor also shares notes for your weakest course. */
export function mentorWeekly(people, day) {
  const m = people.mentor;
  if (!m.id) return { ok: false, text: 'You do not have a mentor yet.' };
  if (m.lastTip === weekOf(day)) return { ok: false, text: 'We have done this week already. Come back next week, and keep practising.' };
  m.lastTip = weekOf(day);
  m.tips += 1;
  const text = MENTOR_TIPS[Math.floor(hash01(day * 7 + m.tips, 'mentor') * MENTOR_TIPS.length)];
  const notes = hash01(day, `notes-${m.id}`) < 0.4;
  return { ok: true, text, notes, prep: notes ? 7 : 3 };
}

/* ---------------------------------------- 3. study groups ---------------------------------------- */

export const MAX_GROUP = 3;
export const GROUP_MIN_POINTS = 8;
export const inGroup = (people, npcId) => people.group.members.some(m => m.id === npcId);

export function inviteToGroup(people, npc, relPoints, day) {
  const g = people.group;
  if (inGroup(people, npc.id)) return { ok: false, text: 'I am already in your study group.' };
  if (g.members.length >= MAX_GROUP) return { ok: false, text: 'Your group is full. Three people is the best size.' };
  if (relPoints < GROUP_MIN_POINTS) return { ok: false, text: 'Maybe later. Let us get to know each other a little more first.' };
  g.members.push({ id: npc.id, name: npc.name });
  if (g.formed < 0) g.formed = day;
  return { ok: true, text: 'Yes, I would love that. Three heads are better than one.' };
}
export function leaveGroup(people, npcId) {
  const g = people.group;
  g.members = g.members.filter(m => m.id !== npcId);
  if (!g.members.length) g.formed = -1;
}
/** One session a week with at least one member. More members help a little more, up to a limit. */
export function groupSession(people, day) {
  const g = people.group, n = g.members.length;
  if (!n) return { ok: false, text: 'You have no study group yet. Invite a coursemate you know.' };
  if (g.lastSession === weekOf(day)) return { ok: false, text: 'The group already met this week. Rest, then read on your own.' };
  g.lastSession = weekOf(day);
  g.sessions += 1;
  return { ok: true, prep: Math.min(10, 4 + 2 * n), names: g.members.map(m => m.name) };
}
export function canGroupSession(people, day) {
  const g = people.group;
  if (!g.members.length) return { ok: false, text: 'You have no study group yet. Invite a coursemate you know.' };
  if (g.lastSession === weekOf(day)) return { ok: false, text: 'The group already met this week. Rest, then read on your own.' };
  return { ok: true };
}
export const groupSummary = people => {
  const g = people.group;
  return g.members.length ? `Study group: ${g.members.map(m => m.name).join(', ')} (${g.sessions} session${g.sessions === 1 ? '' : 's'})` : '';
};

/* ---------------------------------------- 4. a friendly rival ---------------------------------------- */

export const RIVAL_NAMES = ['Ife', 'Kayode', 'Zara', 'Chinedu', 'Hadiza', 'Tosin'];
export function rivalFor(seedText) {
  return { id: 'rival', name: RIVAL_NAMES[strHash(seedText || 'x') % RIVAL_NAMES.length] };
}
/** The rival's CA fraction (0..1) for a course, always within about 0.25 of yours. */
export function rivalCa(name, code, mine) {
  const off = (hash01(strHash(name + code), 'ca') - 0.45) * 0.5;
  return clamp(Math.round((mine + off) * 5) / 5, 0.2, 1);
}
/** Rival's course total (0..100): close to yours, never wildly different. */
export function rivalTotal(name, code, mine, round) {
  const off = (hash01(strHash(name + code), `r${round}`) - 0.45) * 18;
  return clamp(Math.round(mine + off), 25, 98);
}
const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * Friendly gist about the CA test. `courses` is [{ code, ca }] (ca = fraction 0..1 or null).
 * Returns { text, result: 'ahead'|'behind'|'level'|null, mine, theirs } (percentages).
 */
export function rivalCaGist(name, courses) {
  const done = courses.filter(c => c.ca != null);
  if (!done.length) return { text: `${name}: We have not written the CA yet. May the best preparation win!`, result: null };
  const mine = Math.round(avg(done.map(c => c.ca)) * 100);
  const theirs = Math.round(avg(done.map(c => rivalCa(name, c.code, c.ca))) * 100);
  if (theirs > mine + 4) return { result: 'behind', mine, theirs, text: `${name}: I got ${theirs}% in the CA and you got ${mine}%. Close! Let us see who leads in the exam.` };
  if (mine > theirs + 4) return { result: 'ahead', mine, theirs, text: `${name}: You got ${mine}% and I got ${theirs}%. Well done! I will be studying harder for the exam.` };
  return { result: 'level', mine, theirs, text: `${name}: We both got about ${mine}% in the CA. A fair fight. May the best revision win!` };
}
/** Friendly gist about semester results. `rows` is [{ code, total }]. */
export function rivalResultsGist(name, rows, round = 0) {
  if (!rows.length) return { text: `${name}: Results are not out yet.`, result: null };
  const mine = Math.round(avg(rows.map(r => r.total)));
  const theirs = Math.round(avg(rows.map(r => rivalTotal(name, r.code, r.total, round))));
  if (theirs > mine + 2) return { result: 'behind', mine, theirs, text: `${name}: Results are out! I averaged ${theirs} and you ${mine}. You were close. Next semester is yours!` };
  if (mine > theirs + 2) return { result: 'ahead', mine, theirs, text: `${name}: Congratulations! You averaged ${mine} and I got ${theirs}. I am proud of you, and I am coming for you next time.` };
  return { result: 'level', mine, theirs, text: `${name}: We both averaged about ${mine}. Same score, same stress. Let us celebrate with zobo.` };
}

/* ---------------------------------------- 5. club storylines ---------------------------------------- */

/*
 * Three chapters per club. The coordinator tells each chapter when you have attended enough meetings and two days have passed.
 * `pts` count towards the finale: 2 = great, 1 = good, 0 = "you learned a lot". Nobody ever fails the club.
 */
const ch = (text, a, b) => ({ text, choices: [a, b] });
const opt = (label, reply, pts, extra = {}) => ({ label, reply, pts, ...extra });
export const CLUB_STORIES = {
  debate: {
    title: 'The inter-hall debate',
    chapters: [
      ch('The Debate Club will face another hall. The motion: "Phones should be allowed in lectures". You will speak second.',
        opt('📚 Research both sides', 'Good plan. Knowing the other side makes your argument stronger.', 1, { fx: { energy: -4, stress: 2 }, prep: 2 }),
        opt('🎤 Practise your speech aloud', 'Your voice is steadier already.', 1, { fx: { fun: 4, energy: -4 } })),
      ch('Practice round. A teammate says your opening is too long. The debate is in two days.',
        opt('✂️ Cut it down to two minutes', 'Short and sharp. The team likes it.', 1, { fx: { stress: -2 } }),
        opt('🙋 Keep it and ask for more feedback', 'Fair. You will decide on the day.', 0, { fx: { stress: 2 } })),
      ch('Debate day! The hall is full. The other team opens strongly. Your turn is next.',
        opt('🔥 Answer them directly and politely', 'The room claps. You spoke with courage.', 1, { fx: { fun: 14, stress: -6, energy: -8 } }),
        opt('🙂 Stick to your prepared speech', 'Calm and clear. You did your part.', 0, { fx: { fun: 10, stress: -4, energy: -6 } }))
    ],
    end: { 2: 'Your hall won the debate! The club carried you on their shoulders. Well, almost.', 1: 'Your hall came second, with praise for your speech.', 0: 'You did not win, but the judges praised your courage. You grew a lot.' }
  },
  drama: {
    title: 'The end-of-term play',
    chapters: [
      ch('The Drama Society will stage a short play about a first-year in a new hostel. You are offered a small speaking part.',
        opt('🎭 Accept the speaking part', 'Wonderful! Rehearsals begin on Thursday.', 1, { fx: { fun: 4, stress: 2 } }),
        opt('🎬 Help backstage instead', 'Backstage keeps the whole show running. Thank you.', 1, { fx: { fun: 3 } })),
      ch('Rehearsal. You forgot a line and the whole room laughed, kindly. The director smiles.',
        opt('😄 Laugh along and try again', 'Perfect attitude. Actors forget lines every day.', 1, { fx: { fun: 6, stress: -3 } }),
        opt('📝 Write the line on your palm', 'Old trick! Just do not sweat on it.', 0, { fx: { stress: -1 } })),
      ch('Show night. The curtain rises, the hall is full. Your cue is coming.',
        opt('✨ Deliver your best performance', 'Big applause! People stop you afterwards to say well done.', 1, { fx: { fun: 16, stress: -6, energy: -8 } }),
        opt('🤝 Help a nervous friend first', 'Kind of you. The play went well because of the team.', 1, { fx: { fun: 12, stress: -4, energy: -6 } }))
    ],
    end: { 2: 'A standing ovation! The Drama Society wants a second show next semester.', 1: 'A warm round of applause. The play was a success.', 0: 'The show went on, and you learned the stage. Nice start.' }
  },
  tech: {
    title: 'The campus app challenge',
    chapters: [
      ch('The Tech Club enters a small challenge: build a timetable reminder app in one week.',
        opt('🧩 Take the design and layout', 'A clean layout helps users. Good choice.', 1, { fx: { energy: -4 } }),
        opt('💻 Take the coding', 'Great. Remember to test often.', 1, { fx: { energy: -5, stress: 2 } })),
      ch('The app crashes on a teammate\'s phone and the demo is tomorrow.',
        opt('🔍 Find the bug together', 'Found it! A missing check. The team cheers.', 1, { fx: { stress: -2, energy: -5 }, prep: 2 }),
        opt('🧪 Ask a senior for help', 'Seniors love helping. The bug is fixed.', 0, { fx: { stress: -3 } })),
      ch('Demo day. You have three minutes to present to the judges.',
        opt('🎯 Show the problem it solves', 'Clear and honest. The judges nod.', 1, { fx: { fun: 12, stress: -4, energy: -6 } }),
        opt('🚀 Show every feature', 'Lots of features! A bit fast but impressive.', 0, { fx: { fun: 10, stress: -2, energy: -6 } }))
    ],
    end: { 2: 'First place! The club got a certificate and a small prize. Your teammates cheered for the laptop.', 1: 'Second place and a lot of new friends.', 0: 'Not a winner, but you built a real app. That is a big step.' }
  },
  enterprise: {
    title: 'The pitch night',
    chapters: [
      ch('The Enterprise Club holds a pitch night. You can pitch a small idea: snacks, printing, or tutoring.',
        opt('🍪 Pitch a snack idea', 'Everyone likes snacks. Good, simple idea.', 1, { fx: { fun: 3 } }),
        opt('🎓 Pitch peer tutoring', 'Students helping students. Very fitting.', 1, { fx: { stress: 1 }, prep: 2 })),
      ch('A mentor asks, "How much will it cost, and who will pay?" You have not worked it out yet.',
        opt('🧮 Work out the numbers tonight', 'Numbers make an idea real. Well done.', 1, { fx: { energy: -5, stress: 2 } }),
        opt('🗣️ Ask the club for help with the numbers', 'Asking is smart. They help you in twenty minutes.', 0, { fx: { stress: -2 } })),
      ch('Pitch night. Three judges, five minutes. You are third in line.',
        opt('🙌 Pitch with confidence', 'Clear and friendly. The judges ask good questions.', 1, { fx: { fun: 12, stress: -4, energy: -6 } }),
        opt('📋 Read from your notes', 'Safe and clear. They respect your preparation.', 0, { fx: { fun: 8, stress: -2, energy: -5 } }))
    ],
    end: { 2: 'Your pitch won the club grant. You also made two new contacts!', 1: 'The judges liked your idea and gave you tips to grow it.', 0: 'No grant this time, but the feedback was worth gold.' }
  },
  football: {
    title: 'The inter-faculty cup',
    chapters: [
      ch('The Football Club enters the inter-faculty cup. The coach asks where you want to play.',
        opt('⚽ Midfield, in the middle of the action', 'Midfield it is. Lots of running!', 1, { fx: { energy: -6, fun: 4 } }),
        opt('🧤 Defence, solid and calm', 'Good. Every team needs steady people at the back.', 1, { fx: { energy: -4, fun: 3 } })),
      ch('Training: you are tired and the coach says to go home and rest, or stay and run one more drill.',
        opt('🛌 Go home and rest', 'Smart. Rest is part of training.', 1, { fx: { energy: 8, stress: -3 } }),
        opt('🏃 Stay for one more drill', 'Hard work! Remember to drink water.', 0, { fx: { energy: -10, hygiene: -6, fun: 5 } })),
      ch('Cup day! Your faculty is in the semi-final. The whistle blows.',
        opt('🔥 Play your hardest', 'Wow, what a game! The crowd is loud.', 1, { fx: { fun: 18, energy: -16, hygiene: -12, stress: -8 } }),
        opt('🤝 Pass often and support your team', 'Team play wins friends. The coach is proud.', 1, { fx: { fun: 14, energy: -12, hygiene: -10, stress: -6 } }))
    ],
    end: { 2: 'Your faculty won the cup! Cheering, dancing and a photo with the trophy.', 1: 'You lost the final on penalties, but it was a good fight.', 0: 'You went out in the semi-final. Next year!' }
  }
};

export const STORY_MEETING_GAP = 2;      // days between chapters
export function storyFor(people, clubId) { return people.story[clubId] || (people.story[clubId] = { chapter: 0, last: -9, pts: 0 }); }
/**
 * What the coordinator can offer for one club right now.
 * { state: 'locked'|'wait'|'ready'|'done', chapter? , text? }
 */
export function storyStatus(people, clubId, { day, meetings }) {
  const def = CLUB_STORIES[clubId];
  if (!def) return { state: 'locked' };
  const s = storyFor(people, clubId);
  if (s.chapter >= def.chapters.length) return { state: 'done' };
  if (meetings < s.chapter + 1) return { state: 'locked', text: 'Come to a club meeting first, then I will tell you what is next.' };
  if (day - s.last < STORY_MEETING_GAP) return { state: 'wait', text: 'Give it a day or two. We are still preparing.' };
  return { state: 'ready', chapter: s.chapter, def: def.chapters[s.chapter] };
}
/** Applies a choice. Returns { choice, finished, endText }. */
export function advanceStory(people, clubId, choiceIdx, day) {
  const def = CLUB_STORIES[clubId], s = storyFor(people, clubId);
  const choice = def?.chapters[s.chapter]?.choices[choiceIdx];
  if (!choice) return null;
  s.pts += choice.pts;
  s.chapter += 1;
  s.last = day;
  const finished = s.chapter >= def.chapters.length;
  return { choice, finished, endText: finished ? def.end[Math.min(2, s.pts)] : '' };
}

/* ---------------------------------------- 6. friendship events ---------------------------------------- */

export const FRIEND_MIN_POINTS = 25;
export const BIRTHDAY_CYCLE = 28;
/** A friend's birthday falls on the same day every 28 game days. */
export const birthdayDay = npcId => strHash(npcId) % BIRTHDAY_CYCLE;
export const isBirthday = (npcId, day) => day % BIRTHDAY_CYCLE === birthdayDay(npcId);

export const FRIEND_EVENTS = {
  cultural: {
    title: '🥁 Cultural night invitation',
    min: 25,
    open: n => `${n}: A group of us are going to the cultural night. Drums, dances and food from every region. Come with us?`,
    choices: [
      { id: 'yes', label: '🥁 Yes, I would love to', reply: 'Yay! We had a great time. The jollof was the best.', rel: 6, cost: 500, minutes: 120, fx: { fun: 24, energy: -8, stress: -8 } },
      { id: 'no', label: '🙂 Not this time, thanks', reply: 'No problem at all. Maybe next time!', rel: 0 }
    ]
  },
  birthday: {
    title: '🎂 Birthday surprise',
    min: 25,
    open: n => `Today is ${n}'s birthday, and ${n} has not told many people. A little surprise could mean a lot.`,
    choices: [
      { id: 'cake', label: '🎂 Bring a small cake (₦1,500)', reply: 'You remembered! This is the best surprise. Thank you!', rel: 8, cost: 1500, minutes: 20, fx: { fun: 10, stress: -3 } },
      { id: 'card', label: '💌 Give a handwritten card', reply: 'A card! I will keep it. Thank you so much.', rel: 5, minutes: 10, fx: { fun: 4 } },
      { id: 'skip', label: '👋 Just say happy birthday', reply: 'Thank you! That makes me smile.', rel: 2 }
    ]
  },
  move: {
    title: '📦 Help moving in',
    min: 8,
    open: n => `${n}: I am moving into my hostel room today and the bags are heavy. Could you help me carry a few?`,
    choices: [
      { id: 'boxes', label: '📦 Carry the big boxes', reply: 'Thanks so much! You are strong. I owe you a cold drink.', rel: 6, minutes: 45, fx: { energy: -12, hygiene: -6, fun: 3 } },
      { id: 'bag', label: '🎒 Carry a light bag', reply: 'Every bit helps. Thank you!', rel: 3, minutes: 20, fx: { energy: -4 } },
      { id: 'busy', label: '🙏 I cannot today, sorry', reply: 'That is okay. I will manage. See you around!', rel: 0 }
    ]
  }
};

/**
 * Which friendship event (if any) this friend can offer today. Never repeated, and not every day.
 * `sd` is the semester day (1..7) and `term` the semester.
 */
export function friendEventFor(people, { npcId, name, relPoints, day, sd }) {
  const done = people.events.done;
  const c = key => done[`${key}-${npcId}-${Math.floor(day / BIRTHDAY_CYCLE)}`];
  if (relPoints >= FRIEND_EVENTS.birthday.min && isBirthday(npcId, day) && !c('birthday')) return { id: 'birthday', key: `birthday-${npcId}-${Math.floor(day / BIRTHDAY_CYCLE)}` };
  if (hash01(day, `fe-${npcId}`) > 0.35) return null;                        // only some days
  if (relPoints >= FRIEND_EVENTS.move.min && sd >= 1 && sd <= 2 && !done[`move-${npcId}`]) return { id: 'move', key: `move-${npcId}` };
  if (relPoints >= FRIEND_EVENTS.cultural.min && weekdayOf(sd) >= 4 && !c('cultural')) return { id: 'cultural', key: `cultural-${npcId}-${Math.floor(day / BIRTHDAY_CYCLE)}` };
  return null;
}
export function markEventDone(people, key, day) { people.events.done[key] = day; }

/* ---------------------------------------- 7. faith and community spaces ---------------------------------------- */

export const FAITH_TYPES = new Set(['chapel', 'mosque']);
export const FAITH = {
  chapel: {
    name: 'Campus Chapel', emoji: '⛪', staff: { name: 'Chaplain Rev. Okafor', role: 'Chaplain', emoji: '⛪', dialogue: 'chaplain', shirt: 0x2b2b3a, skin: 0x5a3a26 },
    services: [
      { id: 'sunday', day: 7, hours: [8, 10], label: '🙏 Join Sunday service (2 hrs)', minutes: 120, text: 'Sunday service: 8:00 to 10:00' },
      { id: 'midweek', day: 3, hours: [17, 18], label: '🕯️ Join the midweek service', minutes: 60, text: 'Midweek service: Wednesday 17:00' }
    ]
  },
  mosque: {
    name: 'Campus Mosque', emoji: '🕌', staff: { name: 'Imam Abdulrahman', role: 'Imam', emoji: '🕌', dialogue: 'imam', shirt: 0xf4f1ea, skin: 0x6b4a2f },
    services: [
      { id: 'jumaat', day: 5, hours: [13, 15], label: '🕌 Join Friday prayers (2 hrs)', minutes: 90, text: 'Friday prayers: 13:00 to 15:00' },
      { id: 'evening', day: 0, hours: [18, 19], label: '🌙 Join the evening prayer', minutes: 30, text: 'Evening prayer: every day at 18:00' }
    ]
  }
};
export const FAITH_OPEN = [6, 22];
export const REFLECT = { id: 'reflect', label: '🧘 Quiet reflection (20 min)', minutes: 20, limit: 2, fx: { stress: -10, fun: 2 }, msg: 'You sat quietly for a while. Your mind feels calmer.' };
const SERVICE_FX = { stress: -12, fun: 4, energy: -3 };

/** Walk-in services running now (day 0 = every day). `sd` is the semester day. */
export function faithServices(type, { sd, hour }) {
  const f = FAITH[type];
  if (!f) return [];
  const wd = weekdayOf(sd);
  return f.services.filter(s => (s.day === 0 || s.day === wd) && hour >= s.hours[0] && hour < s.hours[1])
    .map(s => ({ id: `faith-${s.id}`, label: s.label, minutes: s.minutes, limit: 1, fx: SERVICE_FX, msg: 'A peaceful, respectful hour. You leave feeling calmer.' }));
}
/** What the inside panel shows at a spot: `spot` is 'reflect' or 'service'. */
export function faithPanel(type, spot, { sd, hour }) {
  const f = FAITH[type];
  if (!f) return { actions: [], note: '' };
  if (hour < FAITH_OPEN[0] || hour >= FAITH_OPEN[1]) return { actions: [], note: `The ${f.name.toLowerCase()} is closed. It opens at ${FAITH_OPEN[0]}:00.` };
  if (spot === 'reflect') return { actions: [REFLECT], note: 'A quiet place for anyone. Everyone is welcome.' };
  const run = faithServices(type, { sd, hour });
  return { actions: run, note: run.length ? 'A service is on now. All are welcome to sit quietly.' : f.services.map(s => s.text).join(' · ') };
}

/* The chapel and mosque, as campus buildings (src/campuses.js adds them to every campus). */
export const FAITH_BUILDINGS = [
  { name: 'Campus Chapel', emoji: '⛪', type: 'chapel', x: -46, z: -12, w: 10, d: 8, h: 7, color: 0xf2eadb, roof: 0x3a4f7a },
  { name: 'Campus Mosque', emoji: '🕌', type: 'mosque', x: -46, z: 12, w: 10, d: 8, h: 7, color: 0xf4f1ea, roof: 0x1f7a4f }
];

/** Staff for faith buildings and the clubs coordinator, and the rival in lecture halls (used by npcs.js interiorNpcDefs). */
let rivalSeed = '';
/** Called once at start so the rival has one name everywhere. */
export const setRivalSeed = s => { rivalSeed = String(s || ''); };
export const currentRival = () => rivalFor(rivalSeed);
export function peopleStaff(place, base) {
  if (FAITH[place.type]) return [{ ...base, id: `faith-${place.type}`, hours: [FAITH_OPEN], ...FAITH[place.type].staff }];
  if (place.type === 'auditorium') {
    return [{ ...base, x: base.x + 5.2, id: `clubs-${place.name}`, name: 'Miss Chioma', hours: [[9, 21]], role: 'Clubs coordinator', emoji: '🎪', dialogue: 'clubleader', shirt: 0xc0392b, skin: 0x6b4a2f }];
  }
  if (place.type === 'lecture') {
    const r = rivalFor(rivalSeed);
    return [{ ...base, x: base.x - 4.6, z: 3.0, id: `rival-${place.name}`, name: r.name, hours: [[8, 18]], role: 'Coursemate', emoji: '📝', dialogue: 'rival', shirt: 0xd35400, skin: 0x8d5a3b }];
  }
  return [];
}

/* ---------------------------------------- 8. light crush storyline ---------------------------------------- */

/*
 * Strictly PG and consent-based. Off by default (settings.crushes). Three small steps, each one an invitation
 * with an equal, friendly "no". Nothing physical beyond carrying a bag. Saying no never costs anything.
 */
export const CRUSH_MIN_POINTS = 25;
export const CRUSH_STEPS = [
  { id: 'walk', ask: () => 'Would you like to walk to the library together? Just a chat on the way.', yes: 'You walked together and talked about music and classes. It was easy and fun.', no: 'No problem at all. Maybe another day, or not. We are still friends.',
    carry: 'They offered to carry your bag, and you offered to carry theirs. You laughed about who was heavier.', rel: 4, minutes: 20, fx: { fun: 8, stress: -3 } },
  { id: 'food', ask: () => 'Would you like to share a snack at the canteen? Zobo and meat pie, your choice.', yes: 'You split a meat pie and argued about the best zobo. A nice break.', no: 'That is fine. Thanks for being honest. We can just chat another time.',
    rel: 4, cost: 800, minutes: 25, fx: { hunger: 14, fun: 8, stress: -3 } },
  { id: 'cultural', ask: () => 'Would you like to go to the cultural night, as friends, with a few others?', yes: 'You went with a group of friends. The drums were loud and you danced a little. A lovely evening.', no: 'No worries. I understand. We are good as friends.',
    rel: 6, cost: 500, minutes: 120, fx: { fun: 22, energy: -8, stress: -6 } }
];
export const CRUSH_GAP = 2;               // days between invitations

export function crushOffer(people, { enabled, npcId, relPoints, day }) {
  if (!enabled) return null;
  const c = people.crush;
  if (c.status === 'friends' || c.status === 'done') return null;
  if (c.id && c.id !== npcId) return null;
  if (relPoints < CRUSH_MIN_POINTS) return null;
  if (day - c.last < CRUSH_GAP) return null;
  if (c.step >= CRUSH_STEPS.length) return null;
  return { step: CRUSH_STEPS[c.step], index: c.step };
}
/** The player answers an invitation. `accept` false is always allowed and has no penalty. */
export function crushAnswer(people, { npc, accept, day }) {
  const c = people.crush, step = CRUSH_STEPS[c.step];
  if (!step) return null;
  c.last = day;
  if (!accept) return { step, accepted: false, text: step.no };
  c.id = npc.id; c.name = npc.name; c.status = 'active';
  c.step += 1;
  if (c.step >= CRUSH_STEPS.length) c.status = 'done';
  return { step, accepted: true, text: step.yes + (step.carry ? ` ${step.carry}` : ''), done: c.status === 'done' };
}
/** Saying "let us stay friends" ends the storyline kindly. */
export function crushStayFriends(people) { people.crush.status = 'friends'; }

/* ---------------------------------------- summary for the phone ---------------------------------------- */

export function peopleSummary(people) {
  const out = [];
  if (people.mentor.id) out.push(`Mentor: ${people.mentor.name}`);
  const g = groupSummary(people);
  if (g) out.push(g);
  const r = people.roommate;
  if (people.since != null) out.push(`Roommate: ${moodLabel(r.mood)}`);
  return out;
}
