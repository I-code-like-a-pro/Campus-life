import { showModal } from './modal.js';
import { recentErrors } from './telemetry.js';

/*
 * Reviewer feedback. Three ways to send ideas, depending on what the site owner configured at build time:
 *   VITE_FEEDBACK_URL    a link to a form (Google Forms, Typeform...)
 *   VITE_FEEDBACK_EMAIL  an address; the button opens the reviewer's email app with a pre-filled message
 * A "Copy report" option is always available: it copies a short, anonymous diagnostic summary the reviewer can paste anywhere.
 */

const FORM_URL = import.meta.env?.VITE_FEEDBACK_URL || '';
const EMAIL = import.meta.env?.VITE_FEEDBACK_EMAIL || '';
export const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

/** A short diagnostic summary. Contains no name, no money, no text the player typed. */
export function buildReport(state, extra = {}) {
  const a = state?.academic;
  const where = state?.aspirant ? 'JAMB aspirant at home'
    : state?.admission ? 'Admitted, preparing to travel'
      : state?.clearance && !state.clearance.done ? 'Clearance'
        : a ? `Student, ${a.year}00 level, semester ${a.term}${a.graduated ? ' (graduated)' : ''}` : 'Unknown';
  const errors = (extra.errors ?? recentErrors()).slice(-3).map(e => `- ${e.kind}: ${String(e.message).slice(0, 120)}`);
  return [
    `Campus Life feedback (version ${VERSION})`,
    `Where I am: ${where}${state?.campusId && state.campusId !== 'home' ? ` at ${state.campusId.toUpperCase()}` : ''}`,
    `Game day: ${extra.day ?? '?'}`,
    `Device: ${extra.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown')}`,
    `Screen: ${extra.viewport ?? (typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}x` : 'unknown')}`,
    errors.length ? `Recent errors:\n${errors.join('\n')}` : 'Recent errors: none',
    '',
    'What I liked:',
    '',
    'What was confusing or broken:',
    '',
    'Ideas I would add:'
  ].join('\n');
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** Opens the feedback dialog. `getContext()` returns { state, day }. */
export async function openFeedback(getContext) {
  for (;;) {
    const ctx = getContext();
    const report = buildReport(ctx.state, { day: ctx.day });
    const buttons = [];
    if (FORM_URL) buttons.push({ label: '📝 Open the feedback form', value: 'form' });
    if (EMAIL) buttons.push({ label: '✉️ Send feedback by email', value: 'email' });
    buttons.push({ label: '📋 Copy my feedback report', value: 'copy' });
    buttons.push({ label: 'Close', value: 'x', secondary: true });

    const lines = [
      `Thanks for trying Campus Life (early preview ${VERSION}). Tell us what you liked, what confused you and what you would add.`,
      FORM_URL || EMAIL ? 'Choose how you would like to send it:' : 'Copy the report below and send it to whoever shared this game with you.'
    ];
    const pick = await showModal({ title: '💡 Send feedback', lines, buttons });
    if (pick === 'x') return;
    if (pick === 'form') window.open(FORM_URL, '_blank', 'noopener');
    else if (pick === 'email') {
      const body = encodeURIComponent(report.slice(0, 1500));
      window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`Campus Life feedback (${VERSION})`)}&body=${body}`;
    } else if (pick === 'copy') {
      const ok = await copy(report);
      await showModal({
        title: ok ? '📋 Copied!' : '📋 Your report',
        lines: ok ? ['The report is on your clipboard. Paste it into a message and add your thoughts.'] : ['Copying is blocked in this browser. Select and copy the text below:', report],
        buttons: [{ label: '← Back', value: 'b' }]
      });
    }
  }
}
