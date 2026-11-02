import { CAMPUSES, CAMPUS_ORDER } from './campuses.js';
import { COURSES, BACKGROUNDS, CUTOFFS, CUTOFF_SOURCE } from './admissions.js';
import { TOWNS } from './towns.js';

import { t } from './i18n.js';

const $ = id => document.getElementById(id);

function el(tag, props = {}, ...children) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}

/**
 * Shows the start screen. Resolves with
 *  - { resume: true } when the player continues a save, or
 *  - { resume: false, name, background, choices } for a new game (after filling the JAMB form).
 */
export async function showStart(save) {
  const first = await new Promise(resolve => {
    let background = BACKGROUNDS[1].id;
    const nameInput = $('nameInput');
    const next = $('next');
    nameInput.value = save?.name || '';
    const townInput = $('townInput');
    townInput.replaceChildren(...TOWNS.map(t => el('option', { value: t.id, textContent: `${t.emoji} ${t.name}: ${t.blurb}` })));
    townInput.value = save?.hometown || 'lagos';

    const cards = BACKGROUNDS.map(b => {
      const card = el('button', { type: 'button', className: 'uni' },
        el('b', { textContent: `${b.emoji} ${b.name}` }),
        el('p', { textContent: b.blurb }));
      card.addEventListener('click', () => { background = b.id; refresh(); });
      return { id: b.id, card };
    });
    $('bgs').replaceChildren(...cards.map(c => c.card));

    function refresh() {
      cards.forEach(c => c.card.classList.toggle('sel', c.id === background));
      next.disabled = nameInput.value.trim().length === 0;
    }
    nameInput.addEventListener('input', refresh);
    refresh();

    next.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (name) resolve({ resume: false, name, background, town: townInput.value });
    });

    if (save) {
      const label = save.aspirant ? 'JAMB aspirant' : `${CAMPUSES[save.campusId]?.short || ''}`;
      const cont = $('continue');
      cont.hidden = false;
      cont.textContent = t('start.continue', { name: save.name, label, day: save.day });
      cont.addEventListener('click', () => resolve({ resume: true }));
    }
  });

  if (first.resume) { $('start').classList.add('gone'); return first; }
  const choices = await showJambForm();
  return { ...first, choices };
}

/** The JAMB / CAPS form: first and second choice of university and course. Resolves with the two choices. */
export function showJambForm(prefill) {
  return new Promise(resolve => {
    $('start').classList.remove('gone');
    $('step1').hidden = true;
    $('step2').hidden = false;

    const blocks = [0, 1].map(i => {
      const pre = prefill?.[i];
      const uni = el('select', {}, ...CAMPUS_ORDER.map(id =>
        el('option', { value: id, textContent: `${CAMPUSES[id].short} · ${CAMPUSES[id].name}` })));
      const course = el('select', {}, ...COURSES.map(c =>
        el('option', { value: c.id, textContent: `${c.emoji} ${c.name}` })));
      const hint = el('div', { className: 'hint' });
      uni.value = pre?.uni || CAMPUS_ORDER[i];
      course.value = pre?.course || COURSES[i === 0 ? 3 : 4].id;

      const refresh = () => {
        const note = CUTOFF_SOURCE[uni.value] === 'official' ? 'official 2025/26' : 'game estimate';
        hint.textContent = `Last cut-off: ${CUTOFFS[uni.value][course.value].toFixed(1)} aggregate (${note})`;
      };
      uni.addEventListener('change', refresh);
      course.addEventListener('change', refresh);
      refresh();

      const box = el('div', { className: 'choice' },
        el('h4', { textContent: i === 0 ? '1st choice' : '2nd choice' }),
        el('label', {}, 'University', uni),
        el('label', {}, 'Course', course),
        hint);
      return { box, uni, course };
    });

    $('choices').replaceChildren(...blocks.map(b => b.box));
    $('formErr').textContent = '';

    const submit = $('submitForm');
    const handler = () => {
      const picks = blocks.map(b => ({ uni: b.uni.value, course: b.course.value }));
      if (picks[0].uni === picks[1].uni && picks[0].course === picks[1].course) {
        $('formErr').textContent = 'Your 2nd choice must be different from your 1st choice.';
        return;
      }
      submit.removeEventListener('click', handler);
      $('start').classList.add('gone');
      resolve(picks);
    };
    submit.addEventListener('click', handler);
  });
}
