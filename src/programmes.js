/*
 * The programme catalogue: every degree a player can choose, across all universities.
 *
 * A programme is either:
 *   - 'authored': written by hand with its own course lists and question banks (the original nine), or
 *   - 'generic': a sample programme built from a family template. Its course titles are placeholders and its questions come from
 *     related subject banks. The game labels these as sample courses until a real course list has been researched and verified.
 *
 * Which universities offer which programme, and how programmes group into faculties, is in the university packs (src/packs).
 * This file has no imports, so the packs, courses, questions and admissions code can all use it.
 */

/** Question banks each family draws on (keys of QUESTIONS in questions.js). */
export const FAMILIES = {
  authored:    { label: 'Authored', banks: [] },
  physical:    { label: 'Physical sciences, architecture', banks: ['maths', 'phy', 'chm'], practical: true },
  life:        { label: 'Life and health sciences', banks: ['bio', 'chm'], practical: true },
  engineering: { label: 'Engineering', banks: ['engineering', 'maths', 'phy'], practical: true },
  social:      { label: 'Social sciences, planning', banks: ['economics', 'sta', 'gst'] },
  management:  { label: 'Management', banks: ['bus', 'economics', 'sta'] },
  humanities:  { label: 'Arts and humanities', banks: ['gst'] },
  creative:    { label: 'Creative arts', banks: ['gst'] },
  education:   { label: 'Education', banks: ['gst', 'sta'] }
};

const A = (id, name, emoji, prefix, years) => ({ id, name, emoji, prefix, years, family: 'authored', status: 'authored' });
const G = (id, name, emoji, prefix, years, family, extra = {}) => ({ id, name, emoji, prefix, years, family, status: 'generic', ...extra });

/** Order matters: the original nine come first, in the order the game always listed them. */
export const PROGRAMME_LIST = [
  A('medicine', 'Medicine & Surgery', '🩺', 'MED', 6),
  A('law', 'Law', '⚖️', 'LAW', 5),
  A('engineering', 'Engineering', '⚙️', 'ENG', 5),
  A('cs', 'Computer Science', '💻', 'CSC', 4),
  A('accounting', 'Accounting', '📊', 'ACC', 4),
  A('masscomm', 'Mass Communication', '🎙️', 'MAC', 4),
  A('pharmacy', 'Pharmacy', '💊', 'PHA', 5),
  A('economics', 'Economics', '📈', 'ECO', 4),
  A('maths', 'Mathematics', '➗', 'MTH', 4),

  G('architecture', 'Architecture', '📐', 'ARC', 5, 'physical'),
  G('english', 'English', '📖', 'ENL', 4, 'humanities'),
  G('history', 'History and Strategic Studies', '🏛️', 'HIS', 4, 'humanities'),
  G('medmicro', 'Medical Microbiology and Parasitology', '🦠', 'MMP', 4, 'life'),
  G('anatomy', 'Anatomy', '🦴', 'ANA', 4, 'life'),
  G('physiology', 'Physiology', '🫀', 'PHS', 4, 'life'),
  G('dentistry', 'Dentistry', '🦷', 'DEN', 6, 'life'),
  G('theatre', 'Theatre Arts and Film Studies', '🎭', 'THR', 4, 'creative'),
  G('music', 'Music and Sound Production', '🎼', 'MUS', 4, 'creative'),
  G('scieducation', 'Science Education', '🧑🏾‍🏫', 'SED', 4, 'education'),
  G('electrical', 'Electrical and Electronics Engineering', '🔌', 'EEE', 5, 'engineering'),
  G('estate', 'Estate Management', '🏘️', 'EST', 4, 'social'),
  G('urbanplanning', 'Urban and Regional Planning', '🗺️', 'URP', 4, 'social'),
  G('nursing', 'Nursing Science', '🩹', 'NSC', 5, 'life'),
  G('medlab', 'Medical Laboratory Science', '🔬', 'MLS', 5, 'life'),
  G('biochem', 'Biochemistry', '🧪', 'BCH', 4, 'life'),
  G('microbio', 'Microbiology', '🧫', 'MCB', 4, 'life'),
  G('busadmin', 'Business Administration', '💼', 'BUS', 4, 'management'),
  G('physics', 'Physics', '⚛️', 'PHY', 4, 'physical', { firstYear: 'physics' }),
  G('psychology', 'Psychology', '🧠', 'PSY', 4, 'social'),
  G('polsci', 'Political Science', '🗳️', 'POL', 4, 'social')
];

