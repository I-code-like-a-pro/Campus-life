import { showModal } from './modal.js';
import { CLUBS, clubSchedule, CLUB_DUES, MAX_CLUBS } from './social.js';
import { hash01 } from './eventengine.js';
import { seedOf } from './clearance.js';
import { matricPages, MATRIC_FX } from './campuslife-events.js';
import { ACADEMIC_SCENES } from './scenes-academic.js';

/*
 * Scenes: story events that happen at a real place and a real time. The player is told when and where, can walk there and
 * attend, or skip it. Skipping is a genuine choice (a lecture may clash, or the player may be tired); it simply means the
 * moment passes. Pure scheduling rules are exported for tests; createScenes() wires them to the game.
 *
 * State lives in state.academic.scenes[id] = { notified: day, status: 'attended' | 'missed' }.
 */

const pad = n => String(n).padStart(2, '0');
export const clock = h => `${pad(Math.floor(h))}:${pad(Math.round((h % 1) * 60))}`;

/** `windows(a)` lists { day, from, to } (hours). `venue` is 'auditorium' (the main hall) or 'hostel' (the player's own hall). */

/* ---- club fair helpers: two rounds of "visit a stall, then decide whether to join" ---- */
const PITCH = {
  debate: 'The president argues that you should join before you can finish saying "no". You admire the confidence.',
  drama: 'Members in costume act out a scene about a lost phone charger. It is surprisingly moving.',
  tech: 'A laptop sticker wall and a robot arm that waves at passers-by. They promise real projects, and real bugs.',
  enterprise: 'A table of branded notebooks and a sign that says "Start small, think big". The mentor offers you a handshake and a business card.',
  football: 'Boots hang from the stall frame. The captain says training is twice a week and the pitch is free.'
};
const stallBeat = round => ctx => {
  const seen = ctx.flags.seen || (ctx.flags.seen = []);
  const left = ctx.clubs.filter(c => !seen.includes(c.id));
  if (ctx.flags.stop || !left.length) return null;
  return {
    title: round === 1 ? '🎪 The stalls' : '🎪 Another stall',
    lines: [round === 1 ? 'Tables line the hall, each with banners, flyers and a volunteer shouting over the drums.' : 'You still have time for another stall.'],
    choices: [
      ...left.map(c => ({ label: `${c.icon} ${c.name}`, text: PITCH[c.id], fx: { fun: 2 }, pick: c.id })),
      { label: 'Skip the rest and grab snacks', text: 'You collect a free flyer, a sachet of water and a meat pie. The pie is the best offer in the hall.', fx: { hunger: 10, fun: 2 }, flag: 'stop' }
    ]
  };
};
const joinBeat = ctx => {
  const id = ctx.flags.pick;
  if (!id) return null;
  delete ctx.flags.pick;
  const c = ctx.clubs.find(x => x.id === id);
  const why = ctx.canJoin(id);
  return {
    title: `${c.icon} ${c.name}`,
    lines: [`The president slides a form across the table. Dues are ₦${ctx.clubDues} and meetings are ${c.schedule}.`, ...(why ? [why] : [])],
    choices: why
      ? [{ label: 'Take a flyer and move on', text: 'You fold the flyer into your pocket for later.', fx: {} }]
      : [
        { label: `Join the ${c.name} (₦${ctx.clubDues})`, cost: ctx.clubDues, join: id, text: `Welcome to the ${c.name}! Your first meeting is ${c.schedule}.`, poor: 'You do not have the dues today. The president says you are welcome any time.', fx: { fun: 4 } },
        { label: 'Not today', text: 'The president says the door is always open, and hands you a flyer anyway.', fx: {} }
      ]
  };
};

const entryKey = t => `${t.day}|${t.hour}|${t.code}`;
/** The first class on the timetable (earliest day and hour that is not cancelled). */
export const firstEntry = a => [...(a?.timetable || [])].filter(t => !t.cancelled).sort((x, y) => x.day - y.day || x.hour - y.hour)[0] || null;

