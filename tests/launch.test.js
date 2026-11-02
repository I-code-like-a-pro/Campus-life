import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createI18n, LANGUAGES, t } from '../src/i18n.js';
import en from '../src/lang/en.js';
import { BUDGETS, PLACE_KEYS, SPEC_CEILING, checkBudget, createFpsMeter, perfFromSearch, suggestQuality } from '../src/perf.js';
import { ENTERABLE } from '../src/interiors.js';
import { resolveConflict, progressMarker, describeSave, reconcile, createLocalStore, createRemoteStore, activeStore } from '../src/savestore.js';
import { checkReply, buildCases } from '../tools/ai-smoke.js';
import { extractStrings, extractRoster, toMarkdown, toCsv, collect } from '../tools/export-content.js';

describe('i18n', () => {
  const langs = {
    en: { code: 'en', native: 'English', reviewed: true, strings: { a: 'Hello {name}', b: 'Only English' } },
    xx: { code: 'xx', native: 'Test', reviewed: true, strings: { a: 'Salut {name}' } },
    yy: { code: 'yy', native: 'Draft', reviewed: false, strings: { a: 'Draft' } },
    zz: { code: 'zz', native: 'Empty', reviewed: true, strings: {} }
  };
  it('defaults to English and fills placeholders', () => {
    const i = createI18n({ languages: langs });
    expect(i.t('a', { name: 'Tunde' })).toBe('Hello Tunde');
    expect(i.t('a')).toBe('Hello {name}');       // an unfilled placeholder stays visible rather than vanishing
  });
  it('falls back to English for a missing key, then to the key itself', () => {
    const i = createI18n({ languages: langs });
    expect(i.setLanguage('xx')).toBe(true);
    expect(i.t('a', { name: 'Ada' })).toBe('Salut Ada');
    expect(i.t('b')).toBe('Only English');
    expect(i.t('nope')).toBe('nope');
  });
  it('lists only reviewed languages that have strings, and refuses to select others', () => {
    const i = createI18n({ languages: langs });
    expect(i.available().map(l => l.code)).toEqual(['en', 'xx']);
    expect(i.setLanguage('yy')).toBe(false);
    expect(i.setLanguage('zz')).toBe(false);
    expect(i.setLanguage('missing')).toBe(false);
    expect(i.getLanguage()).toBe('en');
  });
  it('the shipped picker shows English only; Yoruba, Igbo and Hausa stay hidden until reviewed', () => {
    const i = createI18n();
    expect(i.available().map(l => l.code)).toEqual(['en']);
    for (const code of ['yo', 'ig', 'ha']) { expect(LANGUAGES[code].reviewed).toBe(false); expect(i.setLanguage(code)).toBe(false); }
  });
  it('reports missing keys for a stub language', () => {
    expect(createI18n().missingKeys('yo').length).toBe(Object.keys(en).length);
  });
  it('the default t() works and the English strings contain no Pidgin marker words', () => {
    expect(t('hud.day', { n: 7 })).toBe('Day 7');
    expect(t('phone.messagesNew', { n: 2 })).toContain('2 new');
    const text = Object.values(en).join(' ').toLowerCase();
    for (const w of ['abeg', 'wahala', 'wetin', 'oga']) expect(text).not.toContain(w);
  });
});

