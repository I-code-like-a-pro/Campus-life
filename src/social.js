import { hash01 } from './eventengine.js';

/*
 * Social life (spec F-120, F-121, F-124, F-126, F-127).
 *  - Every NPC you meet can become a friend. Points grow through daily chats, well-chosen tones, gifts and shared activities.
 *  - Each NPC has a personality trait that decides which tone they like.
 *  - Friends unlock favours: studying together, lecture notes, and borrowing money (which becomes a bill to repay).
 *  - Clubs meet on set evenings; campus events (hostel night, match day, Sunday fellowship) happen on fixed days.
 * Pure rules; state lives in state.meta.relations and state.meta.clubs.
 */

export const LEVELS = [
  { min: 0,   name: 'Stranger',     icon: '🙂' },
  { min: 8,   name: 'Acquaintance', icon: '👋' },
  { min: 25,  name: 'Friend',       icon: '😊' },
  { min: 55,  name: 'Close friend', icon: '🤗' },
  { min: 100, name: 'Best friend',  icon: '💖' }
];
export const MAX_POINTS = 150;

export function levelIndex(points) {
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (points >= LEVELS[k].min) i = k;
  return i;
}
export const levelOf = points => LEVELS[levelIndex(points)];

/** Gets (or creates) the relationship record for an NPC. */
export function getRel(relations, npc) {
  return relations[npc.id] || (relations[npc.id] = { name: npc.name, points: 0, lastTalk: -1, lastGift: -1 });
}

/** Adds points. Returns { from, to } level indexes so callers can celebrate a new friendship. */
export function addPoints(rel, n) {
  const from = levelIndex(rel.points);
  rel.points = Math.max(0, Math.min(MAX_POINTS, rel.points + n));
  return { from, to: levelIndex(rel.points) };
}

/** The first chat of each game day is worth a couple of points. */
export function dailyChat(rel, day) {
  if (rel.lastTalk === day) return 0;
  rel.lastTalk = day;
  return 2;
}

/* ---- personalities and tones ---- */

export const TRAITS = ['funny', 'serious', 'shy', 'foodie'];

function strHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
/** A stable personality for each NPC. */
export const traitOf = id => TRAITS[Math.floor(hash01(strHash(String(id)), 'trait') * TRAITS.length)];

export const TONES = {
  joke:       { label: '😄 Crack a joke' },
  serious:    { label: '🧠 Have a serious talk' },
  compliment: { label: '🌟 Pay a compliment' }
};
const LIKES = { funny: 'joke', serious: 'serious', shy: 'compliment' };
const DISLIKES = { funny: 'serious', serious: 'joke', shy: 'joke' };

/** Points for using a tone with someone of a given trait. */
export function toneDelta(trait, tone) {
  if (LIKES[trait] === tone) return 4;
  if (DISLIKES[trait] === tone) return -1;
  return 1;
}
export function toneReply(trait, tone) {
  const d = toneDelta(trait, tone);
  if (d >= 4) return 'Ha! That was exactly my kind of conversation. I like you.';
  if (d < 0) return 'Hmm... not really my thing. But okay.';
  return 'Mm, that was nice. Thanks.';
}

/* ---- gifts ---- */

export const GIFTS = {
  snack: { label: '🍪 Share a snack', cost: 800, base: 4 },
  gift:  { label: '🎁 Give a small gift', cost: 2000, base: 8 }
};
export const giftDelta = (trait, gift) => GIFTS[gift].base + (trait === 'foodie' && gift === 'snack' ? 4 : 0);

/* ---- favours from friends ---- */

export const FAVOURS = {
  study: { minLevel: 2, label: '📚 Study together', note: 'A friend will study with you.' },
  loan:  { minLevel: 2, label: '💸 Borrow ₦2,000', amount: 2000, repayDays: 7 },
  notes: { minLevel: 3, label: '📝 Borrow their lecture notes' }
};
export const canAsk = (favour, points) => levelIndex(points) >= FAVOURS[favour].minLevel;

export function loanBill(npc, day) {
  return { id: `loan-${npc.id}-${day}`, label: `Repay ${npc.name}`, amount: FAVOURS.loan.amount, due: day + FAVOURS.loan.repayDays, paid: false, late: false, lateFee: 0, npc: npc.id };
}

/* ---- clubs ---- */

