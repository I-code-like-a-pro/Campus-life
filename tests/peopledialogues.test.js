import { describe, it, expect } from 'vitest';
import { PEOPLE_DIALOGUES, peopleOptions, rivalNews } from '../src/peopledialogues.js';
import { newPeople, ensurePeople, setRivalSeed, currentRival } from '../src/people.js';
import { newMeta } from '../src/save.js';

/** A fake talk context: `script` is a list of picks (label substrings, or 'bye'), used one per c.say call. */
function makeCtx({ day = 20, crushes = false, money = 20000, academic = true, rel = 30 } = {}) {
  const meta = newMeta();
  const state = {
    money, meta, needs: { stress: 50 },
    academic: academic ? { courses: [{ code: 'A1', knowledge: 10, ca: 0.6 }], history: [] } : null
  };
  const log = { said: [], actions: [], rel: [], prep: 0, notes: [] };
  const script = [];
  const c = {
    state, day: () => day, semDay: () => 2, crushesOn: () => crushes,
    relation: () => ({ points: rel, lastTalk: -1 }),
    addRelation: (n, v) => log.rel.push([n.name || n.id, v]),
    boostPrep: n => { log.prep += n; },
    doAction: a => { if (a.cost && state.money < a.cost) return false; state.money -= a.cost || 0; log.actions.push(a.id); return true; },
    meta: { notify: n => log.notes.push(n.title), track: () => {}, trackOnce: () => true },
    say: async (_npc, text, choices) => {
      log.said.push(text);
      const want = script.shift();
      if (want === undefined) return choices.at(-1).value;
      const hit = choices.find(ch => ch.label.includes(want)) || choices.at(-1);
      return hit.value;
    },
    directions: async () => 'there', ai: null
  };
  return { c, log, script, state, people: () => ensurePeople(meta) };
}
const npc = { id: 'r1', name: 'Emeka' };

