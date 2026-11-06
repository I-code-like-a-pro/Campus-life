// Pack for University of Lagos. Everything specific to this university lives here (see src/packs/schema.js for the rules and limits).
// Each section has a provenance entry: where the facts came from, how sure we are, and whether the owner has verified them.

export default {
  id: 'unilag',
  version: 1,
  identity: { short: 'UNILAG', name: 'University of Lagos', tagline: 'Lagoon-side campus in the heart of Lagos', accent: '#0a8f4f' },
  campus: {
    ground: 0x6bb55a,
    trees: 26,
    features: ['lagoon'],
    buildings: [
      { name: 'Faculty of Engineering', emoji: '⚙️', type: 'lecture', x: -24, z: -24, w: 16, d: 12, h: 9, color: 0xe9dcc2, roof: 0x8a3b2b },
      { name: 'Main Library', emoji: '📖', type: 'library', x: 24, z: -24, w: 14, d: 12, h: 9, color: 0xd6e2ef, roof: 0x2f4f7a },
      { name: 'Moremi Hall', emoji: '🛏️', type: 'hostel', x: -26, z: 22, w: 16, d: 12, h: 10, color: 0xf2c9a0, roof: 0x7a4a2a },
      { name: 'Jaja Hall', emoji: '🛏️', type: 'hostel', x: 26, z: 42, w: 14, d: 10, h: 9, color: 0xe8b99a, roof: 0x6a3a2a },
      { name: 'Mama Put Canteen', emoji: '🍛', type: 'canteen', x: 24, z: 22, w: 12, d: 10, h: 5, color: 0xf6e07a, roof: 0xb5481f },
      { name: 'Main Auditorium', emoji: '🎭', type: 'auditorium', x: 0, z: -42, w: 18, d: 10, h: 12, color: 0xf4f1ea, roof: 0x0a8f4f }
    ],
    field: { name: 'Sports Centre', x: 42, z: 0, w: 20, d: 14 }
  },
  admissions: {
    cutoffs: { medicine: 85.025, law: 78.225, engineering: 75.625, cs: 83.425, accounting: 75.7, masscomm: 74.074, pharmacy: 76.4, economics: 73.475, maths: 63.675 },
    cutoffSource: 'official'
  },
  fees: { amount: 30000, lateFee: 2500 },
  travel: { lagos: 15, ibadan: 130, ife: 200, uyo: 780, abuja: 760, portharcourt: 620, kano: 1050 },
  provenance: {
    identity: { source: 'game-data', confidence: 'medium', verified: false, note: 'Names come from the game, not a checked source yet.' },
    campus: { source: 'game-data', confidence: 'low', verified: false, note: 'Stylised layout. Building names are inspired by the real campus and still need owner review.' },
    cutoffs: { source: 'game-data', confidence: 'medium', verified: false, note: 'Carried over from the earlier game data, which called them official. Not yet checked by the owner.' },
    fees: { source: 'game-data', confidence: 'none', verified: false, note: 'Game placeholder, not a real fee.' },
    travel: { source: 'game-data', confidence: 'medium', verified: false, note: 'Approximate road distances from the game data.' }
  }
};
