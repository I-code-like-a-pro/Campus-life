import { degreeClass } from './academics.js';

/*
 * Year-structure scenes: results day, resumption of each semester and session, exam week, the first assignment hand-in,
 * Faculty week, the departmental dinner, SIWES, the final-year project, the convocation, and the seasonal visit home.
 *
 * Every entry is a scene in the format of src/scenes.js. Scenes that run in more than one semester carry `repeat: true` and
 * `active(a)`, and their status is stored per semester (key `id@year.term`). Beats read the real academic record from `ctx.a`.
 * They are written to cope when `ctx.a` is missing, so the tests can play them without a game.
 */

const npc = (id, name, role, emoji, dx, dz, shirt, dialogue = 'student', skin) => ({ id, name, role, emoji, dx, dz, shirt, dialogue, ...(skin ? { skin } : {}) });
const naira = n => `₦${Number(n).toLocaleString('en-NG')}`;
const clampUp = (n, max = 100) => Math.min(max, n);

/* ---------------- pure rules (tested) ---------------- */

export const levelName = year => `${year}00 Level`;
export const isFinalYear = a => !!a && a.year === (a.programmeYears || 4);

/** The result of the semester that just ended (or the latest one on record). */
export const lastResult = a => {
  const h = a?.history || [];
  return h.find(x => x.year === a?.year && x.term === a?.term) || h[h.length - 1] || { gpa: 2.5, rows: [] };
};

/** How a semester's GPA feels, from the real GPA. */
export const RESULT_TIERS = [
  { id: 'first', min: 4.5, label: 'First class standard', emoji: '🌟', fx: { fun: 12, stress: -8 }, mum: 3000 },
  { id: 'upper', min: 3.5, label: 'Second class upper standard', emoji: '😄', fx: { fun: 7, stress: -5 }, mum: 2000 },
  { id: 'lower', min: 2.4, label: 'Second class lower standard', emoji: '🙂', fx: { fun: 2, stress: -2 }, mum: 1000 },
  { id: 'third', min: 1.5, label: 'Third class standard', emoji: '😕', fx: { fun: -3, stress: 5 }, mum: 0 },
  { id: 'pass', min: 1.0, label: 'Pass standard', emoji: '😟', fx: { fun: -5, stress: 9 }, mum: 0 },
  { id: 'danger', min: -Infinity, label: 'Below pass level', emoji: '😰', fx: { fun: -8, stress: 13 }, mum: 0 }
];
export const resultTier = gpa => RESULT_TIERS.find(t => gpa >= t.min);
export const isGoodResult = tier => ['first', 'upper', 'lower'].includes(tier.id);

const CROWD_REACTION = {
  first: 'A cheer goes up at the notice board when your name is found. Tosin lifts your hand in the air and Chioma starts a small, loud song.',
  upper: 'Coursemates crowd round and shake your hand. "Well done!" Someone asks you to share your reading timetable.',
  lower: 'People nod and say "not bad at all". The mood around the board is mixed: some smiling, some counting carryovers.',
  third: 'The board is crowded and quiet. People find their names, then walk away slowly, scrolling through their phones.',
  pass: 'There is a long line at the notice board, and few faces look happy. Someone near you is trying not to cry.',
  danger: 'You find your name at the end of the list. The crowd is thin now. Chioma squeezes your arm and says nothing, which is kind.'
};
const MUM_REPLY = {
  first: 'Mum screams so loudly that you hold the phone away. "First class standard! I will tell the whole street!" She promises a surprise.',
  upper: 'Mum says she is very proud and has already told Aunty Sade. She sends something small to celebrate.',
  lower: 'Mum says a good result is a good result, and asks only that you keep trying. She sends a little for provisions.',
  third: 'Mum is quiet for a moment, then says, "We learn from this. Read earlier, sleep well, and eat." Her voice is warm.',
  pass: 'Mum says she is not angry. She wants to know what went wrong and how she can help. You promise to change your habits.',
  danger: 'Mum listens to everything and then says, "You are not your result. We will find a plan together." You cry a little and feel lighter.'
};

/** Thesis defence: points from the project work, the rehearsal, the answers and the real record. */
export const defenceScore = ({ effort = 0, rehearsal = 0, answers = 0, cgpa = 2.5, avgKnowledge = 0 } = {}) =>
  effort + rehearsal + answers + (cgpa >= 4 ? 2 : cgpa >= 3 ? 1 : cgpa < 2 ? -1 : 0) + (avgKnowledge >= 50 ? 1 : 0);
export const DEFENCE_TIERS = [
  { id: 'distinction', min: 9, title: '🏅 Distinction', fx: { fun: 12, stress: -12 }, give: 5000 },
  { id: 'pass', min: 6, title: '✅ Pass with minor corrections', fx: { fun: 6, stress: -8 }, give: 0 },
  { id: 'major', min: 3, title: '📝 Pass with major corrections', fx: { stress: -2 }, give: 0 },
  { id: 'redo', min: -Infinity, title: '🔁 Defend again next week', fx: { stress: 8, fun: -4 }, give: 0 }
];
export const defenceTier = score => DEFENCE_TIERS.find(t => score >= t.min);

/** SIWES (industrial attachment) assessment from the points earned over the placement. */
export const SIWES_TIERS = [
  { id: 'excellent', min: 7, title: '🏅 Excellent report', stipend: 25000 },
  { id: 'good', min: 5, title: '✅ Good report', stipend: 18000 },
  { id: 'fair', min: 3, title: '📋 Satisfactory report', stipend: 12000 },
  { id: 'weak', min: -Infinity, title: '⚠️ Needs improvement', stipend: 6000 }
];
export const siwesTier = pts => SIWES_TIERS.find(t => pts >= t.min);

/** Which seasonal visit home belongs to the break after this semester. */
export const homeSeason = a => (a?.term === 1 ? 'christmas' : 'harvest');

/* ---------------- helpers for beats ---------------- */
const go = (ctx, fx) => { if (fx && Object.keys(fx).length) ctx.consume({ minutes: 0, fx }); };
const courses = ctx => ctx.a?.courses || [];
const boostAll = (ctx, n) => { for (const c of courses(ctx)) c.knowledge = clampUp((c.knowledge || 0) + n); };
const avgKnowledge = a => { const cs = a?.courses || []; return cs.length ? cs.reduce((s, c) => s + (c.knowledge || 0), 0) / cs.length : 0; };
const pending = ctx => courses(ctx).filter(c => !c.assign?.done);
const addPts = (ctx, key, n) => { ctx.flags[key] = (ctx.flags[key] || 0) + n; };
const duringBreak = a => a.phase === 'break' && !a.graduated && !a.withdrawn;
const resultsOut = a => duringBreak(a) && !!a.history?.some(h => h.year === a.year && h.term === a.term);

/* ---------------- the scenes ---------------- */

