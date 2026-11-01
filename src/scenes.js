import { showModal } from './modal.js';
import { matricPages, MATRIC_FX } from './campuslife-events.js';

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
  }
];

export const sceneById = id => SCENES.find(s => s.id === id);

/* ---------------- scheduling rules (pure) ---------------- */

export const sceneState = (a, id) => a?.scenes?.[id] || {};
export const windowsOf = (def, a) => (a ? def.windows(a) : []);
const inWindow = (w, day, hour) => w.day === day && hour >= w.from && hour < w.to;

/** Is this scene on right now (inside one of its windows) and not yet attended or missed? */
export function isOpen(def, a, day, hour) {
  return !!a && !sceneState(a, def.id).status && windowsOf(def, a).some(w => inWindow(w, day, hour));
}

/** The next window that has not passed yet (or null). */
export function nextWindow(def, a, day, hour) {
  return windowsOf(def, a).filter(w => w.day > day || (w.day === day && hour < w.to)).sort((x, y) => x.day - y.day)[0] || null;
}

/** True once every window has passed without the player going. */
export function isOverdue(def, a, day, hour) {
  if (!a || sceneState(a, def.id).status) return false;
  const ws = windowsOf(def, a);
  return ws.length > 0 && ws.every(w => w.day < day || (w.day === day && hour >= w.to));
}

const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const whenText = (w, a) => `${WEEKDAY[Math.max(0, Math.min(6, w.day - a.startDay))] || `Day ${w.day}`} ${clock(w.from)}–${clock(w.to)}`;

/* ---------------- running a scene ---------------- */

/** Plays the beats as dialogs, applying each choice. Returns the lines to show in the closing summary. */
export async function playScene(def, ctx) {
  const done = [];
  for (const beat of def.beats(ctx)) {
    if (!beat.choices) { await showModal({ title: beat.title, lines: beat.lines, buttons: [{ label: 'Next', value: 0 }] }); continue; }
    const pick = await showModal({ title: beat.title, lines: beat.lines, buttons: beat.choices.map((c, i) => ({ label: c.label, value: i })) });
    const ch = beat.choices[pick] ?? beat.choices[beat.choices.length - 1];
    let text = ch.text, fx = ch.fx || {};
    if (ch.cost && !ctx.pay(ch.cost)) { text = ch.poor || 'You do not have the money for that.'; fx = {}; }
    else if (ch.cost) done.push(`Paid ₦${ch.cost.toLocaleString('en-NG')}`);
    if (Object.keys(fx).length) ctx.consume({ minutes: 0, fx });
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
  const venueName = def => (def.venue === 'hostel' ? deps.hostelName() : deps.venuePlace('auditorium'));
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
      if (r.status) { clearCrowd(def.id); continue; }
      const w = windowsOf(def, a).find(x => inWindow(x, d, h));
      if (w && r.notified !== `${d}`) {
        r.notified = `${d}`;
        meta.notify({ icon: def.emoji, title: `${def.short} is on`, text: `${venueName(def) || 'On campus'} until ${clock(w.to)}. You can go, or skip it.` });
      }
      if (!w && spawned.has(def.id)) clearCrowd(def.id);
      if (isOverdue(def, a, d, h)) {
        r.status = 'missed';
        meta.notify({ icon: '⏱️', title: `You missed the ${def.short.toLowerCase()}`, text: def.matric ? 'The Registry will sort out your matriculation later.' : 'It is over now. Maybe next time.' });
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
    const summary = await playScene(def, {
      name: deps.name(), campusName: deps.campusName, courseName: deps.courseName(), hostelName: deps.hostelName(), rhythm: deps.rhythm(),
      pay: deps.pay, consume: deps.consume, met: deps.met
    });
    deps.consume({ minutes: def.minutes, fx: def.matric ? MATRIC_FX : def.fx });
    rec(def.id).status = 'attended';
    if (def.matric) { a.matric = true; meta.track('matriculated'); }
    clearCrowd(def.id);
    await showModal({
      title: `${def.emoji} ${def.title} is over`,
      lines: [def.matric ? 'You are now a matriculated student. Welcome to the university family.' : 'That was time well spent.', ...summary],
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
