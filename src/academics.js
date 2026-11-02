import { showModal } from './modal.js';
import { DEPTS, buildCourses, bankOf } from './courses.js';
import { QUESTIONS, shuffle } from './questions.js';
import { courseOf } from './admissions.js';
import { semesterHasStrike, strikeDays } from './eventengine.js';
import { orientationLine } from './campuslife-events.js';

/*
 * The academic calendar. A cycle is 7 game days: 6 semester days (Mon to Sat) and a break day (Sun) when
 * results are out. Two semesters make a year. Each course has 2 lectures; scores are out of 100:
 *   attendance 10 + assignment 10 + CA test 20 + exam 60.
 */

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LECTURE_DAYS = [1, 2, 4, 5];
const SLOT_HOURS = [9, 13, 16];
const LECTURE_HOURS = 2;
const CA_DAY = 3;            // Wednesday
const EXAM_DAY = 6;          // Saturday
const ASSIGNMENT_DUE = 5;    // Friday
const CA_QUESTIONS = 3;      // per course
const EXAM_QUESTIONS = 5;    // per course
export const EXAM_CURVE = 1.4;   // raw exam fraction is raised to this power, so weak papers lose more than strong ones

/**
 * How many wrong options your preparation rules out. Easier in first year, harder later:
 * the preparation needed for each hint rises with the year. Being tired, stressed or ill removes one.
 */
export function hintCount(knowledge, year, tired = false) {
  const t1 = 25 + 5 * Math.min(2, Math.max(0, year - 1));
  const t2 = 60 + 5 * Math.min(2, Math.max(0, year - 1));
  return Math.max(0, (knowledge >= t2 ? 2 : knowledge >= t1 ? 1 : 0) - (tired ? 1 : 0));
}

const GRADES = [[70, 'A', 5], [60, 'B', 4], [50, 'C', 3], [45, 'D', 2], [40, 'E', 1], [0, 'F', 0]];

const hhmm = h => `${String(h).padStart(2, '0')}:00`;
const gradeFor = total => GRADES.find(g => total >= g[0]);

/** Two semesters in a row with a GPA below 1.0 means withdrawal; one means probation. */
export const PROBATION_GPA = 1.0;
export const WITHDRAW_AFTER = 2;
export function applyStanding(a, gpa) {
  a.lowStreak = gpa < PROBATION_GPA ? (a.lowStreak || 0) + 1 : 0;
  a.probation = a.lowStreak > 0 && a.lowStreak < WITHDRAW_AFTER;
  if (a.lowStreak >= WITHDRAW_AFTER) a.withdrawn = true;
  return { probation: a.probation, withdrawn: !!a.withdrawn };
}

export function degreeClass(cgpa) {
  if (cgpa >= 4.5) return 'First Class';
  if (cgpa >= 3.5) return 'Second Class Upper';
  if (cgpa >= 2.4) return 'Second Class Lower';
  if (cgpa >= 1.5) return 'Third Class';
  if (cgpa >= 1.0) return 'Pass';
  return 'Below pass level';
}

/**
 * deps: { state, day(), minutes(), venues() -> lecture building names, consume({minutes, fx}), toast(text) }
 * The academic record lives in state.academic and is saved with the game.
 */
