import { converse, asks, tip } from './dialogues.js';
import {
  ensurePeople, startStories, nextRoommateArc, resolveRoommateArc, ROOMMATE_ARCS, moodLabel,
  canAskMentor, chooseMentor, mentorWeekly, releaseMentor,
  inviteToGroup, inGroup, groupSession, canGroupSession, MAX_GROUP, leaveGroup,
  rivalCaGist, rivalResultsGist, currentRival,
  CLUB_STORIES, storyStatus, advanceStory,
  friendEventFor, FRIEND_EVENTS, markEventDone,
  FAITH, faithServices, crushOffer, crushAnswer, crushStayFriends, CRUSH_STEPS
} from './people.js';
import { clubById } from './social.js';

/*
 * Dialogue for the people systems in people.js (group "people").
 * Needs on the talk context (see main.js): c.state, c.day(), c.semDay(), c.relation(npc), c.addRelation(npc, n),
 * c.doAction(action), c.boostPrep(n), c.crushesOn(), c.meta.notify(...).
 * The game decides every outcome; text only describes it.
 */

const pp = c => ensurePeople(c.state.meta);
const naira = n => `₦${n.toLocaleString('en-NG')}`;

/** Spends time, money and needs for a choice, then applies friendship and preparation. Returns false if it could not happen. */
function applyChoice(c, npc, key, ch, msg) {
  if (ch.cost || ch.fx || ch.minutes) {
    const ok = c.doAction({ id: `pp-${key}`, label: key, cost: ch.cost, minutes: ch.minutes || 10, fx: ch.fx, limit: 1, msg });
    if (!ok) return false;
  }
  if (ch.rel) c.addRelation(npc, ch.rel);
  if (ch.prep) c.boostPrep(ch.prep);
  return true;
}
const later = { label: 'Not now', value: 'later', secondary: true };

/* ------------------------------ 1. roommate stories ------------------------------ */

async function roommateArc(c, npc, people, arc) {
  const id = await c.say(npc, arc.open(npc.name), [...arc.choices.map(ch => ({ label: ch.label, value: ch.id })), later]);
  if (id === 'later') return 'Okay, we can talk later.';
  const ch = arc.choices.find(x => x.id === id);
  if (!applyChoice(c, npc, `arc-${arc.id}`, ch, ch.reply)) return 'That is not possible right now. Ask me again later.';
  resolveRoommateArc(people, arc.id, id, c.day());
  if (arc.id === 'birthday' || ch.mood > 0) c.meta.track('friendly');
  return ch.reply;
}

/* ------------------------------ 2. mentors ------------------------------ */

function mentorOptions(c, npc, people, pts) {
  const m = people.mentor;
  if (!m.id) {
    return [{ label: '🤝 Will you be my mentor?', run: () => {
      const chk = canAskMentor(people, pts);
      if (!chk.ok) return chk.why;
      chooseMentor(people, npc, c.day());
      c.addRelation(npc, 3);
      c.meta.notify({ icon: '🤝', title: `${npc.name} is your mentor`, text: 'Ask for a weekly tip. Sometimes you also get notes.' });
      return 'Of course. I was a fresher once and someone helped me. Come to me once a week for a tip.';
    } }];
  }
  if (m.id !== npc.id) return [];
  return [
    { label: '💡 My weekly tip', run: () => {
      const r = mentorWeekly(people, c.day());
      if (!r.ok) return r.text;
      c.boostPrep(r.prep);
      return `${r.text}${r.notes ? ` I have also saved my notes for you. (Preparation +${r.prep}%)` : ` (Preparation +${r.prep}%)`}`;
    } },
    { label: '👋 I think I am ready on my own', run: async () => {
      const ok = await c.say(npc, 'Do you want to stop our mentoring? That is fine. You can ask again any time.', [{ label: 'Yes, stop', value: 'y' }, { label: 'No, keep it', value: 'n', secondary: true }]);
      if (ok !== 'y') return 'Good. I am happy to keep helping.';
      releaseMentor(people);
      return 'Well done. You have grown a lot. My door is always open.';
    } }
  ];
}

