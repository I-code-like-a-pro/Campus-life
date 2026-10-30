import { settings } from './settings.js';

/*
 * Tutorial hints (spec F-005): short, non-blocking cards that appear the first time the player meets a
 * mechanic. Each one is shown once (remembered in the save) and can be switched off in settings.
 */

export const HINTS = {
  move:     'Drag the joystick (or use WASD / arrow keys) to walk around.',
  goal:     'The green line at the top is your current goal. It always tells you what to do next.',
  needs:    'These bars are your needs. Eat, sleep and bathe before they run out, or you may faint.',
  talk:     'Tap 💬 Talk to chat with someone. Many people can give you directions.',
  enter:    'Tap 🚪 Enter to go inside a building. Inside, walk up to furniture to use it.',
  phone:    'Your 📱 phone has your bank, messages, daily goals and settings. A red dot means something new.',
  portal:   'Open 📱 then Student portal to see your timetable, courses and results.',
  lecture:  'Lectures run at set times. Go to the right lecture hall and tap Attend before it ends.',
  library:  'Study at the library to raise your preparation. Better preparation rules out wrong answers in tests.',
  work:     'Jobs pay naira but cost energy. Watch your needs, and check the limit per day.',
  social:   'Tap 💞 Spend time together to pick a tone, share a snack or ask a favour. Friends can lend money and study with you.',
  health:   'You are not feeling well. See a doctor at the Health Centre (or the Chemist at home), or rest and sleep to get better.',
  power:    'NEPA took the light. Phones, printers and browsing wait until power returns.'
};

export function createHints({ meta }) {
  const el = document.getElementById('tip');
  let timer = null;

  function hide() { el.hidden = true; clearTimeout(timer); }
  el.addEventListener('click', hide);

  /** Shows a hint once. Returns true if it was shown. */
  function show(id, ms = 7000) {
    if (!settings.hints || !HINTS[id] || meta.tutorial[id]) return false;
    meta.tutorial[id] = true;
    el.textContent = `💡 ${HINTS[id]}`;
    el.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(hide, ms);
    return true;
  }

  return { show, hide };
}
