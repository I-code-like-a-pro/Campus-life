import { durationText, townGist, townPlace } from './towns.js';
import { DESKS, CLEARANCE_FEE, nextStep } from './clearance.js';
import { naira } from './needs.js';

/*
 * Conversations. Each one is `async (c, npc) => {...}`; `c` is the context built in main.js:
 *   c.state, c.campus, c.say(npc, text, choices) -> value, c.directions(npc) -> reply text,
 *   c.guideTo({x, z, label}), c.pay(amount) -> boolean, c.give(amount), c.travel(), c.completeStep(id), c.day()
 */

/** A line about the player's own home town, for family and neighbours. */
export function homeGist(c) {
  const id = c.state.hometown || 'lagos';
  return `${townGist(id)} Do you remember ${townPlace(id)}?`;
}

const TIPS = [
  'Read small every day, not all at once the night before exam.',
  'Keep your receipts safe. Everybody needs them at one point or the other.',
  'Don\'t buy everything at once. Allowance must reach the end of the month!',
  'Make friends in your department early. Handouts and past questions are shared around.',
  'Sleep well. Nobody can read on an empty stomach and no sleep.',
  'Lecturers love people who sit in front. Just saying.'
];
const tip = () => TIPS[Math.floor(Math.random() * TIPS.length)];

/** Runs a menu until the player says bye. Each option's `run()` may return the NPC's next line. */
async function converse(c, npc, opening, makeOptions) {
  let text = opening;
  for (;;) {
    const opts = makeOptions();
    if (c.ai?.enabled(npc)) opts.push({ label: '✍️ Ask something…', run: async () => (await c.ai.ask(npc)) ?? 'Anything else?' });
    const pick = await c.say(npc, text, [
      ...opts.map((o, i) => ({ label: o.label, value: i })),
      { label: 'Bye 👋', value: -1, secondary: true }
    ]);
    if (pick === -1) return;
    text = (await opts[pick].run()) ?? 'Anything else?';
  }
}

const asks = c => npc => ({ label: '🧭 Please, where is…?', run: () => c.directions(npc) });

/* ------------------------------ home neighbourhood ------------------------------ */

async function mama(c, npc) {
  const s = c.state;
  const a = s.aspirant;
  let open;
  if (s.admission) open = `Congratulations, my child! I knew it. Go to the Motor Park and travel to ${c.uniName(s.admission.uni)}. Take care of yourself.`;
  else if (a && a.jambSeen && !a.admitSeen) open = 'The JAMB result is out. Now we wait for the admission list. Pray and rest small.';
  else if (a && !a.jambSeen) open = 'Rest a little, my child. The JAMB result will be out soon. Bode at the cyber cafe will help you check.';
  else open = 'My child, how far?';
  await converse(c, npc, open, () => [
    asks(c)(npc),
    { label: '💡 Any advice, Mama?', run: () => `Ehen. ${tip()}` },
    { label: '🏡 Tell me about home', run: () => homeGist(c) },
    { label: '🍲 I\'m hungry', run: () => 'Go inside and eat the jollof in the kitchen. Free of charge, my dear.' }
  ]);
}

async function tobi(c, npc) {
  await converse(c, npc, 'Big bro! Are you going to be a doctor? Or a lawyer? Or a footballer?', () => [
    asks(c)(npc),
    { label: '😄 Any gist?', run: () => ['Mama said she will make egusi tonight!', 'Aunty Sade is now selling akara. Free taste if you ask nicely.', 'I scored three goals at school yesterday. Three!'][Math.floor(Math.random() * 3)] },
    { label: '🎓 Will I get admission?', run: () => 'Of course! You are the smartest person I know. Well… after me.' }
  ]);
}

