// Campus definitions. Layouts are loosely inspired by each school (names and landmarks), not exact maps.
// Building types decide what you can do there: hostel, canteen, sports, lecture, library, auditorium.
// Coordinates: x/z in world units; main path runs along x = 0, cross path along z = 0.

export const CAMPUSES = {
  unilag: {
    id: 'unilag',
    short: 'UNILAG',
    name: 'University of Lagos',
    tagline: 'Lagoon-side campus in the heart of Lagos',
    accent: '#0a8f4f',
    ground: 0x6bb55a,
    trees: 26,
    features: ['lagoon'],
    buildings: [
      { name: 'Faculty of Engineering', emoji: '⚙️', type: 'lecture',    x: -24, z: -24, w: 16, d: 12, h: 9,  color: 0xe9dcc2, roof: 0x8a3b2b },
      { name: 'Main Library',           emoji: '📖', type: 'library',    x: 24,  z: -24, w: 14, d: 12, h: 9,  color: 0xd6e2ef, roof: 0x2f4f7a },
      { name: 'Moremi Hall',            emoji: '🛏️', type: 'hostel',     x: -26, z: 22,  w: 16, d: 12, h: 10, color: 0xf2c9a0, roof: 0x7a4a2a },
      { name: 'Jaja Hall',              emoji: '🛏️', type: 'hostel',     x: 26,  z: 42,  w: 14, d: 10, h: 9,  color: 0xe8b99a, roof: 0x6a3a2a },
      { name: 'Mama Put Canteen',       emoji: '🍛', type: 'canteen',    x: 24,  z: 22,  w: 12, d: 10, h: 5,  color: 0xf6e07a, roof: 0xb5481f },
      { name: 'Main Auditorium',        emoji: '🎭', type: 'auditorium', x: 0,   z: -42, w: 18, d: 10, h: 12, color: 0xf4f1ea, roof: 0x0a8f4f }
    ],
    field: { name: 'Sports Centre', x: 42, z: 0, w: 20, d: 14 }
  },

  ui: {
    id: 'ui',
    short: 'UI',
    name: 'University of Ibadan',
    tagline: 'Nigeria’s first university: green, leafy and historic',
    accent: '#8a3b2b',
    ground: 0x4f9a45,
    trees: 90,
    features: [],
    buildings: [
      { name: 'Trenchard Hall',           emoji: '🎓', type: 'lecture',    x: -24, z: -24, w: 16, d: 12, h: 10, color: 0xf4ead2, roof: 0x7a2f22 },
      { name: 'Faculty of Arts',          emoji: '🎨', type: 'lecture',    x: 24,  z: -24, w: 14, d: 12, h: 8,  color: 0xe7d3b8, roof: 0x5a3a22 },
      { name: 'Tedder Hall',              emoji: '🛏️', type: 'hostel',     x: -26, z: 22,  w: 16, d: 12, h: 10, color: 0xf0cfa8, roof: 0x6a3a2a },
      { name: 'Queen Elizabeth II Hall',  emoji: '🛏️', type: 'hostel',     x: 26,  z: 42,  w: 15, d: 10, h: 9,  color: 0xf6dcc0, roof: 0x8a4a2a },
      { name: 'Campus Buttery',           emoji: '🍛', type: 'canteen',    x: 24,  z: 22,  w: 12, d: 10, h: 5,  color: 0xf6e07a, roof: 0xb5481f },
      { name: 'Kenneth Dike Library',     emoji: '📚', type: 'library',    x: 0,   z: -42, w: 16, d: 10, h: 13, color: 0xe8e0d0, roof: 0x6b3a2a }
    ],
    field: { name: 'Sports Centre', x: 42, z: 0, w: 20, d: 14 }
  },

  oau: {
    id: 'oau',
    short: 'OAU',
    name: 'Obafemi Awolowo University',
    tagline: 'Ile-Ife: a sprawling, scenic campus full of character',
    accent: '#c27a1a',
    ground: 0x7aa84a,
    trees: 50,
    features: ['amphitheatre'],
    buildings: [
      { name: 'Hezekiah Oluwasanmi Library', emoji: '📚', type: 'library',    x: -24, z: -24, w: 16, d: 12, h: 10, color: 0xe4d6c0, roof: 0x4a5a3a },
      { name: 'Faculty of Technology',       emoji: '⚙️', type: 'lecture',    x: 40,  z: -32, w: 14, d: 10, h: 8,  color: 0xd9d4c8, roof: 0x3a3a46 },
      { name: 'Awolowo Hall',                emoji: '🛏️', type: 'hostel',     x: -26, z: 22,  w: 16, d: 12, h: 10, color: 0xf2c9a0, roof: 0x7a4a2a },
      { name: 'Angola Hall',                 emoji: '🛏️', type: 'hostel',     x: 26,  z: 42,  w: 14, d: 10, h: 9,  color: 0xeab98a, roof: 0x6a3a1a },
      { name: 'Student Union Building',      emoji: '🍛', type: 'canteen',    x: 24,  z: 22,  w: 14, d: 10, h: 6,  color: 0xf6e07a, roof: 0xb5481f },
      { name: 'Oduduwa Hall',                emoji: '🎭', type: 'auditorium', x: 0,   z: -42, w: 18, d: 10, h: 12, color: 0xe4c9a8, roof: 0x9a4a2a }
    ],
    field: { name: 'Sports Centre', x: 42, z: 0, w: 20, d: 14 },
    amphitheatre: { x: 24, z: -22 }
  }
};

export const CAMPUS_ORDER = ['unilag', 'ui', 'oau'];

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
