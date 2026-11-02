import { describe, it, expect } from 'vitest';
import {
  newPeople, ensurePeople, weekOf, weekdayOf,
  ROOMMATE_ARCS, nextRoommateArc, startStories, resolveRoommateArc, roommateNameFor, MOOD_MAX, MOOD_MIN,
  canAskMentor, chooseMentor, mentorWeekly, releaseMentor, MENTOR_TIPS,
  inviteToGroup, groupSession, canGroupSession, leaveGroup, MAX_GROUP, inGroup,
  rivalFor, rivalCa, rivalCaGist, rivalResultsGist, RIVAL_NAMES,
  CLUB_STORIES, storyStatus, advanceStory,
  friendEventFor, FRIEND_EVENTS, isBirthday, birthdayDay, markEventDone,
  FAITH, FAITH_BUILDINGS, faithServices, faithPanel, REFLECT, peopleStaff, setRivalSeed,
  CRUSH_STEPS, crushOffer, crushAnswer, crushStayFriends, peopleSummary
} from '../src/people.js';
import { CLUBS } from '../src/social.js';
import { CAMPUSES, CAMPUS_ORDER } from '../src/campuses.js';
import { newMeta, migrate } from '../src/save.js';
import { DEFAULTS } from '../src/settings.js';
import { personaFor } from '../src/ainpc.js';
import { BOUNDS } from '../src/world.js';
import { ENTERABLE } from '../src/interiors.js';

describe('people state and saves', () => {
  it('is part of a new save, and old saves without it get it', () => {
    expect(newMeta().people).toEqual(newPeople());
    const old = migrate({ v: 3, campusId: 'ui', name: 'Ada', meta: { relations: {} } });
    expect(old.meta.people.roommate.mood).toBe(0);
    expect(migrate({ v: 2, campusId: 'ui', name: 'Ada' }).meta.people.group.members).toEqual([]);
  });
  it('repairs partial data without losing it', () => {
    const meta = { people: { mentor: { id: 'seun', name: 'Seun' }, group: { members: 'bad' } } };
    const p = ensurePeople(meta);
    expect(p.mentor.id).toBe('seun');
    expect(p.mentor.tips).toBe(0);
    expect(p.group.members).toEqual([]);
    expect(p.story).toEqual({});
  });
  it('knows weeks and weekdays', () => {
    expect(weekOf(6)).toBe(0); expect(weekOf(7)).toBe(1);
    expect([1, 7, 8, 0, -1].map(weekdayOf)).toEqual([1, 7, 1, 7, 6]);
  });
});

describe('roommate stories', () => {
  it('keeps the same roommate name the hostel always used', () => {
    expect(roommateNameFor('Moremi Hall')).toBe(['Emeka', 'Dami', 'Kunle', 'Chuka'][11 % 4]);
  });
  it('has 4 arcs with 2 or 3 choices each, and a bad choice never costs money', () => {
    expect(ROOMMATE_ARCS.length).toBeGreaterThanOrEqual(4);
    for (const a of ROOMMATE_ARCS) {
      expect(a.choices.length).toBeGreaterThanOrEqual(2);
      expect(a.choices.length).toBeLessThanOrEqual(3);
      expect(a.choices.some(c => c.mood > 0), a.id).toBe(true);
    }
  });
  it('offers one arc at a time, in order, one a day, never twice', () => {
    const p = newPeople();
    expect(nextRoommateArc(p, 10)).toBeNull();                 // not started
    startStories(p, 10);
    expect(nextRoommateArc(p, 10).id).toBe('borrow');
    expect(resolveRoommateArc(p, 'borrow', 'talk', 10)).toBeTruthy();
    expect(nextRoommateArc(p, 10)).toBeNull();                  // one a day
    expect(nextRoommateArc(p, 11)).toBeNull();                  // next arc needs 2 days
    expect(nextRoommateArc(p, 12).id).toBe('clean');
    expect(resolveRoommateArc(p, 'borrow', 'talk', 12)).toBeNull();   // already done
    expect(resolveRoommateArc(p, 'clean', 'nope', 12)).toBeNull();    // unknown choice
  });
  it('changes mood and keeps it in range', () => {
    const p = newPeople();
    startStories(p, 1);
    for (let i = 0; i < 4; i++) resolveRoommateArc(p, ROOMMATE_ARCS[i].id, ROOMMATE_ARCS[i].choices[0].id, 100 + i);
    expect(p.roommate.mood).toBeLessThanOrEqual(MOOD_MAX);
    const q = newPeople();
    for (let i = 0; i < 4; i++) resolveRoommateArc(q, ROOMMATE_ARCS[i].id, ROOMMATE_ARCS[i].choices.find(c => c.mood < 0)?.id || ROOMMATE_ARCS[i].choices.at(-1).id, 100 + i);
    expect(q.roommate.mood).toBeGreaterThanOrEqual(MOOD_MIN);
  });
});

