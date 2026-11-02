import { createCharacter } from './character.js';
import { createSign, resolveCollisions } from './world.js';
import { DESKS } from './clearance.js';
import { OFFICE_HOURS } from './documents.js';
import { REGISTRY_SLOTS } from './interiors.js';
import { roommateNameFor, peopleStaff } from './people.js';   // group people

const SKINS = [0x8d5a3b, 0x5a3a26, 0x3b2418, 0xb07a54, 0x6b4a2f];
const SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xecf0f1, 0xff7aa8];
const TROUSERS = [0x222a35, 0x2b3a55, 0x4a3b2a, 0x555b61];

/**
 * NPC definition:
 *  { id, name, role, emoji, x, z, face?, dialogue, wander?, where?, lite?, shirt?, skin?, hair?, trousers? }
 * `dialogue` is a key into DIALOGUES (dialogues.js). `wander` is a radius to stroll within (0 = stands still).
 * `where` is the name of the building an NPC works inside (null = outdoors); NPCs only act while the player is in
 * the same place, so indoor and outdoor NPCs never mix.
 */
/** Is someone with these working hours [[from, to], ...] at their post at `hour`? No hours means always there. */
export const isPresent = (hours, hour) => !hours || hours.some(([a, b]) => hour >= a && hour < b);

// Where students head for at different times of day (building types).
const ROUTINE = [
  [[6, 8], ['canteen', 'hostel']],
  [[8, 12], ['lecture', 'lecture', 'library', 'auditorium']],
  [[12, 14], ['canteen', 'canteen', 'hostel']],
  [[14, 18], ['lecture', 'library', 'field', 'auditorium']],
  [[18, 22], ['hostel', 'canteen', 'field', 'library']]
];

/**
 * `nav` (optional) = { grid, findPath, places }. With it, NPCs follow A* routes around poles and walls, and ambient students
 * walk between real destinations (lectures in the morning, canteen at lunch, the field and hostels later) instead of
 * pacing randomly.
 */
