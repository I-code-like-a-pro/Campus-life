import { settings } from './settings.js';

/*
 * Privacy-respecting analytics and crash reports (spec 5.4/5.5).
 *  - Nothing is sent unless the player opts in (settings.analytics).
 *  - Events carry no personal data: names, scores and text are never included.
 *  - With no endpoint configured (VITE_TELEMETRY_URL) events are only kept in memory, which is useful for debugging.
 * Errors are always kept locally (last 20) so they can be attached to a support request; sending them is opt-in too.
 */

const ENDPOINT = import.meta.env?.VITE_TELEMETRY_URL || '';
const ERROR_KEY = 'campuslife.errors.v1';
const queue = [];
const session = Math.random().toString(36).slice(2, 10);

function flush() {
  if (!ENDPOINT || !settings.analytics || !queue.length) return;
  const batch = queue.splice(0, queue.length);
  try { navigator.sendBeacon(ENDPOINT, JSON.stringify({ session, build: import.meta.env?.MODE, events: batch })); } catch { /* ignore */ }
}

/** Record a gameplay event, e.g. track('exam_taken', { year: 1 }). Only simple numbers/strings are kept. */
export function track(event, props = {}) {
  if (!settings.analytics) return;
  const clean = {};
  for (const [k, v] of Object.entries(props)) if (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.length < 40)) clean[k] = v;
  queue.push({ event, props: clean, t: Date.now() });
  if (queue.length >= 20) flush();
}

export function recentErrors() {
  try { return JSON.parse(localStorage.getItem(ERROR_KEY) || '[]'); } catch { return []; }
}

function logError(kind, err) {
  const entry = { kind, message: String(err?.message || err).slice(0, 300), stack: String(err?.stack || '').slice(0, 600), t: Date.now() };
  try {
    const all = recentErrors();
    all.push(entry);
    localStorage.setItem(ERROR_KEY, JSON.stringify(all.slice(-20)));
  } catch { /* storage unavailable */ }
  if (settings.analytics && ENDPOINT) { try { navigator.sendBeacon(ENDPOINT, JSON.stringify({ session, error: entry })); } catch { /* ignore */ } }
}

export function installErrorHandlers() {
  window.addEventListener('error', e => logError('error', e.error || e.message));
  window.addEventListener('unhandledrejection', e => logError('promise', e.reason));
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}
