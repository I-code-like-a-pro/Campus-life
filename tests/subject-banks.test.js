import { describe, it, expect } from 'vitest';
import { DEPTS, buildCourses, bankOf } from '../src/courses.js';
import { QUESTIONS } from '../src/questions.js';
import { COURSES } from '../src/admissions.js';

const years = [1, 2, 3, 4];

describe('subject question banks', () => {
  it('every course in every department and level resolves to a bank with 16+ questions', () => {
    for (const { id } of COURSES) {
      for (let year = 1; year <= DEPTS[id].years; year++) {
        for (const term of [1, 2]) {
          for (const c of buildCourses(id, year, term)) {
            const bank = QUESTIONS[bankOf(c)];
            expect(bank, `${id} y${year} t${term} ${c.code}`).toBeTruthy();
            expect(bank.length, `${c.code} ${bankOf(c)}`).toBeGreaterThanOrEqual(16);
          }
        }
      }
    }
  });

  it('every question has one right answer and three distinct wrong ones', () => {
    for (const [key, bank] of Object.entries(QUESTIONS)) {
      const seen = new Set();
      for (const row of bank) {
        expect(row.length, `${key}: ${row[0]}`).toBe(5);
        expect(new Set(row.slice(1)).size, `${key}: ${row[0]}`).toBe(4);
        row.forEach(t => expect(String(t).trim().length).toBeGreaterThan(0));
        expect(seen.has(row[0]), `${key} duplicate question ${row[0]}`).toBe(false);
        seen.add(row[0]);
      }
    }
  });

  it('subject spot checks', () => {
    const bankFor = (dept, code, year = 1, term = 1) => buildCourses(dept, year, term).find(c => c.code === code);
    expect(bankOf(bankFor('cs', 'MTH 101'))).toBe('maths');
    expect(bankOf(bankFor('cs', 'PHY 101'))).toBe('phy');
    expect(bankOf(bankFor('cs', 'STA 102', 1, 2))).toBe('sta');
    expect(bankOf(bankFor('cs', 'CSC 101'))).toBe('cs');
    expect(bankOf(bankFor('medicine', 'BIO 101'))).toBe('bio');
    expect(bankOf(bankFor('medicine', 'CHM 101'))).toBe('chm');
    expect(bankOf(bankFor('pharmacy', 'CHM 102', 1, 2))).toBe('chm');
    expect(bankOf(bankFor('accounting', 'ECO 101'))).toBe('economics');
    expect(bankOf(bankFor('accounting', 'BUS 101'))).toBe('bus');
    expect(bankOf(bankFor('engineering', 'PHY 102', 1, 2))).toBe('phy');
    expect(bankOf(bankFor('engineering', 'MTH 101'))).toBe('maths');
    expect(bankOf(bankFor('economics', 'STA 101'))).toBe('sta');
    for (const { id } of COURSES) {
      for (const y of years) for (const t of [1, 2]) {
        for (const c of buildCourses(id, y, t)) {
          if (c.code.startsWith('MTH') || c.code.startsWith('PHY')) expect(bankOf(c)).not.toBe('cs');
        }
      }
    }
  });

  it('old saves with the wrong bank are repaired by course code', () => {
    expect(bankOf({ code: 'MTH 101', bank: 'cs' })).toBe('maths');
    expect(bankOf({ code: 'CSC 101', bank: 'cs' })).toBe('cs');
    expect(bankOf({ code: 'CSC 211', bank: 'cs@2' })).toBe('cs@2');
  });
});
