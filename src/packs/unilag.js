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
    cutoffs: { medicine: 85.025, law: 78.225, engineering: 75.625, cs: 83.425, accounting: 75.7, masscomm: 74.074, pharmacy: 76.4, economics: 73.475, maths: 63.675,
      architecture: 74, english: 68, history: 62, medmicro: 70, anatomy: 72, physiology: 72, dentistry: 80, theatre: 64, music: 60, scieducation: 62, electrical: 75, estate: 68, urbanplanning: 64, nursing: 76, medlab: 75, biochem: 70, microbio: 70, busadmin: 72, physics: 65, psychology: 72, polsci: 68 },
    cutoffSource: 'official',
    // Game estimates, not published figures (the original nine above came from the earlier game data):
    estimated: ['architecture', 'english', 'history', 'medmicro', 'anatomy', 'physiology', 'dentistry', 'theatre', 'music', 'scieducation', 'electrical', 'estate', 'urbanplanning', 'nursing', 'medlab', 'biochem', 'microbio', 'busadmin', 'physics', 'psychology', 'polsci']
  },
  offers: ['medicine', 'law', 'engineering', 'cs', 'accounting', 'masscomm', 'pharmacy', 'economics', 'maths', 'architecture', 'english', 'history', 'medmicro', 'anatomy', 'physiology', 'dentistry', 'theatre', 'music', 'scieducation', 'electrical', 'estate', 'urbanplanning', 'nursing', 'medlab', 'biochem', 'microbio', 'busadmin', 'physics', 'psychology', 'polsci'],
  faculties: [
    { id: 'architecture', name: 'Architecture', departments: ['Architecture', 'Landscape Architecture and Urban Design', 'Interior Architecture and Design'], programmes: ['architecture'] },
    { id: 'arts', name: 'Arts', departments: ['English', 'European Languages and Integration Studies', 'History and Strategic Studies', 'Linguistics', 'African and Asian Studies', 'Philosophy', 'Religious Studies'], programmes: ['english', 'history'] },
    { id: 'basic-clinical-sciences', name: 'Basic Clinical Sciences', departments: ['Anatomic and Molecular Pathology', 'Haematology and Blood Transfusion', 'Medical Microbiology and Parasitology', 'Clinical Pathology', 'Clinical Pharmacology'], programmes: ['medmicro'] },
    { id: 'basic-medical-sciences', name: 'Basic Medical Sciences', departments: ['Anatomy', 'Physiology', 'Medical Biochemistry', 'Pharmacology, Therapeutics and Toxicology'], programmes: ['anatomy', 'physiology'] },
    { id: 'clinical-sciences', name: 'Clinical Sciences', departments: ['Anaesthesia', 'Community Health and Primary Care', 'Medicine', 'Obstetrics and Gynaecology', 'Ophthalmology', 'Paediatrics', 'Psychiatry', 'Radiation Biology, Radiotherapy and Radiodiagnosis', 'Surgery'], programmes: ['medicine'] },
    { id: 'communication-and-media-studies', name: 'Communication and Media Studies', departments: ['Mass Communication'], programmes: ['masscomm'] },
    { id: 'computing-and-informatics', name: 'Computing and Informatics', departments: ['Computer Science', 'Intelligent Systems and Robotics', 'Cybersecurity and Software Engineering'], programmes: ['cs'] },
    { id: 'creative-arts', name: 'Creative Arts', departments: ['Music and Sound Production', 'Theatre Arts and Film Studies', 'Fine and Applied Arts'], programmes: ['theatre', 'music'] },
    { id: 'dental-sciences', name: 'Dental Sciences', departments: ['Child Dental Health', 'Oral and Maxillofacial Pathology and Biology', 'Oral and Maxillofacial Surgery', 'Preventive Dentistry', 'Restorative Dentistry'], programmes: ['dentistry'] },
    { id: 'education', name: 'Education', departments: ['Adult Education', 'Arts Education', 'Educational Foundations', 'Educational Management', 'Science Education'], programmes: ['scieducation'] },
    { id: 'engineering', name: 'Engineering', departments: ['Biomedical Engineering', 'Chemical Engineering', 'Civil and Environmental Engineering', 'Computer Engineering', 'Electrical and Electronics Engineering', 'Mechanical Engineering', 'Metallurgical and Materials Engineering', 'Petroleum and Gas Engineering', 'Surveying and Geoinformatics', 'Systems Engineering'], programmes: ['engineering', 'electrical'] },
    { id: 'environmental-sciences', name: 'Environmental Sciences', departments: ['Building', 'Estate Management', 'Quantity Surveying', 'Urban and Regional Planning'], programmes: ['estate', 'urbanplanning'] },
    { id: 'health-professions', name: 'Health Professions', departments: ['Medical Laboratory Science', 'Nursing Science', 'Physiotherapy', 'Radiography'], programmes: ['nursing', 'medlab'] },
    { id: 'law', name: 'Law', departments: ['Commercial and Industrial Law', 'Jurisprudence and International Law', 'Private and Property Law', 'Public Law'], programmes: ['law'] },
    { id: 'life-sciences', name: 'Life Sciences', departments: ['Biochemistry', 'Botany', 'Cell Biology and Genetics', 'Marine Science', 'Microbiology', 'Zoology', 'Fisheries and Aquaculture'], programmes: ['biochem', 'microbio'] },
    { id: 'management-sciences', name: 'Management Sciences', departments: ['Accounting', 'Actuarial Science and Insurance', 'Business Administration', 'Employment Relations and Human Resource Management', 'Finance'], programmes: ['accounting', 'busadmin'] },
    { id: 'pharmacy', name: 'Pharmacy', departments: ['Clinical Pharmacy and Biopharmacy', 'Pharmaceutical Chemistry', 'Pharmaceutical Microbiology and Biotechnology', 'Pharmaceutics and Pharmaceutical Technology', 'Pharmacognosy'], programmes: ['pharmacy'] },
    { id: 'physical-and-earth-sciences', name: 'Physical and Earth Sciences', departments: ['Chemistry', 'Geosciences', 'Mathematics', 'Physics', 'Statistics'], programmes: ['maths', 'physics'] },
    { id: 'social-sciences', name: 'Social Sciences', departments: ['Economics', 'Geography', 'Library and Information Science', 'Political Science', 'Psychology', 'Social Work', 'Sociology'], programmes: ['economics', 'psychology', 'polsci'] }
  ],
  fees: { amount: 30000, lateFee: 2500 },
  travel: { lagos: 15, ibadan: 130, ife: 200, uyo: 780, abuja: 760, portharcourt: 620, kano: 1050 },
  provenance: {
    faculties: { source: 'data/unilag/facts.json (fac-list, dept-*)', confidence: 'medium', verified: false, note: 'Faculty and department names come from the research notes, read through search summaries because the official site could not be fetched. Several department lists are partial. Each programme is a game programme placed in the faculty it belongs to; the course lists of new programmes are generic samples.' },
    identity: { source: 'game-data', confidence: 'medium', verified: false, note: 'Names come from the game, not a checked source yet.' },
    campus: { source: 'game-data', confidence: 'low', verified: false, note: 'Stylised layout. Building names are inspired by the real campus and still need owner review.' },
    cutoffs: { source: 'game-data', confidence: 'medium', verified: false, note: 'Carried over from the earlier game data, which called them official. Not yet checked by the owner.' },
    fees: { source: 'game-data', confidence: 'none', verified: false, note: 'Game placeholder, not a real fee.' },
    travel: { source: 'game-data', confidence: 'medium', verified: false, note: 'Approximate road distances from the game data.' }
  }
};
