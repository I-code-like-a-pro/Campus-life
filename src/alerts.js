import { applyEffects } from './needs.js';

/**
 * Alerts that react to what the player does. Nothing here fires on a timer:
 * every alert is a consequence of an action (or of how often it was repeated today).
 *
 * `counts` are per game day and are saved with the game.
 */
export function createAlerts({ state, dayNight, events, hud, stamp, restored }) {
  const fresh = () => ({ day: dayNight.state.day, counts: {}, flags: {} });
  let today = restored && restored.day === dayNight.state.day ? restored : fresh();

  const say = (icon, title, msg) => hud.banner(icon, title, msg, stamp());
  const once = key => (today.flags[key] ? false : (today.flags[key] = true));

  /**
   * Call after an action has been applied.
   * `before` is a snapshot { ...needs, money } from before it ran, `startMinutes` the clock when it began.
   */
  function afterAction(action, before, startMinutes) {
    if (today.day !== dayNight.state.day) today = fresh();
    const n = (today.counts[action.id] = (today.counts[action.id] || 0) + 1);
    const startHour = (startMinutes % 1440) / 60;

    // most important first; only one alert per action
    if (action.id === 'phone' && n >= 3 && once('nepa')) {
      events.start('nepa', { title: 'Power cut!', msg: 'Too much TikTok! Everybody in the hostel drained the power 🔦' });
    } else if (action.id === 'football' && n >= 2 && once('motm')) {
      applyEffects(state.needs, { fun: 10 });
      say('🏆', 'Man of the match!', 'Everybody is calling your name after that second game. (+fun)');
    } else if (before.money >= 2000 && state.money < 2000 && once('sapa')) {
      say('💸', 'Running low on money', 'Your balance is almost finished. Your allowance is coming, hold on.');
    } else if (action.fx && action.fx.hunger > 0 && before.hunger >= 90) {
      say('🤢', 'Already full!', 'You ate when you were not hungry. Money wasted.');
    } else if (action.id === 'bathe' && before.hygiene >= 90) {
      say('🧼', 'Too clean', 'You were already clean. Water wasted.');
    } else if (action.id === 'sleep' && startHour >= 8 && startHour < 18) {
      say('😴', 'Sleeping in the day?', 'Your hostel mates are judging you. Sleep at night next time.');
    }
  }

  return { afterAction, snapshot: () => today };
}
