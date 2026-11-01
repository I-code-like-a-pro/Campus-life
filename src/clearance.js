import * as THREE from 'three';
import { createSign } from './world.js';
import { hash01 } from './eventengine.js';

export const CLEARANCE_FEE = 15000;       // acceptance and registration fees, paid at the Bursary

// Open-air registration desks under canopies near the main gate (as on a real resumption day).
// Done in order: Admissions → Bursary → Medical → Hostel.
export const DESKS = [
  { id: 'admissions', name: 'Admissions Desk',    emoji: '📋', x: -10, z: 38, canopy: 0x2f6fd0,
    npc: { id: 'desk-admissions', name: 'Mrs. Adeyemi', role: 'Admissions officer', emoji: '📋', dialogue: 'admissions', shirt: 0x2f6fd0, skin: 0x5a3a26 } },
  { id: 'bursary',    name: 'Bursary',            emoji: '💳', x: 10,  z: 38, canopy: 0xc0392b,
    npc: { id: 'desk-bursary', name: 'Mr. Chukwu', role: 'Bursary officer', emoji: '💳', dialogue: 'bursary', shirt: 0x7f8c8d, skin: 0x8d5a3b } },
  { id: 'medical',    name: 'Medical Screening',  emoji: '🩺', x: -10, z: 27, canopy: 0x27ae60,
    npc: { id: 'desk-medical', name: 'Nurse Fatima', role: 'Medical screening', emoji: '🩺', dialogue: 'medical', shirt: 0xf4f7f5, skin: 0x6b4a2f } },
  { id: 'hostel',     name: 'Hostel Allocation',  emoji: '🛏️', x: 10,  z: 27, canopy: 0xe5a52a,
    npc: { id: 'desk-hostel', name: 'Baba Sule', role: 'Hostel porter', emoji: '🔑', dialogue: 'porter', shirt: 0x6b4a2f, skin: 0x3b2418 } }
];

export const nextStep = clearance => DESKS.find(d => !clearance[d.id]);

/** Builds the canopies and returns NPC definitions for the officers. */
export function buildDesks(scene, colliders) {
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c));
    m.position.set(x, y, z);
    scene.add(m);
  };
  const npcs = [];
  for (const d of DESKS) {
    [[-2.6, -1.8], [2.6, -1.8], [-2.6, 1.8], [2.6, 1.8]].forEach(([dx, dz]) => box(0.15, 3.6, 0.15, 0x555b61, d.x + dx, 1.8, d.z + dz));
    box(6.4, 0.3, 4.6, d.canopy, d.x, 3.7, d.z);
    box(3.4, 1.1, 1.2, 0xd6a96a, d.x, 0.55, d.z + 0.5);          // table
    box(2.6, 0.12, 0.7, 0xffffff, d.x, 1.16, d.z + 0.5);          // papers
    const s = createSign(d.emoji, d.name);
    s.scale.multiplyScalar(0.5);
    s.position.set(d.x, 5.4, d.z);
    scene.add(s);
    colliders.push({ x: d.x, z: d.z + 0.5, hw: 1.8, hd: 0.7 });
    npcs.push({ ...d.npc, x: d.x, z: d.z - 1, face: 0 });
  }
  return npcs;
}

/** Reserved zones (x, z, halfWidth, halfDepth) so trees aren't planted under the canopies. */
export const DESK_RESERVED = DESKS.map(d => [d.x, d.z, 6, 5]);

/* ---------------- clearance hiccups ----------------
 * Small, funny, never blocking. Each desk may throw one hiccup at you, decided by a seeded roll so a given save always
 * meets the same ones. Every hiccup can be resolved two ways: wait it out (time and stress, always available) or pay a
 * small fee to skip the trouble (only offered when affordable). After that the desk carries on as normal.
 */