describe('mentors', () => {
  it('needs a little friendship first, and only one mentor', () => {
    const p = newPeople();
    expect(canAskMentor(p, 0).ok).toBe(false);
    expect(chooseMentor(p, { id: 'seun', name: 'Seun' }, 3).ok).toBe(true);
    expect(canAskMentor(p, 99).ok).toBe(false);
    releaseMentor(p);
    expect(canAskMentor(p, 99).ok).toBe(true);
  });
  it('gives one tip a week, sometimes with notes (a bigger boost)', () => {
    const p = newPeople();
    chooseMentor(p, { id: 'seun', name: 'Seun' }, 1);
    const first = mentorWeekly(p, 14);
    expect(first.ok).toBe(true);
    expect(MENTOR_TIPS).toContain(first.text);
    expect(mentorWeekly(p, 15).ok).toBe(false);                 // same week
    let withNotes = 0, plain = 0;
    for (let d = 21; d < 21 + 7 * 40; d += 7) { const r = mentorWeekly(p, d); expect(r.ok).toBe(true); if (r.notes) { withNotes++; expect(r.prep).toBeGreaterThan(3); } else plain++; }
    expect(withNotes).toBeGreaterThan(5);
    expect(plain).toBeGreaterThan(5);
  });
  it('does nothing without a mentor', () => { expect(mentorWeekly(newPeople(), 20).ok).toBe(false); });
});

describe('study groups', () => {
  const npc = n => ({ id: `s${n}`, name: `Student ${n}` });
  it('needs friendship, remembers members and caps the size', () => {
    const p = newPeople();
    expect(inviteToGroup(p, npc(1), 0, 5).ok).toBe(false);
    for (let i = 1; i <= MAX_GROUP; i++) expect(inviteToGroup(p, npc(i), 10, 5).ok).toBe(true);
    expect(inviteToGroup(p, npc(9), 10, 5).ok).toBe(false);
    expect(inviteToGroup(p, npc(1), 10, 5).ok).toBe(false);     // already in
    expect(p.group.members.map(m => m.name)).toContain('Student 2');
    expect(inGroup(p, 's1')).toBe(true);
    leaveGroup(p, 's1');
    expect(inGroup(p, 's1')).toBe(false);
  });
  it('allows one boosted session a week, bigger groups help a little more but with a limit', () => {
    const p = newPeople();
    expect(canGroupSession(p, 14).ok).toBe(false);
    inviteToGroup(p, npc(1), 10, 14);
    expect(canGroupSession(p, 14).ok).toBe(true);
    const a = groupSession(p, 14);
    expect(a.ok).toBe(true);
    expect(groupSession(p, 16).ok).toBe(false);
    expect(canGroupSession(p, 16).ok).toBe(false);
    inviteToGroup(p, npc(2), 10, 14); inviteToGroup(p, npc(3), 10, 14);
    const b = groupSession(p, 21);
    expect(b.prep).toBeGreaterThan(a.prep);
    expect(b.prep).toBeLessThanOrEqual(10);
    expect(p.group.sessions).toBe(2);
  });
});