export const SCENES = [
  {
    id: 'orientation', emoji: '🧭', title: "Freshers' orientation", short: 'Orientation briefing',
    venue: 'auditorium', minutes: 150, fx: { fun: 6, stress: -3, hunger: -6 },
    windows: a => [{ day: a.startDay, from: 10, to: 13 }],
    crowd: [
      { id: 'dean', name: 'Dean of Student Affairs', role: 'Dean', emoji: '🎤', dx: 0, dz: -6.2, shirt: 0x1f2a44, skin: 0x5a3a26, dialogue: 'dean' },
      { id: 'f1', name: 'Chinedu', role: 'Fresher', emoji: '🎒', dx: -5.4, dz: -1.6, shirt: 0xe67e22, dialogue: 'student' },
      { id: 'f2', name: 'Halima', role: 'Fresher', emoji: '🎒', dx: 5.4, dz: 0.8, shirt: 0x8e44ad, dialogue: 'student' }
    ],
    beats: ctx => [
      { title: "🧭 Freshers' orientation", lines: [`The Dean of Student Affairs welcomes the new set to ${ctx.campusName}.`, `Hundreds of freshers fill the hall. ${ctx.courseName} students are sitting in the middle rows.`] },
      { title: '📜 The rules of the university', lines: ['Attendance matters: miss too many lectures and your marks suffer.', 'Exam malpractice is punished severely. Plagiarism is too.', 'Respect staff, keep to the dress code, and look after the hostel you are given.'] },
      {
        title: '🙋 Questions from the floor', lines: ['The Dean asks if anyone has a question. A hundred freshers suddenly find their shoes interesting.'],
        choices: [
          { label: 'Ask how tests and exams work', text: ctx.rhythm || 'The Dean explains that every semester runs on a weekly rhythm of assignments, CA tests and exams.', fx: { stress: -3 } },
          { label: 'Ask about hostel rules', text: 'The Dean says the hall porter keeps order, noise after ten at night earns a warning, and cooking with heaters is banned.', fx: { stress: -2 } },
          { label: 'Ask about scholarships', text: 'The Dean says a student with a GPA of 4.50 or higher receives a bursary award at the end of the year.', fx: { fun: 2 } },
          { label: 'Stay quiet and listen', text: 'You decide to listen and watch. Someone else asks about parking, even though freshers cannot bring cars.', fx: {} }
        ]
      },
      {
        title: '☕ Break', lines: ['The hall breaks for a few minutes. Freshers turn to the people beside them.'],
        choices: [
          { label: 'Say hello to the fresher beside you', text: 'Chinedu says he is also new here and has already lost his way twice. You promise to compare timetables.', fx: { fun: 3 }, meet: 'orientation-f1' },
          { label: 'Stay on your phone', text: 'You scroll through messages. A text from home asks if you have eaten.', fx: {} }
        ]
      }
    ]
  },
  {
    id: 'hallmeet', emoji: '🛏️', title: 'Hall meeting', short: 'Hall meeting',
    venue: 'hostel', minutes: 90, fx: { energy: -3, fun: 3 },
    windows: a => [{ day: a.startDay, from: 17, to: 19.5 }, { day: a.startDay + 1, from: 17, to: 19.5 }],
    crowd: [
      { id: 'chair', name: 'Hall Chairman', role: 'Hall chairman', emoji: '🪑', dx: 0, dz: -2.5, shirt: 0x34495e, skin: 0x5a3a26, dialogue: 'student' },
      { id: 'mate', name: 'Dami', role: 'Hall mate', emoji: '🎒', dx: -4, dz: 1.5, shirt: 0x27ae60, dialogue: 'student' }
    ],
    beats: ctx => [
      { title: '🛏️ Hall meeting', lines: [`The chairman of ${ctx.hostelName} calls everyone to the common space.`, 'People arrive slowly, sit on beds and boxes, and pretend they did not hear the first call.'] },
      { title: '📋 Hall rules', lines: ['Visitors must leave by nine in the evening.', 'Light bulbs are not to be left on while the room is empty.', 'When the water runs out, the hall tank is shared fairly, not secretly.'] },
      {
        title: '💰 Hall dues', lines: ['The treasurer announces the hall dues: ₦1,000 each, for the generator fund and general repairs.'],
        choices: [
          { label: 'Pay the ₦1,000 dues now', cost: 1000, text: 'The treasurer ticks your name and says you are a model resident.', poor: 'You do not have the money right now. The treasurer writes your name in a very small notebook.', fx: { stress: -2, fun: 2 } },
          { label: 'Say you will pay later', text: 'The treasurer writes your name in a very small notebook. Everyone saw.', fx: { stress: 2 } }
        ]
      },
      {
        title: '👋 Meet the hall', lines: ['The chairman asks new residents to stand and introduce themselves.'],
        choices: [
          { label: 'Stand and introduce yourself', text: 'Your voice cracks on the word "Computer". The hall laughs kindly and a few people wave.', fx: { fun: 5, stress: -2 }, meet: 'hallmeet-chair' },
          { label: 'Stay seated and nod', text: 'You nod politely. The chairman pretends not to notice.', fx: {} }
        ]
      }
    ]
  },
  {
    id: 'matric', emoji: '🎩', title: 'Matriculation', short: 'Matriculation ceremony',
    venue: 'auditorium', minutes: 120, fx: {}, matric: true,
    windows: a => [{ day: a.startDay + 1, from: 10, to: 13 }, { day: a.startDay + 2, from: 10, to: 13 }],
    crowd: [
      { id: 'registrar', name: 'The Registrar', role: 'Registrar', emoji: '📜', dx: 0, dz: -6.2, shirt: 0x7a2f22, skin: 0x5a3a26, dialogue: 'registrar' },
      { id: 'f1', name: 'Emeka', role: 'Fresher', emoji: '🎒', dx: -5.4, dz: -1.6, shirt: 0xecf0f1, dialogue: 'student' },
      { id: 'f2', name: 'Ngozi', role: 'Fresher', emoji: '🎒', dx: 5.4, dz: 0.8, shirt: 0xecf0f1, dialogue: 'student' }
    ],
    beats: ctx => {
      const pages = matricPages({ name: ctx.name, campus: ctx.campusName, course: ctx.courseName });
      return [
        { title: pages[0].title, lines: pages[0].lines },
        {
          title: '💺 Where will you sit?', lines: ['The ushers point out rows. Parents and photographers crowd the aisle.'],
          choices: [
            { label: 'The front row, near the stage', text: 'The Vice-Chancellor looks straight at you and nods. You sit up very straight.', fx: { stress: 2, fun: 4 } },
            { label: 'The middle, beside Emeka', text: 'Emeka whispers that his gown itches. You both try not to laugh.', fx: { fun: 4 }, meet: 'matric-f1' },
            { label: 'The back, near the door', text: 'You have a good view of everyone fanning themselves with their programmes.', fx: { fun: 1 } }
          ]
        },
        { title: pages[1].title, lines: pages[1].lines },
        {
          title: pages[2].title, lines: pages[2].lines,
          choices: [
            { label: 'Buy a printed photo (₦1,500)', cost: 1500, text: 'The photographer hands you a glossy print. It goes straight into your file.', poor: 'You cannot afford the print today. The photographer promises to keep your picture for later.', fx: { fun: 5 } },
            { label: 'Take a free photo with your phone', text: 'A friend in a gown takes it for you. It is slightly blurred but you look happy.', fx: { fun: 2 } }
          ]
        }
      ];
    }
  },
  {
    id: 'courseReg', emoji: '📝', title: 'Course registration', short: 'Course registration',
    venue: 'class', minutes: 90, fx: { energy: -4, hunger: -5 }, missFx: { stress: 3 },
    windows: a => [{ day: a.startDay, from: 14, to: 17.5 }, { day: a.startDay + 1, from: 14, to: 17.5 }],
    crowd: [
      { id: 'officer', name: 'Mrs. Obi', role: 'Department officer', emoji: '🗂️', dx: -3.6, dz: -4.4, shirt: 0x8e44ad, skin: 0x5a3a26, dialogue: 'deptofficer' },
      { id: 'f1', name: 'Kelechi', role: 'Fresher', emoji: '🎒', dx: -6, dz: 1.4, shirt: 0x3498db, dialogue: 'student' },
      { id: 'f2', name: 'Amina', role: 'Fresher', emoji: '🎒', dx: 6, dz: 1.4, shirt: 0xff7aa8, dialogue: 'student' }
    ],
    beats: ctx => [
      { title: '📝 Course registration', lines: ['The department office is full of freshers holding forms and photocopies.', `Mrs. Obi, the department officer, calls out names. ${ctx.courseName} students are told to form a line along the wall.`] },
      { title: '📋 Your course form', lines: ['This semester you register for:', ...ctx.courses] },
      {
        title: '🧍 The queue', lines: ['The line is long and the hall is warm. A senior student offers to carry your form to the front.'],
        choices: [
          { label: 'Join the queue and wait', text: 'An hour later you reach the front. Your feet hurt but your conscience is clear.', fx: { stress: 3, energy: -3 } },
          { label: 'Pay the senior ₦500 to fast-track', cost: 500, text: 'The senior walks you past the line. A few people mutter, but it is done in minutes.', poor: 'You cannot afford it right now, so you join the queue and wait.', fx: { stress: -1 } }
        ]
      },
      {
        title: '🧑🏾‍🏫 The level adviser', lines: ['The level adviser has five minutes for each student. What do you want to ask?'],
        choices: [
          { label: 'Which course needs the most work?', text: `The adviser says to look at your lowest scores early. ${ctx.weakest ? `For you, that may be ${ctx.weakest}.` : 'Start reading before the tests come.'}`, fx: { stress: -2 } },
          { label: 'What is a carryover?', text: 'A carryover is a course you failed and must retake. Keep your attendance up and do not leave everything for the exam.', fx: { stress: -2 } },
          { label: 'Where do I find past questions?', text: 'The Business Centre sells handouts and past questions. They help, but they do not replace lectures.', fx: { fun: 1 } }
        ]
      },
      { title: '🖋️ Signed and stamped', lines: ['Your form is signed, stamped and filed. You are registered for the semester.', 'You walk out holding the stamped copy like a trophy.'] }
    ],
    onAttend: ctx => ctx.setRegistered()
  },
  {
    id: 'firstLecture', emoji: '🎓', title: 'Your first lecture', short: 'First lecture',
    venue: 'class', minutes: 105, fx: { energy: -7, hunger: -8, stress: 2 },
    windows: a => { const t = firstEntry(a); return t ? [{ day: a.startDay + t.day - 1, from: t.hour - 0.25, to: t.hour + 1 }] : []; },
    done: a => { const t = firstEntry(a); return !!t && !!a.attended?.[entryKey(t)]; },
    crowd: [
      { id: 'c1', name: 'Tosin', role: 'Coursemate', emoji: '🎒', dx: -5.2, dz: 2.5, shirt: 0xf1c40f, dialogue: 'student' },
      { id: 'c2', name: 'Ibrahim', role: 'Coursemate', emoji: '🎒', dx: 5.2, dz: 2.5, shirt: 0x2ecc71, dialogue: 'student' },
      { id: 'c3', name: 'Chioma', role: 'Coursemate', emoji: '🎒', dx: -5.2, dz: 5.2, shirt: 0xe74c3c, dialogue: 'student' }
    ],
    beats: ctx => [
      { title: `🎓 ${ctx.first.code}: ${ctx.first.title}`, lines: ['The hall fills slowly. Some people arrive with notebooks, some with only a pen, and one person with a laptop and no charger.', 'The lecturer walks in and the room goes quiet.'] },
      {
        title: '💺 Where will you sit?', lines: ['Lecturers remember the front rows. Friends sit at the back.'],
        choices: [
          { label: 'The front row', text: 'You can see every word on the board. The lecturer notices you and nods.', fx: { stress: 2 }, prep: 3 },
          { label: 'The middle, beside Tosin', text: 'Tosin shares a spare pen and a very short summary of the course.', fx: { fun: 2 }, prep: 1, meet: 'firstlecture-c1' },
          { label: 'The back, near the door', text: 'You are the first one out later. You also miss half of what is said.', fx: {} }
        ]
      },
      { title: '📖 The course outline', lines: [`The lecturer introduces ${ctx.first.code} and lists what the semester will cover.`, 'Assignments are due on Fridays, and attendance counts towards your final mark.'] },
      {
        title: '🙋 A question to the room', lines: ['The lecturer asks a warm-up question to see who is paying attention.'], quiz: ctx.warmup,
        right: 'You answered correctly. The lecturer smiles and writes your name down as someone to remember.', rightFx: { fun: 3, stress: -2 }, rightPrep: 3,
        wrong: 'Not quite. The lecturer explains the answer kindly, and the room laughs with you, not at you.', wrongFx: { stress: 2 }
      },
      {
        title: '✍️ Notes', lines: ['The lecturer starts the first topic. How do you want to follow it?'],
        choices: [
          { label: 'Write careful notes', text: 'Your hand aches, but the page is full and neat.', fx: { energy: -3 }, prep: 4 },
          { label: 'Mostly listen', text: 'You follow the main ideas and ask a question at the end.', fx: {}, prep: 2 },
          { label: 'Take photos of the board', text: 'Quick, but the photos are blurry and you do not retain much.', fx: {}, prep: 1 }
        ]
      }
    ],
    onAttend: ctx => ctx.attendFirstLecture()
  },
  {
    id: 'clubfair', emoji: '🎪', title: 'Club fair', short: 'Club fair',
    venue: 'auditorium', minutes: 105, fx: { energy: -3, hunger: -4 },
    windows: a => [{ day: a.startDay + 1, from: 14, to: 17 }, { day: a.startDay + 3, from: 14, to: 17 }],
    crowd: [
      { id: 'pres', name: 'Club President', role: 'Club president', emoji: '📣', dx: 0, dz: -4.6, shirt: 0xe67e22, skin: 0x5a3a26, dialogue: 'student' },
      { id: 's1', name: 'Dayo', role: 'Senior', emoji: '😎', dx: -5.4, dz: -1.2, shirt: 0x16a085, dialogue: 'student' },
      { id: 's2', name: 'Yetunde', role: 'Fresher', emoji: '🎒', dx: 5.4, dz: 1.2, shirt: 0xe84393, dialogue: 'student' }
    ],
    beats: ctx => [
      { title: '🎪 The club fair', lines: [`Every club on campus has set up a stall in the main hall at ${ctx.campusName}. Drums, flyers, banners and volunteers who will not take no for an answer.`, `You may join up to ${ctx.maxClubs} clubs. Meetings are in the evening and dues are ₦${ctx.clubDues} each.`] },
      stallBeat(1), joinBeat, stallBeat(2), joinBeat
    ]
  },
  {
    id: 'firstCA', emoji: '📝', title: 'Your first CA test', short: 'First CA test',
    venue: 'class', minutes: 0, fx: {},
    windows: a => [{ day: a.startDay + 2, from: 8, to: 18 }],
    done: a => !!a.caTaken,
    crowd: [
      { id: 'inv', name: 'Dr. Adebayo', role: 'Invigilator', emoji: '🕶️', dx: 3.2, dz: -3.4, shirt: 0x1f2a44, skin: 0x5a3a26, dialogue: 'invigilator' },
      { id: 'c1', name: 'Tosin', role: 'Coursemate', emoji: '🎒', dx: -5.2, dz: 2.5, shirt: 0xf1c40f, dialogue: 'student' },
      { id: 'c2', name: 'Ibrahim', role: 'Coursemate', emoji: '🎒', dx: 5.2, dz: 2.5, shirt: 0x2ecc71, dialogue: 'student' }
    ],
    beats: ctx => [
      { title: '📝 Test day', lines: ['A notice is stuck to the board: the first CA test holds today. Three questions per course.', 'Nervous coursemates whisper formulas to themselves outside the hall.'] },
      {
        title: '📖 Last minutes before the test', lines: ['You still have a little time. How do you use it?'],
        choices: [
          { label: ctx.weakest ? `Revise ${ctx.weakest}, your weakest course` : 'Revise your weakest course', text: 'You go through your notes one last time. Two things click that did not before.', fx: { energy: -2 }, prepWeak: 6 },
          { label: 'Ask Tosin to quiz you', text: 'Tosin fires questions at you. You get half of them wrong, which is useful.', fx: { fun: 1 }, prepWeak: 3, meet: 'firstca-c1' },
          { label: 'Cram everything until the last second', text: 'Your head is full of half-remembered facts and your hands are cold.', fx: { stress: 3, energy: -3 }, prepWeak: 3 },
          { label: 'Breathe and trust what you have studied', text: 'You take a slow breath and walk in calm. It helps more than you expected.', fx: { stress: -3 } }
        ]
      },
      { title: '📜 The rules', lines: ['The invigilator reads the rules: bags at the front, phones switched off, no talking, no sharing answers.', 'Anyone caught cheating receives a zero and a letter to the Dean.'] },
      {
        title: '🤫 A whisper from behind', lines: ['Halfway through, Ibrahim leans forward and whispers: "Number two, quickly. What is the answer?"'],
        choices: [
          { label: 'Ignore him politely', text: 'You keep your eyes on your paper. He sighs, and then finds the answer himself.', fx: { stress: 1 } },
          { label: 'Whisper the answer back', text: 'You whisper a quick answer.', fx: { stress: 1 }, risk: 0.5, caught: 'The invigilator turns around at that exact moment. You get a warning, and your face goes hot for an hour.', caughtFx: { stress: 8, fun: -4 } }
        ]
      }
    ],
    onAttend: ctx => ctx.takeCa()
  },
  {
    id: 'inspection', emoji: '🧹', title: 'Hostel inspection', short: 'Hostel inspection',
    venue: 'hostel', minutes: 60, fx: { energy: -2 },
    windows: a => [{ day: a.startDay + 2, from: 15, to: 18 }, { day: a.startDay + 3, from: 15, to: 18 }],
    crowd: [
      { id: 'warden', name: 'Hall Warden', role: 'Hall warden', emoji: '📋', dx: 2.5, dz: 3, shirt: 0x1f2a44, skin: 0x5a3a26, dialogue: 'warden' },
      { id: 'porter', name: 'Baba Sule', role: 'Hostel porter', emoji: '🔑', dx: -1.5, dz: 4.4, shirt: 0x6b4a2f, skin: 0x3b2418, dialogue: 'porter' }
    ],
    beats: ctx => [
      { title: '🧹 Hall inspection', lines: [`The notice on the door of ${ctx.hostelName} said "inspection this week". Today the porter knocks on every room.`, 'The hall warden walks behind him with a clipboard and a very serious face.'] },
      {
        title: '🛏️ Before they reach your room', lines: ['You hear them two doors away. What do you do?'],
        choices: [
          { label: 'Tidy the room properly', text: 'You make the bed, wipe the desk and fold the clothes. The room has never looked this good.', fx: { energy: -3 }, minutes: 20, flag: 'tidy' },
          { label: 'Do a quick sweep', text: 'You push things under the bed and straighten the sheet. It will do from the door.', fx: {}, minutes: 5, flag: 'quick' },
          { label: 'Leave it as it is', text: 'You decide the room is a fair picture of your life right now.', fx: {} }
        ]
      },
      {
        title: '🔌 The forbidden heater', lines: ['Under your bed is a small electric heater. Heaters are banned in the hostel because of the fire risk.'],
        choices: [
          { label: 'Hide it in the wardrobe', text: 'It goes in behind the shoes. You try to look innocent.', fx: {}, flag: 'hid' },
          { label: 'Hand it to the porter and apologise', cost: 300, text: 'The porter sighs, takes the heater, and says honesty will be remembered. You pay the ₦300 fine.', poor: 'The porter takes the heater and says he will remember your honesty. You cannot pay the fine today, so it goes on your record.', fx: { stress: 1 }, flag: 'honest' }
        ]
      },
      ctx2 => {
        const room = ctx2.room(), f = ctx2.flags;
        const caught = f.hid && !f.tidy;
        const score = (room.hygiene >= 60 ? 1 : 0) + (room.decor >= 1 ? 1 : 0) + (f.tidy ? 2 : f.quick ? 1 : 0) + (f.honest ? 1 : 0) - (caught ? 2 : 0);
        const why = [room.hygiene >= 60 ? 'The room smells fresh.' : 'The warden wrinkles his nose at the air.', room.decor >= 1 ? 'The poster and the little touches make it feel like a home.' : 'The walls are bare.'];
        if (caught) why.push('The warden opens the wardrobe and finds the heater behind the shoes.');
        if (score >= 4) return { title: '🏅 Commended', lines: [...why, 'The warden writes "Excellent" and tells the porter to use your room as the example.', 'You get a ₦1,000 tidy-room prize from the hall fund.'], fx: { fun: 4, stress: -3 }, give: 1000 };
        if (score >= 2) return { title: '✅ Satisfactory', lines: [...why, 'The warden ticks the box and moves on to the next door.'], fx: { stress: -1 } };
        return { title: '⚠️ Warning', lines: [...why, 'You get a written warning. A second one means a letter to the Dean.'], fx: { stress: 3 }, cost: caught ? 500 : 0 };
      }
    ]
  },
  {
    id: 'party', emoji: '🎉', title: "Freshers' night", short: "Freshers' night",
    venue: 'auditorium', minutes: 120, fx: { hunger: -6 },
    windows: a => [{ day: a.startDay + 4, from: 19, to: 23 }],
    crowd: [
      { id: 'dj', name: 'DJ Kash', role: 'DJ', emoji: '🎧', dx: 0, dz: -6.2, shirt: 0x8e44ad, skin: 0x5a3a26, dialogue: 'student' },
      { id: 'p1', name: 'Bisi', role: 'Fresher', emoji: '🎒', dx: -5.4, dz: -1.6, shirt: 0xff7aa8, dialogue: 'student' },
      { id: 'p2', name: 'Femi', role: 'Fresher', emoji: '🎒', dx: 5.4, dz: 0.8, shirt: 0x3498db, dialogue: 'student' },
      { id: 'p3', name: 'Uche', role: 'Senior', emoji: '😎', dx: -5.4, dz: 3.2, shirt: 0x34495e, dialogue: 'student' }
    ],
    beats: ctx => [
      {
        title: "🎉 Freshers' night", lines: ['The student union has turned the hall into a party: loud speakers, coloured lights and a DJ who keeps shouting "make some noise!".', 'Tickets are ₦1,000 at the door.'],
        choices: [
          { label: 'Pay the ₦1,000 ticket', cost: 1000, text: 'The bouncer stamps your wrist and the music hits you like a wall.', poor: 'You cannot afford the ticket, so you volunteer to carry chairs for the union. The bouncer lets you in for free.', fx: { fun: 2 } },
          { label: 'Volunteer to carry chairs instead', text: 'You carry thirty chairs in and are let in for free. Your arms are not impressed.', fx: { energy: -4, fun: 2 } }
        ]
      },
      {
        title: '💃 The dance floor', lines: ['The night is warming up. What do you do first?'],
        choices: [
          { label: 'Dance with everyone', text: 'You dance badly and happily. Someone films it. Hopefully not you.', fx: { fun: 12, energy: -8 } },
          { label: 'Chat with people at the edge', text: 'You meet Bisi and Femi, who are also new. You swap numbers and stories about your lecturers.', fx: { fun: 6, stress: -3 }, meet: 'party-p1' },
          { label: 'Buy snacks and watch (₦500)', cost: 500, text: 'Meat pie, a cold drink and a good view of the dance floor.', poor: 'You count your money twice and decide to just watch.', fx: { fun: 4, hunger: 18 } }
        ]
      },
      {
        title: '🌙 It is nearly eleven', lines: ['A senior says the real party begins at midnight. But the exams are tomorrow morning.'],
        choices: [
          { label: 'Go back to the hostel and sleep', text: 'You leave while the music is still loud and sleep better than you have all week.', fx: { stress: -3, energy: 2 }, minutes: 30 },
          { label: 'Stay for one more hour', text: 'The last hour is the best of the night. You will pay for it in the morning.', fx: { fun: 5, energy: -8, stress: 2 }, minutes: 60 }
        ]
      }
    ]
  },
];

