// Exports everything a reviewer should read into ONE file a lecturer or senior student can annotate:
//   question banks (100 to 400 level and general studies), NPC dialogue lines, scene and event text, hints, town flavour
//   lines, the NPC roster, and the AI personas and rules.
//
//   node tools/export-content.js                       writes content-review.md in the current folder
//   node tools/export-content.js --format csv          writes content-review.csv (opens in Excel or Google Sheets)
//   node tools/export-content.js --out some/file.md    choose the file name
//   node tools/export-content.js --stdout              print instead of writing
//
// Question banks come straight from the data. Dialogue, scene and event text is lifted from the source files with its
// file name and line number, so every correction can point to the exact place. See docs/REVIEW_KIT.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(root, rel), 'utf8');

/** Pulls human-readable string literals out of JS source: [{ line, text }]. Skips comments, short strings, ids and paths. */
export function extractStrings(source, { minWords = 3 } = {}) {
  const out = [];
  let i = 0, line = 1;
  const n = source.length;
  while (i < n) {
    const c = source[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && source[i + 1] === '/') { while (i < n && source[i] !== '\n') i++; continue; }
    if (c === '/' && source[i + 1] === '*') { i += 2; while (i < n && !(source[i] === '*' && source[i + 1] === '/')) { if (source[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c, startLine = line;
      let text = '';
      i++;
      while (i < n && source[i] !== quote) {
        if (source[i] === '\\') { const nx = source[i + 1]; text += nx === 'n' ? ' ' : nx; i += 2; continue; }
        if (source[i] === '\n') { if (quote !== '`') break; line++; }
        text += source[i++];
      }
      i++;
      const t = text.replace(/\s+/g, ' ').trim();
      const words = t.split(' ').filter(w => /[A-Za-z]/.test(w)).length;
      if (words >= minWords && !/^(\.|\/|https?:|#|[\w-]+\.(js|css|json))/.test(t) && !/^[\w-]+(\|[\w-]+)+$/.test(t)) out.push({ line: startLine, text: t });
      continue;
    }
    i++;
  }
  return out;
}

/** The NPC roster: every `name: '...', role: '...'` pair in the given source. */
export function extractRoster(source) {
  const rows = [], seen = new Set();
  const re = /name:\s*(?:'([^']+)'|"([^"]+)")[^}\n]*?role:\s*(?:'([^']+)'|"([^"]+)")/g;
  let m;
  while ((m = re.exec(source))) {
    const name = m[1] || m[2], role = m[3] || m[4], key = `${name}|${role}`;
    if (!seen.has(key)) { seen.add(key); rows.push({ name, role, line: source.slice(0, m.index).split('\n').length }); }
  }
  return rows;
}

/** AI personas (from src/ainpc.js) as [{ id, text }]. */
export function extractPersonas(source) {
  const block = /const PERSONAS = \{([\s\S]*?)\n\};/.exec(source)?.[1] || '';
  return [...block.matchAll(/^\s*(\w+):\s*'((?:[^'\\]|\\.)*)'/gm)].map(m => ({ id: m[1], text: m[2].replace(/\\'/g, "'") }));
}

/** Builds the whole review model from the project files. */
export async function collect() {
  const { QUESTIONS } = await import(pathToFileURL(join(root, 'src/questions.js')).href);
  const { UPPER_QUESTIONS } = await import(pathToFileURL(join(root, 'src/upperlevels.js')).href);
  const { buildSystem } = await import(pathToFileURL(join(root, 'server/npc-core.js')).href);

  const questions = [];
  for (const [bank, list] of [...Object.entries(QUESTIONS), ...Object.entries(UPPER_QUESTIONS)]) {
    list.forEach(([q, right, ...wrong], i) => questions.push({ bank, n: i + 1, q, right, wrong }));
  }

  const textFiles = [
    ['src/dialogues.js', 'NPC dialogue (story characters)'],
    ['src/worlddialogues.js', 'NPC dialogue (students, lecturers, vendors, nurse)'],
    ['src/scenes.js', 'Scenes (orientation, hall meeting, first lecture and more)'],
    ['src/campuslife-events.js', 'Campus life events (matriculation, orientation week)'],
    ['src/events.js', 'Campus announcements'],
    ['src/hints.js', 'Tutorial hints'],
    ['src/towns.js', 'Home town flavour'],
    ['src/ending.js', 'Graduation and ending text']
  ];
  const sections = textFiles.map(([file, title]) => ({ file, title, items: extractStrings(read(file)) }));

  const roster = [...extractRoster(read('src/npcs.js')).map(r => ({ ...r, file: 'src/npcs.js' })), ...extractRoster(read('src/scenes.js')).map(r => ({ ...r, file: 'src/scenes.js' }))];
  const personas = extractPersonas(read('src/ainpc.js'));
  const sample = { npc: { name: '(NPC name)', role: '(role)', persona: '(persona)' }, context: { facts: ['(game facts are filled in from the game)'] } };
  const aiRules = buildSystem(sample).split('\n').filter(l => l.startsWith('- ') || l.startsWith('Rules'));
  return { questions, sections, roster, personas, aiRules };
}