describe('the friendly rival', () => {
  it('is deterministic and always has a name from the list', () => {
    expect(rivalFor('Ada|cs')).toEqual(rivalFor('Ada|cs'));
    expect(RIVAL_NAMES).toContain(rivalFor('x').name);
  });
  it('stays close to your score', () => {
    for (const mine of [0, 0.2, 0.6, 1]) expect(Math.abs(rivalCa('Ife', 'CSC101', mine) - mine)).toBeLessThanOrEqual(0.45);
  });
  it('says something kind whether you win, lose or draw', () => {
    const lines = [];
    for (const name of RIVAL_NAMES) for (const s of [0.2, 0.5, 0.8, 1]) {
      const g = rivalCaGist(name, [{ code: 'A1', ca: s }, { code: 'B2', ca: s }]);
      expect(['ahead', 'behind', 'level']).toContain(g.result);
      lines.push(g.text);
      lines.push(rivalResultsGist(name, [{ code: 'A1', total: s * 100 }, { code: 'B2', total: s * 90 }], 1).text);
    }
    expect(lines.join(' ')).not.toMatch(/stupid|fool|loser|dumb|idiot|hate|useless|pathetic|worst/i);
    expect(new Set(lines).size).toBeGreaterThan(5);
  });
  it('waits until a CA has been written', () => {
    expect(rivalCaGist('Ife', [{ code: 'A', ca: null }]).result).toBeNull();
    expect(rivalResultsGist('Ife', []).result).toBeNull();
  });
});

describe('club storylines', () => {
  it('has three short chapters for every club, each with two choices', () => {
    for (const c of CLUBS) {
      const s = CLUB_STORIES[c.id];
      expect(s, c.id).toBeTruthy();
      expect(s.chapters).toHaveLength(3);
      s.chapters.forEach(ch => expect(ch.choices).toHaveLength(2));
      expect(Object.keys(s.end)).toEqual(['0', '1', '2']);
    }
  });
  it('needs meetings and a short gap between chapters, then finishes with an ending', () => {
    const p = newPeople();
    expect(storyStatus(p, 'debate', { day: 10, meetings: 0 }).state).toBe('locked');
    expect(storyStatus(p, 'debate', { day: 10, meetings: 1 }).state).toBe('ready');
    advanceStory(p, 'debate', 0, 10);
    expect(storyStatus(p, 'debate', { day: 11, meetings: 5 }).state).toBe('wait');
    expect(storyStatus(p, 'debate', { day: 12, meetings: 1 }).state).toBe('locked');
    expect(storyStatus(p, 'debate', { day: 12, meetings: 2 }).state).toBe('ready');
    advanceStory(p, 'debate', 0, 12);
    const last = advanceStory(p, 'debate', 0, 14);
    expect(last.finished).toBe(true);
    expect(last.endText).toBe(CLUB_STORIES.debate.end[2]);
    expect(storyStatus(p, 'debate', { day: 20, meetings: 9 }).state).toBe('done');
    expect(advanceStory(p, 'debate', 0, 20)).toBeNull();
  });
  it('never makes the player fail: even the lowest ending is encouraging', () => {
    for (const s of Object.values(CLUB_STORIES)) expect(s.end[0]).not.toMatch(/fail|lose|useless|bad/i);
  });
});

describe('friendship events', () => {
  it('has a stable birthday for each friend', () => {
    const d = birthdayDay('crowd-3');
    expect(isBirthday('crowd-3', d)).toBe(true);
    expect(isBirthday('crowd-3', d + 28)).toBe(true);
    expect(isBirthday('crowd-3', d + 1)).toBe(false);
  });
  it('offers a birthday surprise only to friends, once per birthday', () => {
    const p = newPeople(), d = birthdayDay('f1') + 28 * 3;
    expect(friendEventFor(p, { npcId: 'f1', name: 'F', relPoints: 5, day: d, sd: 3 })).toBeNull();
    const ev = friendEventFor(p, { npcId: 'f1', name: 'F', relPoints: 30, day: d, sd: 3 });
    expect(ev.id).toBe('birthday');
    markEventDone(p, ev.key, d);
    expect(friendEventFor(p, { npcId: 'f1', name: 'F', relPoints: 30, day: d, sd: 3 })?.id).not.toBe('birthday');
  });
  it('offers help moving in only at the start of a semester, and each one has an easy way to decline', () => {
    const p = newPeople();
    let move = 0;
    for (let i = 0; i < 60; i++) { const ev = friendEventFor(p, { npcId: `n${i}`, name: 'N', relPoints: 10, day: 2 + 28 * i + 1, sd: 2 }); if (ev?.id === 'move') move++; }
    expect(move).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) expect(friendEventFor(p, { npcId: `n${i}`, name: 'N', relPoints: 10, day: 100 + i, sd: 5 })?.id).not.toBe('move');
    for (const e of Object.values(FRIEND_EVENTS)) expect(e.choices.some(c => !c.cost && !c.fx), e.title).toBe(true);
  });
});