SCENES.push(...ACADEMIC_SCENES);   // group academic
export const sceneById = id => SCENES.find(s => s.id === id);

/* ---------------- scheduling rules (pure) ---------------- */

export const sceneState = (a, id) => a?.scenes?.[id] || {};
export const windowsOf = (def, a) => (a && a.year === 1 && a.term === 1 ? def.windows(a) : []);      // first semester only
const inWindow = (w, day, hour) => w.day === day && hour >= w.from && hour < w.to;

/** Is this scene on right now (inside one of its windows) and not yet attended or missed? */
export function isOpen(def, a, day, hour) {
  return !!a && !sceneState(a, def.id).status && !def.done?.(a) && windowsOf(def, a).some(w => inWindow(w, day, hour));
}

/** The next window that has not passed yet (or null). */
export function nextWindow(def, a, day, hour) {
  return windowsOf(def, a).filter(w => w.day > day || (w.day === day && hour < w.to)).sort((x, y) => x.day - y.day)[0] || null;
}

/** True once every window has passed without the player going. */
export function isOverdue(def, a, day, hour) {
  if (!a || sceneState(a, def.id).status || def.done?.(a)) return false;
  const ws = windowsOf(def, a);
  return ws.length > 0 && ws.every(w => w.day < day || (w.day === day && hour >= w.to));
}

