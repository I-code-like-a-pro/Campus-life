import en from './lang/en.js';
import yo from './lang/yo.js';
import ig from './lang/ig.js';
import ha from './lang/ha.js';

/*
 * A very small translation layer. t('key', { vars }) returns the string in the current language, falls back to English,
 * and finally to the key itself so a missing string never breaks the screen.
 *
 * A language is listed in the picker only when `reviewed` is true AND it has strings. Yoruba, Igbo and Hausa are stubs
 * that wait for native-speaker review (docs/REVIEW_KIT.md). Standard English only; no Pidgin.
 */
export const LANGUAGES = {
  en: { code: 'en', name: 'English', native: 'English', reviewed: true, strings: en },
  yo: { code: 'yo', name: 'Yoruba', native: 'Èdè Yorùbá', reviewed: false, strings: yo },
  ig: { code: 'ig', name: 'Igbo', native: 'Asụsụ Igbo', reviewed: false, strings: ig },
  ha: { code: 'ha', name: 'Hausa', native: 'Harshen Hausa', reviewed: false, strings: ha }
};

const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text);

/** Builds an independent translator (the game uses the default one below; tests build their own). */
export function createI18n({ languages = LANGUAGES, fallback = 'en', initial = fallback } = {}) {
  let current = languages[initial] ? initial : fallback;

  const available = () => Object.values(languages).filter(l => l.reviewed && l.strings && Object.keys(l.strings).length > 0);
  const isAvailable = code => available().some(l => l.code === code);

  function t(key, vars) {
    const text = languages[current]?.strings?.[key] ?? languages[fallback]?.strings?.[key] ?? key;
    return fill(String(text), vars);
  }
  function setLanguage(code) {
    if (!isAvailable(code)) return false;       // unreviewed or unknown languages cannot be selected
    current = code;
    return true;
  }
  /** Keys that English has but `code` does not (they show in English). */
  const missingKeys = code => Object.keys(languages[fallback].strings).filter(k => !(k in (languages[code]?.strings || {})));

  return { t, setLanguage, getLanguage: () => current, available, isAvailable, missingKeys, fill };
}

const i18n = createI18n();
export const t = i18n.t;
export const setLanguage = i18n.setLanguage;
export const getLanguage = i18n.getLanguage;
export const availableLanguages = i18n.available;
export const missingKeys = i18n.missingKeys;

/** Fills every element marked data-i18n="key" (text), data-i18n-placeholder or data-i18n-label (aria-label). */
export function applyDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
}