const LEVEL_WORDS = {
  2: 'Second year is where the real course begins. Lectures are more specialised, practicals matter, and past questions are harder.',
  3: 'Third year is the heavy one: demanding courses, and at the end of the year the industrial attachment (SIWES) that every student must do.',
  4: 'Final year: your project, your defence, your last exams, and then the stage at convocation. Everything now counts twice.'
};

export const MILESTONES = [
  /* ===== results day ===== */
  {
    id: 'results', repeat: true, emoji: '📄', title: 'Results day', short: 'Results day', venue: 'class', minutes: 60, fx: { energy: -2 },
    closing: a => `The results are out. ${a ? `Your GPA is ${lastResult(a).gpa.toFixed(2)}.` : ''} The portal still has the full breakdown.`,
    active: resultsOut,
    windows: a => [{ day: a.startDay + 6, from: 8, to: 22 }],
    crowd: [npc('c1', 'Tosin', 'Coursemate', '🎒', -5.2, 2.5, 0xf1c40f), npc('c2', 'Chioma', 'Coursemate', '🎒', 5.2, 2.5, 0xe74c3c), npc('c3', 'Mr. Okon', 'Department officer', '🗂️', -3.6, -4.4, 0x8e44ad, 'deptofficer', 0x5a3a26)],
    beats: ctx => {
      const a = ctx.a || {};
      const r = lastResult(a);
      const tier = resultTier(r.gpa);
      const rows = [...(r.rows || [])].sort((x, y) => y.total - x.total);
      const best = rows[0], worst = rows[rows.length - 1];
      const strong = isGoodResult(tier);
      return [
        { title: '📄 Results are out', lines: ['The results are pinned on the department notice board and already on the portal. Students are packed around the glass.', CROWD_REACTION[tier.id]] },
        {
          title: `${tier.emoji} Your result`,
          lines: [
            ...(rows.length ? rows.map(x => `${x.code}: ${x.total} (${x.grade})${x.carry ? ' · carryover' : ''}`) : ['Your row is on the sheet.']),
            `GPA: ${Number(r.gpa).toFixed(2)}${a.cgpa != null ? ` · CGPA: ${a.cgpa.toFixed(2)} (${degreeClass(a.cgpa)})` : ''}`,
            best && worst && best !== worst ? `Strongest: ${best.code}. Weakest: ${worst.code}.` : '',
            ...(a.carryovers?.length ? [`Carryovers: ${a.carryovers.map(c => c.code).join(', ')}.`] : []),
            ...(a.probation ? ['You are on academic probation. Another weak semester could mean withdrawal.'] : [])
          ].filter(Boolean),
          fx: tier.fx
        },
        {
          title: '🤔 What now?', lines: [strong ? 'You are in a good mood. How do you spend the rest of the day?' : 'The day is not over. What helps you most right now?'],
          choices: [
            { label: 'Celebrate with friends (₦1,500)', cost: 1500, text: strong ? 'Jollof, chilled drinks and a lot of laughing. Someone insists on a group photo at the notice board.' : 'A hot meal with friends. You do not talk about grades, and it helps more than you expected.', poor: 'You cannot afford a treat today. You share a bottle of water on the steps and laugh anyway.', fx: { fun: 8, hunger: 15, stress: -4 }, meet: 'results-c1' },
            { label: 'Call Mum', text: `${MUM_REPLY[tier.id]}${duringBreak(a) ? ' She asks if you will come home for the break. You can travel from the student portal.' : ''}`, give: tier.mum || undefined, fx: { stress: -5, fun: 3 } },
            { label: 'Console a friend', text: strong ? 'Chioma had a hard semester. You sit with her and go through what happened. She says it is the first time she has smiled all day.' : 'You and Tosin compare notes. Both of you have a few things to fix, and it feels less lonely.', fx: { stress: -3, fun: 3 }, meet: 'results-c2' },
            { label: 'Make a study plan for next semester', text: `You write a timetable on the back of the results slip: read early, sleep well, attend every class${worst ? `, and give ${worst.code} extra time` : ''}. You start the next semester ahead.`, fx: { energy: -2, stress: -3 }, minutes: 45, run: ctx2 => { if (ctx2.a) ctx2.a.studyPlan = strong ? 4 : 7; } }
          ]
        },
        ctx2 => (tier.id === 'third' || tier.id === 'pass' || tier.id === 'danger')
          ? { title: '🧑🏾‍🏫 A word from the department', lines: [`Mr. Okon, the department officer, says results like this happen to many students. ${tier.id === 'danger' ? 'He explains that two weak semesters in a row can lead to withdrawal, and the level adviser can help you plan.' : 'He suggests meeting the level adviser early next semester.'}`, 'Carryover courses can be retaken and cleared. Your story is not over.'], fx: { stress: -2 } }
          : null
      ];
    }
  },

  /* ===== resumption ===== */
  {
    id: 'session', repeat: true, emoji: '🏫', title: 'A new session', short: 'New session welcome', venue: 'auditorium', minutes: 90, fx: { energy: -2, hunger: -4 },
    active: a => a.year >= 2 && a.term === 1,
    windows: a => [{ day: a.startDay, from: 10, to: 13 }],
    crowd: [npc('dean', 'Dean of Faculty', 'Dean', '🎤', 0, -6.2, 0x1f2a44, 'dean', 0x5a3a26), npc('s1', 'Dayo', 'Senior', '😎', -5.4, -1.2, 0x16a085), npc('s2', 'Yetunde', 'Coursemate', '🎒', 5.4, 1.2, 0xe84393)],
    beats: ctx => {
      const a = ctx.a || { year: 2 };
      const cg = a.cgpa != null ? `Your CGPA stands at ${a.cgpa.toFixed(2)}, which is ${degreeClass(a.cgpa)} territory.` : 'Your record starts fresh today.';
      return [
        { title: `🏫 Welcome to ${levelName(a.year)}`, lines: [`Students who survived the last session cluster in the hall at ${ctx.campusName || 'the university'}, comparing holidays.`, LEVEL_WORDS[Math.min(4, a.year)] || LEVEL_WORDS[4]] },
        { title: '📈 Where you stand', lines: [cg, a.carryovers?.length ? `You still owe ${a.carryovers.map(c => c.code).join(', ')}. Clear them this session.` : 'You have no carryovers. Keep it that way.'] },
        {
          title: '🧭 Your goal for the session', lines: ['The Dean asks everyone to pick one thing to focus on this session.'],
          choices: [
            { label: 'Study first: raise my CGPA', text: 'You decide to treat the library like a second room. It will cost you some fun.', fx: { stress: 2 }, run: ctx2 => { if (ctx2.a) ctx2.a.studyPlan = (ctx2.a.studyPlan || 0) + 3; } },
            { label: 'Get involved: clubs and friends', text: 'You promise yourself to say yes to more things, as long as the grades hold.', fx: { fun: 4 }, meet: 'session-s2' },
            { label: 'Balance: a bit of both', text: 'You write a plan with study blocks and rest blocks. It looks sensible, which is a good start.', fx: { stress: -2 } }
          ]
        },
        { title: '🤝 Seniors say a word', lines: ['Dayo, a final-year student, says the best advice he got was simple: attend every class and never leave the assignment for Friday night.'], fx: { fun: 2 } }
      ];
    }
  },
  {
    id: 'resumeS2', repeat: true, emoji: '🌧️', title: 'Second semester resumption', short: 'Semester 2 resumption', venue: 'auditorium', minutes: 60, fx: { energy: -2 },
    active: a => a.term === 2,
    windows: a => [{ day: a.startDay, from: 10, to: 13 }],
    crowd: [npc('reg', 'Mrs. Obi', 'Department officer', '🗂️', -3.6, -4.4, 0x8e44ad, 'deptofficer', 0x5a3a26), npc('c1', 'Kelechi', 'Coursemate', '🎒', -5.4, 1.4, 0x3498db), npc('c2', 'Amina', 'Coursemate', '🎒', 5.4, 1.4, 0xff7aa8)],
    beats: ctx => {
      const home = Object.keys(ctx.a?.homeVisits || {}).length > 0;
      return [
        { title: '🌧️ Back for second semester', lines: [home ? 'You return from home with a bag of food and a lighter head. Mama waved from the gate until you were out of sight.' : 'The break was short but it helped. The rains have started, and the paths between buildings are muddy.', 'The Registrar announces that the second semester is now open.'] },
        { title: '☂️ The rainy season', lines: ['Afternoon showers will come most days. Carry an umbrella, keep your feet dry and sleep under a net: malaria season is here.', 'Lectures and exams hold in the rain. Plan the walks between halls.'] },
        {
          title: '🎒 How do you start?', lines: ['The first day back, you have a few free minutes.'],
          choices: [
            { label: 'Buy a new notebook and pens (₦500)', cost: 500, text: 'A fresh notebook feels like a fresh start. You label every page.', poor: 'Notebooks are out of reach today. You tear out the empty pages of last semester\'s one.', fx: { stress: -2 }, run: ctx2 => boostAll(ctx2, 1) },
            { label: 'Catch up with coursemates', text: 'Kelechi has a story about a bus that broke down twice. You compare timetables.', fx: { fun: 4 }, meet: 'resume-c1' },
            { label: 'Rest and settle in', text: 'You sort out your room and drink a lot of water. The semester can wait one hour.', fx: { energy: 4, stress: -3 } }
          ]
        }
      ];
    }
  },
  {
    id: 'reReg', repeat: true, emoji: '📝', title: 'Course registration', short: 'Course registration', venue: 'class', minutes: 75, fx: { energy: -3, hunger: -4 }, missFx: { stress: 3 },
    closing: 'You are registered for the semester. Your stamped form goes in your folder.',
    active: a => !(a.year === 1 && a.term === 1),
    windows: a => [{ day: a.startDay, from: 14, to: 17.5 }, { day: a.startDay + 1, from: 14, to: 17.5 }],
    crowd: [npc('officer', 'Mrs. Obi', 'Department officer', '🗂️', -3.6, -4.4, 0x8e44ad, 'deptofficer', 0x5a3a26), npc('adv', 'Dr. Eze', 'Level adviser', '🧑🏾‍🏫', 3.4, -4.2, 0x2c3e50, 'lecturer', 0x5a3a26), npc('c1', 'Kelechi', 'Coursemate', '🎒', -6, 1.4, 0x3498db)],
    beats: ctx => {
      const a = ctx.a || { year: 2, term: 1 };
      const carry = a.carryovers || [];
      return [
        { title: '📝 Course registration', lines: [`The ${levelName(a.year)} registration line stretches along the corridor. Mrs. Obi calls ${ctx.courseName || 'your department'} students forward in groups.`, 'You bring your fee receipt, last result slip and a pen that works.'] },
        { title: `📋 Your ${levelName(a.year)} courses`, lines: ['This semester you register for:', ...(ctx.courses?.length ? ctx.courses : ['Your department\'s courses for this level.']), ...(carry.length ? [`Your carryover${carry.length > 1 ? 's are' : ' is'} included: ${carry.map(c => c.code).join(', ')}.`] : [])] },
        {
          title: '🧑🏾‍🏫 The level adviser', lines: [`Dr. Eze, the ${levelName(a.year)} adviser, has a few minutes for each student. What do you ask?`],
          choices: [
            { label: 'Which course will be hardest?', text: `Dr. Eze says to start with ${ctx.weakest || 'the course you feel least sure about'} early: "Fear of the hardest course is what makes it hard."`, fx: { stress: -2 } },
            { label: 'How do I raise my CGPA?', text: a.cgpa != null && a.cgpa < 3.5 ? `With a CGPA of ${a.cgpa.toFixed(2)} the quickest gains are attendance, assignments done early, and clearing every carryover.` : 'Dr. Eze says consistency beats heroics: attend, submit on time and do not skip the CA tests.', fx: { stress: -2 } },
            { label: carry.length ? 'How do I clear my carryover?' : 'What are the common mistakes?', text: carry.length ? 'Register it again and treat it like a new course: attend all classes. Carryovers that are cleared leave no mark on you.' : 'Missing the CA test, ignoring early lectures, and leaving the assignment until Friday night. Avoid the three and you will be fine.', fx: { stress: -2 } },
            ...(isFinalYear(a) ? [{ label: 'How do I choose a project topic?', text: 'Pick something you can actually finish. A small problem solved well beats a huge one left unfinished. Meet your supervisor early.', fx: { stress: -2 } }] : [])
          ]
        },
        { title: '🖋️ Signed and stamped', lines: ['Your form is signed, stamped and filed. You are registered for the semester.'] }
      ];
    },
    onAttend: ctx => ctx.setRegistered()
  },

  /* ===== exam week ===== */
  {
    id: 'examEve', repeat: true, emoji: '📚', title: 'Revision night', short: 'Revision night', venue: 'library', minutes: 30, fx: { hunger: -8 },
    closing: 'The library clock says it is late. Tomorrow are the exams. Go to a lecture hall and write them when you are ready.',
    done: a => !!a.examTaken,
    windows: a => [{ day: a.startDay + 4, from: 15, to: 19 }],
    crowd: [npc('l1', 'Ibrahim', 'Coursemate', '🎒', -6, 2.8, 0x2ecc71), npc('l2', 'Halima', 'Coursemate', '🎒', 6, 3.2, 0x8e44ad), npc('lib', 'Librarian', 'Librarian', '📚', 0, -4.6, 0x7f8c8d, 'librarian', 0x5a3a26)],
    beats: ctx => {
      const cs = courses(ctx);
      const weak = ctx.weakest || (cs.slice().sort((x, y) => x.knowledge - y.knowledge)[0]?.code) || '';
      const prep = cs.length ? Math.round(avgKnowledge(ctx.a)) : 0;
      return [
        { title: '📚 Revision night', lines: ['Tomorrow is exam day. Every seat in the library is taken, and people are reading on the floor, on the stairs and under the lamps.', cs.length ? `You have ${cs.length} papers tomorrow. Your average preparation is about ${prep}%${weak ? `, and ${weak} is your weakest` : ''}.` : 'The exams are tomorrow.'] },
        {
          title: '🌙 How will you spend the evening?', lines: ['What you do tonight changes how many wrong options you can rule out tomorrow.'],
          choices: [
            { label: 'Study late into the night', text: 'Notes, past questions, coffee. By the end your eyes burn but your head is full.', fx: { energy: -14, stress: 5 }, minutes: 180, flag: 'late', run: ctx2 => boostAll(ctx2, 8) },
            { label: 'Join a study group', text: 'Ibrahim explains one topic and you explain another. Teaching it makes it stick.', fx: { energy: -6, fun: 4, stress: -2 }, minutes: 150, run: ctx2 => boostAll(ctx2, 5), meet: 'exameve-l1' },
            { label: weak ? `Focus only on ${weak}` : 'Focus on your weakest course', text: 'You ignore everything else and dig into the course you fear. By ten o\'clock it makes sense.', fx: { energy: -6 }, minutes: 120, prepWeak: 12 },
            { label: 'Revise briefly, then sleep early', text: 'You go through the key points and leave before the library fills up. A rested mind is worth a few marks.', fx: { energy: 8, stress: -6 }, minutes: 60, run: ctx2 => boostAll(ctx2, 2) }
          ]
        },
        c2 => ({
          title: c2.flags.late ? '🌅 Close to dawn' : '🌃 The campus at night',
          lines: c2.flags.late ? ['The lamps outside flicker, then a generator hums. Your head is heavy, but you remember more than you thought.'] : ['You walk back to the hostel in the cool night air. Other students are still reading under street lamps.'],
          fx: c2.flags.late ? { hunger: -4 } : { stress: -1 }
        })
      ];
    }
  },
  {
    id: 'examMorning', repeat: true, emoji: '⏰', title: 'Exam morning', short: 'Exam morning', venue: 'class', minutes: 45, fx: {},
    closing: 'The doors are opening. The exams are written at the lecture seats in any lecture hall until 20:00.',
    done: a => !!a.examTaken,
    windows: a => [{ day: a.startDay + 5, from: 6.5, to: 9 }],
    crowd: [npc('inv', 'Dr. Adebayo', 'Invigilator', '🕶️', 3.2, -3.4, 0x1f2a44, 'invigilator', 0x5a3a26), npc('c1', 'Tosin', 'Coursemate', '🎒', -5.2, 2.5, 0xf1c40f), npc('c2', 'Ibrahim', 'Coursemate', '🎒', 5.2, 2.5, 0x2ecc71)],
    beats: ctx => [
      { title: '⏰ Exam morning', lines: [courses(ctx).length ? `${courses(ctx).length} papers today, written one after the other at the lecture seats. The exam desk opens at 08:00 and closes at 20:00.` : 'Exams are on today.', 'Coursemates whisper formulas at the door. A mother prays loudly over her son. The invigilator checks his watch.'] },
      {
        title: '🧠 The last half hour', lines: ['What do you do with it?'],
        choices: [
          { label: 'Quick look at your notes', text: 'You skim headings and formulas. A few things come back to you.', fx: { stress: 1 }, run: ctx2 => boostAll(ctx2, 2) },
          { label: 'Buy breakfast (₦300)', cost: 300, text: 'A hot bean cake and tea. Your stomach stops complaining and your head clears.', poor: 'You cannot afford breakfast. You drink water and push on.', fx: { hunger: 25, stress: -2 } },
          { label: 'Take slow breaths outside', text: 'You stand under a tree and breathe. The shaking in your hands eases.', fx: { stress: -5 } },
          { label: 'Quiz a coursemate', text: 'Tosin asks you three questions, and you ask him three. You get two wrong. Better now than later.', fx: { fun: 1 }, run: ctx2 => boostAll(ctx2, 1), meet: 'examMorning-c1' }
        ]
      },
      { title: '🚪 The doors open', lines: ['The invigilator calls everyone to line up. Pens out, bags at the front, phones off.', 'Whatever you did last night, it is time to write.'] }
    ]
  },

  /* ===== the first assignment hand-in ===== */
  {
    id: 'assignment', repeat: true, emoji: '🖨️', title: 'Assignment deadline', short: 'Assignment deadline', venue: 'biz', minutes: 60, fx: { energy: -3 },
    closing: 'Your assignments are in. The portal shows what each course has received.',
    done: a => !!a.courses && a.courses.every(c => c.assign?.done),
    windows: a => [{ day: a.startDay + 4, from: 9, to: 17 }],
    crowd: [npc('mgr', 'Manager', 'Business Centre', '🧾', 6.5, -3.5, 0x6b4a2f, 'bizmanager', 0x5a3a26), npc('c1', 'Amina', 'Coursemate', '🎒', -5.4, 2.4, 0xff7aa8), npc('c2', 'Femi', 'Coursemate', '🎒', 5.4, 3.2, 0x3498db)],
    beats: ctx => {
      const left = pending(ctx);
      return [
        { title: '🖨️ Deadline Friday', lines: ['The printers hum, the queue winds out the door and everyone is holding a flash drive or a stack of paper.', left.length ? `You still have ${left.length} assignment${left.length > 1 ? 's' : ''} open: ${left.map(c => `${c.code} (${c.assign?.progress || 0}/2 sessions)`).join(', ')}.` : 'All your assignments are submitted already.'] },
        {
          title: '🎯 What do you do?', lines: ['Departments collect assignments at the department office by evening. How will you handle yours?'],
          choices: [
            { label: 'Print and hand in what you have (₦200)', cost: 200, text: 'You print a rough draft and submit it. It will earn partial marks, not full ones.', poor: 'You cannot afford printing and submit a handwritten page instead.', fx: { stress: 1 }, run: ctx2 => { for (const c of pending(ctx2)) if (!c.assign.progress) c.assign.progress = 1; } },
            { label: 'Finish them here and submit (₦300)', cost: 300, text: 'Two hours of typing, fixing and printing. Your eyes ache, but the work is done.', poor: 'You do not have enough for the printing and data. You rush what you can by hand.', fx: { energy: -8, stress: 2 }, minutes: 120, run: ctx2 => { for (const c of pending(ctx2)) { if (c.assign.progress >= 1) { c.assign.progress = 2; c.assign.done = true; } else c.assign.progress = 1; } return 'Courses you had already started are now complete; the others have a draft in.'; } },
            { label: 'Ask the lecturer for more time', text: 'You find the lecturer by the stairs and explain.', fx: {}, run: ctx2 => { if (ctx2.roll('extension') < 0.5) { for (const c of pending(ctx2)) c.assign.progress = Math.min(2, (c.assign.progress || 0) + 1); go(ctx2, { stress: -3 }); return 'She grants a short extension and says never to ask twice. You have made some progress.'; } go(ctx2, { stress: 4 }); return 'She shakes her head: "Deadlines are deadlines." You walk away embarrassed.'; } },
            { label: 'Let it go this time', text: 'You decide to accept a lower mark. The Friday evening is yours.', fx: { stress: 2, fun: 3 } }
          ]
        },
        c2 => {
          const left2 = pending(c2);
          return { title: '📬 Received', lines: left2.length ? [`The office has received your work. Still open: ${left2.map(c => `${c.code} (${c.assign.progress}/2)`).join(', ')}. Open assignments earn only partial marks.`] : ['Every assignment is now submitted. Well done.'] };
        }
      ];
    }
  },

  /* ===== faculty week and the departmental dinner (years 2 to 4) ===== */
  {
    id: 'facultyWeek', repeat: true, emoji: '🎭', title: 'Faculty week', short: 'Faculty week', venue: 'auditorium', minutes: 150, fx: { energy: -5, hunger: -8 },
    closing: 'Faculty week leaves you tired, with a good story and a fresh friend or two.',
    active: a => a.year >= 2 && a.term === 1,
    windows: a => [{ day: a.startDay + 2, from: 14, to: 18 }, { day: a.startDay + 3, from: 14, to: 18 }],
    crowd: [npc('mc', 'Faculty MC', 'Master of ceremonies', '🎙️', 0, -6, 0x8e44ad, 'student', 0x5a3a26), npc('s1', 'Uche', 'Senior', '😎', -5.4, -1.4, 0x34495e), npc('s2', 'Bisi', 'Coursemate', '🎒', 5.4, 0.6, 0xff7aa8)],
    beats: ctx => {
      const know = avgKnowledge(ctx.a);
      return [
        { title: '🎭 Faculty week', lines: ['The whole faculty is on the move: banners, a sports tournament, a quiz, an exhibition and a cultural evening. Departments compete for a trophy that sits in the Dean\'s office for a year.'] },
        {
          title: '🏆 This afternoon', lines: ['Which event do you join?'],
          choices: [
            { label: 'Join the department quiz team', text: know >= 40 ? 'You answer three questions right in a row and the crowd shouts. Your department wins the round and the prize goes to the team.' : 'You get two questions right and miss four. The team still has fun and the quizmaster is kind.', fx: { fun: know >= 40 ? 10 : 5, stress: 2 }, give: know >= 40 ? 1500 : undefined, meet: 'faculty-s1' },
            { label: 'Play in the football tournament', text: 'Twenty minutes of sprinting, one very good tackle and a bruised knee. Your department reaches the semi-final.', fx: { fun: 9, energy: -12 } },
            { label: 'Walk round the exhibition', text: 'Posters, models and demonstrations from every department. Someone explains something so well that you take notes.', fx: { fun: 4 }, run: ctx2 => boostAll(ctx2, 1) }
          ]
        },
        {
          title: '🌙 Cultural evening', lines: ['As the sun sets, the cultural night begins: drums, dancers in colourful attire and food stalls.'],
          choices: [
            { label: 'Buy a ticket for the cultural night (₦1,000)', cost: 1000, text: 'The dancers are brilliant. You clap until your palms sting.', poor: 'You do not have the ticket money. You listen from the gate, which is not too bad.', fx: { fun: 12, energy: -4 }, meet: 'faculty-s2' },
            { label: 'Eat at the food stalls (₦500)', cost: 500, text: 'Suya, puff-puff and a cold drink. You eat on a low wall and watch the fun.', poor: 'You count your money twice and just walk about.', fx: { hunger: 22, fun: 5 } },
            { label: 'Go back and rest', text: 'You skip the evening. Sleep is a kind of luxury during the semester.', fx: { energy: 6, stress: -3 } }
          ]
        }
      ];
    }
  },
  {
    id: 'deptDinner', repeat: true, emoji: '🍽️', title: 'Departmental dinner', short: 'Departmental dinner', venue: 'auditorium', minutes: 180, fx: { hunger: 12, energy: -4 },
    closing: 'The department has fed you, honoured you and photographed you more than enough.',
    active: a => a.year >= 2 && a.term === 2,
    windows: a => [{ day: a.startDay + 3, from: 18, to: 22 }],
    crowd: [npc('hod', 'Head of Department', 'HOD', '🎓', 0, -6, 0x1f2a44, 'lecturer', 0x5a3a26), npc('s1', 'Dayo', 'Senior', '😎', -5.4, -1.2, 0x16a085), npc('s2', 'Yetunde', 'Coursemate', '🎒', 5.4, 1.2, 0xe84393)],
    beats: ctx => {
      const a = ctx.a || {};
      return [
        { title: '🍽️ Departmental dinner', lines: ['Round tables, white cloths and the smell of party jollof. The department\'s annual dinner is the one night lecturers and students share the same food.'] },
        {
          title: '🎟️ The ticket', lines: ['Tickets cost ₦3,000, or you can volunteer as an usher.'],
          choices: [
            { label: 'Buy a ticket (₦3,000)', cost: 3000, text: 'The usher shows you to a table near the front and gives you a name card.', poor: 'You cannot afford the ticket. The committee lets you help with seating in exchange for a plate of food.', fx: { fun: 4 } },
            { label: 'Volunteer as an usher', text: 'You wear a badge and show people to their seats. Several lecturers learn your name.', fx: { energy: -4, fun: 2 } }
          ]
        },
        {
          title: '🪑 Where do you sit?', lines: ['The seating plan is flexible. Everyone is watching to see who sits where.'],
          choices: [
            { label: 'With the lecturers', text: 'A lecturer says that the exam questions always follow the lecture notes. You write that down in your head.', fx: { stress: 1 }, prepWeak: 4 },
            { label: 'With your coursemates', text: 'Yetunde tells a story about the worst bus ride of the semester. You laugh until your stomach hurts.', fx: { fun: 8 }, meet: 'dinner-s2' },
            { label: 'With the final-year students', text: 'Dayo shares what he wishes he knew. You collect three useful tips and a free cake.', fx: { fun: 3 }, run: ctx2 => boostAll(ctx2, 2), meet: 'dinner-s1' }
          ]
        },
        c2 => {
          const cg = c2.a?.cgpa;
          if (cg != null && cg >= 4.5) return { title: '🏅 Best student award', lines: ['The HOD reads your name as the best student in your level. The room stands and applauds.', 'You receive a plaque and a prize of ₦5,000.'], fx: { fun: 10, stress: -5 }, give: 5000 };
          if (cg != null && cg >= 3.5) return { title: '📜 Certificate of merit', lines: ['The HOD calls your name for academic merit. You walk to the front, a little shaky, and shake his hand.'], fx: { fun: 6 }, give: 1500 };
          return { title: '👏 The awards', lines: ['The department honours its top students. You clap loudly for friends who earned it, and promise yourself that next year you will be one of them.'], fx: { fun: 2 } };
        }
      ].filter(Boolean);
    }
  },

  /* ===== SIWES (industrial attachment) after year three ===== */
  {
    id: 'siwes', repeat: true, emoji: '🏭', title: 'SIWES industrial attachment', short: 'SIWES attachment', venue: 'class', minutes: 4 * 1440, noDrain: true, fx: { hunger: -20, energy: -18, fun: -6 },
    closing: a => `Your attachment is over. ${a?.siwes ? `The report: ${siwesTier(a.siwes.pts).title}.` : ''} The next semester begins soon.`,
    active: a => a.year === 3 && a.term === 2 && resultsOut(a),
    windows: a => [{ day: a.startDay + 6, from: 8, to: 22 }],
    crowd: [npc('coord', 'Dr. Bello', 'SIWES coordinator', '🧑🏾‍🏫', 3.4, -4.2, 0x2c3e50, 'lecturer', 0x5a3a26), npc('c1', 'Tosin', 'Coursemate', '🎒', -5.2, 2.5, 0xf1c40f), npc('c2', 'Chioma', 'Coursemate', '🎒', 5.2, 2.5, 0xe74c3c)],
    beats: ctx => [
      { title: '🏭 Placement letters', lines: ['The SIWES coordinator hands out placement letters. Industrial attachment is compulsory: a short stay at a real workplace, with a logbook that your supervisor signs.', 'It lasts several days in the game, and the break is stretched so that you return before the new session begins.'], run: ctx2 => { if (ctx2.a) ctx2.a.breakUntil = Math.max(ctx2.a.breakUntil || 0, (ctx2.day || ctx2.a.startDay + 6) + 5); } },
      {
        title: '📍 Where will you work?', lines: ['The coordinator offers three placements in the city.'],
        choices: [
          { label: 'A busy company', text: 'Busy, fast and demanding. You will learn a lot if you keep up.', fx: { stress: 2 }, run: ctx2 => addPts(ctx2, 'pts', 1) },
          { label: 'A government office', text: 'Steady and slow. Your supervisor is kind and the work is dull.', fx: {}, run: ctx2 => addPts(ctx2, 'pts', 1) },
          { label: 'A small start-up', text: 'Three people, one table. You will be given real responsibility on the first day.', fx: { stress: 1 }, run: ctx2 => addPts(ctx2, 'pts', 2) }
        ]
      },
      {
        title: '🌅 First morning', lines: ['The supervisor expects you at 8:00. The road is crowded.'],
        choices: [
          { label: 'Arrive an hour early', text: 'The gateman is still opening up. The supervisor notices your punctuality and writes it in the logbook.', fx: { energy: -3 }, run: ctx2 => addPts(ctx2, 'pts', 2) },
          { label: 'Arrive on time', text: 'You walk in as the clock strikes eight. Nobody says anything, which is good.', fx: {}, run: ctx2 => addPts(ctx2, 'pts', 1) },
          { label: 'Arrive late', text: 'You apologise about the traffic. The supervisor smiles thinly: "Traffic is not new here."', fx: { stress: 4 }, run: ctx2 => addPts(ctx2, 'pts', 0) }
        ]
      },
      {
        title: '🛠️ A real task', lines: ['Your supervisor gives you a task connected to your course. Nobody will check it before it goes out.'],
        choices: [
          { label: 'Ask questions, then do it carefully', text: 'It takes longer, but the result is solid. The supervisor says, "Good, you asked."', fx: { energy: -4 }, run: ctx2 => addPts(ctx2, 'pts', 2) },
          { label: 'Work fast to finish early', text: 'You finish quickly. There are two small mistakes, which you hope no one finds.', fx: {}, run: ctx2 => addPts(ctx2, 'pts', 1) },
          { label: 'Copy the format of an older file', text: 'You change a few details. It does the job, but it is not your work.', fx: { stress: 1 }, run: ctx2 => addPts(ctx2, 'pts', 0) }
        ]
      },
      {
        title: '😬 A mistake', lines: ['On the third day, a figure you entered is wrong. A colleague spots it before the client does.'],
        choices: [
          { label: 'Own up and fix it', text: 'You explain what happened and correct it quickly. The supervisor values honesty more than perfection.', fx: { stress: 2 }, run: ctx2 => addPts(ctx2, 'pts', 2) },
          { label: 'Fix it quietly', text: 'You fix the figure before anyone asks. Nothing breaks, but you tell nobody.', fx: {}, run: ctx2 => addPts(ctx2, 'pts', 1) },
          { label: 'Say it was the template\'s fault', text: 'The supervisor looks at the template and then at you. The logbook note is short.', fx: { stress: 4 }, run: ctx2 => addPts(ctx2, 'pts', -1) }
        ]
      },
      c2 => {
        const pts = c2.flags.pts || 0;
        const t = siwesTier(pts);
        if (c2.a) c2.a.siwes = { pts, tier: t.id };
        return { title: t.title, lines: ['On the last day the supervisor signs your logbook and writes a short assessment.', `Your points for punctuality, work and honesty: ${pts}.`, `You receive a transport and feeding allowance of ${naira(t.stipend)}.`], fx: { fun: pts >= 5 ? 6 : 1, stress: pts >= 5 ? -4 : 2 }, give: t.stipend };
      }
    ]
  },

  /* ===== the final-year project ===== */
  {
    id: 'projectTopic', repeat: true, emoji: '🔬', title: 'Project topic and supervisor', short: 'Project topic', venue: 'class', minutes: 90, fx: { energy: -3 },
    closing: 'Your project is registered. Your supervisor expects regular progress reports.',
    active: a => isFinalYear(a) && a.term === 1,
    windows: a => [{ day: a.startDay + 1, from: 14, to: 17 }, { day: a.startDay + 2, from: 14, to: 17 }],
    crowd: [npc('sup', 'Prof. Nwosu', 'Project supervisor', '🧑🏾‍🏫', 3.4, -4.2, 0x2c3e50, 'lecturer', 0x5a3a26), npc('c1', 'Kelechi', 'Coursemate', '🎒', -6, 1.4, 0x3498db), npc('c2', 'Amina', 'Coursemate', '🎒', 6, 1.4, 0xff7aa8)],
    beats: ctx => [
      { title: '🔬 Final-year project', lines: [`Every ${ctx.courseName || 'final-year'} student must complete a project and defend it before a panel. It is read by the department, so choose carefully.`, 'Prof. Nwosu sits behind a pile of proposals and asks, "What do you want to study?"'] },
      {
        title: '💡 Your topic', lines: ['You have three ideas on your phone.'],
        choices: [
          { label: 'An ambitious topic', text: 'Prof. Nwosu raises an eyebrow and says, "Bold. Do you have the time?" You leave with a long reading list.', fx: { stress: 4 }, run: ctx2 => { addPts(ctx2, 'effort', 1); if (ctx2.a) ctx2.a.project = { approach: 'ambitious', effort: 1 }; } },
          { label: 'A practical local problem', text: 'The supervisor smiles. "A real problem, with real data. Good." You will visit people and collect evidence.', fx: { stress: 1 }, run: ctx2 => { addPts(ctx2, 'effort', 2); if (ctx2.a) ctx2.a.project = { approach: 'practical', effort: 2 }; } },
          { label: 'The supervisor\'s suggested topic', text: 'Safe and clear. The supervisor already has a framework you can follow.', fx: { stress: -2 }, run: ctx2 => { addPts(ctx2, 'effort', 1); if (ctx2.a) ctx2.a.project = { approach: 'suggested', effort: 1 }; } }
        ]
      },
      {
        title: '📅 How will you work?', lines: ['The supervisor asks how you will manage your time.'],
        choices: [
          { label: 'Meet every week and write as you go', text: 'You promise a short chapter every fortnight. It is a heavy promise, but a good one.', fx: { stress: 2 }, run: ctx2 => { if (ctx2.a?.project) ctx2.a.project.effort += 2; } },
          { label: 'Research now, write later', text: 'You plan to read for a month and write in a rush. Prof. Nwosu looks doubtful.', fx: {}, run: ctx2 => { if (ctx2.a?.project) ctx2.a.project.effort += 1; } },
          { label: 'Leave it until second semester', text: 'The supervisor sighs: "Please do not." You smile weakly.', fx: { stress: -2 }, run: ctx2 => { if (ctx2.a?.project) ctx2.a.project.effort += 0; } }
        ]
      }
    ]
  },
  {
    id: 'projectDefence', repeat: true, emoji: '🎤', title: 'Project defence', short: 'Project defence', venue: 'class', minutes: 150, fx: { energy: -8, hunger: -8 },
    closing: a => `The panel has spoken. ${a?.project?.result ? defenceTier(a.project.score ?? 0).title : ''}`,
    active: a => isFinalYear(a) && a.term === 2,
    windows: a => [{ day: a.startDay + 4, from: 10, to: 15 }],
    crowd: [npc('p1', 'Prof. Nwosu', 'Panel chair', '🧑🏾‍🏫', 0, -4.6, 0x2c3e50, 'lecturer', 0x5a3a26), npc('p2', 'Dr. Bello', 'External examiner', '🧑🏾‍🏫', 3.6, -4.2, 0x7a2f22, 'lecturer', 0x5a3a26), npc('c1', 'Tosin', 'Coursemate', '🎒', -5.2, 2.5, 0xf1c40f)],
    beats: ctx => [
      { title: '🎤 Defence day', lines: ['The panel table is covered in green cloth. Your bound copies sit in front of the examiners, with tabs on the pages they will ask about.', ctx.a?.project ? `You chose the ${ctx.a.project.approach} route for your project.` : 'You have a draft, whatever its state.'] },
      {
        title: '🧪 Before you go in', lines: ['A few minutes remain. How do you prepare?'],
        choices: [
          { label: 'Rehearse aloud with Tosin', text: 'Tosin asks tough questions and you stumble on two. Better now than in front of the panel.', fx: { energy: -2 }, run: ctx2 => addPts(ctx2, 'rehearsal', 2), meet: 'defence-c1' },
          { label: 'Rehearse alone, quietly', text: 'You run through the slides in your head and time yourself.', fx: {}, run: ctx2 => addPts(ctx2, 'rehearsal', 1) },
          { label: 'Walk outside and breathe', text: 'You do nothing but breathe. Your hands stop shaking.', fx: { stress: -5 }, run: ctx2 => addPts(ctx2, 'rehearsal', 0) }
        ]
      },
      {
        title: '❓ A tough question', lines: ['Dr. Bello leans forward: "What are the limitations of your study, and what would you do differently?"'],
        choices: [
          { label: 'Answer honestly, including the weak points', text: 'You list the limits plainly and say what you would improve. The examiner nods slowly.', fx: { stress: 2 }, run: ctx2 => addPts(ctx2, 'answers', 2) },
          { label: 'Point to your data and results', text: 'You return to the tables and charts. It is a solid answer, if a little narrow.', fx: {}, run: ctx2 => addPts(ctx2, 'answers', 2) },
          { label: 'Bluff confidently', text: 'You speak smoothly and say nothing.', fx: { stress: 2 }, run: ctx2 => { if (ctx2.roll('bluff') < 0.5) { addPts(ctx2, 'answers', -2); return 'The examiner asks one follow-up question and the silence is long.'; } addPts(ctx2, 'answers', 1); return 'It works this time, but you are lucky.'; } }
        ]
      },
      c2 => {
        const a = c2.a;
        const score = defenceScore({ effort: a?.project?.effort || 0, rehearsal: c2.flags.rehearsal || 0, answers: c2.flags.answers || 0, cgpa: a?.cgpa ?? 2.5, avgKnowledge: avgKnowledge(a) });
        const t = defenceTier(score);
        if (a) a.project = { ...(a.project || {}), result: t.id, score };
        return { title: t.title, lines: ['The panel confers outside, and you wait. Then the door opens.', t.id === 'distinction' ? 'The chair says, "This is some of the best work we have seen this year." You receive a departmental prize of ₦5,000.' : t.id === 'pass' ? 'The chair says you have passed. A few corrections to the formatting, and you will submit the final copy.' : t.id === 'major' ? 'You pass, with serious corrections to make before the final submission. It is a lot, but it is yours to fix.' : 'The panel asks you to defend again next week. It is not a failure: many students need a second try, and it is a chance to be better prepared.'], fx: t.fx, give: t.give || undefined };
      }
    ]
  }
];