describe('people dialogue glue', () => {
  it('runs a roommate story: choice changes mood and friendship, and cannot repeat', async () => {
    const t = makeCtx();
    const opts = peopleOptions(t.c, npc, 'roommate');
    expect(opts[0].label).toMatch(/Borrowed/);
    t.script.push('calmly');
    const reply = await opts[0].run();
    expect(reply).toMatch(/Sorry/);
    expect(t.people().roommate.mood).toBe(1);
    expect(t.log.rel).toContainEqual(['Emeka', 5]);
    expect(peopleOptions(t.c, npc, 'roommate')[0].label).not.toMatch(/Borrowed/);   // done
  });
  it('does not resolve an arc if the player cannot afford the choice', async () => {
    const t = makeCtx({ day: 50, money: 0 });
    const p = t.people(); p.since = 0;
    p.roommate.done = { borrow: {}, clean: {}, exam: {} };
    const arc = peopleOptions(t.c, npc, 'roommate').find(o => /birthday/i.test(o.label));
    t.script.push('cake');
    expect(await arc.run()).toMatch(/not possible/);
    expect(t.people().roommate.done.birthday).toBeUndefined();
  });
  it('lets a senior become a mentor and gives one tip a week', async () => {
    const t = makeCtx();
    const senior = { id: 'seun', name: 'Seun' };
    const ask = peopleOptions(t.c, senior, 'senior')[0];
    expect(await ask.run()).toMatch(/mentor|helped/i);
    expect(t.people().mentor.id).toBe('seun');
    const tip = peopleOptions(t.c, senior, 'senior').find(o => /weekly tip/.test(o.label));
    expect(await tip.run()).toMatch(/Preparation \+/);
    expect(t.log.prep).toBeGreaterThan(0);
    expect(await tip.run()).toMatch(/next week/);
    expect(peopleOptions(t.c, { id: 'other', name: 'O' }, 'senior')).toEqual([]);      // only your own mentor
  });
  it('forms a study group and holds one session a week', async () => {
    const t = makeCtx();
    const invite = peopleOptions(t.c, npc, 'student').find(o => /study group/.test(o.label));
    expect(await invite.run()).toMatch(/love that/);
    const session = peopleOptions(t.c, npc, 'student').find(o => /group session/.test(o.label));
    expect(await session.run()).toMatch(/Preparation \+6%/);
    expect(await session.run()).toMatch(/already/);
    expect(peopleOptions(t.c, { id: 'lib', name: 'Mrs. Bello' }, 'librarian')[0].label).toMatch(/Study group/);
  });
  it('offers a friend event that can be declined without cost', async () => {
    const t = makeCtx({ day: 28 * 4 + 2 });
    // find a friend id whose event shows up today
    let opt;
    for (let i = 0; i < 200 && !opt; i++) { const n = { id: `f${i}`, name: `F${i}` }; opt = peopleOptions(t.c, n, 'student').find(o => /Help moving|Cultural|Birthday/i.test(o.label)); if (opt) opt.n = n; }
    expect(opt).toBeTruthy();
    t.script.push('not'); t.script.push('cannot');
    const money = t.state.money;
    await opt.run();
    expect(t.state.money).toBe(money);
  });
  it('keeps the crush storyline hidden unless the setting is on, and lets the player decline', async () => {
    const off = makeCtx({ crushes: false });
    expect(peopleOptions(off.c, npc, 'student').some(o => /invitation/i.test(o.label))).toBe(false);
    const on = makeCtx({ crushes: true });
    const o = peopleOptions(on.c, npc, 'student').find(x => /invitation/i.test(x.label));
    expect(o).toBeTruthy();
    on.script.push('Not today');
    expect(await o.run()).toMatch(/No problem/);
    expect(on.people().crush.step).toBe(0);
    expect(on.log.actions).toEqual([]);
    const t2 = makeCtx({ crushes: true });
    t2.script.push('stay friends');
    await peopleOptions(t2.c, npc, 'student').find(x => /invitation/i.test(x.label)).run();
    expect(peopleOptions(t2.c, npc, 'student').some(x => /invitation/i.test(x.label))).toBe(false);
  });
  it('runs the chaplain, imam and coordinator dialogues', async () => {
    const t = makeCtx();
    t.script.push('services'); t.script.push('stressed'); t.script.push('faiths'); 
    await PEOPLE_DIALOGUES.chaplain(t.c, { id: 'faith-chapel', name: 'Chaplain', dialogue: 'chaplain' });
    expect(t.log.said.join(' ')).toMatch(/Sunday service/);
    expect(t.log.actions).toContain('calm-chapel');
    const t2 = makeCtx();
    t2.script.push('faiths');
    await PEOPLE_DIALOGUES.imam(t2.c, { id: 'faith-mosque', name: 'Imam', dialogue: 'imam' });
    expect(t2.log.said.join(' ')).toMatch(/Assalamu alaikum/);
    expect(t2.log.said.join(' ')).toMatch(/every student|always/);
    const t3 = makeCtx();
    t3.state.meta.counters.clubMeetings = 1;
    t3.state.meta.clubs.push('debate');
    t3.script.push('inter-hall'); t3.script.push('Research');
    await PEOPLE_DIALOGUES.clubleader(t3.c, { id: 'clubs', name: 'Miss Chioma', dialogue: 'clubleader' });
    expect(t3.people().story.debate.chapter).toBe(1);
    expect(t3.log.prep).toBeGreaterThan(0);
  });
  it('lets the rival share friendly gist after a CA test', () => {
    setRivalSeed('Ada|cs');
    const notes = [];
    const state = { meta: newMeta(), academic: { courses: [{ code: 'A1', ca: 0.8 }, { code: 'B2', ca: 0.4 }], history: [] } };
    rivalNews('ca', { state, meta: { notify: n => notes.push(n) } });
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toContain(currentRival().name);
    rivalNews('results', { state, meta: { notify: n => notes.push(n) }, info: { rows: [{ code: 'A1', total: 70 }] } });
    expect(notes).toHaveLength(2);
    expect(state.meta.people.rival.wins + state.meta.people.rival.losses).toBeLessThanOrEqual(1);
  });
  it('is quiet before a student is enrolled', () => {
    const t = makeCtx({ academic: false });
    expect(peopleOptions(t.c, npc, 'student')).toEqual([]);
    void newPeople;
  });
});
