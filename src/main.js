import * as THREE from 'three';
import { createEngine } from './engine.js';
import { buildCampus, resolveCollisions, updateDoors, updateSigns, SPAWN, BOUNDS } from './world.js';
import { buildInterior, addDecor, ENTERABLE } from './interiors.js';
import { newBill, addBill, dailyBillCheck, payBill as payHostelBill, cookBurns, restBonus, owed, HOSTEL_DUES } from './housing.js';
import { createCharacter } from './character.js';
import { createInput } from './input.js';
import { createDayNight } from './daynight.js';
import { createEvents } from './events.js';
import { createEventEngine, seasonFor } from './eventengine.js';
import { createHud } from './hud.js';
import { CAMPUSES } from './campuses.js';
import { ACTIONS, COMING_SOON } from './actions.js';
import { newNeeds, tickNeeds, applyEffects, naira, setSickness } from './needs.js';
import { rollIllness, fallSick, dayPassed, rest, diagnose, recover, statusLabel, ILLNESSES } from './health.js';
import { loadSave, writeSave, clearSave, newMeta, lastLoadNote } from './save.js';
import { showStart, showJambForm } from './start.js';
import { showModal } from './modal.js';
import { BACKGROUNDS, rollScores, aggregate, decide, courseOf, cutoff } from './admissions.js';
import { createGuide, describeWay } from './guide.js';
import { createNpcs, npcDefsFor, crowdDefs, interiorNpcDefs } from './npcs.js';
import { DIALOGUES } from './dialogues.js';
import { WORLD_DIALOGUES } from './worlddialogues.js';
import { DESKS, DESK_RESERVED, buildDesks, nextStep } from './clearance.js';
import { createAcademics } from './academics.js';
import { createMeta } from './meta.js';
import { ALLOWANCE, FARE, TRANSPORT_GIFT } from './economy.js';
import { createPhone, openAbout } from './phone.js';
import { createHints } from './hints.js';
import { settings, onSettingChange, applySettings } from './settings.js';
import { unlockAudio, sfx, syncAudio } from './audio.js';
import { installErrorHandlers, track } from './telemetry.js';
import { openFeedback } from './feedback.js';
import { buildGrid, findPath } from './pathfind.js';
import { createMapUI, createMinimap } from './map.js';
import { MODES, fareFor, minutesFor, okadaScare } from './transport.js';
import { getRel, addPoints, dailyChat, levelOf, loanBill, socialActions, FAVOURS } from './social.js';

const ALL_DIALOGUES = { ...DIALOGUES, ...WORLD_DIALOGUES };

const SPEED = 9;
const REACH = 5;              // how close you must be to a building to use it
const TALK_REACH = 3.8;       // how close you must be to an NPC to talk (outdoors)
const TALK_REACH_INSIDE = 2.6;// indoors, so furniture panels aren't hidden by NPCs behind counters
const JAMB_DAY = 2;           // JAMB result: Day 2 (about 8.5 real minutes after starting at 07:00 on Day 1)
const ADMISSION_GAP = 1;      // admission list: one day later, Day 3 (about 20.5 real minutes in)
const ARRIVAL = { x: 0, z: 48 };   // where the bus drops you: just inside the main gate
const MEAL_IDS = new Set(['jollof', 'pie', 'zobo', 'momfood', 'snack', 'vendorhalf', 'cook']);
const CROWD_BY_QUALITY = { low: 4, medium: 8, high: 12 };

installErrorHandlers();