const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const whenText = (w, a) => `${WEEKDAY[Math.max(0, Math.min(6, w.day - a.startDay))] || `Day ${w.day}`} ${clock(w.from)}–${clock(w.to)}`;

/* ---------------- running a scene ---------------- */

/** Plays the beats as dialogs, applying each choice. Returns the lines to show in the closing summary. */
export async function playScene(def, ctx) {
  const done = [];
  for (let beat of def.beats(ctx)) {
    if (typeof beat === 'function') beat = beat(ctx);     // a beat decided at the moment it is reached (e.g. a verdict)
    if (!beat) continue;
    if (beat.quiz) {
      const q = beat.quiz();
      if (!q) continue;
      const pick = await showModal({ title: beat.title, lines: [...beat.lines, q.q], buttons: q.options.map((o, i) => ({ label: o.t, value: i })) });
      const ok = !!q.options[pick]?.ok;
      const fx = (ok ? beat.rightFx : beat.wrongFx) || {};
      if (Object.keys(fx).length) ctx.consume({ minutes: 0, fx });
      if (ok && beat.rightPrep) ctx.boost(beat.rightPrep);
      await showModal({ title: beat.title, lines: [ok ? beat.right : beat.wrong], buttons: [{ label: 'Continue', value: 1 }] });
      continue;
    }
    if (!beat.choices) {
      await showModal({ title: beat.title, lines: beat.lines, buttons: [{ label: 'Next', value: 0 }] });
      if (beat.fx) ctx.consume({ minutes: 0, fx: beat.fx });
      if (beat.give) { ctx.give(beat.give); done.push(`Received ₦${beat.give.toLocaleString('en-NG')}`); }
      if (beat.cost) { if (ctx.pay(beat.cost)) done.push(`Paid ₦${beat.cost.toLocaleString('en-NG')}`); else ctx.consume({ minutes: 0, fx: { stress: 2 } }); }
      continue;
    }
    const pick = await showModal({ title: beat.title, lines: beat.lines, buttons: beat.choices.map((c, i) => ({ label: c.label, value: i })) });
    const ch = beat.choices[pick] ?? beat.choices[beat.choices.length - 1];
    let text = ch.text, fx = ch.fx || {};
    let ok = true;
    if (ch.cost) {
      if (ctx.pay(ch.cost)) done.push(`Paid ₦${ch.cost.toLocaleString('en-NG')}`);
      else { text = ch.poor || 'You do not have the money for that.'; fx = {}; ok = false; }
    }
    if (ok && ch.join && ctx.joinClub(ch.join).ok) done.push(`Joined the ${ctx.clubs.find(c => c.id === ch.join).name}`);
    if (ok && ch.risk != null && ctx.roll(ch.label) < ch.risk) { text = `${text} ${ch.caught}`; fx = { ...fx, ...ch.caughtFx }; ctx.warn(); done.push('Warning recorded'); }
    if (ch.pick) { ctx.flags.pick = ch.pick; (ctx.flags.seen || (ctx.flags.seen = [])).push(ch.pick); }
    if (ch.prepWeak) ctx.boostWeakest(ch.prepWeak);
    if (ch.flag) ctx.flags[ch.flag] = true;
    if (Object.keys(fx).length || ch.minutes) ctx.consume({ minutes: ch.minutes || 0, fx });
    if (ch.prep) ctx.boost(ch.prep);
    if (ch.meet) ctx.met(ch.meet);
    await showModal({ title: beat.title, lines: [text], buttons: [{ label: 'Continue', value: 1 }] });
  }
  return done;
}