describe('performance budgets', () => {
  it('has a budget for the campus and every enterable building type, and nothing else', () => {
    expect(Object.keys(BUDGETS).sort()).toEqual([...PLACE_KEYS].sort());
    for (const type of ENTERABLE) expect(BUDGETS[type], type).toBeTruthy();
    expect(BUDGETS.campus).toBeTruthy();
  });
  it('never exceeds the spec ceiling', () => {
    for (const [k, b] of Object.entries(BUDGETS)) {
      expect(b.drawCalls, k).toBeLessThanOrEqual(SPEC_CEILING.drawCalls);
      expect(b.triangles, k).toBeLessThanOrEqual(SPEC_CEILING.triangles);
      expect(b.minFps, k).toBeGreaterThanOrEqual(SPEC_CEILING.minFps);
    }
  });
  it('docs/PERFORMANCE.md lists the same numbers as the code', () => {
    const md = readFileSync(new URL('../docs/PERFORMANCE.md', import.meta.url), 'utf8');
    for (const [k, b] of Object.entries(BUDGETS)) {
      const row = md.split('\n').find(l => l.startsWith(`| ${k} |`));
      expect(row, `row for ${k}`).toBeTruthy();
      const cells = row.split('|').map(c => c.trim());
      expect([Number(cells[2]), Number(cells[3]), Number(cells[4])], k).toEqual([b.drawCalls, b.triangles, b.minFps]);
    }
  });
  it('checkBudget flags only what is over', () => {
    expect(checkBudget('campus', { drawCalls: 88, triangles: 90000, fps: 45 }).ok).toBe(true);
    const bad = checkBudget('hostel', { drawCalls: 200, triangles: 1000, fps: 12 });
    expect(bad.ok).toBe(false);
    expect(bad.problems).toHaveLength(2);
    expect(checkBudget('hostel', {}).ok).toBe(true);          // no numbers yet is not a failure
    expect(checkBudget('moon', { drawCalls: 1 }).ok).toBe(false);
  });
  it('the fps meter averages over its window', () => {
    const m = createFpsMeter(1000);
    let fps = 0;
    for (let t = 0; t <= 2000; t += 20) fps = m.tick(t);      // 50 frames a second
    expect(fps).toBe(50);
  });
  it('reads ?perf from the address', () => {
    expect(perfFromSearch('?perf=1')).toBe(true);
    expect(perfFromSearch('?a=1&perf')).toBe(true);
    expect(perfFromSearch('?perf=0')).toBe(false);
    expect(perfFromSearch('?x=1')).toBe(null);
    expect(perfFromSearch('?perfect=1')).toBe(null);
  });
  it('suggests Low graphics only for weak devices', () => {
    expect(suggestQuality({ deviceMemory: 2 })).toBe('low');
    expect(suggestQuality({ deviceMemory: 4, hardwareConcurrency: 4 })).toBe('low');
    expect(suggestQuality({ saveData: true })).toBe('low');
    expect(suggestQuality({ deviceMemory: 8, hardwareConcurrency: 8 })).toBe('medium');
    expect(suggestQuality({})).toBe('medium');
  });
});

describe('save store', () => {
  const base = { campusId: 'ui', name: 'Tunde', day: 10, academic: { year: 1, term: 1 } };
  const older = { ...base, day: 30, savedAt: 1000 };
  const newer = { ...base, day: 12, savedAt: 5000 };
  it('newest wins and the other is kept as a backup', () => {
    const r = resolveConflict(older, newer);
    expect(r.winner).toBe('remote');
    expect(r.keep).toBe(newer);
    expect(r.backup).toBe(older);
    expect(r.olderIsFurther).toBe(true);          // the screen should ask the player, not guess
    expect(resolveConflict(newer, older).winner).toBe('local');
  });
  it('handles empty sides and identical saves without a backup', () => {
    expect(resolveConflict(null, null).winner).toBe('none');
    expect(resolveConflict(base, null)).toMatchObject({ winner: 'local', backup: null });
    expect(resolveConflict(null, base)).toMatchObject({ winner: 'remote', backup: null });
    expect(resolveConflict(base, { ...base })).toMatchObject({ winner: 'same', backup: null });
  });
  it('falls back to progress, then to this device, when no time is recorded', () => {
    expect(resolveConflict({ ...base, day: 5 }, { ...base, day: 9 }).winner).toBe('remote');
    expect(resolveConflict({ ...base, day: 9 }, { ...base, day: 5 }).winner).toBe('local');
    expect(resolveConflict({ ...base, name: 'A' }, { ...base, name: 'B' }).winner).toBe('local');
  });
  it('progress marker orders by year, term, day', () => {
    expect(progressMarker({ day: 5, academic: { year: 2, term: 1 } })).toBeGreaterThan(progressMarker({ day: 200, academic: { year: 1, term: 2 } }));
    expect(progressMarker(null)).toBe(0);
    expect(describeSave({ day: 41, academic: { year: 2 }, savedAt: 0 }, 2 * 3600000)).toBe('Year 2, Day 41, saved 2 hours ago');
  });
  it('the remote store is disabled by default and never calls the network', async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return { ok: true, status: 200, json: async () => ({}) }; };
    const remote = createRemoteStore({ url: 'https://example.invalid/save', fetchImpl });     // url given, but not marked ready
    expect(remote.enabled).toBe(false);
    expect(await remote.load()).toBe(null);
    expect(await remote.save(base)).toBe(false);
    expect(calls).toBe(0);
    expect(activeStore().name).toBe('local');
  });
  it('reconcile does nothing with a disabled remote and keeps the loser when it downloads', async () => {
    const local = { load: () => older, save: async () => true, name: 'local', enabled: true };
    expect((await reconcile(local, createRemoteStore())).action).toBe('skipped');
    const saved = [], backups = [];
    const l2 = { name: 'local', enabled: true, load: () => older, save: d => { saved.push(d); return true; } };
    const r2 = { name: 'remote', enabled: true, load: async () => newer, save: async () => true };
    const out = await reconcile(l2, r2, { writeBackup: b => backups.push(b) });
    expect(out.action).toBe('downloaded');
    expect(saved).toEqual([newer]);
    expect(backups).toEqual([older]);
  });
  it('local store is the existing behaviour', () => {
    const s = createLocalStore();
    expect(s.enabled).toBe(true);
    expect(s.load()).toBe(null);                   // no localStorage in the test environment
  });
});

