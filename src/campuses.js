import { FAITH_BUILDINGS } from './people.js';
import { PACKS, PACK_ORDER } from './packs/index.js';
// Campus definitions. Layouts are loosely inspired by each school (names and landmarks), not exact maps.
// Building types decide what you can do there: hostel, canteen, sports, lecture, library, auditorium.
// Coordinates: x/z in world units; main path runs along x = 0, cross path along z = 0.

/** A campus as the game uses it, built from a university pack (src/packs). */
function campusFromPack(p) {
  return {
    id: p.id, short: p.identity.short, name: p.identity.name, tagline: p.identity.tagline, accent: p.identity.accent,
    ground: p.campus.ground, trees: p.campus.trees, features: [...p.campus.features],
    buildings: p.campus.buildings.map(b => ({ ...b })), field: { ...p.campus.field },
    ...(p.campus.amphitheatre ? { amphitheatre: { ...p.campus.amphitheatre } } : {})
  };
}

export const CAMPUSES = Object.fromEntries(PACK_ORDER.map(id => [id, campusFromPack(PACKS[id])]));

export const CAMPUS_ORDER = [...PACK_ORDER];

// The neighbourhood where every game starts: you are a JAMB aspirant waiting for results.
CAMPUSES.home = {
  id: 'home',
  short: 'HOME',
  name: 'Home',
  tagline: 'Your neighbourhood',
  accent: '#0a8f4f',
  ground: 0x8bb860,
  trees: 24,
  features: [],
  gate: false,
  buildings: [
    { name: 'Family House',    emoji: '🏠', type: 'home',    x: -26, z: 22,  w: 14, d: 10, h: 6, color: 0xf3e3c3, roof: 0x8a3b2b },
    { name: 'Cyber Cafe',      emoji: '🖥️', type: 'cafe',    x: 24,  z: -24, w: 12, d: 10, h: 5, color: 0xcfe3f1, roof: 0x2f4f7a },
    { name: 'Mama Put',        emoji: '🍛', type: 'canteen', x: 24,  z: 22,  w: 12, d: 10, h: 5, color: 0xf6e07a, roof: 0xb5481f },
    { name: 'Provision Store', emoji: '🛒', type: 'shop',    x: -24, z: -24, w: 10, d: 8,  h: 5, color: 0xe9c2c2, roof: 0x6a3a2a },
    { name: 'Motor Park',      emoji: '🚌', type: 'park',    x: 0,   z: -42, w: 16, d: 8,  h: 4, color: 0xd9d4c8, roof: 0x3a3a46 }
  ]
};

// Shared buildings on every campus: somewhere to work and buy handouts, a clinic, and a market.
for (const id of CAMPUS_ORDER) {
  CAMPUSES[id].buildings.push(
    { name: 'Registry', emoji: '📋', type: 'registry', x: -12, z: 36, w: 10, d: 8, h: 6, color: 0xe6e2d6, roof: 0x2f4f7a },
    { name: 'Business Centre', emoji: '💼', type: 'biz', x: -26, z: 42, w: 12, d: 10, h: 5, color: 0xdde8f0, roof: 0x3a4f66 },
    { name: 'Health Centre', emoji: '🏥', type: 'clinic', x: -24, z: -44, w: 12, d: 9, h: 5, color: 0xe8f4ee, roof: 0x2d8f6f },
    { name: 'Campus Market', emoji: '🛒', type: 'shop', x: 26, z: -44, w: 12, d: 9, h: 4, color: 0xf0d9c2, roof: 0x7a4a2a },
    // group money: the bookshop (north-west) and the bank with an ATM (south-west), off the paths and clear of every other building
    { name: 'Campus Bookshop', emoji: '📚', type: 'books', x: -40, z: -9, w: 9, d: 8, h: 5, color: 0xf3e0c4, roof: 0x7a3b2b },
    { name: 'Campus Bank', emoji: '🏦', type: 'bank', x: -40, z: 9, w: 9, d: 8, h: 5, color: 0xdfe8f0, roof: 0x1f4f7a }
  );
}
CAMPUSES.home.buildings.push({ name: 'Chemist', emoji: '💊', type: 'clinic', x: 26, z: 44, w: 10, d: 8, h: 5, color: 0xe8f4ee, roof: 0x2d8f6f });

// group people: a chapel and a mosque on every campus (east side, clear of the sports field, the faculties and the bookshop and bank on the west)
for (const id of CAMPUS_ORDER) CAMPUSES[id].buildings.push(...FAITH_BUILDINGS.map(b => ({ ...b })));