/* ------------------------------ 3. study groups ------------------------------ */

async function runGroupSession(c, people, npc, place = '') {
  const chk = canGroupSession(people, c.day());
  if (!chk.ok) return chk.text;
  const ok = c.doAction({ id: 'studygroup', label: 'Study group', minutes: 90, limit: 1, needsAcademic: true, fx: { energy: -8, fun: 6, hunger: -6, stress: -2 }, msg: 'Your study group met and went through the hard topics.' });
  if (!ok) return 'We already met today. Let us rest.';
  const r = groupSession(people, c.day());
  c.boostPrep(r.prep);
  people.group.members.forEach(m => c.addRelation(m, 2));
  c.meta.track('studyGroups');
  return `Good session${place}! ${r.names.join(', ')} and you went through the weak spots. (Preparation +${r.prep}%)`;
}

function groupOptions(c, npc, people, pts) {
  if (!c.state.academic) return [];
  const g = people.group;
  if (inGroup(people, npc.id)) {
    return [
      { label: '👥 Hold our group session', run: () => runGroupSession(c, people, npc) },
      { label: '🚪 Leave the study group', run: async () => {
        const ok = await c.say(npc, 'Do you want to leave the group? No hard feelings.', [{ label: 'Yes, leave', value: 'y' }, { label: 'No, stay', value: 'n', secondary: true }]);
        if (ok !== 'y') return 'Great, we are glad you are staying.';
        leaveGroup(people, npc.id);
        return 'Okay, take care. You can join again later.';
      } }
    ];
  }
  if (g.members.length >= MAX_GROUP) return [];
  return [{ label: '📚 Invite to my study group', run: () => {
    const r = inviteToGroup(people, npc, pts, c.day());
    if (r.ok) { c.addRelation(npc, 2); c.meta.notify({ icon: '👥', title: `${npc.name} joined your study group`, text: 'Hold one session a week from the library or in a chat.' }); }
    return r.text;
  } }];
}

/* ------------------------------ 6. friendship events ------------------------------ */

async function friendEvent(c, npc, people, ev) {
  const def = FRIEND_EVENTS[ev.id];
  const id = await c.say(npc, def.open(npc.name), [...def.choices.map(ch => ({ label: ch.label, value: ch.id })), later]);
  if (id === 'later') return 'No problem. Maybe another time.';
  const ch = def.choices.find(x => x.id === id);
  if (!applyChoice(c, npc, `${ev.key}`, ch, ch.reply)) return 'It looks like that is not possible right now. Maybe later.';
  markEventDone(people, ev.key, c.day());
  if (ch.rel > 3) c.meta.track('friendly');
  return ch.reply;
}

/* ------------------------------ 8. light crush storyline ------------------------------ */

async function crushInvite(c, npc, people, offer) {
  const pick = await c.say(npc, offer.step.ask(), [
    { label: '😊 Yes, sure', value: 'y' },
    { label: '🙂 Not today, thanks', value: 'n' },
    { label: '🤝 Let us just stay friends', value: 'f', secondary: true }
  ]);
  if (pick === 'f') { crushStayFriends(people); return 'Of course. I like having you as a friend. Nothing changes.'; }
  const accept = pick === 'y';
  if (accept && offer.step.cost && c.state.money < offer.step.cost) return `That needs ${naira(offer.step.cost)} and you do not have it right now. Another day, maybe.`;
  if (accept && !applyChoice(c, npc, `crush-${offer.step.id}`, offer.step, 'A pleasant time together.')) return 'Not right now. Maybe another day.';
  const r = crushAnswer(people, { npc, accept, day: c.day() });
  return r.text;
}

/* ------------------------------ options added to existing dialogues ------------------------------ */

/**
 * Extra menu options for an existing dialogue.
 * kind: 'student' | 'roommate' | 'senior' | 'librarian'
 */
