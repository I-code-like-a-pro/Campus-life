/*
 * Progression and information layer (spec 4.10, F-161):
 *  - counters: lifetime stats that everything else feeds
 *  - achievements and daily goals read those counters
 *  - the notification inbox (F-161): non-blocking toasts plus a history the player can reopen
 *  - the money ledger shown by the phone's bank app
 * State lives in state.meta (see newMeta in save.js) and is saved with the game.
 */

export const ACHIEVEMENTS = [
  // journey
  { id: 'first_steps',   icon: '👋', name: 'First Steps',        text: 'Talk to someone',                         c: 'talks',        n: 1 },
  { id: 'jamb_checked',  icon: '📄', name: 'Result Day',         text: 'Check your JAMB result',                  c: 'jambChecked',  n: 1 },
  { id: 'admitted',      icon: '🎉', name: 'Admitted!',          text: 'Get admission',                           c: 'admitted',     n: 1 },
  { id: 'retaker',       icon: '🔁', name: 'Never Give Up',      text: 'Retake JAMB',                             c: 'retakes',      n: 1 },
  { id: 'on_the_road',   icon: '🚌', name: 'On the Road',        text: 'Take the bus to school',                  c: 'busRides',     n: 1 },
  { id: 'cleared',       icon: '📋', name: 'Cleared',            text: 'Finish clearance',                        c: 'cleared',      n: 1 },
  // academics
  { id: 'front_row',     icon: '🎓', name: 'Front Row',          text: 'Attend a lecture',                        c: 'lectures',     n: 1 },
  { id: 'attendance',    icon: '📚', name: 'Attendance King',    text: 'Attend 20 lectures',                      c: 'lectures',     n: 20 },
  { id: 'bookworm',      icon: '🐛', name: 'Bookworm',           text: 'Study 10 times',                          c: 'studies',      n: 10 },
  { id: 'assignments',   icon: '📝', name: 'Assignment Ace',     text: 'Submit 5 assignments',                    c: 'assignments',  n: 5 },
  { id: 'ca_done',       icon: '✏️', name: 'CA Done',            text: 'Take a CA test',                          c: 'caTests',      n: 1 },
  { id: 'exam_warrior',  icon: '🧪', name: 'Exam Warrior',       text: 'Write an exam',                           c: 'exams',        n: 1 },
  { id: 'first_results', icon: '📄', name: 'Results Are Out',    text: 'Finish a semester',                       c: 'semesters',    n: 1 },
  { id: 'a_student',     icon: '🅰️', name: 'A Student',          text: 'Score an A in a course',                  c: 'gradeA',       n: 1 },
  { id: 'dean_list',     icon: '🏅', name: "Dean's List",        text: 'Get a semester GPA of 4.5 or more',       c: 'deansList',    n: 1 },
  { id: 'no_carry',      icon: '✅', name: 'Clean Sheet',        text: 'Finish a semester with no F',             c: 'cleanSemesters', n: 1 },
  { id: 'comeback',      icon: '💪', name: 'Comeback',           text: 'Pass a carryover course',                 c: 'carryPassed',  n: 1 },
  { id: 'graduate',      icon: '🎓', name: 'Graduate',           text: 'Complete your degree',                    c: 'graduated',    n: 1 },
  // money
  { id: 'first_naira',   icon: '💵', name: 'First Naira',        text: 'Earn money from work',                    c: 'shifts',       n: 1 },
  { id: 'hustler',       icon: '💼', name: 'Hustler',            text: 'Work 10 shifts',                          c: 'shifts',       n: 10 },
  { id: 'big_earner',    icon: '💰', name: 'Big Earner',         text: 'Earn ₦100,000 in total',                  c: 'earned',       n: 100000 },
  { id: 'saver',         icon: '🏦', name: 'Saver',              text: 'Save ₦20,000',                            c: 'savingsPeak',  n: 20000 },
  { id: 'big_spender',   icon: '🛍️', name: 'Big Spender',        text: 'Spend ₦100,000 in total',                 c: 'spent',        n: 100000 },
  { id: 'sapa',          icon: '😩', name: 'Sapa Survivor',      text: 'Fall below ₦500 and recover',             c: 'sapaRecovered', n: 1 },
  // life
  { id: 'chop_life',     icon: '🍛', name: 'Chop Life',          text: 'Eat 10 meals',                            c: 'meals',        n: 10 },
  { id: 'sleeper',       icon: '😴', name: 'Sleeper',            text: 'Sleep 10 times',                          c: 'sleeps',       n: 10 },
  { id: 'fresh',         icon: '🚿', name: 'Fresh and Clean',    text: 'Bathe 10 times',                          c: 'bathes',       n: 10 },
  { id: 'explorer',      icon: '🧭', name: 'Explorer',           text: 'Visit 6 different places',                c: 'placesSeen',   n: 6 },
  { id: 'gist_master',   icon: '🗣️', name: 'Gist Master',        text: 'Have 20 conversations',                   c: 'talks',        n: 20 },
  { id: 'popular',       icon: '🌟', name: 'Popular',            text: 'Talk to 10 different people',             c: 'peopleMet',    n: 10 },
  { id: 'checkup',       icon: '🩺', name: 'Check-up',           text: 'See a doctor',                            c: 'doctorVisits', n: 1 },
  { id: 'back_on_feet',  icon: '💪', name: 'Back on Your Feet',  text: 'Recover from an illness',                 c: 'recoveries',   n: 1 },
  { id: 'netted',        icon: '🦟', name: 'Netted',             text: 'Buy a mosquito net',                      c: 'netBought',    n: 1 },
  { id: 'chef',          icon: '👩🏾‍🍳', name: 'Home Chef',          text: 'Cook 5 meals',                            c: 'cooked',       n: 5 },
  { id: 'decorator',     icon: '🪴', name: 'Home Sweet Home',    text: 'Buy 3 room decorations',                  c: 'decorBought',  n: 3 },
  { id: 'responsible',   icon: '💳', name: 'Responsible',        text: 'Pay 2 hostel bills',                      c: 'billsPaid',    n: 2 },
  { id: 'first_ride',    icon: '🛺', name: 'First Ride',         text: 'Take a keke or okada',                    c: 'rides',        n: 1 },
  { id: 'rider',         icon: '🛵', name: 'Frequent Rider',     text: 'Take 10 rides',                           c: 'rides',        n: 10 },
  { id: 'weeks',         icon: '📅', name: 'Settling In',        text: 'Play for 14 game days',                   c: 'daysPlayed',   n: 14 }
];