describe('chapel and mosque', () => {
  it('sit on every campus, inside the map, clear of every other building and the paths', () => {
    expect(ENTERABLE.has('chapel') && ENTERABLE.has('mosque')).toBe(true);
    for (const id of CAMPUS_ORDER) {
      const list = CAMPUSES[id].buildings;
      for (const t of ['chapel', 'mosque']) expect(list.filter(b => b.type === t), `${id} ${t}`).toHaveLength(1);
      for (const b of list.filter(b => FAITH_BUILDINGS.some(f => f.name === b.name))) {
        expect(b.x - b.w / 2).toBeGreaterThan(BOUNDS.minX + 3);
        expect(Math.abs(b.x) - b.w / 2 > 4 || Math.abs(b.z) > 6).toBe(true);
        for (const o of [...list, { ...CAMPUSES[id].field, x: CAMPUSES[id].field.x, z: CAMPUSES[id].field.z }]) {
          if (o === b) continue;
          const gap = 3;     // trees and the door area need space
          const overlap = Math.abs(o.x - b.x) < (o.w + b.w) / 2 + gap && Math.abs(o.z - b.z) < (o.d + b.d) / 2 + gap;
          expect(overlap, `${id}: ${b.name} overlaps ${o.name}`).toBe(false);
        }
      }
    }
  });
  it('has service times that open and close on the right days', () => {
    expect(faithServices('chapel', { sd: 7, hour: 9 })).toHaveLength(1);
    expect(faithServices('chapel', { sd: 7, hour: 12 })).toHaveLength(0);
    expect(faithServices('chapel', { sd: 3, hour: 17.5 })[0].label).toMatch(/midweek/i);
    expect(faithServices('mosque', { sd: 5, hour: 13.5 })).toHaveLength(1);
    expect(faithServices('mosque', { sd: 2, hour: 13.5 })).toHaveLength(0);
    expect(faithServices('mosque', { sd: 2, hour: 18.5 })).toHaveLength(1);          // evening prayer every day
  });
  it('offers a quiet reflection that lowers stress, to anyone, in opening hours only', () => {
    const open = faithPanel('chapel', 'reflect', { sd: 2, hour: 12 });
    expect(open.actions[0]).toBe(REFLECT);
    expect(REFLECT.fx.stress).toBeLessThan(0);
    expect(REFLECT.limit).toBeGreaterThan(0);
    expect(faithPanel('mosque', 'reflect', { sd: 2, hour: 23 }).actions).toHaveLength(0);
    expect(faithPanel('mosque', 'service', { sd: 2, hour: 12 }).note).toMatch(/Friday/);
  });
  it('has a chaplain and an imam, a coordinator and a rival where they belong', () => {
    const base = { x: 0, z: 0, where: 'X', face: 0 };
    expect(peopleStaff({ type: 'chapel', name: 'C' }, base)[0].dialogue).toBe('chaplain');
    expect(peopleStaff({ type: 'mosque', name: 'M' }, base)[0].dialogue).toBe('imam');
    expect(peopleStaff({ type: 'auditorium', name: 'A' }, base)[0].dialogue).toBe('clubleader');
    setRivalSeed('Ada|cs');
    const r = peopleStaff({ type: 'lecture', name: 'L' }, base)[0];
    expect(r.dialogue).toBe('rival');
    expect(r.name).toBe(rivalFor('Ada|cs').name);
    expect(peopleStaff({ type: 'library', name: 'Lib' }, base)).toEqual([]);
  });
  it('has personas for the new characters', () => {
    for (const d of ['chaplain', 'imam', 'clubleader', 'rival']) expect(personaFor({ dialogue: d })).toMatch(/.{60,}/);
    expect(personaFor({ dialogue: 'imam' })).toMatch(/every faith/);
  });
});