async function main() {
  // ---- start: new game, continue, or straight into the campus after the bus ride ----
  const existing = loadSave();
  let choice;
  if (existing?.autoResume) {
    writeSave({ ...existing, autoResume: false });
    document.getElementById('start').classList.add('gone');     // skip the start screen
    choice = { resume: true };
  } else {
    choice = await showStart(existing);
  }
  unlockAudio();

  const saved = choice.resume ? loadSave() : null;
  const bg = choice.resume ? null : BACKGROUNDS.find(b => b.id === choice.background);
  const state = {
    campusId: saved?.campusId ?? 'home',
    name: saved?.name ?? choice.name,
    money: saved?.money ?? bg.money,
    needs: saved?.needs ?? newNeeds(),
    x: saved?.x ?? SPAWN.x,
    z: saved?.z ?? SPAWN.z,
    course: saved?.course ?? null,
    admission: saved?.admission ?? null,        // { uni, course } once admitted, until you take the bus
    clearance: saved?.clearance ?? null,        // { admissions, bursary, medical, hostel, done } after arriving
    hostel: saved?.hostel ?? null,
    academic: saved?.academic ?? null,          // semesters, courses, grades (see academics.js)
    meta: saved?.meta ?? newMeta(),             // achievements, goals, inbox, ledger (see meta.js)
    aspirant: saved ? (saved.aspirant ?? null) : {
      background: bg.id,
      choices: choice.choices,
      attempt: 1,
      ...rollScores(bg.id, 1),
      jambDay: JAMB_DAY,
      admitDay: JAMB_DAY + ADMISSION_GAP,
      jambSeen: false,
      admitSeen: false
    }
  };
  const campus = CAMPUSES[state.campusId];
  document.documentElement.style.setProperty('--accent', campus.accent);

  const engine = createEngine();
  applySettings(engine);
  const clearing = !!state.clearance && !state.clearance.done;     // registration desks are set up
  const { colliders, places } = buildCampus(engine.scene, campus, clearing ? DESK_RESERVED : []);
  const deskNpcs = clearing ? buildDesks(engine.scene, colliders) : [];
  const input = createInput();
  const hud = createHud();
  const dayNight = createDayNight();
  if (saved) { dayNight.state.minutes = saved.minutes; dayNight.state.day = saved.day; }
  const guide = createGuide(engine.scene);
  const day = () => dayNight.state.day;
  const toast = t => hud.toast(t);

  // To use a real model later, drop a .glb in public/assets/models and pass modelUrl, e.g.
  // createCharacter({ modelUrl: '/assets/models/student.glb' })
  const player = createCharacter();
  player.group.position.set(state.x, 0, state.z);
  engine.scene.add(player.group);

  const npcs = createNpcs(engine.scene, colliders);
  [...npcDefsFor(campus, places), ...deskNpcs].forEach(npcs.add);
  const crowdCount = campus.id === 'home' ? 4 : CROWD_BY_QUALITY[settings.quality] ?? 8;
  crowdDefs(campus, crowdCount, state.name.length * 97 + 13).forEach(npcs.add);
  const navGrid = buildGrid(colliders, BOUNDS);

  /* ---- progression, notifications, phone ---- */
  const meta = createMeta({
    state, day, give: n => { state.money += n; }, toast, sound: sfx, isStudent: () => !!state.academic
  });
  const hints = createHints({ meta: state.meta });

  const academics = createAcademics({
    state,
    day,
    minutes: () => dayNight.state.minutes,
    venues: () => {
      const halls = places.filter(p => p.type === 'lecture').map(p => p.name);
      return halls.length ? halls : ['Lecture Hall'];
    },
    consume: a => consume(a),
    toast,
    onEvent: (name, info) => {
      switch (name) {
        case 'lecture': meta.track('lectures'); break;
        case 'study': meta.track('studies'); break;
        case 'assignmentSession': meta.track('assignmentSessions'); break;
        case 'assignmentDone': meta.track('assignments'); break;
        case 'ca': meta.track('caTests'); break;
        case 'exam': meta.track('exams'); break;
        case 'graduated': meta.track('graduated'); break;
        case 'semesterStart':
          if (state.hostel && addBill(state.meta.bills, newBill(info.year, info.term, info.startDay))) {
            meta.notify({ icon: '🏠', title: 'Hostel dues', text: `Hostel dues of ${naira(HOSTEL_DUES)} are due on Friday. Pay in your phone under My room and bills.` });
          }
          break;
        case 'results': {
          meta.track('semesters');
          meta.track('gradeA', info.rows.filter(r => r.grade === 'A').length);
          if (info.gpa >= 4.5) meta.track('deansList');
          if (!info.rows.some(r => r.grade === 'F')) meta.track('cleanSemesters');
          if (info.carryPassed) meta.track('carryPassed', info.carryPassed);
          meta.notify({ icon: '📄', title: 'Results are out!', text: `Semester GPA ${info.gpa.toFixed(2)}. Open your phone, then the student portal.` });
          sfx('bell');
          // academic standing (spec F-064): warnings first, then probation
          const cg = state.academic.cgpa;
          if (cg < 1.5) meta.notify({ icon: '⚠️', title: 'Academic probation', text: `Your CGPA is ${cg.toFixed(2)}. Below 1.5 puts you on probation. Attend, study and clear your carryovers.` });
          else if (cg < 2.0) meta.notify({ icon: '⚠️', title: 'Academic warning', text: `Your CGPA is ${cg.toFixed(2)}. Raise it above 2.0 to stay in good standing.` });
          track('semester_results', { gpa: Math.round(info.gpa * 10) / 10 });
          break;
        }
        default: break;
      }
    }
  });
  if (state.clearance?.done) academics.init();      // also covers saves made before academics existed

  const events = createEvents(engine.scene, () => {});
  const eventEngine = createEventEngine({
    events, meta, sound: sfx,
    getContext: () => ({ day: day(), minutes: dayNight.state.minutes, term: state.academic?.term ?? null, academic: state.academic })
  });

  /* ---- going inside buildings ---- */
  let inside = null;                       // { place, interior } while indoors
  let activePlace = null;                  // the building you're standing next to (outside)
  let transitioning = false;
  let paused = false;                      // true while a dialog is open
  const interiors = new Map();
  const fadeEl = document.getElementById('fade');

  function fadeThrough(midpoint) {
    transitioning = true;
    fadeEl.classList.add('on');
    setTimeout(() => {
      midpoint();
      fadeEl.classList.remove('on');
      setTimeout(() => { transitioning = false; }, 250);
    }, 260);
  }
  function enterPlace(place) {
    if (transitioning || inside) return;
    fadeThrough(() => {
      let it = interiors.get(place.name);
      if (!it) {
        it = buildInterior(engine.scene, place, 400 + interiors.size * 60);   // far from the campus
        interiors.set(place.name, it);
        interiorNpcDefs(place, it).forEach(npcs.add);                          // staff, lecturers, roommates
        if (place.type === 'hostel' || place.type === 'home') Object.keys(state.meta.room).forEach(id => addDecor(it, id));
      }
      inside = { place, interior: it };
      player.group.position.set(it.spawn.x, 0, it.spawn.z);
      player.group.rotation.y = Math.PI;                                       // face the back wall
      events.setIndoors(true);
      engine.camera.position.set(it.spawn.x, 17, 16);
      sfx('door');
      meta.track('enters');
      meta.trackOnce('place', place.name, 'placesSeen');
    });
  }
  function leavePlace(instant) {
    if (!inside) return;
    const place = inside.place;
    const out = () => {
      inside = null;
      player.group.position.set(place.door.x, 0, place.door.z);
      player.group.rotation.y = 0;
      events.setIndoors(false);
      engine.camera.position.set(place.door.x, 15, place.door.z + 17);
      sfx('door');
    };
    if (instant) out(); else if (!transitioning) fadeThrough(out);
  }

  /* ---- saving ---- */
  let enrolling = false;                   // set once we travel, so unloading can't overwrite the new save
  function snapshot() {
    const p = inside ? { x: inside.place.door.x, z: inside.place.door.z } : player.group.position;
    return {
      campusId: state.campusId, name: state.name, money: state.money, needs: state.needs,
      minutes: dayNight.state.minutes, day: dayNight.state.day, x: p.x, z: p.z,
      course: state.course, aspirant: state.aspirant, admission: state.admission,
      clearance: state.clearance, hostel: state.hostel, academic: state.academic, meta: state.meta
    };
  }
  let lastSaveWarning = 0;
  function save() {
    if (enrolling) return;
    if (!writeSave(snapshot()) && Date.now() - lastSaveWarning > 60000) {
      lastSaveWarning = Date.now();
      toast('⚠️ Could not save your game. Your browser storage may be full. Open the phone, Settings, Export my save.');
    }
  }
  /** Replaces the game with an imported save and restarts (saving is blocked so the old game cannot overwrite it). */
  function applyImportedSave(imported) {
    enrolling = true;
    writeSave({ ...imported, autoResume: false });
    location.reload();
  }
  let saveTimer = 0;
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);

  /* ---- time passing (shared by the clock and by actions) ---- */
  /** Once per game day: an illness runs its course, or a new one may strike (deterministic, see health.js). */
  function dailyHealth(d) {
    const h = state.meta.health;
    if (dayPassed(h, d) === 'recovered') {
      meta.track('recoveries');
      meta.notify({ icon: '💪', title: 'You have recovered', text: 'You are feeling like yourself again.' });
    }
    const id = rollIllness({ day: d, season: seasonFor({ term: state.academic?.term ?? null, day: d }), needs: state.needs, health: h });
    if (id) {
      fallSick(h, id, d);
      meta.notify({ icon: '🤒', title: 'You are not feeling well', text: 'Weak and feverish. See a doctor at the Health Centre, or rest and sleep.' });
    }
  }

  function afterTime(_crossed, prevDay) {
    for (let d = prevDay + 1; d <= dayNight.state.day; d++) {
      dailyHealth(d);
      for (const ev of dailyBillCheck(state.meta.bills, d)) {
        if (ev.type === 'reminder') meta.notify({ icon: '💳', title: ev.bill.npc ? `Repay ${ev.bill.label.replace('Repay ', '')} tomorrow` : 'Hostel dues tomorrow', text: `${naira(owed(ev.bill))} is due tomorrow. Pay in your phone.` });
        else if (ev.bill.npc) {
          addRelation({ id: ev.bill.npc, name: ev.bill.label.replace('Repay ', '') }, -10);
          meta.notify({ icon: '😠', title: `${ev.bill.label.replace('Repay ', '')} is upset`, text: 'You have not repaid your loan. Your friendship took a hit. Pay under My room and bills.' });
        } else meta.notify({ icon: '⚠️', title: 'Late fee added', text: `Your hostel dues are overdue. A late fee was added: ${naira(owed(ev.bill))} now.` });
      }
      if ((d - 1) % 7 === 0) {
        state.money += ALLOWANCE;
        meta.ledger('Allowance from home', ALLOWANCE);
        meta.notify({ icon: '💸', title: 'Allowance don land', text: `${naira(ALLOWANCE)} from home. Spend am well!` });
        sfx('coin');
      }
    }
  }

  /* ---- JAMB results and admission ---- */
  const label = (uni, course) => `${courseOf(course).name} at ${CAMPUSES[uni].short}`;

  function resultsAction() {
    const a = state.aspirant;
    if (!a) return null;
    if (!a.jambSeen && day() >= a.jambDay) return { id: 'results', label: '📄 Check JAMB result' };
    if (a.jambSeen && !a.admitSeen && day() >= a.admitDay) return { id: 'results', label: '🎓 Check admission list' };
    return null;
  }
  function goalText() {
    if (state.admission) return `🚌 Go to the Motor Park and take a bus to ${CAMPUSES[state.admission.uni].short}`;
    if (state.clearance && !state.clearance.done) return `📋 Clearance: ${nextStep(state.clearance).name}`;
    if (state.academic) return academics.goal();
    const a = state.aspirant;
    if (!a) return state.course ? `🎓 ${courseOf(state.course).name} · ${campus.short}` : '';
    if (!a.jambSeen) return day() < a.jambDay ? `📅 JAMB result: Day ${a.jambDay}` : '📄 JAMB result is out! Check the cyber cafe';
    if (!a.admitSeen) return day() < a.admitDay ? `📅 Admission list: Day ${a.admitDay}` : '🎓 Admission list is out! Check the cyber cafe';
    return '';
  }

  async function checkResults() {
    const a = state.aspirant;
    if (!a || paused) return;
    paused = true;
    try {
      if (!a.jambSeen) {
        a.jambSeen = true;
        meta.track('jambChecked');
        const verdict = a.jamb >= 300 ? 'Excellent score! 🔥' : a.jamb >= 250 ? 'Good score. Let\'s hope the cut-off is kind.' : a.jamb >= 200 ? 'You made the 200 minimum. Pray for post-UTME.' : 'Below 200. This one na wahala.';
        await showModal({
          title: '📄 JAMB result',
          lines: [`Candidate: ${state.name}`, `UTME score: ${a.jamb} / 400`, verdict, `The admission list comes out on Day ${a.admitDay}. Check back at the cyber cafe.`],
          buttons: [{ label: 'OK', value: 'ok' }]
        });
      } else {
        a.admitSeen = true;
        await admissionFlow(a);
      }
    } finally {
      paused = false;
      save();
    }
  }

  async function admissionFlow(a) {
    const agg = aggregate(a.jamb, a.post);
    const [c1, c2] = a.choices;
    const scoreLines = [
      `UTME ${a.jamb}/400 → ${(a.jamb / 8).toFixed(2)}`,
      `Post-UTME ${a.post}/100 → ${(a.post / 2).toFixed(2)}`,
      `Your aggregate: ${agg.toFixed(2)} / 100`,
      `1st choice ${label(c1.uni, c1.course)}: cut-off ${cutoff(c1.uni, c1.course).toFixed(1)}`,
      `2nd choice ${label(c2.uni, c2.course)}: cut-off ${cutoff(c2.uni, c2.course).toFixed(1)}`
    ];
    const result = decide(a.choices, agg);

    if (result.kind === 'first' || result.kind === 'second') {
      sfx('success');
      await showModal({
        title: '🎉 Congratulations! You have been admitted',
        lines: [...scoreLines, `You got your ${result.kind === 'first' ? '1st' : '2nd'} choice: ${label(result.uni, result.course)}.`],
        buttons: [{ label: 'Get ready for school 🎒', value: 'go' }]
      });
      return admitted(result.uni, result.course);
    }

    if (result.kind === 'offer') {
      const pick = await showModal({
        title: '📬 Not admitted to your choices',
        lines: [...scoreLines, `But you qualify for an offer: ${label(result.uni, result.course)} (cut-off ${cutoff(result.uni, result.course).toFixed(1)}).`, 'Accept it, or retake JAMB next year?'],
        buttons: [{ label: `Accept: ${label(result.uni, result.course)}`, value: 'accept' }, { label: 'Decline and retake next year', value: 'retake', secondary: true }]
      });
      return pick === 'accept' ? admitted(result.uni, result.course) : retake(a);
    }

    sfx('fail');
    await showModal({
      title: '😔 No admission this year',
      lines: [...scoreLines, 'Your score is below every cut-off. Don\'t lose hope: read hard, retake next year, and you will do better.'],
      buttons: [{ label: 'Retake next year', value: 'retake' }]
    });
    return retake(a);
  }

  async function retake(a) {
    a.attempt += 1;
    meta.track('retakes');
    Object.assign(a, rollScores(a.background, a.attempt));
    a.jambDay = day() + JAMB_DAY;
    a.admitDay = a.jambDay + ADMISSION_GAP;
    a.jambSeen = false;
    a.admitSeen = false;
    a.choices = await showJambForm(a.choices);
    toast(`📚 Retake #${a.attempt - 1}: new form submitted. Results in ${JAMB_DAY} days.`);
  }

  /** Admission secured: Mum helps with money, and the next job is getting to school. */
  async function admitted(uni, course) {
    state.admission = { uni, course };
    state.aspirant = null;
    state.money += TRANSPORT_GIFT;
    meta.ledger('Mum: transport and registration', TRANSPORT_GIFT);
    meta.track('admitted');
    track('admitted', { uni });
    await showModal({
      title: '🏠 Time to get ready',
      lines: [
        `Mum gives you ${naira(TRANSPORT_GIFT)} for transport and registration.`,
        `Next: go to the Motor Park and take a bus to ${CAMPUSES[uni].short} (fare ${naira(FARE)}). Ask around if you need directions.`
      ],
      buttons: [{ label: 'Let\'s go!', value: 'ok' }]
    });
    const park = places.find(p => p.type === 'park');
    if (park) guide.set({ x: park.door.x, z: park.door.z, label: 'Motor Park' });
  }

  /** Writes the new save and reloads straight into the campus (autoResume skips the start screen). */
  function enroll(uni, course) {
    enrolling = true;
    writeSave({
      campusId: uni, name: state.name, money: state.money, needs: state.needs,
      minutes: dayNight.state.minutes, day: dayNight.state.day, x: ARRIVAL.x, z: ARRIVAL.z,
      course, aspirant: null, admission: null, hostel: null, meta: state.meta,
      clearance: { admissions: false, bursary: false, medical: false, hostel: false, done: false },
      autoResume: true
    });
    location.reload();
  }

  async function travel() {
    const adm = state.admission;
    if (!adm) return 'You have no admission yet.';
    if (state.money < FARE) return `The fare is ${naira(FARE)} and you only have ${naira(state.money)}. Check your pocket!`;
    state.money -= FARE;
    meta.ledger('Bus fare to school', -FARE);
    meta.track('busRides');
    await showModal({
      title: '🚌 On the road',
      lines: ['You squeeze into the bus. Loud music, tight seats, one very talkative passenger.', `Five hours later: "${CAMPUSES[adm.uni].name}! Everybody get down!"`],
      buttons: [{ label: 'Get down 🧳', value: 'ok' }]
    });
    const prevDay = dayNight.state.day;
    tickNeeds(state.needs, 300);
    applyEffects(state.needs, { stress: 8 });
    afterTime(dayNight.skip(300), prevDay);
    fadeEl.classList.add('on');
    await new Promise(r => setTimeout(r, 700));
    enroll(adm.uni, adm.course);
    return '';
  }

  /* ---- clearance ---- */
  function completeStep(id) {
    const cl = state.clearance;
    cl[id] = true;
    let hostel = null;
    if (id === 'hostel') {
      hostel = (places.find(p => p.type === 'hostel') || {}).name || 'your hostel';
      state.hostel = hostel;
    }
    if (DESKS.every(d => cl[d.id])) {
      cl.done = true;
      academics.init();
      meta.track('cleared');
      meta.notify({ icon: '🎓', title: `Welcome to ${campus.name}`, text: 'Clearance complete! Your first semester starts tomorrow. Open your phone for the portal.' });
      sfx('success');
      track('cleared');
    }
    guide.clear();
    save();
    return hostel;
  }

  /* ---- talking to NPCs ---- */
  const say = (npc, text, choices) => showModal({
    title: `${npc.emoji} ${npc.name}`,
    lines: [text],
    buttons: choices
  });

  function tellWay(npc, target, lead = '') {
    const w = describeWay(player.group.position, target);
    guide.set(target);
    return `${lead ? lead + ' ' : ''}${target.label} is about ${w.dist} metres ${w.dir}. I've marked it for you 📍`;
  }

  async function directions(npc) {
    const dests = places.map(p => ({ label: `${p.emoji} ${p.name}`, target: { x: p.door.x, z: p.door.z, label: p.name } }));
    if (state.clearance && !state.clearance.done) {
      DESKS.slice().reverse().forEach(d => dests.unshift({ label: `${d.emoji} ${d.name}`, target: { x: d.x, z: d.z + 3, label: d.name } }));
    }
    const pick = await showModal({
      title: `${npc.emoji} ${npc.name}`,
      lines: ['Where do you want to go?'],
      buttons: [...dests.map((d, i) => ({ label: d.label, value: i })), { label: 'Never mind', value: -1, secondary: true }]
    });
    if (pick < 0) return 'Okay, no wahala.';
    return tellWay(npc, dests[pick].target);
  }

  /* ---- relationships (spec F-120) ---- */
  const relation = npc => getRel(state.meta.relations, npc);
  function addRelation(npc, n) {
    const ch = addPoints(relation(npc), n);
    if (ch.to > ch.from) {
      const lvl = levelOf(relation(npc).points);
      meta.notify({ icon: lvl.icon, title: `${npc.name} is now your ${lvl.name.toLowerCase()}`, text: 'Your friendship is growing.' });
      if (ch.to >= 2 && ch.from < 2) meta.track('friendsMade');
      if (ch.to >= 3 && ch.from < 3) meta.track('closeFriends');
      if (ch.to >= 4 && ch.from < 4) meta.track('bestFriends');
    }
    return ch;
  }
  const weakestCourse = () => state.academic?.courses.slice().sort((a, b) => a.knowledge - b.knowledge)[0];
  function studyTogether(npc) {
    const c = weakestCourse();
    if (!c) return 'You are not enrolled in any course yet.';
    const ok = execute({ id: `study-${npc.id}`, label: 'Study together', minutes: 120, limit: 1, needsAcademic: true, fx: { energy: -8, fun: 6, hunger: -6, stress: -2 }, msg: `You and ${npc.name} studied together.` });
    if (!ok) return 'We already studied together today. Let us rest.';
    c.knowledge = Math.min(100, c.knowledge + 8);
    addRelation(npc, 3);
    return `Good session! We went through ${c.code}. (Preparation +8%)`;
  }
  function addLoan(npc) {
    if (!meta.trackOnce(`loan-${Math.floor(day() / 7)}`, npc.id, 'loansTaken')) return 'I lent you money this week already. Let us wait until next week.';
    state.money += FAVOURS.loan.amount;
    meta.ledger(`Loan from ${npc.name}`, FAVOURS.loan.amount, { count: false });
    addBill(state.meta.bills, loanBill(npc, day()));
    return `Here is ₦${FAVOURS.loan.amount.toLocaleString('en-NG')}. Pay me back within a week, please. It will show under My room and bills.`;
  }
  function borrowNotes(npc) {
    const c = weakestCourse();
    if (!c) return 'You are not enrolled in any course yet.';
    if (!meta.trackOnce(`notes-${Math.floor(day() / 7)}`, npc.id, 'notesBorrowed')) return 'You already have my notes this week.';
    c.knowledge = Math.min(100, c.knowledge + 6);
    addRelation(npc, 1);
    return `My ${c.code} notes are in your bag now. (Preparation +6%)`;
  }
  /** Parties and club meetings are a chance to meet people: those nearby warm to you a little. */
  function boostNearby() {
    const p = player.group.position;
    npcs.list.filter(n => n.where === null && n.present && n.dialogue === 'student' && Math.hypot(n.char.group.position.x - p.x, n.char.group.position.z - p.z) < 22)
      .slice(0, 4).forEach(n => addRelation(n, 2));
  }

  const talkContext = {
    relation,
    addRelation,
    addLoan,
    studyTogether,
    borrowNotes,
    state,
    campus,
    meta,
    FARE,
    say,
    directions,
    tellWay,
    travel,
    completeStep,
    day,
    world: () => eventEngine.current,
    doAction: a => execute(a),
    directionsTo: name => {
      const p = places.find(x => x.name === name);
      return p ? tellWay(null, { x: p.door.x, z: p.door.z, label: p.name }) : 'I am not sure where that is on this campus.';
    },
    uniName: id => CAMPUSES[id].name,
    uniShort: id => CAMPUSES[id].short,
    guideTo: t => guide.set(t),
    pay: n => { if (state.money < n) return false; state.money -= n; meta.ledger('Payment', -n); return true; },
    give: n => { state.money += n; meta.ledger('Money received', n); }
  };

  async function runTalk(npc) {
    if (paused || transitioning) return;
    const run = ALL_DIALOGUES[npc.dialogue];
    if (!run) return;
    paused = true;
    meta.track('talks');
    meta.trackOnce('met', npc.id, 'peopleMet');
    const gain = dailyChat(relation(npc), day());
    if (gain) addRelation(npc, gain);
    try { await run(talkContext, npc); }
    finally { paused = false; save(); }
  }

  /* ---- phone and dialogs (these pause the game while open) ---- */
  async function runModal(fn) {
    if (paused || transitioning) return;
    paused = true;
    try { await fn(); }
    finally { paused = false; save(); }
  }
  const phone = createPhone({
    state, meta, academics, day,
    give: n => { state.money += n; },
    spend: n => { if (state.money < n) return false; state.money -= n; return true; },
    onSettingsChanged: () => { applySettings(engine); syncAudio(); minimap.setVisible(settings.minimap); },
    onOpenMap: () => mapUI.open(),
    getSnapshot: () => snapshot(),
    applyImportedSave,
    payBill: id => {
      const bill = state.meta.bills.find(b => b.id === id);
      const r = payHostelBill(state.meta.bills, id, state.money);
      if (r.ok) {
        state.money -= r.cost;
        meta.ledger(bill.npc ? bill.label : 'Hostel dues', -r.cost, { count: !bill.npc });
        if (bill.npc) addRelation({ id: bill.npc, name: bill.label.replace('Repay ', '') }, 3); else meta.track('billsPaid');
        sfx('coin');
      }
      return r.message;
    }
  });
  onSettingChange(() => { applySettings(engine); syncAudio(); });
  document.getElementById('portalbtn').addEventListener('click', () => { sfx('click'); runModal(() => phone.open()); });
  document.getElementById('aboutbtn').addEventListener('click', () => {
    document.getElementById('menu').classList.remove('open');
    runModal(() => openAbout(showModal));
  });
  document.getElementById('feedbackbtn').addEventListener('click', () => {
    document.getElementById('menu').classList.remove('open');
    runModal(() => openFeedback(() => ({ state, day: day() })));
  });
  const ACADEMIC_ACTIONS = new Set(['attend', 'study', 'assign', 'ca', 'exam']);

  /** Spends game time and applies need changes (shared by building actions and academics). */
  function consume({ minutes, fx, sleep }) {
    const prevDay = dayNight.state.day;
    if (!sleep) tickNeeds(state.needs, minutes);
    applyEffects(state.needs, fx);
    afterTime(dayNight.skip(minutes), prevDay);
  }

  /* ---- actions ---- */
  function canDo(a) {
    if (a.cost && state.money < a.cost) return false;
    if (a.needs) for (const k of Object.keys(a.needs)) if (state.needs[k] < a.needs[k]) return false;
    return true;
  }

  /** Runs a building action (jobs, food, sleep...). Returns true if it happened. */
  function execute(a) {
    if (a.needsPantry && state.meta.pantry < a.needsPantry) { toast('No foodstuff left. Buy some at a market or provision store.'); return false; }
    if (a.decor && state.meta.room[a.decor]) { toast('You already have that in your room.'); return false; }
    if (a.id === 'cook' && cookBurns(Math.random())) {
      a = { ...a, fx: { ...a.fx, hunger: 22, fun: -3 }, msg: 'You burnt the stew. You ate what you could.' };
    }
    if (!canDo(a)) {
      toast(a.cost && state.money < a.cost ? 'Money no reach. Sapa dey!' : 'You are too tired for that.');
      return false;
    }
    if (a.needsPower && eventEngine.current?.powerCut) {
      toast('💡 NEPA took the light. That has to wait until power returns.');
      hints.show('power');
      return false;
    }
    if (a.needsAcademic && !state.academic) { toast('That is for enrolled students.'); return false; }
    const health = state.meta.health;
    if (a.pay && health.sick) { toast('🤒 You are too sick to work. Rest or see a doctor.'); return false; }
    if (a.id === 'drugs' && !(health.sick && health.sick.diagnosed)) { toast(health.sick ? 'See the doctor first so you get the right drugs.' : 'You are not sick. No drugs needed.'); return false; }
    if (a.id === 'buynet' && health.net) { toast('You already have a mosquito net.'); return false; }
    if (a.limit) {
      const j = state.meta.jobs[a.id] || (state.meta.jobs[a.id] = { day: 0, n: 0 });
      if (j.day !== day()) { j.day = day(); j.n = 0; }
      if (j.n >= a.limit) { toast('You have done enough of that for today. Come back tomorrow.'); return false; }
      j.n += 1;
    }
    const delta = (a.pay || 0) - (a.cost || 0);
    state.money += delta;
    if (delta) meta.ledger(a.label.replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s*\(.*\)\s*$/, '').trim() || a.id, delta);
    if (a.id === 'handouts') academics.boostAll(5);
    consume({ minutes: a.minutes, fx: a.fx, sleep: a.sleep });
    if (a.pay) { meta.track('shifts'); sfx('coin'); }
    if (MEAL_IDS.has(a.id)) meta.track('meals');
    if (a.id === 'sleep') meta.track('sleeps');
    if (a.id === 'bathe') meta.track('bathes');
    if (a.id === 'sleep') { rest(health, 8); applyEffects(state.needs, { stress: -restBonus(state.meta.room) }); }
    if (a.socialBoost) boostNearby();
    if (a.clubId) meta.track('clubMeetings');
    if (a.id === 'party') meta.track('parties');
    if (a.id === 'foodstuff') state.meta.pantry += 4;
    if (a.id === 'cook') { state.meta.pantry -= 1; meta.track('cooked'); }
    if (a.decor) {
      state.meta.room[a.decor] = true;
      meta.track('decorBought');
      for (const it of interiors.values()) addDecor(it, a.decor);
    }
    if (a.id === 'buynet') { health.net = true; meta.track('netBought'); }
    if (a.id === 'consult') {
      meta.track('doctorVisits');
      health.visits += 1;
      const ill = diagnose(health);
      meta.notify({ icon: '🩺', title: ill ? `Diagnosis: ${ill.name}` : 'Clean bill of health', text: ill ? `${ill.note} Buy the prescribed drugs at the pharmacy counter.` : 'The doctor says you are healthy. Keep it up!' });
    }
    if (a.id === 'drugs') {
      recover(health, day());
      meta.track('recoveries');
      meta.notify({ icon: '💪', title: 'You have recovered', text: 'The medicine worked.' });
    }
    toast(a.msg);
    save();
    return true;
  }

  function perform(a) {
    sfx('click');
    if (a.id === 'enter') { if (activePlace) enterPlace(activePlace); return; }
    if (a.id === 'exit') { leavePlace(false); return; }
    if (a.id === 'results') { checkResults(); return; }
    if (a.id === 'talk') { runTalk(a.npc); return; }
    if (ACADEMIC_ACTIONS.has(a.id)) { runModal(() => academics.run(a)); return; }
    execute(a);
  }

  function faint() {
    leavePlace(true);
    const home = places.find(p => p.type === 'hostel' || p.type === 'home') || places[0];
    player.group.position.set(home.door.x, 0, home.door.z);
    const prevDay = dayNight.state.day;
    const fee = Math.min(state.money, 1500);
    state.money -= fee;
    if (fee) meta.ledger('Nurse (you fainted)', -fee);
    state.needs.energy = 40;
    state.needs.hunger = Math.max(state.needs.hunger, 25);
    afterTime(dayNight.skip(360), prevDay);
    toast(`🚑 You fainted! Carried home (${naira(fee)} for the nurse).`);
    save();
  }

  /* ---- menu ---- */
  const menuLabel = state.aspirant || state.admission ? 'JAMB aspirant' : campus.short;
  document.getElementById('menuTitle').textContent = `${state.name} · ${menuLabel}`;
  document.getElementById('resume').addEventListener('click', () => document.getElementById('menu').classList.remove('open'));
  document.getElementById('newgame').addEventListener('click', () => {
    if (confirm('Erase your save and start again?')) { clearSave(); location.reload(); }
  });

  /* ---- main loop ---- */
  const camTarget = new THREE.Vector3();
  const badge = document.getElementById('badge');
  let blackoutAmount = 0;
  let prev = performance.now();
  let playTime = 0;

  /* ---- map, auto-walk and fast travel (spec F-043, F-046) ---- */
  let autoWalk = null;                         // { path, i } while the character walks itself somewhere
  const getMapScene = () => ({
    campus,
    places,
    desks: state.clearance && !state.clearance.done ? DESKS : [],
    player: player.group.position,
    npcs: npcs.list.filter(n => n.where === null).map(n => ({ x: n.char.group.position.x, z: n.char.group.position.z })),
    target: guide.target,
    indoors: !!inside
  });
  const mapUI = createMapUI({ getScene: getMapScene, onDestination: dest => runModal(() => chooseTrip(dest)) });
  const minimap = createMinimap({ getScene: getMapScene, onTap: () => { sfx('click'); mapUI.open(); } });
  minimap.setVisible(settings.minimap);

  async function chooseTrip(dest) {
    const dist = Math.hypot(dest.x - player.group.position.x, dest.z - player.group.position.z);
    const opt = id => `${MODES[id].icon} ${MODES[id].name}${id === 'walk' ? ' (free' : ` (${naira(fareFor(id, dist))}`}, about ${minutesFor(id, dist)} min)`;
    const pick = await showModal({
      title: `${dest.emoji} ${dest.label}`,
      lines: [`About ${Math.round(dist)} metres from you.`],
      buttons: [
        { label: '📍 Show it on my screen', value: 'guide' },
        { label: opt('walk'), value: 'walk' },
        { label: opt('keke'), value: 'keke' },
        { label: opt('okada'), value: 'okada' },
        { label: 'Cancel', value: 'x', secondary: true }
      ]
    });
    if (pick === 'guide') guide.set({ x: dest.x, z: dest.z, label: dest.label });
    else if (pick === 'walk') startWalk(dest);
    else if (pick === 'keke' || pick === 'okada') rideTo(dest, pick);
  }

  function startWalk(dest) {
    if (inside) { toast('Step outside first.'); return; }
    const path = findPath(navGrid, player.group.position, dest);
    if (!path) { toast('There is no way through to there.'); return; }
    autoWalk = { path, i: 0 };
    toast(`🚶 Walking to ${dest.label}. Move the joystick to stop.`);
  }

  function rideTo(dest, modeId) {
    if (inside) { toast('Step outside first.'); return false; }
    const dist = Math.hypot(dest.x - player.group.position.x, dest.z - player.group.position.z);
    const fare = fareFor(modeId, dist);
    if (state.money < fare) { toast('Money no reach for that ride. Try walking!'); return false; }
    state.money -= fare;
    meta.ledger(`${MODES[modeId].name} ride`, -fare);
    meta.track('rides');
    const scare = modeId === 'okada' && okadaScare(Math.random());
    consume({ minutes: minutesFor(modeId, dist), fx: { stress: scare ? 8 : modeId === 'okada' ? 2 : 0, energy: -1 } });
    autoWalk = null;
    fadeThrough(() => {
      player.group.position.set(dest.x, 0, dest.z);
      resolveCollisions(player.group.position, colliders);
      engine.camera.position.set(dest.x, 15, dest.z + 17);
    });
    toast(scare ? '🛵 The rider zig-zagged through traffic. You arrived shaken!' : `${MODES[modeId].icon} You arrived at ${dest.label}.`);
    save();
    return true;
  }

  /** While auto-walking, steer the character toward the next waypoint. Moving the joystick cancels it. */
  function driveAutoWalk(v) {
    if (!autoWalk) return v;
    if (inside || v.len > 0.08) { autoWalk = null; return v; }
    const wp = autoWalk.path[autoWalk.i];
    const dx = wp.x - player.group.position.x, dz = wp.z - player.group.position.z, d = Math.hypot(dx, dz);
    if (d < 0.7) {
      autoWalk.i += 1;
      if (autoWalk.i >= autoWalk.path.length) { autoWalk = null; toast('📍 You have arrived.'); }
      return { x: 0, y: 0, len: 0 };
    }
    return { x: dx / d, y: dz / d, len: 1 };
  }

  function nearestPlace(p) {
    let best = null, bestD = REACH;
    for (const pl of places) {
      const dx = Math.max(Math.abs(p.x - pl.x) - pl.hw, 0);
      const dz = Math.max(Math.abs(p.z - pl.z) - pl.hd, 0);
      const d = Math.hypot(dx, dz);
      if (d < bestD) { bestD = d; best = pl; }
    }
    return best;
  }

  function update(dt) {
    playTime += dt;
    const prevDay = dayNight.state.day;
    afterTime(dayNight.advance(dt), prevDay);
    tickNeeds(state.needs, dt * 2);           // 2 game minutes per real second (matches the clock)
    if (state.needs.energy <= 0.5) faint();
    meta.refreshDay();
    setSickness(state.meta.health.sick ? 1 : 0);

    // "sapa" tracking for the Sapa Survivor achievement
    const c = state.meta.counters;
    if (state.money < 500) c.sapaNow = 1;
    else if (c.sapaNow) { c.sapaNow = 0; meta.track('sapaRecovered'); }

    const world = eventEngine.update();
    events.update(dt, player.group.position);
    const { night } = dayNight.apply(engine, { raining: events.raining, haze: events.haze, blackout: events.blackout });
    if (inside) {                             // rooms stay lit regardless of the time of day
      engine.ambient.intensity = Math.max(engine.ambient.intensity, 0.95 * Math.PI);
      engine.sun.intensity = Math.max(engine.sun.intensity, 0.5 * Math.PI);
      engine.scene.fog.near = 60; engine.scene.fog.far = 160;
    }

    const target = events.blackout ? (night > 0.35 ? 0.55 : 0.28) : 0;
    blackoutAmount += (target - blackoutAmount) * Math.min(1, dt * 2);
    const weatherIcon = events.blackout ? '💡' : events.raining ? '🌧️' : events.haze ? '🌫️' : events.strike ? '📢' : '☀️';
    for (const ev of academics.tick()) {
      if (ev === 'graduated') runModal(() => academics.graduationModal());
    }
    const unread = meta.unread();
    badge.hidden = !unread;
    badge.textContent = unread > 9 ? '9+' : String(unread);
    hud.update({
      minutes: dayNight.state.minutes, day: dayNight.state.day, weatherIcon, blackoutAmount,
      needs: state.needs, money: state.money, goal: goalText(), weekday: academics.weekday(),
      status: statusLabel(state.meta.health)
    });

    // movement
    const v = driveAutoWalk(input.read());
    if (v.len > 0.08) {
      player.group.position.x += v.x * SPEED * dt;
      player.group.position.z += v.y * SPEED * dt;
      player.group.rotation.y = Math.atan2(v.x, v.y);
    }
    if (inside) resolveCollisions(player.group.position, inside.interior.colliders, 0.75, inside.interior.bounds);
    else resolveCollisions(player.group.position, colliders);
    player.update(dt, v.len);
    const where = inside ? inside.place.name : null;
    if (!inside) updateDoors(places, player.group.position, dt);
    npcs.update(dt, player.group.position, where, dayNight.state.minutes / 60);
    if (guide.update(player.group.position, !!inside)) toast('📍 You have arrived.');

    // what can I do here?
    const p = player.group.position;
    let panelPlace = null, actions = [], note = '';
    activePlace = null;
    const npc = npcs.nearest(p, inside ? TALK_REACH_INSIDE : TALK_REACH, where);
    if (npc) {
      panelPlace = { name: npc.name, emoji: npc.emoji };
      actions = [{ id: 'talk', label: '💬 Talk', npc }];
      const rel = state.meta.relations[npc.id];
      note = rel && rel.points >= 8 ? `${npc.role} · ${levelOf(rel.points).name}` : npc.role;
    } else if (inside) {
      const it = inside.interior;
      if (Math.hypot(p.x - it.exit.x, p.z - it.exit.z) < it.exit.r) {
        panelPlace = { name: `${inside.place.name} › Exit`, emoji: '🚪' };
        actions = [{ id: 'exit', label: '🚪 Leave building' }];
      } else {
        let best = null, bestD = Infinity;
        for (const s of it.spots) {
          const d = Math.hypot(p.x - s.x, p.z - s.z);
          if (d < s.r && d < bestD) { bestD = d; best = s; }
        }
        if (best) {
          panelPlace = { name: best.name, emoji: best.emoji };
          actions = (ACTIONS[inside.place.type] || []).filter(a => best.actionIds.includes(a.id));
          note = best.note || '';
          if (best.actionIds.includes('lecture')) {
            const r = academics.lectureActions(inside.place.name);
            actions = r.actions; note = r.note;
          } else if (best.actionIds.includes('library')) {
            const r = academics.libraryActions();
            actions = [...r.actions, ...(ACTIONS.library || [])]; note = r.note;
          }
          if (best.actionIds.includes('results')) {
            const r = resultsAction();
            if (r) actions = [r, ...actions];
            else if (state.aspirant) note = goalText();
          }
        }
      }
    } else {
      const place = nearestPlace(p);
      if (place) {
        panelPlace = place;
        if (ENTERABLE.has(place.type)) {
          activePlace = place;
          actions = [{ id: 'enter', label: '🚪 Enter' }];
        } else {
          const sd = academics.semDay();
          const social = state.academic && state.academic.phase !== 'pre'
            ? socialActions({ venue: place.type, sd, hour: dayNight.state.minutes / 60, clubs: state.meta.clubs }) : [];
          actions = [...(ACTIONS[place.type] || []), ...social];
          if (!actions.length) note = COMING_SOON[place.type] || '';
        }
      }
    }
    hud.setPlace(panelPlace, actions, note, perform);
    hud.refreshButtons(canDo);

    // tutorial hints: each appears once, the first time it is relevant
    if (!paused && settings.hints) {
      if (playTime > 1) hints.show('move');
      else if (playTime > 16) hints.show('goal');
      if (Object.values(state.needs).some((val, i) => (i === 4 ? 100 - val : val) < 45)) hints.show('needs');
      if (npc) { hints.show('talk'); if (npc.dialogue === 'student' || npc.dialogue === 'roommate') hints.show('social'); }
      if (activePlace) hints.show('enter');
      if (unread > 0 && !state.academic) hints.show('phone');
      if (state.academic) hints.show('portal');
      if (inside?.place.type === 'lecture') hints.show('lecture');
      if (inside?.place.type === 'library') hints.show('library');
      if (actions.some(a => a.pay)) hints.show('work');
      if (world.powerCut) hints.show('power');
      if (state.meta.health.sick) hints.show('health');
    }

    updateSigns(engine.camera.position);
    minimap.update(performance.now());

    // follow camera
    if (inside) {
      const ox = inside.interior.exit.x;
      const cx = ox + (p.x - ox) * 0.75, cz = p.z * 0.3;
      camTarget.set(cx, 17, cz + 15);
      engine.camera.position.lerp(camTarget, Math.min(1, dt * 5));
      engine.camera.lookAt(cx, 0.5, cz - 1);
    } else {
      camTarget.set(p.x, 15, p.z + 17);
      engine.camera.position.lerp(camTarget, Math.min(1, dt * 5));
      engine.camera.lookAt(p.x, 1.5, p.z);
    }

    saveTimer += dt;
    if (saveTimer > 5) { saveTimer = 0; save(); }
  }

  function frame(now) {
    const dt = paused ? 0 : Math.min(0.05, (now - prev) / 1000);
    prev = now;
    update(dt);
    engine.renderer.render(engine.scene, engine.camera);
    requestAnimationFrame(frame);
  }

  engine.camera.position.set(state.x, 15, state.z + 17);
  if (state.admission) {                      // reloaded while preparing to travel: point at the motor park again
    const park = places.find(p => p.type === 'park');
    if (park) guide.set({ x: park.door.x, z: park.door.z, label: 'Motor Park' });
  }
  if (lastLoadNote === 'damaged') toast('🛠️ Your save was damaged, so it was restored from a recent backup.');
  meta.refreshDay();
  meta.claimLogin();                          // daily login bonus and streak
  track('session_start', { student: !!state.academic });
  save();
  requestAnimationFrame(frame);

  // Offline support for installed/production builds
  if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => {});

  // Debug helpers: __campus.setHour(19), __campus.setDay(3), __campus.state, __campus.enter(place) ...
  window.__campus = {
    start: events.start, setHour: dayNight.setHour, setDay: d => { dayNight.state.day = d; },
    state, places, player, npcs, guide, enter: enterPlace, leave: leavePlace, get inside() { return inside; },
    checkResults, admitted, runTalk, academics, consume, meta, eventEngine, execute, phone, hints,
    openPhone: () => runModal(() => phone.open()),
    mapUI, startWalk, rideTo, navGrid, get autoWalk() { return autoWalk; },
    addRelation, relation, boostNearby, engine
  };
}

main();