/* ---------------- convocation (played by scenes.convocation() before the story card) ---------------- */

export const CONVOCATION = {
  id: 'convocation', emoji: '🎓', title: 'Convocation', short: 'Convocation', venue: 'auditorium', minutes: 240, fx: { energy: -8, hunger: -6 }, crowd: [],
  beats: ctx => {
    const a = ctx.a || {};
    const cgpa = a.cgpa ?? 2.5;
    const klass = degreeClass(cgpa);
    return [
      {
        title: '🎓 Gown day', lines: ['The convocation grounds are covered with people in black gowns and coloured hoods. Parents hold flowers and balloons.'],
        choices: [
          { label: 'Hire a gown (₦2,500)', cost: 2500, text: 'The gown fits well and the hood is a bright colour. You look like a graduate.', poor: 'You cannot afford a hire. A senior lends you her gown. It is a bit long, and you do not mind.', fx: { fun: 4 } },
          { label: 'Borrow a gown from a coursemate', text: 'It is a size too big, and you hold it up as you walk, but you are in the right colours.', fx: { fun: 2 } }
        ]
      },
      { title: '🥁 The procession', lines: ['The band plays, the Vice-Chancellor and the senate lead the way, and the graduating class walks in rows.', 'You pass the hostels, the library and the lecture halls where you sat, studied and worried.'], fx: { fun: 3 } },
      { title: '📣 Your name is called', lines: [`"${ctx.name || 'Graduand'}, ${ctx.courseName || 'your course'}."`, `${klass} · CGPA ${cgpa.toFixed(2)}`, cgpa >= 4.5 ? 'The hall rises for the First Class graduates.' : cgpa >= 3.5 ? 'A warm applause follows you across the stage.' : 'Your family\'s cheers ring above everyone else\'s.'], fx: { fun: cgpa >= 3.5 ? 10 : 6, stress: -8 } },
      {
        title: '📸 With Mama and Tobi', lines: ['Mama is crying and smiling at the same time. Tobi is wearing a tie that is too big and waving a paper flag.'],
        choices: [
          { label: 'Hug Mama first', text: 'Mama holds you for a long time. "I knew you could do it," she says into your gown.', fx: { fun: 8, stress: -6 } },
          { label: 'Lift Tobi on your shoulders', text: 'Tobi shouts, "My brother is a graduate!" Everyone nearby turns to look and then clap.', fx: { fun: 10 } },
          { label: 'Take a family photo', text: 'A photographer arranges you all in front of the banner. Mama keeps closing her eyes, so you take it four times.', fx: { fun: 6 } }
        ]
      },
      { title: '🧢 Caps in the air', lines: ['At the end of the ceremony, every graduate throws their cap into the air. For a second, the sky is black with them.', 'You catch someone else\'s. It does not matter.'], fx: { fun: 6 } }
    ];
  }
};