/**
 * deps: { state, meta, day(), minutes(), consume, pay, met(id), npcs, campusName, courseName, name, rhythm(), hostelName(), venuePlace(type) }
 * `venuePlace('auditorium' | 'hostel')` returns the place name for this save (or '' if there is none).
 */
export function createScenes(deps) {
  const { state, meta, npcs } = deps;
  const A = () => state.academic;
  const hour = () => deps.minutes() / 60;
  const venueName = def => {
    if (def.venue === 'hostel') return deps.hostelName();
    if (def.venue === 'class') return firstEntry(A())?.venue || deps.venuePlace('lecture');     // the department's first lecture hall
    return deps.venuePlace('auditorium');
  };
  const rec = id => { const a = A(); a.scenes = a.scenes || {}; return (a.scenes[id] = a.scenes[id] || {}); };
  const spawned = new Map();            // scene id -> npc ids currently standing in the venue
  let askedHere = false;                // already offered for this visit to the venue

  /** The scene that is on right now at the venue the player is standing in (or null). */
  function openAt(placeName) {
    const a = A();
    if (!a || !placeName) return null;
    return SCENES.find(def => isOpen(def, a, deps.day(), hour()) && venueName(def) === placeName) || null;
  }

  function clearCrowd(id) {
    for (const nid of spawned.get(id) || []) npcs.remove(nid);
    spawned.delete(id);
  }

  /** Called when the player has walked into a building; fills the room if a scene is on there. */
  function entered(place, interior) {
    askedHere = false;
    const def = openAt(place.name);
    if (!def || spawned.has(def.id)) return;
    const ids = def.crowd.map(p => {
      const id = `scene-${def.id}-${p.id}`;
      npcs.add({ ...p, id, where: place.name, x: interior.ox + p.dx, z: p.dz, face: 0 });
      return id;
    });
    spawned.set(def.id, ids);
  }
  function left() { askedHere = false; }

  /** Per-frame check (cheap): announce a scene when it opens, mark it missed when it passes, tidy the crowd. */
  function tick() {
    const a = A();
    if (!a) return;
    const d = deps.day(), h = hour();
    for (const def of SCENES) {
      const r = rec(def.id);
      if (!r.status && def.done?.(a)) r.status = 'attended';
      if (r.status) { clearCrowd(def.id); continue; }
      const w = windowsOf(def, a).find(x => inWindow(x, d, h));
      if (w && r.notified !== `${d}`) {
        r.notified = `${d}`;
        meta.notify({ icon: def.emoji, title: `${def.short} is on`, text: `${venueName(def) || 'On campus'} until ${clock(w.to)}. You can go, or skip it.` });
      }
      if (!w && spawned.has(def.id)) clearCrowd(def.id);
      if (isOverdue(def, a, d, h)) {
        r.status = 'missed';
        if (def.missFx) deps.consume({ minutes: 0, fx: def.missFx });
        meta.notify({ icon: '⏱️', title: `You missed the ${def.short.toLowerCase()}`, text: def.matric ? 'The Registry will sort out your matriculation later.' : def.id === 'courseReg' ? 'You are not registered yet. Visit the department office as soon as you can.' : def.id === 'firstCA' ? 'The CA test was not written. That mark will count as zero.' : 'It is over now. Maybe next time.' });
      }
    }
  }

  /** Should the "take a seat?" prompt appear now? (once per visit) */
  function shouldOffer(placeName) {
    if (askedHere) return false;
    return !!openAt(placeName);
  }

  async function offer(place) {
    const def = openAt(place.name);
    askedHere = true;
    if (!def) return false;
    const pick = await showModal({
      title: `${def.emoji} ${def.title}`,
      lines: [`${def.short} is happening here now. Do you want to take a seat?`, 'You can also skip it and carry on with your day.'],
      buttons: [{ label: `Attend (about ${Math.round(def.minutes / 60 * 10) / 10} hours)`, value: 'go' }, { label: 'Not now', value: 'no', secondary: true }]
    });
    if (pick !== 'go') return false;
    const a = A();
    const entry = firstEntry(a);
    const first = entry && { ...entry, title: deps.courseTitle(entry.code) };
    const late = !!first && hour() > first.hour + 0.4;      // judged on arrival, before the scene spends time
    const summary = await playScene(def, {
      name: deps.name(), campusName: deps.campusName, courseName: deps.courseName(), hostelName: deps.hostelName(), rhythm: deps.rhythm(),
      pay: deps.pay, consume: deps.consume, met: deps.met,
      flags: {}, give: deps.give, room: deps.room,
      clubs: CLUBS.map(c => ({ id: c.id, icon: c.icon, name: c.name, schedule: clubSchedule(c) })), clubDues: CLUB_DUES, maxClubs: MAX_CLUBS,
      canJoin: deps.canJoin, joinClub: deps.joinClub, warn: deps.warn, boostWeakest: n => deps.boostWeakest(n),
      roll: key => hash01(seedOf(`${deps.name()}|${deps.day()}`), key),
      courses: deps.courseLines(), weakest: deps.weakest(), first, boost: n => first && deps.boost(first.code, n),
      warmup: () => first && deps.warmup(first.code)
    });
    deps.consume({ minutes: def.minutes, fx: def.matric ? MATRIC_FX : def.fx });
    rec(def.id).status = 'attended';
    await def.onAttend?.({
      takeCa: () => deps.takeCa(),
      setRegistered: () => { a.registered = true; },
      attendFirstLecture: () => { if (first) deps.attendEntry(entry, late); }
    });
    if (def.matric) { a.matric = true; meta.track('matriculated'); }
    clearCrowd(def.id);
    await showModal({
      title: `${def.emoji} ${def.title} is over`,
      lines: [def.matric ? 'You are now a matriculated student. Welcome to the university family.' : def.id === 'courseReg' ? 'You are registered for the semester.' : def.id === 'firstCA' ? 'The first CA test is behind you. Results come at the end of the semester.' : def.id === 'clubfair' ? 'The fair is winding down and your arms are full of flyers.' : def.id === 'party' ? 'You will remember tonight for a long time.' : def.id === 'inspection' ? 'The warden has moved on to the next room.' : def.id === 'firstLecture' ? `${first?.code} is now counted as attended, and you already know the lecturer's name.` : 'That was time well spent.', ...summary],
      buttons: [{ label: 'Continue', value: 1 }]
    });
    return true;
  }

  /** The HUD goal line: what is on now or coming up soon. '' when nothing is. */
  function goalLine() {
    const a = A();
    if (!a) return '';
    const d = deps.day(), h = hour();
    const open = SCENES.find(def => isOpen(def, a, d, h));
    if (open) return `${open.emoji} ${open.short} now at ${venueName(open) || 'campus'} (until ${clock(windowsOf(open, a).find(w => inWindow(w, d, h)).to)})`;
    const soon = SCENES.map(def => ({ def, w: !sceneState(a, def.id).status ? nextWindow(def, a, d, h) : null }))
      .filter(x => x.w && (x.w.day === d || x.w.day === d + 1)).sort((x, y) => x.w.day - y.w.day || x.w.from - y.w.from)[0];
    return soon ? `📅 ${soon.def.short}: ${venueName(soon.def) || 'campus'}, ${whenText(soon.w, a)}` : '';
  }

  /** Plain-text facts for the AI so NPCs can answer "when is matriculation?" correctly. */
  function facts() {
    const a = A();
    if (!a) return [];
    return SCENES.map(def => {
      const s = sceneState(a, def.id).status;
      const w = nextWindow(def, a, deps.day(), hour());
      if (s === 'attended') return `${def.short}: the player attended it.`;
      if (s === 'missed' || !w) return `${def.short}: it is over and the player did not attend.`;
      return `${def.short}: at ${venueName(def) || 'campus'}, ${whenText(w, a)}. Attending is optional.`;
    });
  }

  return { tick, entered, left, shouldOffer, offer, goalLine, facts, openAt };
}