export function createNpcs(scene, colliders, nav = null) {
  const list = [];

  function chooseGoal(n, hour) {
    if (n.lite && nav?.places?.length) {
      const row = ROUTINE.find(([[a, b]]) => hour >= a && hour < b);
      const types = row ? row[1] : ['hostel'];
      const options = nav.places.filter(p => p.door && types.includes(p.type));
      if (options.length) {
        const p = options[Math.floor(Math.random() * options.length)];
        return { x: p.door.x + (Math.random() - 0.5) * 3, z: p.door.z + 1.5 + Math.random() * 2 };
      }
    }
    const a = Math.random() * Math.PI * 2, r = Math.random() * n.wander;
    return { x: n.home.x + Math.cos(a) * r, z: n.home.z + Math.sin(a) * r };
  }

  function add(def) {
    const char = createCharacter({
      shirt: def.shirt ?? 0x888888,
      skin: def.skin ?? SKINS[list.length % SKINS.length],
      hair: def.hair ?? 0x1b1210,
      trousers: def.trousers ?? 0x2b3138,
      lite: !!def.lite
    });
    char.group.position.set(def.x, 0, def.z);
    char.group.rotation.y = def.face ?? 0;

    const tag = createSign(def.emoji, def.name);
    tag.scale.multiplyScalar(def.lite ? 0.26 : 0.32);
    tag.position.set(0, 4.5, 0);
    char.group.add(tag);
    scene.add(char.group);

    const npc = { ...def, where: def.where ?? null, present: true, char, home: { x: def.x, z: def.z }, target: null, wait: Math.random() * 2, walking: 0 };
    list.push(npc);
    return npc;
  }

  function turnTo(group, angle, dt) {
    let d = angle - group.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    group.rotation.y += d * Math.min(1, dt * 8);
  }

  /** `where`: the building the player is in right now (null outdoors). Only NPCs of that place are updated. */
  function update(dt, player, where = null, hour = 12) {
    for (const n of list) {
      n.present = isPresent(n.hours, hour);
      n.char.group.visible = n.present;
      if (n.where !== where || !n.present) continue;
      const g = n.char.group;
      const dxp = player.x - g.position.x, dzp = player.z - g.position.z;
      const near = Math.hypot(dxp, dzp) < 5;
      n.walking = 0;

      if (near) {
        turnTo(g, Math.atan2(dxp, dzp), dt);               // look at the player
      } else if (n.wander) {
        if (!n.route) {
          n.wait -= dt;
          if (n.wait <= 0) {
            const goal = chooseGoal(n, hour);
            n.route = nav && goal ? nav.findPath(nav.grid, g.position, goal) : [goal];
            if (!n.route || !n.route.length) { n.route = null; n.wait = 2; }
            n.stuck = 0;
          }
        } else {
          const t = n.route[0];
          const dx = t.x - g.position.x, dz = t.z - g.position.z, d = Math.hypot(dx, dz);
          if (d < 0.5) {
            n.route.shift();
            if (!n.route.length) { n.route = null; n.wait = 3 + Math.random() * 8; }   // arrived: linger a while
          } else {
            const before = { x: g.position.x, z: g.position.z };
            const step = Math.min(d, 2.4 * dt);
            g.position.x += dx / d * step;
            g.position.z += dz / d * step;
            resolveCollisions(g.position, colliders, 0.6);
            turnTo(g, Math.atan2(dx, dz), dt);
            n.walking = 0.6;
            // pushed back by something? after a moment give up on this trip and pick another
            n.stuck = Math.hypot(g.position.x - before.x, g.position.z - before.z) < step * 0.3 ? (n.stuck || 0) + dt : 0;
            if (n.stuck > 1.5) { n.route = null; n.wait = 0.5; }
          }
        }
      }
      n.char.update(dt, n.walking);
    }
  }

  function nearest(pos, radius, where = null) {
    let best = null, bestD = radius;
    for (const n of list) {
      if (n.where !== where || !n.present) continue;
      const d = Math.hypot(pos.x - n.char.group.position.x, pos.z - n.char.group.position.z);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  /** Takes a character out of the world (used for one-off scene crowds). */
  function remove(id) {
    const i = list.findIndex(n => n.id === id);
    if (i < 0) return;
    scene.remove(list[i].char.group);
    list.splice(i, 1);
  }

  return { add, remove, update, nearest, list };
}

/* ------------------------------------------------------------------------------------------------ */

const FIRST_NAMES = ['Ada', 'Tunde', 'Chidi', 'Amina', 'Emeka', 'Zainab', 'Femi', 'Ngozi', 'Ibrahim', 'Bisi', 'Kelechi', 'Halima',
  'Seyi', 'Uche', 'Hauwa', 'Dayo', 'Chioma', 'Musa', 'Yetunde', 'Obinna', 'Fatima', 'Jide', 'Nkechi', 'Sola', 'Ifeanyi', 'Kemi', 'Tobi', 'Ese'];

const pickFrom = (list, i) => list[Math.abs(i) % list.length];

/** Who lives where. Positions are placed relative to building doors so they work on every campus. */
export function npcDefsFor(campus, places) {
  const door = name => places.find(p => p.name === name)?.door;
  const at = (name, dx, dz) => { const d = door(name); return d ? { x: d.x + dx, z: d.z + dz } : null; };
  const defs = [];
  const put = (def, pos) => { if (pos) defs.push({ ...def, ...pos }); };

  if (campus.id === 'home') {
    put({ id: 'mama',   name: 'Mama',             role: 'Your mum',            emoji: '👩🏾', dialogue: 'mama',   shirt: 0xc2694a, face: 0 }, at('Family House', 4, -2));
    put({ id: 'tobi',   name: 'Tobi',             role: 'Your little brother', emoji: '🧒🏾', dialogue: 'tobi',   shirt: 0xe5a52a, wander: 5 }, at('Family House', -3, -4));
    put({ id: 'ade',    name: 'Mr. Ade',          role: 'Shopkeeper',          emoji: '🛒', dialogue: 'shopkeeper', shirt: 0x27ae60, face: 0, hours: [[7, 21]] }, at('Provision Store', 4, 0));
    put({ id: 'bode',   name: 'Bode',             role: 'Cyber cafe attendant', emoji: '🖥️', dialogue: 'bode',  shirt: 0x2f6fd0, face: 0, hours: [[8, 21]] }, at('Cyber Cafe', 4, 0));
    put({ id: 'sade',   name: 'Aunty Sade',       role: 'Neighbour',           emoji: '👵🏾', dialogue: 'sade',   shirt: 0x8e44ad, wander: 9 }, { x: 8, z: 10 });
    put({ id: 'bala',   name: 'Conductor Bala',   role: 'Bus conductor',       emoji: '🚌', dialogue: 'bala',   shirt: 0xf1c40f, trousers: 0x222a35, face: 0 }, at('Motor Park', 5, 0));
  } else {
    // everyone arrives through the main gate
    defs.push({ id: 'musa', name: 'Officer Musa', role: 'Gate security', emoji: '💂🏾', dialogue: 'musa', shirt: 0x1f2a44, trousers: 0x1f2a44, x: 6.5, z: 46, face: -0.6 });
    defs.push({ id: 'seun', name: 'Seun', role: 'Senior student (guide)', emoji: '🎒', dialogue: 'seun', shirt: 0xe67e22, x: -6.5, z: 44, wander: 4 });
  }
  return defs;
}

/** Ambient students (campus) or neighbours (home): cheap characters who stroll along the paths and chat (F-143). */
export function crowdDefs(campus, count = 8, seed = 1) {
  let s = seed >>> 0 || 1;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const defs = [];
  for (let i = 0; i < count; i++) {
    const onMain = rand() < 0.55;
    const x = onMain ? (rand() - 0.5) * 6 : -45 + rand() * 70;
    const z = onMain ? -36 + rand() * 80 : (rand() - 0.5) * 6;
    defs.push({
      id: `crowd-${i}`,
      name: pickFrom(FIRST_NAMES, Math.floor(rand() * 1000)),
      role: campus.id === 'home' ? 'Neighbour' : 'Student',
      emoji: campus.id === 'home' ? '🧑🏾' : '🎒',
      dialogue: 'student',
      shirt: pickFrom(SHIRTS, Math.floor(rand() * 100)),
      trousers: pickFrom(TROUSERS, Math.floor(rand() * 100)),
      skin: pickFrom(SKINS, Math.floor(rand() * 100)),
      lite: true, wander: 9 + rand() * 6, x, z, face: rand() * 6
    });
  }
  return defs;
}

/** NPCs who work inside a building. `interior.npcAnchor` is where they stand (world coordinates). */
export function interiorNpcDefs(place, interior) {
  const a = interior.npcAnchor;
  if (!a) return [];
  const base = { x: a.x, z: a.z, where: place.name, face: 0 };
  switch (place.type) {
    case 'lecture':
      return [{ ...base, id: `lect-${place.name}`, name: pickFrom(['Dr. Okonkwo', 'Prof. Adebayo', 'Dr. Bello', 'Mrs. Eze'], place.name.length), hours: [[8, 18]], role: 'Lecturer', emoji: '👨🏾‍🏫', dialogue: 'lecturer', shirt: 0x6b4a2f, skin: 0x5a3a26 }];
    case 'library':
      return [{ ...base, id: `lib-${place.name}`, name: 'Mrs. Bello', hours: [[8, 20]], role: 'Librarian', emoji: '📚', dialogue: 'librarian', shirt: 0x8e44ad, skin: 0x6b4a2f }];
    case 'canteen':
      return [{ ...base, id: `vend-${place.name}`, name: 'Mama Put', hours: [[7, 21]], role: 'Canteen owner', emoji: '🍛', dialogue: 'vendor', shirt: 0xe67e22, skin: 0x3b2418 }];
    case 'clinic':
      return [{ ...base, id: `nurse-${place.name}`, name: 'Nurse Amaka', hours: [[8, 22]], role: 'Nurse', emoji: '🩺', dialogue: 'nurse', shirt: 0xf4f7f5, skin: 0x5a3a26 }];
    case 'biz':
      return [{ ...base, id: `biz-${place.name}`, name: 'Madam Ify', hours: [[8, 20]], role: 'Business Centre manager', emoji: '💼', dialogue: 'bizmanager', shirt: 0x16a085, skin: 0x8d5a3b }];
    case 'registry':
      // the four clearance officers, one behind each counter, working office hours
      return DESKS.map((d, i) => ({ ...d.npc, ...base, x: interior.ox + REGISTRY_SLOTS[i], z: -6.4, hours: [OFFICE_HOURS] }));
    case 'hostel':
      return [{ ...base, id: `room-${place.name}`, name: roommateNameFor(place.name), hours: [[0, 9], [16, 24]], role: 'Roommate', emoji: '🛏️', dialogue: 'roommate', shirt: 0x34495e, skin: 0x8d5a3b }];
    default:
      return peopleStaff(place, base);   // group people: chaplain, imam, clubs coordinator, rival
  }
}