async function shopkeeper(c, npc) {
  await converse(c, npc, 'Welcome, welcome! Anything you want? Snacks, drinks, recharge card…', () => [
    asks(c)(npc),
    { label: '🧾 Any work for me?', run: () => 'Yes! Stand near my shop and use the panel to "Help at the shop". I pay ₦2,000 for two hours.' },
    { label: '🍪 What do you sell?', run: () => 'Biscuit, sweet, bread, drinks. Stand near the shop and buy snacks from the panel.' }
  ]);
}

async function bode(c, npc) {
  const a = c.state.aspirant;
  const status = !a
    ? 'Welcome back! Need to browse?'
    : !a.jambSeen ? `JAMB result comes out on Day ${a.jambDay}. Come inside and use a computer, it's ₦200 an hour to browse.`
      : !a.admitSeen ? `The admission list comes out on Day ${a.admitDay}. I will be here.`
        : 'Welcome!';
  await converse(c, npc, status, () => [
    asks(c)(npc),
    { label: '📅 When do results come out?', run: () => a ? (a.jambSeen ? `The admission list is on Day ${a.admitDay}.` : `The JAMB result is on Day ${a.jambDay}.`) : 'All the results are out already.' },
    { label: '🖥️ How do I check my result?', run: () => 'Go inside, stand at the computers and choose "Check JAMB result" once the day comes.' }
  ]);
}

async function sade(c, npc) {
  await converse(c, npc, 'Ah, my dear! You are looking well. How is the waiting going?', () => [
    asks(c)(npc),
    { label: '💬 Any gist?', run: () => ['They say the bus fare to school just went up.', 'My nephew got into UNILAG last year. His first week was chaotic!', 'Make sure you carry all your original documents when you go.', homeGist(c), homeGist(c)][Math.floor(Math.random() * 5)] },
    { label: '🎒 What should I know about school?', run: () => 'When you get there, go to the registration desks near the gate. They will clear you step by step. Ask the senior student, he knows everything.' }
  ]);
}

async function bala(c, npc) {
  const adm = c.state.admission;
  if (!adm) {
    await converse(c, npc, 'Where are you going? No admission yet? Come back when you get one, I will take you!', () => [
      asks(c)(npc),
      { label: '🚌 Where do your buses go?', run: () => 'UNILAG, UI, OAU, everywhere! Once you have admission, tell me.' }
    ]);
    return;
  }
  const q = c.quote();
  const first = q.options[0];
  const short = c.uniShort(adm.uni);
  await converse(c, npc, `${short}! ${short}! Last seat! From ${naira(first.fare)}, sir!`, () => [
    { label: `🧭 Travel to ${short}`, run: async () => (await c.travel()) },
    { label: '⏱️ How far is it?', run: () => `About ${q.km} km. By road that is roughly ${durationText(first.minutes)}${q.options[1] ? '. There is also a flight if you can afford it.' : '.'} Sit well, we will get there.` },
    asks(c)(npc)
  ]);
}

/* ------------------------------ campus: gate guides ------------------------------ */

async function musa(c, npc) {
  const cl = c.state.clearance;
  const next = cl && !cl.done ? nextStep(cl) : null;
  const open = next
    ? `Welcome, fresh student! Clearance is done at the registration desks, just up the path. Start with the ${next.name}.`
    : 'Good day. How can I help you?';
  await converse(c, npc, open, () => [
    ...(next ? [{ label: `📋 Take me to the ${next.name}`, run: () => c.tellWay(npc, { x: next.x, z: next.z + 3, label: next.name }) }] : []),
    asks(c)(npc),
    { label: '🪪 What do I need for clearance?', run: () => `You will go through four desks: Admissions, Bursary (fee ${naira(CLEARANCE_FEE)}), Medical and Hostel Allocation. In that order.` }
  ]);
}