export function peopleOptions(c, npc, kind) {
  const people = pp(c), a = c.state.academic, day = c.day();
  const out = [];
  if (kind === 'librarian') {
    if (a && people.group.members.length) out.push({ label: '👥 Study group session here', run: () => runGroupSession(c, people, npc, ' in the library') });
    return out;
  }
  const pts = c.relation(npc).points;
  if (kind === 'roommate') {
    startStories(people, day);
    const arc = nextRoommateArc(people, day);
    if (arc) out.push({ label: `🗣️ ${arc.title}`, run: () => roommateArc(c, npc, people, arc) });
    else out.push({ label: '🤗 How are we doing?', run: () => `You and ${npc.name} get along. Mood: ${moodLabel(people.roommate.mood)}.` });
  }
  if (kind === 'senior') out.push(...mentorOptions(c, npc, people, pts));
  if (kind === 'student' || kind === 'roommate') {
    out.push(...groupOptions(c, npc, people, pts));
    if (a) {
      const ev = friendEventFor(people, { npcId: npc.id, name: npc.name, relPoints: pts, day, sd: c.semDay() });
      if (ev) out.unshift({ label: FRIEND_EVENTS[ev.id].title, run: () => friendEvent(c, npc, people, ev) });
      if (kind === 'student' && c.crushesOn()) {
        const offer = crushOffer(people, { enabled: true, npcId: npc.id, relPoints: pts, day });
        if (offer) out.push({ label: '🌤️ A friendly invitation', run: () => crushInvite(c, npc, people, offer) });
      }
    }
  }
  return out;
}

/* ------------------------------ 7. faith and community dialogue ------------------------------ */

function faithDialogue(type, welcome, calm, faithsAnswer, adviceAnswer) {
  return async function (c, npc) {
    const f = FAITH[type];
    await converse(c, npc, welcome, () => [
      { label: '🕰️ When are the services?', run: () => f.services.map(s => s.text).join('. ') + '. Everyone is welcome to sit quietly.' },
      { label: '😟 I feel stressed', run: () => {
        const ok = c.doAction({ id: `calm-${type}`, label: 'A calming word', minutes: 10, limit: 1, fx: { stress: -6 }, msg: 'A few kind words and a slow breath help.' });
        return ok ? calm : 'We already spoke today. Sit quietly in the pews for a while. It helps.';
      } },
      { label: '🤝 Are people of all faiths welcome?', run: () => faithsAnswer },
      { label: '🎓 Any advice for exams?', run: () => adviceAnswer },
      asks(c)(npc)
    ]);
  };
}

const chaplain = faithDialogue('chapel',
  'Welcome, friend. Everyone is welcome here, whatever you believe. How can I help?',
  'Breathe in slowly, and out. You are doing your best, and that is enough. Take a quiet seat any time.',
  'Yes. This is a place of peace and of listening. The Imam and I share tea every month, and students of every faith are my friends.',
  'Prepare well, sleep well and be gentle with yourself. A calm mind remembers more than a frightened one.');
const imam = faithDialogue('mosque',
  'Assalamu alaikum. Peace be upon you, my friend. All are welcome here. How can I help?',
  'Take a slow breath. Remember that difficulty passes. Sit quietly for a while. You will feel lighter.',
  'Yes, always. The door is open to every student for quiet and for conversation. The Chaplain is a good friend of mine.',
  'Work hard, trust your preparation, and rest well. Be kind to your classmates, and to yourself.');

/* ------------------------------ 5. clubs coordinator ------------------------------ */

async function clubStory(c, npc, people, clubId) {
  const club = clubById(clubId), def = CLUB_STORIES[clubId];
  if (!def) return 'No story for this club yet.';
  const st = storyStatus(people, clubId, { day: c.day(), meetings: c.state.meta.counters.clubMeetings || 0 });
  if (st.state === 'done') return `${def.title} is finished. Well done! A new one will come next year.`;
  if (st.state !== 'ready') return st.text;
  const idx = await c.say(npc, `${club.icon} ${def.title}: ${st.def.text}`, [...st.def.choices.map((ch, i) => ({ label: ch.label, value: i })), later]);
  if (idx === 'later') return 'Okay, come when you are ready.';
  const ch = st.def.choices[idx];
  if (!applyChoice(c, npc, `story-${clubId}-${st.chapter}`, { fx: ch.fx, minutes: 60, prep: ch.prep }, ch.reply)) return 'You cannot do that right now. Come back later.';
  const r = advanceStory(people, clubId, idx, c.day());
  c.addRelation(npc, 1);
  if (r.finished) {
    c.meta.notify({ icon: club.icon, title: `${def.title}: done!`, text: r.endText });
    c.meta.track('clubStories');
    return `${ch.reply} ${r.endText}`;
  }
  return `${ch.reply} We will meet again soon for the next step.`;
}

