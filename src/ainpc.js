import './ai.css';
import { askText } from './modal.js';

/*
 * Client side of the AI NPC chat. The game only talks to your own proxy (VITE_AI_URL, see docs/AI_NPCS.md); the AI key is
 * never in the browser. If the proxy is not configured, offline, or the daily limit is used up, NPCs simply use their scripted dialogue.
 */

const URL_ = import.meta.env?.VITE_AI_URL || '';
export const DAILY_LIMIT = Number(import.meta.env?.VITE_AI_LIMIT) || 20;
const KEY = 'campuslife.ai.v1';

// How each kind of NPC talks. Keys are the `dialogue` ids from npcs.js; anything else falls back to the role.
const PERSONAS = {
  lecturer: 'A fair but firm university lecturer who values attendance and preparation. Encouraging, a little dry humour.',
  librarian: 'A calm, kind librarian who loves quiet and well-organised study. Gives practical study tips.',
  vendor: 'Mama Put, a warm canteen owner who feeds students and gives motherly advice about eating well and saving money.',
  mama: 'The player\'s loving mother. Caring, proud, sometimes worried about money and rest.',
  tobi: 'The player\'s excitable little brother who is full of questions and school stories.',
  sade: 'A friendly older neighbour who knows everyone\'s business in a kind way.',
  bode: 'A helpful cyber cafe attendant who knows the JAMB and admission process well.',
  bala: 'A cheerful, loud bus conductor who knows every route.',
  seun: 'A friendly senior student who helps newcomers with directions and clearance.',
  musa: 'A polite, professional gate officer.',
  student: 'A friendly fellow student with relatable campus stories about classes, food, NEPA and exams.',
  roommate: 'The player\'s hostel roommate: funny, a bit lazy, loyal.',
  nurse: 'A caring campus nurse who gives simple health advice and tells the player to see a doctor for anything serious.',
  officer: 'A tired but polite university staff member at a clearance desk.'
};

export const personaFor = npc => PERSONAS[npc.dialogue] || PERSONAS[npc.role?.toLowerCase()] || `A ${npc.role || 'friendly person'} who lives nearby.`;

const today = () => new Date().toISOString().slice(0, 10);
function readUsage() {
  try { const u = JSON.parse(localStorage.getItem(KEY) || '{}'); return u.day === today() ? u : { day: today(), n: 0, id: u.id }; }
  catch { return { day: today(), n: 0 }; }
}
function writeUsage(u) { try { localStorage.setItem(KEY, JSON.stringify(u)); } catch { /* private mode */ } }
function playerId() {
  const u = readUsage();
  if (!u.id) { u.id = (crypto.randomUUID?.() || String(Math.random()).slice(2)) + ''; writeUsage(u); }
  return u.id;
}

export const aiConfigured = () => !!URL_;
export const remaining = () => Math.max(0, DAILY_LIMIT - readUsage().n);

/**
 * Builds the AI helper. `getContext()` returns { player, uni, course, hometown, when, place, mood, facts[] } from the game,
 * and `isOn()` reads the player's setting.
 */
export function createAi({ getContext, isOn, fetchImpl = (...a) => fetch(...a) }) {
  const histories = new Map();      // npc id -> last few turns, for continuity inside one play session

  const enabled = npc => aiConfigured() && isOn() && !npc.noAi && npc.dialogue !== undefined;

  async function ask(npc) {
    const left = remaining();
    const text = await askText({
      title: `✍️ Ask ${npc.name}`,
      lines: [left ? `${left} AI chat${left === 1 ? '' : 's'} left today.` : 'You have used all AI chats for today. Come back tomorrow!'],
      placeholder: 'Type your question…',
      chips: npc.dialogue === 'lecturer' ? ['When are the tests and exams?', 'How should I prepare?', 'What is my timetable?'] : ['Any advice for me?', 'What is campus like?', 'How is your day?'],
      maxLength: 160,
      disabled: left === 0
    });
    if (!text) return null;
    const usage = readUsage();
    if (usage.n >= DAILY_LIMIT) return 'You have used all your AI chats for today.';
    const hist = histories.get(npc.id) || [];
    try {
      const res = await fetchImpl(URL_, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: text, history: hist.slice(-6), playerId: playerId(),
          npc: { name: npc.name, role: npc.role, persona: personaFor(npc) },
          context: getContext()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reply) return data.error || 'Hmm, I could not think of an answer. Ask me something else?';
      usage.n += 1; writeUsage(usage);
      histories.set(npc.id, [...hist, { role: 'user', text }, { role: 'assistant', text: data.reply }].slice(-8));
      return data.reply;
    } catch {
      return 'Hmm, my network is bad right now. Ask me again in a moment?';
    }
  }

  return { enabled, ask };
}
