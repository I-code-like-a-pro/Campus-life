// Course catalogue per department (ids match admissions.js). `courses[term - 1]` lists the three
// departmental courses for that semester of 100 level. Levels 200 to 400 have their own lists in upperlevels.js.
// `years` is the length of the degree.

import { TITLES } from './upperlevels.js';

export const DEPTS = {
  cs: { prefix: 'CSC', years: 4, courses: [
    [['CSC 101', 'Introduction to Computer Science'], ['MTH 101', 'Elementary Mathematics I'], ['PHY 101', 'General Physics I']],
    [['CSC 102', 'Introduction to Programming'], ['MTH 102', 'Elementary Mathematics II'], ['STA 102', 'Introduction to Statistics']]
  ] },
  medicine: { prefix: 'MED', years: 6, courses: [
    [['BIO 101', 'General Biology I'], ['CHM 101', 'General Chemistry I'], ['PHY 101', 'General Physics I']],
    [['BIO 102', 'General Biology II'], ['CHM 102', 'General Chemistry II'], ['PHY 102', 'General Physics II']]
  ] },
  law: { prefix: 'LAW', years: 5, courses: [
    [['LAW 101', 'Legal Method I'], ['LAW 103', 'Nigerian Legal System'], ['LAW 105', 'Introduction to Public Law']],
    [['LAW 102', 'Legal Method II'], ['LAW 104', 'Constitutional Law I'], ['LAW 106', 'Law of Contract I']]
  ] },
  engineering: { prefix: 'ENG', years: 5, courses: [
    [['ENG 101', 'Introduction to Engineering'], ['MTH 101', 'Elementary Mathematics I'], ['PHY 101', 'General Physics I']],
    [['ENG 102', 'Engineering Drawing'], ['MTH 102', 'Elementary Mathematics II'], ['PHY 102', 'General Physics II']]
  ] },
  accounting: { prefix: 'ACC', years: 4, courses: [
    [['ACC 101', 'Principles of Accounting I'], ['BUS 101', 'Introduction to Business'], ['ECO 101', 'Principles of Economics I']],
    [['ACC 102', 'Principles of Accounting II'], ['BUS 102', 'Business Communication'], ['ECO 102', 'Principles of Economics II']]
  ] },
  masscomm: { prefix: 'MAC', years: 4, courses: [
    [['MAC 101', 'Introduction to Mass Communication'], ['MAC 103', 'Introduction to Journalism'], ['MAC 105', 'Nigerian Media History']],
    [['MAC 102', 'Writing for the Media'], ['MAC 104', 'Introduction to Broadcasting'], ['MAC 106', 'Media and Society']]
  ] },
  pharmacy: { prefix: 'PHA', years: 5, courses: [
    [['PHA 101', 'Introduction to Pharmacy'], ['CHM 101', 'General Chemistry I'], ['BIO 101', 'General Biology I']],
    [['PHA 102', 'Pharmaceutical Chemistry I'], ['CHM 102', 'General Chemistry II'], ['BIO 102', 'General Biology II']]
  ] },
  economics: { prefix: 'ECO', years: 4, courses: [
    [['ECO 101', 'Principles of Economics I'], ['MTH 101', 'Elementary Mathematics I'], ['STA 101', 'Introduction to Statistics']],
    [['ECO 102', 'Principles of Economics II'], ['MTH 102', 'Elementary Mathematics II'], ['STA 102', 'Statistics for Economists']]
  ] },
  maths: { prefix: 'MTH', years: 4, courses: [
    [['MTH 101', 'Elementary Mathematics I'], ['MTH 103', 'Algebra I'], ['PHY 101', 'General Physics I']],
    [['MTH 102', 'Elementary Mathematics II'], ['MTH 104', 'Linear Algebra I'], ['PHY 102', 'General Physics II']]
  ] }
};

// General studies course taken in 100 level only (higher levels get a departmental elective instead).
export const GST = [['GST 111', 'Use of English I'], ['GST 112', 'Use of English II']];

// Subject banks for shared first-year courses, by code prefix. Other prefixes use their department bank.
export const SUBJECT_BANKS = { MTH: 'maths', PHY: 'phy', CHM: 'chm', BIO: 'bio', STA: 'sta', BUS: 'bus', ECO: 'economics', GST: 'gst' };

/** The question bank for a course code. Upper-level banks ('dept@level') are kept as they are. */
export function bankForCode(code, deptId) {
  return SUBJECT_BANKS[String(code).split(' ')[0]] || deptId;
}

/** Bank of a saved course object; repairs saves made before subject banks existed. */
export function bankOf(c) {
  if (c.bank && c.bank.includes('@')) return c.bank;
  return bankForCode(c.code, c.bank);
}

/** Course objects for one semester. `carry` is the list of failed courses to retake (at most two are added). */
export function buildCourses(deptId, year, term, carry = []) {
  const d = DEPTS[deptId];
  const fresh = course => ({ ...course, att: { ok: 0, late: 0 }, knowledge: 0, assign: { progress: 0, done: false }, ca: null, exam: null, usedQ: [] });
  let out;
  if (year === 1) {
    out = d.courses[term - 1].map(([code, title]) => fresh({ code, title, bank: bankForCode(code, deptId), units: 3, carry: false }));
    const [code, title] = GST[term - 1];
    out.push(fresh({ code, title, bank: 'gst', units: 2, carry: false }));
  } else {
    // 200 to 400 level have their own course lists and question banks; the extra years of 5 and 6 year degrees reuse 400 level
    const level = Math.min(year, 4);
    const titles = TITLES[deptId]?.[level]?.[term - 1];
    out = (titles || [...d.courses[term - 1].map(([, t]) => t), 'Departmental Elective']).map((title, i) => fresh({
      code: `${d.prefix} ${year}${term}${i + 1}`,
      title: year > 4 ? `${title} (${year}00L)` : title,
      bank: titles ? `${deptId}@${level}` : deptId,
      units: i === 3 ? 2 : 3, carry: false
    }));
  }
  carry.slice(0, 2).forEach(c => out.push(fresh({ code: c.code, title: c.title, bank: c.bank, units: c.units, carry: true })));
  return out;
}