export const MAX_CLUBS = 2;
export const CLUB_DUES = 500;
export const CLUBS = [
  { id: 'debate',     icon: '🎤', name: 'Debate Club',     venue: 'auditorium', days: [2, 4], fx: { fun: 10, stress: -4, energy: -6 }, msg: 'Heated debate! You argued your heart out.' },
  { id: 'drama',      icon: '🎭', name: 'Drama Society',   venue: 'auditorium', days: [3],    fx: { fun: 16, stress: -6, energy: -8 }, msg: 'Rehearsal was loud and hilarious.' },
  { id: 'tech',       icon: '💻', name: 'Tech Club',       venue: 'auditorium', days: [2, 4], fx: { fun: 8, energy: -8, stress: -2 },  msg: 'You hacked on a small project with new friends.' },
  { id: 'enterprise', icon: '💼', name: 'Enterprise Club', venue: 'auditorium', days: [3, 5], fx: { fun: 7, energy: -6, stress: -2 },  msg: 'Pitch night. A mentor shared hard-won advice.' },
  { id: 'football',   icon: '⚽', name: 'Football Club',   venue: 'field',      days: [2, 4], fx: { fun: 22, energy: -16, hygiene: -14, hunger: -10, stress: -8 }, msg: 'Training was hard but fun.' }
];
export const CLUB_HOURS = [17, 19];
export const clubById = id => CLUBS.find(c => c.id === id);
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const clubSchedule = club => `${club.days.map(d => WEEKDAYS[d - 1]).join(' and ')} at ${CLUB_HOURS[0]}:00`;

/* ---- weekly campus events ---- */

export const EVENTS = [
  { id: 'party',      venue: 'field',      day: 5, hours: [20, 23], label: '🎉 Join the hostel night party', cost: 1000, minutes: 120, fx: { fun: 35, energy: -14, hygiene: -8, stress: -10 }, msg: 'What a night! The music was loud and the jollof was free.' },
  { id: 'match',      venue: 'field',      day: 6, hours: [16, 18], label: '⚽ Watch the inter-hostel match', minutes: 90, fx: { fun: 20, energy: -5, stress: -6 }, msg: 'Your hostel lost on penalties. Still fun!' },
  { id: 'fellowship', venue: 'auditorium', day: 7, hours: [9, 11],  label: '🙏 Attend Sunday fellowship', minutes: 120, fx: { stress: -14, fun: 6, energy: -3 }, msg: 'You left refreshed and at peace.' },
  // added later; `term` limits an event to one semester (seasonal)
  { id: 'deptweek',   venue: 'auditorium', day: 1, hours: [15, 17], term: 2, label: '🏫 Join Departmental week quiz', minutes: 90, fx: { fun: 14, stress: -4, energy: -6 }, msg: 'Your department won the quiz. Well, came second. Still loud.' },
  { id: 'cultural',   venue: 'auditorium', day: 6, hours: [19, 22], term: 1, label: '🥁 Attend Cultural night', cost: 500, minutes: 120, fx: { fun: 28, energy: -10, stress: -8 }, msg: 'Drums, dances and food from every corner of Nigeria. Unforgettable.' },
  { id: 'fellownight', venue: 'auditorium', day: 5, hours: [18, 20], label: '🕯️ Join Fellowship night', minutes: 90, fx: { stress: -10, fun: 8, energy: -4 }, msg: 'Singing by candlelight. You left calm and a little hoarse.' },
  { id: 'carnival',   venue: 'field',      day: 3, hours: [16, 18], term: 2, label: '🎪 Visit the faculty carnival', cost: 300, minutes: 90, fx: { fun: 24, energy: -8, hygiene: -4, stress: -6 }, msg: 'Games, roasted corn and a very competitive tug of war.' }
];

/**
 * Actions available outside a venue right now. `venue` is the building type ('field' or 'auditorium'),
 * `sd` the day of the week (1 = Monday ... 7 = Sunday), `hour` the time of day.
 */
export function socialActions({ venue, sd, hour, clubs, term = null }) {
  const out = [];
  for (const id of clubs) {
    const c = clubById(id);
    if (c && c.venue === venue && c.days.includes(sd) && hour >= CLUB_HOURS[0] && hour < CLUB_HOURS[1]) {
      out.push({ id: `club-${c.id}`, label: `${c.icon} ${c.name} meeting (2 hrs)`, minutes: 120, limit: 1, fx: c.fx, msg: c.msg, clubId: c.id, socialBoost: true, needsAcademic: true });
    }
  }
  for (const e of EVENTS) {
    if (e.term && term && e.term !== term) continue;
    if (e.venue === venue && e.day === sd && hour >= e.hours[0] && hour < e.hours[1]) {
      out.push({ id: e.id, label: e.label, cost: e.cost, minutes: e.minutes, limit: 1, fx: e.fx, msg: e.msg, socialBoost: true, needsAcademic: true });
    }
  }
  return out;
}

/** Join or leave a club. Returns { ok, message }. */
export function joinClub(clubs, id) {
  if (clubs.includes(id)) return { ok: false, message: 'You are already a member.' };
  if (clubs.length >= MAX_CLUBS) return { ok: false, message: `You can join at most ${MAX_CLUBS} clubs. Leave one first.` };
  clubs.push(id);
  return { ok: true, message: `Welcome to the ${clubById(id).name}!` };
}
export function leaveClub(clubs, id) {
  const i = clubs.indexOf(id);
  if (i < 0) return false;
  clubs.splice(i, 1);
  return true;
}