const esc = s => String(s).replace(/\|/g, '\\|');
const csvCell = s => `"${String(s ?? '').replace(/"/g, '""')}"`;

/** Markdown for reviewers. Every table has a "Verdict" and a "Correction" column to fill in. */
export function toMarkdown(model, date = new Date().toISOString().slice(0, 10)) {
  const L = [];
  L.push('# Campus Life content review', '', `Exported ${date}. Please read docs/REVIEW_KIT.md first.`, '',
    'For every row: write OK or FIX in the Verdict column, and the corrected text in the Correction column. Leave rows you are happy with blank or mark OK.', '',
    'Standard English only (no Pidgin). Content must suit teenagers. Reviewer name and date: ____________________', '');
  L.push(`## 1. Exam and test questions (${model.questions.length})`, '',
    'The first option is the marked correct answer (the game shuffles the order). Check: is it correct, is it the ONLY correct option, and is the level right for the course year?', '');
  let bank = null;
  for (const q of model.questions) {
    if (q.bank !== bank) {
      bank = q.bank;
      L.push('', `### Bank: ${bank}`, '', '| # | Question | Correct answer | Wrong options | Verdict | Correction |', '|---|---|---|---|---|---|');
    }
    L.push(`| ${bank}-${q.n} | ${esc(q.q)} | **${esc(q.right)}** | ${esc(q.wrong.join(' / '))} |  |  |`);
  }
  let n = 2;
  for (const s of model.sections) {
    L.push('', `## ${n++}. ${s.title} (${s.items.length} lines)`, '', `Source: \`${s.file}\`. The line number points to the place in the code.`, '', '| Ref | Text | Verdict | Correction |', '|---|---|---|---|');
    for (const it of s.items) L.push(`| ${s.file.replace('src/', '').replace('.js', '')}:${it.line} | ${esc(it.text)} |  |  |`);
  }
  L.push('', `## ${n++}. Characters`, '', '| Name | Role | Source | Verdict | Correction |', '|---|---|---|---|---|');
  for (const r of model.roster) L.push(`| ${esc(r.name)} | ${esc(r.role)} | ${r.file}:${r.line} |  |  |`);
  L.push('', `## ${n++}. AI character personas`, '', 'Each persona tells the AI how that kind of character talks. Check tone and accuracy.', '', '| Persona | Description | Verdict | Correction |', '|---|---|---|---|');
  for (const p of model.personas) L.push(`| ${p.id} | ${esc(p.text)} |  |  |`);
  L.push('', `## ${n++}. AI rules (what the AI is always told)`, '', '| Rule | Verdict | Correction |', '|---|---|---|');
  for (const r of model.aiRules) L.push(`| ${esc(r.replace(/^- /, ''))} |  |  |`);
  return L.join('\n') + '\n';
}

/** CSV with one row per item: section, ref, text, correct answer, wrong options, then empty Verdict and Correction columns. */
export function toCsv(model) {
  const rows = [['section', 'ref', 'text', 'correct_answer', 'wrong_options', 'verdict', 'correction']];
  for (const q of model.questions) rows.push(['Question', `${q.bank}-${q.n}`, q.q, q.right, q.wrong.join(' / '), '', '']);
  for (const s of model.sections) for (const it of s.items) rows.push([s.title, `${s.file}:${it.line}`, it.text, '', '', '', '']);
  for (const r of model.roster) rows.push(['Character', `${r.file}:${r.line}`, `${r.name}: ${r.role}`, '', '', '', '']);
  for (const p of model.personas) rows.push(['AI persona', p.id, p.text, '', '', '', '']);
  for (const r of model.aiRules) rows.push(['AI rule', '', r.replace(/^- /, ''), '', '', '', '']);
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';   // BOM so Excel reads the UTF-8 correctly
}

async function main() {
  const args = process.argv.slice(2);
  const arg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const format = (arg('--format') || 'md').toLowerCase();
  const model = await collect();
  const text = format === 'csv' ? toCsv(model) : toMarkdown(model);
  if (args.includes('--stdout')) { process.stdout.write(text); return; }
  const out = arg('--out') || `content-review.${format === 'csv' ? 'csv' : 'md'}`;
  writeFileSync(out, text, 'utf8');
  console.log(`Wrote ${out}: ${model.questions.length} questions, ${model.sections.reduce((a, s) => a + s.items.length, 0)} text lines, ${model.roster.length} characters, ${model.personas.length} personas.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