async function clubleader(c, npc) {
  const people = pp(c), clubs = c.state.meta.clubs;
  await converse(c, npc, clubs.length ? 'Hello! Each club has a story this semester. Which one shall we do?' : 'Hello! Join a club in your phone first, then come back and I will tell you about the club stories.', () => [
    ...clubs.map(id => ({ label: `${clubById(id).icon} ${CLUB_STORIES[id]?.title || clubById(id).name}`, run: () => clubStory(c, npc, people, id) })),
    { label: '🎪 What clubs are there?', run: () => 'Debate, Drama, Tech, Enterprise and Football. Open your phone, then Clubs. You can join two.' },
    asks(c)(npc)
  ]);
}

/* ------------------------------ 4. the friendly rival ------------------------------ */

async function rival(c, npc) {
  const people = pp(c), r = { id: 'rival', name: npc.name };
  people.rival.met = true;
  const a = c.state.academic;
  const rel = c.relation(r);
  const gain = rel.lastTalk === c.day() ? 0 : 2;
  if (gain) { rel.lastTalk = c.day(); c.addRelation(r, gain); }
  const open = a?.history?.length ? 'Hi! Good to see you. Ready for the next round?' : 'Hi! I am in your class. Whoever studies harder wins. Kindly, of course.';
  await converse(c, r, open, () => [
    { label: '📝 How did the CA go?', run: () => (a ? rivalCaGist(r.name, a.courses).text : 'We have not started yet.') },
    { label: '📄 How were the results?', run: () => {
      const last = a?.history?.at(-1);
      return last ? rivalResultsGist(r.name, last.rows, a.history.length).text : `${r.name}: No results yet. Let us both do our best.`;
    } },
    { label: '🤝 Revise together this week', run: () => {
      if (!a) return 'Let us start once the semester begins.';
      if (!c.meta.trackOnce(`rival-${Math.floor(c.day() / 7)}`, 'rival', 'rivalStudy')) return 'We studied together this week already. Let us beat our own scores.';
      const ok = c.doAction({ id: 'rivalstudy', label: 'Revise with rival', minutes: 60, limit: 1, needsAcademic: true, fx: { energy: -5, fun: 4, stress: -1 }, msg: 'You and your coursemate quizzed each other.' });
      if (!ok) return 'We already studied today.';
      c.boostPrep(3);
      c.addRelation(r, 3);
      return 'Good session! A little competition keeps us sharp. (Preparation +3%)';
    } },
    { label: '💡 Any study tips?', run: () => `Sure. ${tip()}` }
  ]);
  void people;
}

/** After a CA test or results: a friendly message from the rival (called from main.js). */
export function rivalNews(kind, { state, meta, info }) {
  const people = ensurePeople(state.meta), a = state.academic;
  if (!a) return;
  const r = currentRival();
  let g = null;
  if (kind === 'ca') g = rivalCaGist(r.name, a.courses);
  else if (kind === 'results' && info?.rows) g = rivalResultsGist(r.name, info.rows.map(x => ({ code: x.code, total: x.total })), a.history.length);
  if (!g || !g.result) return;
  if (kind === 'results') { if (g.result === 'ahead') people.rival.wins += 1; else if (g.result === 'behind') people.rival.losses += 1; }
  people.rival.lastNews = g.text;
  meta.notify({ icon: '📝', title: kind === 'ca' ? `${r.name} compared CA scores` : `${r.name} on the results`, text: g.text });
}

export const PEOPLE_DIALOGUES = { chaplain, imam, clubleader, rival };
export { faithServices, CRUSH_STEPS, ROOMMATE_ARCS };