describe('the optional crush storyline', () => {
  const npc = { id: 'c1', name: 'Kemi' };
  const offerArgs = (over = {}) => ({ enabled: true, npcId: 'c1', relPoints: 40, day: 20, ...over });
  it('is off by default', () => {
    expect(DEFAULTS.crushes).toBe(false);
    expect(crushOffer(newPeople(), offerArgs({ enabled: false }))).toBeNull();
  });
  it('needs real friendship and goes slowly', () => {
    const p = newPeople();
    expect(crushOffer(p, offerArgs({ relPoints: 10 }))).toBeNull();
    expect(crushOffer(p, offerArgs()).index).toBe(0);
    crushAnswer(p, { npc, accept: true, day: 20 });
    expect(crushOffer(p, offerArgs({ day: 21 }))).toBeNull();                     // not the next day
    expect(crushOffer(p, offerArgs({ day: 22 })).index).toBe(1);
    expect(crushOffer(p, offerArgs({ day: 22, npcId: 'other' }))).toBeNull();      // only one person
  });
  it('lets the player say no with no penalty and no pressure, and the step stays available later', () => {
    const p = newPeople();
    const r = crushAnswer(p, { npc, accept: false, day: 20 });
    expect(r.accepted).toBe(false);
    expect(r.text).toMatch(/no problem|fine|friends|understand/i);
    expect(p.crush.step).toBe(0);
    expect(p.crush.status).toBe('none');
    expect(crushOffer(p, offerArgs({ day: 22 })).index).toBe(0);
  });
  it('can be ended kindly at any time', () => {
    const p = newPeople();
    crushAnswer(p, { npc, accept: true, day: 20 });
    crushStayFriends(p);
    expect(crushOffer(p, offerArgs({ day: 40 }))).toBeNull();
  });
  it('finishes after the three small steps', () => {
    const p = newPeople();
    let d = 20, last;
    for (let i = 0; i < CRUSH_STEPS.length; i++) { last = crushAnswer(p, { npc, accept: true, day: d }); d += 2; }
    expect(last.done).toBe(true);
    expect(crushOffer(p, offerArgs({ day: d + 5 }))).toBeNull();
  });
});

describe('content is suitable for teenagers', () => {
  const strings = [];
  const walk = v => {
    if (typeof v === 'string') strings.push(v);
    else if (typeof v === 'function') { try { strings.push(v('Ada')); } catch { /* not a text function */ } }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk([ROOMMATE_ARCS, MENTOR_TIPS, CLUB_STORIES, FRIEND_EVENTS, CRUSH_STEPS, FAITH, REFLECT]);
  it('has no unsuitable words and no Pidgin', () => {
    expect(strings.length).toBeGreaterThan(100);
    const text = strings.join(' ');
    expect(text).not.toMatch(/\b(kiss|sex|sexy|naked|drunk|beer|alcohol|date night|boyfriend|girlfriend|hug|cuddle|stupid|idiot|hate you)\b/i);
    expect(text).not.toMatch(/\b(abeg|wahala|na wa|oga|no be|dey|wetin|sha\b|ehen)\b/i);
  });
  it('keeps every line short enough for a phone', () => {
    for (const s of strings) expect(s.length, s).toBeLessThan(230);
  });
  it('summarises people for the phone', () => {
    const p = newPeople();
    expect(peopleSummary(p)).toEqual([]);
    chooseMentor(p, { id: 'seun', name: 'Seun' }, 1);
    inviteToGroup(p, { id: 'a', name: 'Ada' }, 10, 1);
    expect(peopleSummary(p).join(' ')).toMatch(/Mentor: Seun.*Study group: Ada/);
  });
});