export const PROGRAMMES = Object.fromEntries(PROGRAMME_LIST.map(p => [p.id, p]));
export const programmeOf = id => PROGRAMMES[id] || null;
export const isGeneric = id => PROGRAMMES[id]?.status === 'generic';

/** The question banks a generic programme draws on. */
export const familyBankKeys = family => FAMILIES[family]?.banks || [];

/* ---------------- generic course templates ---------------- */

const SHARED = {
  MTH101: ['MTH 101', 'Elementary Mathematics I'], MTH102: ['MTH 102', 'Elementary Mathematics II'],
  PHY101: ['PHY 101', 'General Physics I'], PHY102: ['PHY 102', 'General Physics II'],
  CHM101: ['CHM 101', 'General Chemistry I'], CHM102: ['CHM 102', 'General Chemistry II'],
  BIO101: ['BIO 101', 'General Biology I'], BIO102: ['BIO 102', 'General Biology II'],
  ECO101: ['ECO 101', 'Principles of Economics I'], ECO102: ['ECO 102', 'Principles of Economics II'],
  STA101: ['STA 101', 'Introduction to Statistics'], STA102: ['STA 102', 'Statistics for Social Science']
};

/** 100 level courses for a generic programme: `[semester1, semester2]`, each three [code, title] pairs. */
export function genericFirstYear(p) {
  const own = (n, title) => [`${p.prefix} ${n}`, title];
  const intro = [own(101, `Introduction to ${p.name} I`), own(102, `Introduction to ${p.name} II`)];
  // the programme's own introduction plus two shared first-year subjects for each semester
  const withShared = (a, b) => [0, 1].map(i => [intro[i], SHARED[`${a}10${i + 1}`], SHARED[`${b}10${i + 1}`]]);
  if (p.firstYear === 'physics') {
    return [[SHARED.PHY101, SHARED.MTH101, SHARED.CHM101], [SHARED.PHY102, SHARED.MTH102, SHARED.CHM102]];
  }
  switch (p.family) {
    case 'physical': case 'engineering': return withShared('MTH', 'PHY');
    case 'life': return withShared('BIO', 'CHM');
    case 'social': case 'management': return withShared('ECO', 'STA');
    default:   // humanities, creative arts, education: three departmental courses
      return [
        [intro[0], own(103, `Foundations of ${p.name}`), own(105, 'Study and Research Skills')],
        [intro[1], own(104, `Themes in ${p.name}`), own(106, 'Writing and Communication')]
      ];
  }
}

/** 200 to 400 level titles for a generic programme, in the same shape as TITLES in upperlevels.js. */
export function genericTitles(p) {
  const n = p.name;
  const kind = FAMILIES[p.family]?.practical ? 'Laboratory and Practical' : 'Seminar and Tutorials';
  return {
    2: [[`${n} Principles I`, `${n} Methods I`, `${kind} I`, 'Technical Writing and Communication'],
        [`${n} Principles II`, `${n} Methods II`, `${kind} II`, 'Entrepreneurship Studies']],
    3: [[`Intermediate ${n} I`, `Applied ${n} I`, `Research Methods in ${n}`, `${kind} III`],
        [`Intermediate ${n} II`, `Applied ${n} II`, 'Ethics and Professional Practice', `${kind} IV`]],
    4: [['Final Year Project I', `Advanced ${n} I`, `Special Topics in ${n} I`, 'Professional Seminar'],
        ['Final Year Project II', `Advanced ${n} II`, `Special Topics in ${n} II`, 'Industry and Society']]
  };
}
