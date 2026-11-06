// Pack for University of Ibadan. Everything specific to this university lives here (see src/packs/schema.js for the rules and limits).
// Each section has a provenance entry: where the facts came from, how sure we are, and whether the owner has verified them.

export default {
  id: 'ui',
  version: 1,
  identity: { short: 'UI', name: 'University of Ibadan', tagline: 'Nigeria’s first university: green, leafy and historic', accent: '#8a3b2b' },
  campus: {
    ground: 0x4f9a45,
    trees: 90,
    features: [],
    buildings: [
      { name: 'Trenchard Hall', emoji: '🎓', type: 'lecture', x: -24, z: -24, w: 16, d: 12, h: 10, color: 0xf4ead2, roof: 0x7a2f22 },
      { name: 'Faculty of Arts', emoji: '🎨', type: 'lecture', x: 24, z: -24, w: 14, d: 12, h: 8, color: 0xe7d3b8, roof: 0x5a3a22 },
      { name: 'Tedder Hall', emoji: '🛏️', type: 'hostel', x: -26, z: 22, w: 16, d: 12, h: 10, color: 0xf0cfa8, roof: 0x6a3a2a },
      { name: 'Queen Elizabeth II Hall', emoji: '🛏️', type: 'hostel', x: 26, z: 42, w: 15, d: 10, h: 9, color: 0xf6dcc0, roof: 0x8a4a2a },
      { name: 'Campus Buttery', emoji: '🍛', type: 'canteen', x: 24, z: 22, w: 12, d: 10, h: 5, color: 0xf6e07a, roof: 0xb5481f },
      { name: 'Kenneth Dike Library', emoji: '📚', type: 'library', x: 0, z: -42, w: 16, d: 10, h: 13, color: 0xe8e0d0, roof: 0x6b3a2a }
    ],
    field: { name: 'Sports Centre', x: 42, z: 0, w: 20, d: 14 }
  },
  admissions: {
    cutoffs: { medicine: 86, law: 80, engineering: 76, cs: 80, accounting: 72, masscomm: 70, pharmacy: 77, economics: 72, maths: 58 },
    cutoffSource: 'estimate'
  },
  fees: { amount: 24000, lateFee: 2000 },
  travel: { lagos: 130, ibadan: 8, ife: 90, uyo: 700, abuja: 640, portharcourt: 560, kano: 900 },
  provenance: {
    identity: { source: 'game-data', confidence: 'medium', verified: false, note: 'Names come from the game, not a checked source yet.' },
    campus: { source: 'game-data', confidence: 'low', verified: false, note: 'Stylised layout. Building names are inspired by the real campus and still need owner review.' },
    cutoffs: { source: 'game-data', confidence: 'low', verified: false, note: 'Estimates, not official figures.' },
    fees: { source: 'game-data', confidence: 'none', verified: false, note: 'Game placeholder, not a real fee.' },
    travel: { source: 'game-data', confidence: 'medium', verified: false, note: 'Approximate road distances from the game data.' }
  }
};