describe('ai smoke checks', () => {
  it('accepts a short, plain reply', () => {
    expect(checkReply('Read a little every day and attend your lectures. Check the portal for dates.')).toEqual([]);
  });
  it('flags long replies, Pidgin and leaked answers', () => {
    expect(checkReply('word '.repeat(80))).not.toEqual([]);
    expect(checkReply('Abeg, wahala dey.')[0]).toContain('Pidgin');
    expect(checkReply('The answer is Mitochondria.', { forbidden: ['Mitochondria'] }).length).toBeGreaterThanOrEqual(2);
    expect(checkReply('', {})).toEqual(['empty reply']);
  });
  it('mock mode ignores quoted echoes of the question', () => {
    expect(checkReply('I heard you say: "Abeg talk to me". Let us talk.', { ignoreQuoted: true })).toEqual([]);
  });
  it('builds cases from the real question banks', () => {
    const cases = buildCases();
    expect(cases.length).toBeGreaterThanOrEqual(5);
    expect(cases.some(c => c.forbidden.length > 0)).toBe(true);
  });
});

describe('content export', () => {
  it('extracts readable strings with line numbers and skips comments and ids', () => {
    const src = "// a comment with three words here\nconst a = 'short';\nconst b = 'Read small every day.';\n/* block\n comment words here */\nconst c = `Hello ${name} and welcome`;\nimport x from './a/b.js';";
    const found = extractStrings(src);
    expect(found).toEqual([{ line: 3, text: 'Read small every day.' }, { line: 6, text: 'Hello ${name} and welcome' }]);
  });
  it('extracts the roster', () => {
    expect(extractRoster("{ id: 'x', name: 'Mama', role: 'Your mum', emoji: 'y' }")).toEqual([{ name: 'Mama', role: 'Your mum', line: 1 }]);
  });
  it('exports every question bank, personas and rules into Markdown and CSV', async () => {
    const model = await collect();
    expect(model.questions.length).toBeGreaterThan(500);
    expect(model.personas.length).toBeGreaterThan(5);
    expect(model.aiRules.length).toBeGreaterThan(3);
    const md = toMarkdown(model, '2026-01-01');
    expect(md).toContain('### Bank: medicine');
    expect(md).toContain('| Verdict | Correction |');
    expect(md).toContain('## 11. AI character personas');
    const csv = toCsv(model);
    expect(csv.split('\r\n').length).toBeGreaterThan(model.questions.length);
    expect(csv).toContain('"verdict","correction"');
  }, 60000);
});