// Daily goal templates. `who` limits them to aspirants ('a'), students ('s') or both.
const GOAL_TEMPLATES = [
  { id: 'eat2',     text: 'Eat 2 meals',                 c: 'meals',       n: 2, reward: 800,  who: 'as' },
  { id: 'talk3',    text: 'Chat with 3 people',          c: 'talks',       n: 3, reward: 600,  who: 'as' },
  { id: 'sleep1',   text: 'Get a good sleep',            c: 'sleeps',      n: 1, reward: 700,  who: 'as' },
  { id: 'work1',    text: 'Work a shift',                c: 'shifts',      n: 1, reward: 1000, who: 'as' },
  { id: 'enter2',   text: 'Visit 2 buildings',           c: 'enters',      n: 2, reward: 500,  who: 'as' },
  { id: 'bathe1',   text: 'Take a bath',                 c: 'bathes',      n: 1, reward: 400,  who: 'as' },
  { id: 'lect2',    text: 'Attend 2 lectures',           c: 'lectures',    n: 2, reward: 1500, who: 's' },
  { id: 'study2',   text: 'Study twice',                 c: 'studies',     n: 2, reward: 1200, who: 's' },
  { id: 'assign1',  text: 'Work on an assignment',       c: 'assignmentSessions', n: 1, reward: 1200, who: 's' },
  { id: 'earn3k',   text: 'Earn ₦3,000',                 c: 'earned',      n: 3000, reward: 1000, who: 's' }
];

// small seeded RNG so a given game day always offers the same goals
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const LOGIN_REWARD = streak => 500 * Math.min(streak, 7);
const dayNumber = (now = Date.now()) => Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000);

/**
 * deps: { state, day() -> game day, give(amount), toast(text), sound(name), isStudent() -> boolean }
 */
