// Pack for Obafemi Awolowo University. Everything specific to this university lives here (see src/packs/schema.js for the rules and limits).
// Each section has a provenance entry: where the facts came from, how sure we are, and whether the owner has verified them.

export default {
  id: 'oau',
  version: 1,
  identity: { short: 'OAU', name: 'Obafemi Awolowo University', tagline: 'Ile-Ife: a sprawling, scenic campus full of character', accent: '#c27a1a' },
  campus: {
    ground: 0x7aa84a,
    trees: 50,
    features: ['amphitheatre'],
    buildings: [
      { name: 'Hezekiah Oluwasanmi Library', emoji: '📚', type: 'library', x: -24, z: -24, w: 16, d: 12, h: 10, color: 0xe4d6c0, roof: 0x4a5a3a },
      { name: 'Faculty of Technology', emoji: '⚙️', type: 'lecture', x: 40, z: -32, w: 14, d: 10, h: 8, color: 0xd9d4c8, roof: 0x3a3a46 },
      { name: 'Awolowo Hall', emoji: '🛏️', type: 'hostel', x: -26, z: 22, w: 16, d: 12, h: 10, color: 0xf2c9a0, roof: 0x7a4a2a },
      { name: 'Angola Hall', emoji: '🛏️', type: 'hostel', x: 26, z: 42, w: 14, d: 10, h: 9, color: 0xeab98a, roof: 0x6a3a1a },
      { name: 'Student Union Building', emoji: '🍛', type: 'canteen', x: 24, z: 22, w: 14, d: 10, h: 6, color: 0xf6e07a, roof: 0xb5481f },
      { name: 'Oduduwa Hall', emoji: '🎭', type: 'auditorium', x: 0, z: -42, w: 18, d: 10, h: 12, color: 0xe4c9a8, roof: 0x9a4a2a }
    ],
    field: { name: 'Sports Centre', x: 42, z: 0, w: 20, d: 14 },
    amphitheatre: { x: 24, z: -22 }
  },
  admissions: {
    cutoffs: { medicine: 84, law: 77, engineering: 74, cs: 79, accounting: 72, masscomm: 71, pharmacy: 75, economics: 70, maths: 56 },
    cutoffSource: 'estimate'
  },
  offers: ['medicine', 'law', 'engineering', 'cs', 'accounting', 'masscomm', 'pharmacy', 'economics', 'maths'],
  fees: { amount: 27000, lateFee: 2000 },
  travel: { lagos: 200, ibadan: 90, ife: 5, uyo: 640, abuja: 580, portharcourt: 480, kano: 800 },
  provenance: {
    identity: { source: 'game-data', confidence: 'medium', verified: false, note: 'Names come from the game, not a checked source yet.' },
    campus: { source: 'game-data', confidence: 'low', verified: false, note: 'Stylised layout. Building names are inspired by the real campus and still need owner review.' },
    cutoffs: { source: 'game-data', confidence: 'low', verified: false, note: 'Estimates, not official figures.' },
    fees: { source: 'game-data', confidence: 'none', verified: false, note: 'Game placeholder, not a real fee.' },
    travel: { source: 'game-data', confidence: 'medium', verified: false, note: 'Approximate road distances from the game data.' }
  }
};