/* ---------------- the visit home (played by src/homevisit.js) ---------------- */

export const HOME_SCENES = {
  christmas: {
    id: 'homeChristmas', emoji: '🎄', title: 'Christmas at home', short: 'Christmas at home', venue: 'home', minutes: 0, fx: {}, crowd: [],
    beats: ctx => {
      const tier = ctx.a ? resultTier(lastResult(ctx.a).gpa) : resultTier(3);
      return [
        { title: '🏠 Home for the holidays', lines: [`The road is long, but when the gate opens, Mama is already at the door. The house smells of pepper, onions and frying plantain.`, 'Tobi runs out in socks and nearly knocks you over.'] , fx: { stress: -6, fun: 4 } },
        {
          title: '🎁 Tobi\'s gift', lines: ['Tobi wants to know what you brought from school.'],
          choices: [
            { label: 'A small toy car (₦1,500)', cost: 1500, text: 'He races it around the sitting room until bedtime and makes engine noises with every turn.', poor: 'You cannot afford a toy. You draw him a campus map and tell him about the bus.', fx: { fun: 6 } },
            { label: 'Stories and a campus tour on your phone', text: 'Tobi wants to see the lecture halls and the canteen. "Can I come to your school?" he asks.', fx: { fun: 5 } },
            { label: 'Help him with his homework', text: 'You explain fractions with pieces of bread. He understands them and eats the proof.', fx: { fun: 4, stress: -2 } }
          ]
        },
        {
          title: '🍛 The festive dinner', lines: ['The whole family sits for a long dinner: jollof rice, fried chicken, moi moi, salad and zobo. Mama prays over the food.'],
          choices: [
            { label: 'Help Mama in the kitchen', text: 'You stir, chop and taste. Mama pretends she is not impressed, but she keeps smiling.', fx: { fun: 5, stress: -3 }, minutes: 0 },
            { label: 'Set the table with Tobi', text: 'He lines up the spoons with great seriousness and one plate gets a crown of carrots.', fx: { fun: 6 } },
            { label: 'Visit the neighbours with a plate', text: 'You carry food to Aunty Sade next door. She presses coins into your hand and says you have grown.', fx: { fun: 4 }, give: 500 }
          ]
        },
        { title: '💬 Mama asks about school', lines: ['After dinner, Mama asks quietly how things are going.', MUM_REPLY[tier.id]], fx: { stress: -6 }, run: ctx2 => { if (tier.mum) ctx2.give(tier.mum); } },
        { title: '🌃 A quiet night', lines: ['Fireworks pop in the distance. You sleep in your old bed, under your old poster. The generator hums and the house is peaceful.'], fx: { energy: 20, hunger: 30, stress: -10 } }
      ];
    }
  },
  harvest: {
    id: 'homeHarvest', emoji: '🍠', title: 'A harvest weekend at home', short: 'Harvest weekend', venue: 'home', minutes: 0, fx: {}, crowd: [],
    beats: ctx => {
      const tier = ctx.a ? resultTier(lastResult(ctx.a).gpa) : resultTier(3);
      return [
        { title: '🍠 Harvest time', lines: ['The new yams have arrived and the market stalls are stacked with them. The road home was quiet, and the town feels slow and sunny.', 'Mama hugs you and then hands you a basket without a word.'], fx: { stress: -5, fun: 3 } },
        {
          title: '🧺 At the market', lines: ['Mama and Tobi want help carrying the yams and vegetables from the market stalls.'],
          choices: [
            { label: 'Carry the heavy basket', text: 'The basket is heavier than a bag of textbooks, but you feel proud. Mama says your shoulders are getting strong.', fx: { energy: -8, fun: 3 } },
            { label: 'Bargain with the seller', text: 'You say the price is too high five times in five different tones. You save ₦300 and the seller laughs.', fx: { fun: 5 }, give: 300 },
            { label: 'Walk Tobi round the stalls', text: 'Tobi buys groundnuts with his own coins and shares them with you. You feel like the older brother.', fx: { fun: 5 } }
          ]
        },
        { title: '🍲 Pounded yam and soup', lines: ['That evening, the whole family gathers: pounded yam, egusi soup and fresh fish. Tobi tries to cut a swallow that is too big.', MUM_REPLY[tier.id]], fx: { hunger: 30, fun: 5, stress: -4 }, run: ctx2 => { if (tier.mum) ctx2.give(tier.mum); } },
        {
          title: '🗣️ A quiet word with Mama', lines: ['She walks with you to the back of the house. The stars are bright.', '"What do you want to do after all this?" she asks.'],
          choices: [
            { label: 'Talk about your plans after graduation', text: 'Mama listens without interrupting. "Whatever you choose, do it well," she says.', fx: { stress: -5, fun: 3 } },
            { label: 'Say you are tired but you will keep going', text: 'Mama gives you a long hug. "Rest while you are here. Then go back and finish."', fx: { stress: -8 } },
            { label: 'Ask for her old stories', text: 'She tells you how she walked to school barefoot in the dry season. Tobi falls asleep halfway through.', fx: { fun: 6, stress: -3 } }
          ]
        },
        { title: '🎒 Packing', lines: ['At dawn, Mama packs rice, beans, garri and a tin of groundnut oil into your bag. "Do not eat badly," she says.', 'Tobi hides a toy in your pocket as a goodbye present.'], fx: { energy: 18, hunger: 25, stress: -6 } }
      ];
    }
  }
};