export const HICCUP_CHANCE = 0.6;
export const HICCUPS = {
  admissions: [
    { id: 'photocopy', title: 'Missing photocopy', text: 'The officer wants two photocopies of your result slip. You brought one.', wait: 'Queue at the photocopy stand', waitText: 'You waited behind twenty other freshers, but you got your copies.', minutes: 40, stress: 4, fee: 200, feeLabel: 'Pay a runner to copy it', feeText: 'A runner returned in five minutes with warm copies.' },
    { id: 'pen', title: 'No pen', text: 'The form must be filled in blue ink. Your pen is black.', wait: 'Borrow one from the queue', waitText: 'A stranger lent you a pen with a chewed cap.', minutes: 15, stress: 2, fee: 100, feeLabel: 'Buy a pen', feeText: 'You bought a blue pen from a boy selling them in the line.' }
  ],
  bursary: [
    { id: 'queue', title: 'Very long queue', text: 'The line at the bursary snakes around the canopy twice.', wait: 'Join the line', waitText: 'You waited it out and made two new friends in the queue.', minutes: 60, stress: 5, fee: 500, feeLabel: 'Tip a student helper to hold your place', feeText: 'Your helper held the place and you got through quickly.' },
    { id: 'network', title: 'Network failure', text: 'The payment portal is down. The officer says to try again soon.', wait: 'Wait for the network', waitText: 'After a long wait the portal came back.', minutes: 45, stress: 4, fee: 300, feeLabel: 'Use the cafe next door', feeText: 'The cafe had a working connection and printed your slip.' }
  ],
  medical: [
    { id: 'mismatch', title: 'Name mismatch', text: 'Your name is spelt differently on two documents. The nurse sighs.', wait: 'Correct the forms', waitText: 'You fixed it, one patient signature at a time.', minutes: 30, stress: 3, fee: 150, feeLabel: 'Pay for a quick stamp', feeText: 'A stamp made it official in seconds.' },
    { id: 'photo', title: 'Passport photo missing', text: 'Your medical card needs a passport photograph.', wait: 'Take the queue at the photo stand', waitText: 'The photographer told you to smile. You tried.', minutes: 35, stress: 3, fee: 300, feeLabel: 'Pay for an express photo', feeText: 'Express photo, ready while you waited.' }
  ],
  hostel: [
    { id: 'key', title: 'Key mix-up', text: 'Two keys, one room number. The porter checks his book again.', wait: 'Wait while he sorts it out', waitText: 'He found the right key under a pile of receipts.', minutes: 30, stress: 3, fee: 200, feeLabel: 'Give him something for his trouble', feeText: 'The porter found the key very quickly.' },
    { id: 'receipt', title: 'Lost receipt', text: 'Where is your bursary receipt? You are sure you had it a minute ago.', wait: 'Search your bag', waitText: 'It was inside your shoe the whole time. Not your best moment.', minutes: 20, stress: 3, fee: 150, feeLabel: 'Pay to reprint it', feeText: 'The bursary reprinted it for a small charge.' }
  ]
};

/** Deterministic hash of a string, used to seed hiccup rolls per save. */
export function seedOf(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
  return h;
}

/** The hiccup (or null) waiting at a desk for this save. The same seed and desk always give the same answer. */
export function rollHiccup(seed, deskId) {
  const list = HICCUPS[deskId];
  if (!list || hash01(seed, `hic-${deskId}`) >= HICCUP_CHANCE) return null;
  return list[Math.floor(hash01(seed, `pick-${deskId}`) * list.length) % list.length];
}

/** The hiccup at the desk run by `npcId`, if it is your turn there and none has happened yet. */
export function pendingHiccup(clearance, npcId, seed) {
  if (!clearance || clearance.done) return null;
  const desk = DESKS.find(d => d.npc.id === npcId);
  if (!desk || clearance[desk.id] || nextStep(clearance)?.id !== desk.id) return null;
  if (clearance.hiccups?.[desk.id]) return null;
  const hiccup = rollHiccup(seed, desk.id);
  return hiccup ? { desk, hiccup } : null;
}

/** Applies the player's choice. Paying is quietly downgraded to waiting if unaffordable, so it can never block. */
export function resolveHiccup(hiccup, payFee, money) {
  return payFee && money >= hiccup.fee
    ? { fee: hiccup.fee, minutes: 10, stress: 0, text: hiccup.feeText }
    : { fee: 0, minutes: hiccup.minutes, stress: hiccup.stress, text: hiccup.waitText };
}
