import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PROGRAMME_LIST, PROGRAMMES, FAMILIES, isGeneric } from '../src/programmes.js';
import { DEPTS, buildCourses, bankForCode } from '../src/courses.js';
import { QUESTIONS } from '../src/questions.js';
import { COURSES, offeredCourses } from '../src/admissions.js';
import { TOWNS } from '../src/towns.js';
import { PACKS, PACK_ORDER, facultiesOf } from '../src/packs/index.js';
import { validatePack } from '../src/packs/schema.js';
import { simulate } from '../tools/balance.js';

const facts = JSON.parse(readFileSync(new URL('../data/unilag/facts.json', import.meta.url), 'utf8'));
const fact = id => facts.find(f => f.id === id);
const ctx = { courseIds: COURSES.map(c => c.id), townIds: TOWNS.map(t => t.id) };
const clone = o => JSON.parse(JSON.stringify(o));

describe('the programme catalogue', () => {
  it('has unique ids and prefixes, in the original order for the first nine', () => {
    expect(new Set(PROGRAMME_LIST.map(p => p.id)).size).toBe(PROGRAMME_LIST.length);
    expect(PROGRAMME_LIST.slice(0, 9).map(p => p.id)).toEqual(['medicine', 'law', 'engineering', 'cs', 'accounting', 'masscomm', 'pharmacy', 'economics', 'maths']);
    expect(COURSES.map(c => c.id)).toEqual(PROGRAMME_LIST.map(p => p.id));
    const prefixes = PROGRAMME_LIST.map(p => p.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
  it('keeps the authored programmes in step with their hand-written course data', () => {
    for (const p of PROGRAMME_LIST.filter(x => x.status === 'authored')) {
      expect(DEPTS[p.id].prefix, p.id).toBe(p.prefix);
      expect(DEPTS[p.id].years, p.id).toBe(p.years);
    }
  });
  it('gives every generic programme a known family and a department entry', () => {
    const generic = PROGRAMME_LIST.filter(p => p.status === 'generic');
    expect(generic.length).toBeGreaterThanOrEqual(20);
    for (const p of generic) {
      expect(FAMILIES[p.family], p.id).toBeTruthy();
      expect(DEPTS[p.id]?.generic, p.id).toBe(true);
      expect(isGeneric(p.id)).toBe(true);
    }
    expect(isGeneric('cs')).toBe(false);
  });
});

describe('every programme can be played for its whole degree', () => {
  it('builds valid courses for every year and semester', () => {
    for (const p of PROGRAMME_LIST) {
      for (let year = 1; year <= p.years; year++) for (const term of [1, 2]) {
        const list = buildCourses(p.id, year, term);
        expect(list.length, `${p.id} ${year}00L term ${term}`).toBe(4);
        expect(new Set(list.map(c => c.code)).size, `${p.id} ${year}.${term} codes`).toBe(4);
        expect(new Set(list.map(c => c.title)).size, `${p.id} ${year}.${term} titles`).toBe(4);
        for (const c of list) {
          const bank = QUESTIONS[c.bank] || QUESTIONS[c.bank.split('@')[0]];
          expect(bank?.length, `${p.id} ${c.code} bank ${c.bank}`).toBeGreaterThanOrEqual(16);
        }
      }
    }
  });
  it('maths and physics sample programmes use their own subject banks, not computer science', () => {
    expect(buildCourses('physics', 1, 1).map(c => c.bank)).toEqual(['phy', 'maths', 'chm', 'gst']);
    expect(buildCourses('nursing', 1, 1).some(c => c.bank === 'cs')).toBe(false);
    expect(bankForCode('MTH 101', 'physics')).toBe('maths');
  });
  it('borrows each question only once when a family draws on several banks', () => {
    for (const p of PROGRAMME_LIST.filter(x => x.status === 'generic')) {
      const qs = QUESTIONS[p.id].map(q => q[0]);
      expect(new Set(qs).size, p.id).toBe(qs.length);
    }
  });
});

describe('UNILAG faculties', () => {
  const faculties = facultiesOf('unilag');
  it('covers every faculty in the research, with every offered programme in exactly one', () => {
    expect(faculties.map(f => f.name)).toEqual(fact('fac-list').value);
    expect(faculties).toHaveLength(fact('fac-count').value);
    const placed = faculties.flatMap(f => f.programmes);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual([...PACKS.unilag.offers].sort());
    for (const f of faculties) expect(f.programmes.length, f.name).toBeGreaterThanOrEqual(1);
  });
  it('copies department names exactly from the research file', () => {
    for (const f of faculties) {
      const f1 = facts.find(x => x.path === `structure.departments.${f.id}`);
      expect(f.departments, f.name).toEqual(f1.value);
    }
  });
  it('labels every cut-off for a sample programme as an estimate', () => {
    const generic = PACKS.unilag.offers.filter(isGeneric);
    expect([...PACKS.unilag.admissions.estimated].sort()).toEqual([...generic].sort());
  });
  it('is still unverified and says where the structure came from', () => {
    expect(PACKS.unilag.provenance.faculties.verified).toBe(false);
    expect(PACKS.unilag.provenance.faculties.source).toContain('facts.json');
  });
  it('is the only pack with sample programmes; UI and OAU still offer the authored nine', () => {
    for (const id of ['ui', 'oau']) {
      expect(offeredCourses(id).every(c => !isGeneric(c.id)), id).toBe(true);
      expect(facultiesOf(id)).toBeNull();
    }
    expect(PACK_ORDER).toEqual(['unilag', 'ui', 'oau']);
  });
});

describe('the validator and faculties', () => {
  const fresh = () => clone(PACKS.unilag);
  const problems = p => validatePack(p, ctx).join('\n');

  it('passes the shipped packs', () => {
    for (const id of PACK_ORDER) expect(validatePack(PACKS[id], ctx), id).toEqual([]);
  });
  it('rejects a programme in two faculties', () => {
    const p = fresh(); p.faculties[1].programmes.push(p.faculties[0].programmes[0]);
    expect(problems(p)).toContain('is in more than one faculty');
  });
  it('rejects an offered programme that is in no faculty, and a faculty with no programme', () => {
    let p = fresh(); p.faculties[0].programmes = [];
    expect(problems(p)).toContain('every faculty needs at least one playable programme');
    expect(problems(p)).toContain('offered but not in any faculty');
    p = fresh(); p.faculties[0].departments = [];
    expect(problems(p)).toContain('faculties[0].departments');
  });
  it('rejects a cut-off for something the university does not offer, and a faculty programme that is not offered', () => {
    let p = fresh(); p.offers = p.offers.filter(o => o !== 'nursing');
    expect(problems(p)).toContain('admissions.cutoffs.nursing');
    p = clone(PACKS.ui); p.cutoffs = undefined; p.admissions.cutoffs.nursing = 70;
    expect(problems(p)).toContain('admissions.cutoffs.nursing');
  });
  it('requires faculty provenance and a valid estimated list', () => {
    let p = fresh(); delete p.provenance.faculties;
    expect(problems(p)).toContain('provenance.faculties');
    p = fresh(); p.admissions.estimated = ['law', 'spaceflight'];
    expect(problems(p)).toContain('admissions.estimated');
  });
  it('rejects duplicate offers, unknown programmes and an empty offers list', () => {
    let p = fresh(); p.offers.push('law');
    expect(problems(p)).toContain('listed twice');
    p = fresh(); p.offers.push('spaceflight');
    expect(problems(p)).toContain('unknown programme');
    p = fresh(); p.offers = [];
    expect(problems(p)).toContain('offers: a list of programme ids is required');
  });
});

describe('every programme survives a long simulated degree', () => {
  it('plays up to four years without errors, with sensible results', () => {
    for (const p of PROGRAMME_LIST) {
      const semesters = Math.min(p.years * 2, 8);
      const log = simulate({ course: p.id, profile: 'diligent', seed: 3, semesters });
      expect(log.semesters.length, `${p.id} semesters`).toBe(semesters);
      for (const s of log.semesters) {
        expect(Number.isFinite(s.gpa) && s.gpa >= 0 && s.gpa <= 5, `${p.id} gpa ${s.gpa}`).toBe(true);
      }
      expect(Number.isFinite(log.finalMoney), `${p.id} money`).toBe(true);
    }
  }, 120000);
  it('also works for a careless student on a new programme', () => {
    const log = simulate({ course: 'nursing', profile: 'careless', seed: 9, semesters: 4 });
    expect(log.semesters.length).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(log.finalMoney)).toBe(true);
  }, 60000);
});
