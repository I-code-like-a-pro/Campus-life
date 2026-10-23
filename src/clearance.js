import * as THREE from 'three';
import { createSign } from './world.js';

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