export function createAcademics({ state, day, minutes, venues, consume, toast, onEvent = () => {} }) {
  const A = () => state.academic;

  /* ---------- setup ---------- */
  function buildSemester(a) {
    a.courses = buildCourses(state.course, a.year, a.term, a.carryovers);
    const slots = [];
    for (const d of LECTURE_DAYS) for (const h of SLOT_HOURS) slots.push({ day: d, hour: h });
    const places = venues();
    a.timetable = [];
    const n = a.courses.length;
    for (let k = 0; k < 2 * n && k < slots.length; k++) {
      const ci = k % n;
      a.timetable.push({ ...slots[k], code: a.courses[ci].code, venue: places[ci % places.length] });
    }
    // an ASUU strike suspends the lectures on its days; they don't count against attendance
    a.strike = semesterHasStrike(a.year, a.term) ? { from: strikeDays.from, to: strikeDays.to } : null;
    if (a.strike) for (const t of a.timetable) t.cancelled = t.day >= a.strike.from && t.day <= a.strike.to;
    a.reminded = {};
    a.attended = {};
    a.caTaken = false;
    a.examTaken = false;
    a.lastViewed = false;
  }

  /** Called when clearance is complete: the first semester starts the next day. */
  function init() {
    if (state.academic) return;
    state.academic = { year: 1, term: 1, startDay: day() + 1, phase: 'pre', carryovers: [], history: [], graduated: false };
    buildSemester(state.academic);
  }

  const semDay = () => (A() ? day() - A().startDay + 1 : 0);
  const key = t => `${t.day}|${t.hour}|${t.code}`;
  const lectureCount = code => A().timetable.filter(t => t.code === code && !t.cancelled).length;
  const weekday = () => {
    const a = A();
    if (!a || a.phase === 'pre') return '';
    return WEEKDAYS[Math.max(0, Math.min(6, semDay() - 1))];
  };

  /* ---------- results ---------- */
  function finalize() {
    const a = A();
    const rows = a.courses.map(c => {
      const lectures = lectureCount(c.code);
      const attendance = lectures ? 10 * (c.att.ok + 0.5 * c.att.late) / lectures : 10;
      const assignment = c.assign.done ? 10 : Math.min(5, c.assign.progress * 3);
      const ca = (c.ca ?? 0) * 20;
      const exam = Math.pow(c.exam ?? 0, EXAM_CURVE) * 60;
      const total = Math.round(attendance + assignment + ca + exam);
      const [, grade, points] = gradeFor(total);
      return { code: c.code, title: c.title, units: c.units, carry: c.carry, total, grade, points };
    });
    const units = rows.reduce((s, r) => s + r.units, 0);
    const gpa = rows.reduce((s, r) => s + r.points * r.units, 0) / units;

    a.history.push({ year: a.year, term: a.term, gpa, rows });
    const all = a.history.flatMap(h => h.rows);
    a.cgpa = all.reduce((s, r) => s + r.points * r.units, 0) / all.reduce((s, r) => s + r.units, 0);

    // failed courses come back as carryovers; passed carryovers are cleared
    const failed = rows.filter(r => r.grade === 'F');
    const passedCodes = new Set(rows.filter(r => r.grade !== 'F').map(r => r.code));
    a.carryovers = a.carryovers.filter(c => !passedCodes.has(c.code));
    for (const r of failed) {
      if (!a.carryovers.some(c => c.code === r.code)) {
        const src = a.courses.find(c => c.code === r.code);
        a.carryovers.push({ code: r.code, title: r.title, bank: src.bank, units: r.units });
      }
    }
    const standing = applyStanding(a, gpa);
    if (a.year >= DEPTS[state.course].years && a.term === 2 && !standing.withdrawn) a.graduated = true;
    onEvent('results', { gpa, rows, carryPassed: rows.filter(r => r.carry && r.grade !== 'F').length, probation: standing.probation });
    if (a.graduated) onEvent('graduated');
    if (a.withdrawn) onEvent('withdrawn');
  }

  function nextSemester() {
    const a = A();
    if (a.term === 1) a.term = 2; else { a.year += 1; a.term = 1; }
    a.startDay += 7;
    a.phase = 'semester';
    buildSemester(a);
    onEvent('semesterStart', { year: a.year, term: a.term, startDay: a.startDay });
  }

  /** Advances the calendar. Returns events: 'results', 'graduated'. */
  function tick() {
    const a = A();
    if (!a || (a.graduated || a.withdrawn) && a.phase === 'break') return [];
    const events = [];
    if (a.phase === 'pre') {
      if (day() >= a.startDay) { a.phase = 'semester'; onEvent('semesterStart', { year: a.year, term: a.term, startDay: a.startDay }); } else return events;
    }
    const sd = semDay();
    if (a.phase === 'semester' && sd >= 7) {
      finalize();
      a.phase = 'break';
      events.push('results');
      if (a.graduated) events.push('graduated');
      if (a.withdrawn) events.push('withdrawn');
    } else if (a.phase === 'break' && sd >= 8 && !a.graduated && !a.withdrawn) {
      nextSemester();
    }
    return events;
  }

  /* ---------- what to do next (the goal line) ---------- */
  function nextLecture() {
    const a = A(), sd = semDay(), now = minutes();
    return a.timetable
      .filter(t => !t.cancelled && !a.attended[key(t)] && (t.day > sd || (t.day === sd && now < (t.hour + LECTURE_HOURS) * 60)))
      .sort((x, y) => x.day - y.day || x.hour - y.hour)[0];
  }

  function goal() {
    const a = A();
    if (!a) return '';
    if (a.graduated) return `🎓 Graduated · ${degreeClass(a.cgpa)}`;
    if (a.withdrawn) return '📄 You withdrew from the university';
    if (a.phase === 'pre') return orientationLine(a, 0) || `🎓 Semester starts on Day ${a.startDay}`;
    const sd = semDay(), now = minutes();
    if (a.phase === 'break') return a.lastViewed ? '😴 Break day: next semester starts tomorrow' : '📄 Results are out! Open the portal 📱';
    if (sd === EXAM_DAY && !a.examTaken && now < 20 * 60) return '🧪 Exams today! Go to a lecture hall';
    if (sd === CA_DAY && !a.caTaken && now < 18 * 60) return '📝 CA tests today! Go to a lecture hall';
    const next = nextLecture();
    // orientation week goals take the line unless a lecture is about to start
    const orient = orientationLine(a, sd);
    if (orient && !(next && next.day === sd && next.hour * 60 - now < 120)) return orient;
    if (next) return `📚 Next: ${next.code} · ${WEEKDAYS[next.day - 1]} ${hhmm(next.hour)} · ${next.venue}`;
    if (sd <= ASSIGNMENT_DUE && a.courses.some(c => !c.assign.done)) return `📝 Assignments due ${WEEKDAYS[ASSIGNMENT_DUE - 1]}`;
    return '📚 Study at the library';
  }

  /* ---------- actions at buildings ---------- */
  function lectureActions(place) {
    const a = A();
    if (!a) return { actions: [], note: 'Lectures start once you are a student.' };
    if (a.phase !== 'semester') return { actions: [], note: a.phase === 'pre' ? `The semester starts on Day ${a.startDay}.` : 'No lectures during the break.' };
    const sd = semDay(), now = minutes(), actions = [];

    const live = a.timetable.find(t => t.day === sd && t.venue === place && !t.cancelled && !a.attended[key(t)]
      && now >= t.hour * 60 - 15 && now < (t.hour + LECTURE_HOURS) * 60);
    if (live) {
      const late = now > live.hour * 60 + 15;
      actions.push({ id: 'attend', label: `🎓 Attend ${live.code}${late ? ' (late)' : ''}`, entry: live, late });
    }
    if (sd === CA_DAY && !a.caTaken && now >= 8 * 60 && now < 18 * 60) actions.push({ id: 'ca', label: '📝 Take CA tests' });
    if (sd === EXAM_DAY && !a.examTaken && now >= 8 * 60 && now < 20 * 60) actions.push({ id: 'exam', label: '🧪 Write exams' });
    if (actions.length) return { actions, note: '' };
    if (a.strike && sd >= a.strike.from && sd <= a.strike.to) return { actions: [], note: '📢 ASUU strike: lectures are suspended until Saturday.' };

    const next = a.timetable
      .filter(t => t.venue === place && !t.cancelled && !a.attended[key(t)] && (t.day > sd || (t.day === sd && now < t.hour * 60)))
      .sort((x, y) => x.day - y.day || x.hour - y.hour)[0];
    return { actions: [], note: next ? `Next class here: ${next.code}, ${WEEKDAYS[next.day - 1]} ${hhmm(next.hour)}.` : 'No class here right now. Check the portal 📱 for your timetable.' };
  }

  function libraryActions() {
    const a = A();
    if (!a) return { actions: [], note: 'Studying starts once you are a student.' };
    const actions = [{ id: 'study', label: '📚 Study a course' }];
    const sd = semDay();
    if (a.phase === 'semester' && sd >= 1 && sd <= ASSIGNMENT_DUE && a.courses.some(c => !c.assign.done)) {
      actions.push({ id: 'assign', label: '📝 Work on an assignment' });
    }
    return { actions, note: '' };
  }

  /* ---------- running things ---------- */
  async function chooseCourse(title, intro, list, describe) {
    const pick = await showModal({
      title, lines: [intro],
      buttons: [...list.map((c, i) => ({ label: describe(c), value: i })), { label: 'Cancel', value: -1, secondary: true }]
    });
    return pick >= 0 ? list[pick] : null;
  }

  async function quiz(kind, perCourse) {
    const a = A();
    const scores = {};
    for (const c of a.courses) {
      const bank = QUESTIONS[bankOf(c)] || QUESTIONS[bankOf(c).split('@')[0]];
      let pool = bank.map((_, i) => i).filter(i => !c.usedQ.includes(i));
      if (pool.length < perCourse) pool = bank.map((_, i) => i);
      const picks = shuffle(pool).slice(0, perCourse);
      c.usedQ.push(...picks);
      // preparation rules out wrong options; being exhausted or stressed takes one hint away (spec F-021)
      const tired = (!!state.needs && (state.needs.energy < 20 || state.needs.stress > 85)) || !!state.meta?.health?.sick;
      const hide = hintCount(c.knowledge, a.year, tired);

      let right = 0;
      for (let i = 0; i < picks.length; i++) {
        const [q, correct, ...wrong] = bank[picks[i]];
        const options = shuffle([{ t: correct, ok: true }, ...shuffle(wrong).slice(0, 3 - hide).map(t => ({ t, ok: false }))]);
        const ok = await showModal({
          title: `${kind} · ${c.code} · Q${i + 1}/${picks.length}`,
          lines: [q, ...(hide ? [`💡 Your preparation helped you rule out ${hide} wrong option${hide > 1 ? 's' : ''}.`] : []),
            ...(tired ? ['😵 You are too tired, stressed or unwell to think clearly.'] : [])],
          buttons: options.map(o => ({ label: o.t, value: o.ok }))
        });
        if (ok) right++;
      }
      scores[c.code] = right / picks.length;
      if (kind === 'CA test') c.ca = scores[c.code]; else c.exam = scores[c.code];
    }
    await showModal({
      title: `${kind} complete`,
      lines: a.courses.map(c => `${c.code}: ${Math.round(scores[c.code] * (kind === 'CA test' ? CA_QUESTIONS : EXAM_QUESTIONS))}/${kind === 'CA test' ? CA_QUESTIONS : EXAM_QUESTIONS}`).concat('Results will be released at the end of the semester.'),
      buttons: [{ label: 'OK', value: 1 }]
    });
  }

  async function run(action) {
    const a = A();
    if (!a) return;

    if (action.id === 'attend') {
      const t = action.entry;
      const c = a.courses.find(x => x.code === t.code);
      a.attended[key(t)] = action.late ? 'late' : 'ok';
      c.att[action.late ? 'late' : 'ok'] += 1;
      c.knowledge = Math.min(100, c.knowledge + 6);
      const left = Math.max(30, (t.hour + LECTURE_HOURS) * 60 - minutes());
      consume({ minutes: left, fx: { energy: -8, hunger: -8, fun: -6, stress: 3 } });
      toast(`🎓 You attended ${t.code}${action.late ? ' (late)' : ''}.`);
      onEvent('lecture');
    } else if (action.id === 'study') {
      const c = await chooseCourse('📚 Study', 'Which course do you want to study?', a.courses, x => `${x.code} · ${x.title} (${x.knowledge}%)`);
      if (!c) return;
      c.knowledge = Math.min(100, c.knowledge + 12);
      consume({ minutes: 120, fx: { energy: -12, fun: -8, stress: 5, hunger: -8 } });
      toast(`📚 You studied ${c.code}. Preparation: ${c.knowledge}%`);
      onEvent('study');
    } else if (action.id === 'assign') {
      const pending = a.courses.filter(c => !c.assign.done);
      const c = await chooseCourse('📝 Assignment', 'Which assignment do you want to work on? Each needs 2 sessions, due Friday.', pending, x => `${x.code} (${x.assign.progress}/2 done)`);
      if (!c) return;
      c.assign.progress += 1;
      if (c.assign.progress >= 2) c.assign.done = true;
      consume({ minutes: 120, fx: { energy: -10, fun: -8, stress: 4, hunger: -6 } });
      toast(c.assign.done ? `✅ ${c.code} assignment submitted!` : `📝 ${c.code} assignment: ${c.assign.progress}/2 done.`);
      onEvent('assignmentSession');
      if (c.assign.done) onEvent('assignmentDone');
    } else if (action.id === 'ca') {
      await quiz('CA test', CA_QUESTIONS);
      a.caTaken = true;
      onEvent('ca');
      consume({ minutes: 90, fx: { energy: -8, stress: 6, hunger: -6 } });
    } else if (action.id === 'exam') {
      await quiz('Exam', EXAM_QUESTIONS);
      a.examTaken = true;
      onEvent('exam');
      consume({ minutes: 180, fx: { energy: -15, stress: 10, hunger: -10 } });
    }
  }

  /* ---------- the student portal ---------- */
  async function openPortal() {
    const a = A();
    if (!a) {
      await showModal({ title: '📱 Student portal', lines: ['The portal opens once you have completed clearance.'], buttons: [{ label: 'Close', value: 1 }] });
      return;
    }
    const dept = courseOf(state.course);
    for (;;) {
      const sd = semDay();
      const header = [
        `${state.name} · ${dept.name} · ${a.year}00 Level, Semester ${a.term}`,
        a.phase === 'pre' ? `Semester starts on Day ${a.startDay}.` : `Today: ${weekday()} (Day ${day()})`,
        ...(a.cgpa != null ? [`CGPA: ${a.cgpa.toFixed(2)}`] : [])
      ];
      const pick = await showModal({
        title: '📱 Student portal', lines: header,
        buttons: [
          { label: '🗓️ Timetable', value: 'tt' },
          { label: '📚 Courses and assignments', value: 'courses' },
          { label: '📄 Results and CGPA', value: 'results' },
          { label: 'Close', value: 'x', secondary: true }
        ]
      });
      if (pick === 'x') return;

      let title = '', lines = [];
      if (pick === 'tt') {
        title = '🗓️ Timetable';
        lines = [...a.timetable].sort((x, y) => x.day - y.day || x.hour - y.hour).map(t =>
          `${WEEKDAYS[t.day - 1]} ${hhmm(t.hour)} · ${t.code} · ${t.venue}${t.cancelled ? ' ❌ strike' : a.attended[key(t)] ? ' ✅' : ''}${t.day === sd ? ' (today)' : ''}`);
        lines.push(`${WEEKDAYS[ASSIGNMENT_DUE - 1]}: assignments due`, `${WEEKDAYS[CA_DAY - 1]}: CA tests (08:00 to 18:00, any lecture hall)`, `${WEEKDAYS[EXAM_DAY - 1]}: exams (08:00 to 20:00, any lecture hall)`);
      } else if (pick === 'courses') {
        title = '📚 Courses';
        lines = a.courses.map(c => `${c.code} ${c.title}${c.carry ? ' (carryover)' : ''}: prep ${c.knowledge}% · attended ${c.att.ok + c.att.late}/${lectureCount(c.code)} · assignment ${c.assign.done ? 'submitted ✅' : `${c.assign.progress}/2`} · CA ${c.ca == null ? '–' : Math.round(c.ca * 100) + '%'}`);
      } else if (pick === 'results') {
        title = '📄 Results';
        const last = a.history[a.history.length - 1];
        if (!last) lines = ['No results yet. They are released at the end of your first semester.'];
        else {
          a.lastViewed = true;
          lines = [`${last.year}00 Level, Semester ${last.term}`, ...last.rows.map(r => `${r.code}: ${r.total} (${r.grade}) · ${r.units} units${r.carry ? ' · carryover' : ''}`),
            `GPA: ${last.gpa.toFixed(2)}`, `CGPA: ${a.cgpa.toFixed(2)} · ${degreeClass(a.cgpa)}`];
          if (a.carryovers.length) lines.push(`Carryovers: ${a.carryovers.map(c => c.code).join(', ')}`);
        }
      }
      await showModal({ title, lines, buttons: [{ label: '← Back', value: 'b' }] });
    }
  }

  async function graduationModal() {
    const a = A();
    await showModal({
      title: '🎓 You have graduated!',
      lines: [`Final CGPA: ${a.cgpa.toFixed(2)}`, `Degree class: ${degreeClass(a.cgpa)}`,
        a.cgpa >= 1 ? `${courseOf(state.course).name}, ${state.name}. Congratulations!` : 'You finished the programme, but your CGPA is below pass level. Better luck with the next chapter.'],
      buttons: [{ label: 'Celebrate 🥳', value: 1 }]
    });
  }

  /** Handouts and past questions: raises preparation in every course. */
  function boostAll(n) {
    if (A()) for (const c of A().courses) c.knowledge = Math.min(100, c.knowledge + n);
  }

  /** Plain-text facts about the player's semester, given to the AI so lecturers and others answer from real data. */
  function facts() {
    const a = A();
    if (!a) return ['The player has not started university yet.'];
    const sd = semDay();
    const out = [`Semester day ${Math.min(sd, 7)} of 6 (${weekday()}). The player is in ${a.year}00 level, semester ${a.term}.`];
    if (a.phase === 'pre') out.push(`The semester starts on day ${a.startDay}.`);
    out.push(`Weekly rhythm: assignments due ${WEEKDAYS[ASSIGNMENT_DUE - 1]}, CA tests ${WEEKDAYS[CA_DAY - 1]}, exams ${WEEKDAYS[EXAM_DAY - 1]}, ${WEEKDAYS[6]} is a break and results come out then.`);
    out.push(`CA test ${a.caTaken ? 'already taken' : 'not yet taken'} this semester; exam ${a.examTaken ? 'already taken' : 'not yet taken'}.`);
    out.push(`Courses: ${a.courses.map(c => `${c.code} ${c.title} (preparation ${c.knowledge}%${c.assign.done ? ', assignment submitted' : ', assignment pending'})`).join('; ')}.`);
    out.push(`Timetable: ${[...a.timetable].sort((x, y) => x.day - y.day || x.hour - y.hour).map(t => `${WEEKDAYS[t.day - 1]} ${hhmm(t.hour)} ${t.code} at ${t.venue}${t.cancelled ? ' (cancelled by strike)' : ''}`).join('; ')}.`);
    if (a.strike) out.push(`An ASUU strike affects days ${a.strike.from} to ${a.strike.to} of this semester.`);
    if (a.cgpa != null) out.push(`The player's CGPA is ${a.cgpa.toFixed(2)}.`);
    if (a.carryovers?.length) out.push(`Carryovers to retake: ${a.carryovers.map(c => c.code).join(', ')}.`);
    return out;
  }

  /* ---------- helpers for scenes (first lecture, course registration) ---------- */
  /** Counts a timetable entry as attended without spending time (the scene spends it). */
  function attendEntry(t, late = false) {
    const a = A();
    const c = a?.courses.find(x => x.code === t.code);
    if (!c || a.attended[key(t)]) return;
    a.attended[key(t)] = late ? 'late' : 'ok';
    c.att[late ? 'late' : 'ok'] += 1;
    c.knowledge = Math.min(100, c.knowledge + 6);
    onEvent('lecture');
  }
  function boostCourse(code, n) {
    const c = A()?.courses.find(x => x.code === code);
    if (c) c.knowledge = Math.min(100, c.knowledge + n);
  }
  /** A warm-up question from the course's own bank for the lecturer to ask the room: { q, options: [{ t, ok }] } or null. */
  function warmup(code) {
    const c = A()?.courses.find(x => x.code === code);
    const bank = c && (QUESTIONS[bankOf(c)] || QUESTIONS[bankOf(c).split('@')[0]]);
    if (!bank?.length) return null;
    const [q, correct, ...wrong] = bank[Math.floor(Math.random() * bank.length)];
    return { q, options: shuffle([{ t: correct, ok: true }, ...shuffle(wrong).slice(0, 2).map(t => ({ t, ok: false }))]) };
  }

  return { init, tick, goal, facts, weekday, lectureActions, libraryActions, run, openPortal, graduationModal, semDay, boostAll, attendEntry, boostCourse, warmup };
}