async function seun(c, npc) {
  const cl = c.state.clearance;
  const next = cl && !cl.done ? nextStep(cl) : null;
  await converse(c, npc, next ? `Hey, fresher! I'm Seun, 300 level. Don't worry, I'll help you find your way.` : 'Hey! How is school treating you?', () => [
    ...(next ? [{ label: `📋 Where do I go next?`, run: () => c.tellWay(npc, { x: next.x, z: next.z + 3, label: next.name }) }] : []),
    asks(c)(npc),
    { label: '💡 Any advice?', run: () => `Sure. ${tip()}` },
    { label: '😎 What is campus life like?', run: () => 'Lectures, hostel drama, nice food at the canteen, parties, and plenty of stories. You will love it. And hate it. Both.' }
  ]);
}

/* ------------------------------ campus: clearance desks ------------------------------ */

function previous(id) {
  const i = DESKS.findIndex(d => d.id === id);
  return i > 0 ? DESKS[i - 1] : null;
}

async function desk(c, npc, id, greeting, doIt) {
  const cl = c.state.clearance;
  const me = DESKS.find(d => d.id === id);
  const prev = previous(id);
  await converse(c, npc, greeting, () => {
    const opts = [];
    if (!cl || cl.done || cl[id]) {
      opts.push({ label: '✅ My step here is done', run: () => 'Yes, you are cleared at this desk.' });
    } else if (prev && !cl[prev.id]) {
      opts.push({ label: '📝 Process my clearance', run: () => c.tellWay(npc, { x: prev.x, z: prev.z + 3, label: prev.name }, `You have to start from the ${prev.name} first.`) });
    } else {
      opts.push({ label: '📝 Process my clearance', run: () => doIt() });
    }
    opts.push(asks(c)(npc));
    return opts;
  });
}

const advance = c => {
  const n = nextStep(c.state.clearance);
  return n ? c.tellWay(null, { x: n.x, z: n.z + 3, label: n.name }, '') : null;
};

async function admissions(c, npc) {
  await desk(c, npc, 'admissions', 'Good day. Admission letter and JAMB result slip, please.', async () => {
    c.completeStep('admissions');
    return `Your documents are verified. Next, go to the Bursary to pay your fees. ${await advance(c) ?? ''}`;
  });
}

async function bursary(c, npc) {
  await desk(c, npc, 'bursary', `Acceptance and registration fees are ${naira(CLEARANCE_FEE)}. Bring your receipt after you pay.`, async () => {
    if (!c.pay(CLEARANCE_FEE)) {
      const call = await c.say(npc, `You have ${naira(c.state.money)}. The fee is ${naira(CLEARANCE_FEE)}. That is not enough.`, [
        { label: '📞 Call Mum for a transfer', value: 'mum' },
        { label: 'I\'ll come back later', value: 'later', secondary: true }
      ]);
      if (call !== 'mum') return 'No problem. Come back when you are ready.';
      c.give(CLEARANCE_FEE);
      c.pay(CLEARANCE_FEE);
      c.completeStep('bursary');
      return `Mum sent the money and you paid ${naira(CLEARANCE_FEE)}. Receipt issued. Next is Medical Screening. ${await advance(c) ?? ''}`;
    }
    c.completeStep('bursary');
    return `Paid ${naira(CLEARANCE_FEE)}. Here is your receipt. Next is Medical Screening. ${await advance(c) ?? ''}`;
  });
}

async function medical(c, npc) {
  await desk(c, npc, 'medical', 'Medical screening for fresh students. Sit down, let me check you.', async () => {
    c.completeStep('medical');
    return `You are fit and healthy. Cleared! Next is Hostel Allocation. ${await advance(c) ?? ''}`;
  });
}

async function porter(c, npc) {
  await desk(c, npc, 'hostel', 'Hostel allocation! Show me your clearance slips and I will give you a room.', async () => {
    const hostel = c.completeStep('hostel');
    return `Room allocated at ${hostel}! Welcome to school. Your clearance is complete.`;
  });
}

export const DIALOGUES = { mama, tobi, shopkeeper, bode, sade, bala, musa, seun, admissions, bursary, medical, porter };

// shared helpers for other dialogue modules
export { converse, asks, tip };