export function createMeta({ state, day, give, toast, sound = () => {}, isStudent = () => false }) {
  const M = () => state.meta;
  const count = key => M().counters[key] || 0;

  /* ---------- inbox ---------- */
  function notify({ icon = '🔔', title, text = '', show = true }) {
    const m = M();
    m.inbox.unshift({ id: `${day()}-${m.inbox.length}-${title}`, day: day(), icon, title, text, read: false });
    m.inbox.length = Math.min(m.inbox.length, 60);
    if (show) { toast(`${icon} ${title}`); sound('toast'); }
  }
  const unread = () => M().inbox.filter(n => !n.read).length;
  const markAllRead = () => M().inbox.forEach(n => { n.read = true; });

  /* ---------- money ledger ---------- */
  /** `count: false` for transfers between your own accounts, which are not income or spending. */
  function ledger(text, amount, { count = true } = {}) {
    const m = M();
    m.ledger.unshift({ day: day(), text, amount });
    m.ledger.length = Math.min(m.ledger.length, 40);
    if (!count) return;
    if (amount > 0) track('earned', amount); else if (amount < 0) track('spent', -amount);
  }

  /* ---------- achievements ---------- */
  function checkAchievements() {
    const m = M();
    for (const a of ACHIEVEMENTS) {
      if (m.achievements[a.id] || count(a.c) < a.n) continue;
      m.achievements[a.id] = day();
      notify({ icon: a.icon, title: `Achievement: ${a.name}`, text: a.text });
      sound('unlock');
    }
  }

  /* ---------- daily goals ---------- */
  function newGoals() {
    const who = isStudent() ? 's' : 'a';
    const pool = GOAL_TEMPLATES.filter(t => t.who.includes(who));
    const rand = rng(day() * 7919 + (who === 's' ? 11 : 3));
    const picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    return picks.map(t => ({ ...t, base: count(t.c), done: false }));
  }

  function checkGoals() {
    const d = M().daily;
    for (const g of d.goals) {
      if (g.done || count(g.c) - g.base < g.n) continue;
      g.done = true;
      give(g.reward);
      ledger(`Daily goal: ${g.text}`, g.reward);
      notify({ icon: '🎯', title: `Goal done: ${g.text}`, text: `+₦${g.reward.toLocaleString('en-NG')}` });
      sound('coin');
    }
  }

  /** Call every frame (cheap): rolls over to a new set of goals on a new game day. */
  function refreshDay() {
    const m = M();
    if (m.daily.day === day()) return;
    m.daily = { day: day(), goals: newGoals(), claimed: [] };
    track('daysPlayed', 1);
  }

  /* ---------- counters ---------- */
  function track(key, n = 1) {
    const c = M().counters;
    c[key] = (c[key] || 0) + n;
    checkAchievements();
    checkGoals();
  }
  /** Counts something only the first time (distinct places, people). */
  function trackOnce(setKey, id, counterKey) {
    const c = M().counters;
    const flag = `${setKey}:${id}`;
    if (c[flag]) return false;
    c[flag] = 1;
    track(counterKey, 1);
    return true;
  }
  /** For values that only matter at their peak (savings). */
  function trackMax(key, value) {
    const c = M().counters;
    if (value > (c[key] || 0)) { c[key] = value; checkAchievements(); }
  }

  /* ---------- real-time login streak (a reason to come back tomorrow) ---------- */
  function claimLogin(now = Date.now()) {
    const s = M().streak;
    const today = dayNumber(now);
    if (s.last === today) return null;
    s.count = s.last === today - 1 ? s.count + 1 : 1;
    s.last = today;
    const reward = LOGIN_REWARD(s.count);
    give(reward);
    ledger(`Daily login bonus (day ${s.count})`, reward);
    notify({ icon: '🔥', title: `Day ${s.count} streak`, text: `Login bonus +₦${reward.toLocaleString('en-NG')}` });
    return { streak: s.count, reward };
  }

  return {
    notify, unread, markAllRead, ledger, track, trackOnce, trackMax, refreshDay, claimLogin,
    count, achievements: () => ACHIEVEMENTS.map(a => ({ ...a, unlockedDay: M().achievements[a.id] ?? null })),
    goals: () => M().daily.goals, streak: () => M().streak, inbox: () => M().inbox, ledgerList: () => M().ledger
  };
}
