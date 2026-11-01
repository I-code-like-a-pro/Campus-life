/*
 * Condition-driven world events (spec F-044, F-105, F-160). Nothing fires on a random timer: everything is
 * a function of the game day, time of day and the academic calendar, so the same day always brings the same
 * weather and power cuts, and players can plan around them.
 *
 *  - Season: first semester is harmattan (dry, hazy), second semester is the rainy season.
 *  - Rain: rainy season only, about every other day, a two-hour shower in the afternoon.
 *  - NEPA: about 4 evenings in 10 the light goes for one to three hours.
 *  - ASUU strike: decided per semester (see academics.js); announced the evening before.
 */

/** Deterministic pseudo-random number in [0, 1) from a day number and a salt. */
export function hash01(n, salt) {
  let h = 2166136261 ^ (n | 0);
  for (let i = 0; i < salt.length; i++) { h ^= salt.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function seasonFor({ term = null, day = 1 }) {
  if (term) return term === 1 ? 'harmattan' : 'rainy';
  return Math.floor((day - 1) / 14) % 2 === 0 ? 'harmattan' : 'rainy';     // aspirants: alternate every two weeks
}

/** What the weather and power are doing at this moment. */
export function conditions({ day, minutes, season }) {
  const hour = minutes / 60;

  let raining = false;
  if (season === 'rainy' && hash01(day, 'rain') < 0.5) {
    const start = 12 + Math.floor(hash01(day, 'rain-start') * 5);           // between 12:00 and 16:59
    raining = hour >= start && hour < start + 2;
  }

  const haze = season === 'harmattan' && (hour < 11 || hour >= 17);

  let powerCut = false;
  if (hash01(day, 'nepa') < 0.4) {
    const start = 18 + hash01(day, 'nepa-start') * 2.5;                      // 18:00 to 20:30
    const length = 1 + hash01(day, 'nepa-len') * 2;                          // one to three hours
    powerCut = hour >= start && hour < start + length;
  }
  const waterShort = waterShortage(day, hour);
  return { season, raining, haze, powerCut, waterShort };
}

/** Water shortage: about 1 day in 5 the hostel taps run dry from early morning until early afternoon. */
export function waterShortage(day, hour) {
  if (hash01(day, 'water') >= 0.2) return false;
  const start = 5 + Math.floor(hash01(day, 'water-start') * 3);               // 05:00 to 07:59
  return hour >= start && hour < start + 7;
}

export const strikeDays = { from: 4, to: 5 };                                // Thursday and Friday

/** Whether a semester has an ASUU strike. The very first semester never does, so new players learn the ropes. */
export function semesterHasStrike(year, term) {
  if (year === 1 && term === 1) return false;
  return hash01(year * 10 + term, 'asuu') < 0.3;
}

/**
 * deps: { events (visual effects: events.set), meta (notify), sound(name), getContext() -> { day, minutes, term, academic } }
 * Call update() every frame; it only does work when something changes.
 */
export function createEventEngine({ events, meta, sound = () => {}, getContext }) {
  let last = null;
  let lastSeason = null;

  function announce(prev, now, ctx) {
    if (prev === null) return;                                               // first frame: just set the scene
    if (now.powerCut && !prev.powerCut) { meta.notify({ icon: '💡', title: 'Power cut!', text: 'No power: phones, laptops and browsing are off until it returns.' }); sound('power'); }
    if (!now.powerCut && prev.powerCut) meta.notify({ icon: '🎉', title: 'Power is back!', text: 'Power is back.' });
    if (now.raining && !prev.raining) meta.notify({ icon: '🌧️', title: 'It is raining', text: 'A shower for the next two hours.' });
    if (!now.raining && prev.raining) meta.notify({ icon: '☀️', title: 'The rain has stopped', text: 'The sky is clearing.' });
    if (now.waterShort && !prev.waterShort) meta.notify({ icon: '🚰', title: 'Water shortage', text: 'The hostel taps are dry. Baths are bucket baths until the afternoon.' });
    if (!now.waterShort && prev.waterShort) meta.notify({ icon: '🚰', title: 'Water is back', text: 'The taps are running again.' });
    if (ctx && lastSeason && now.season !== lastSeason) {
      meta.notify({ icon: now.season === 'harmattan' ? '🌫️' : '🌧️', title: now.season === 'harmattan' ? 'Harmattan season' : 'Rainy season', text: now.season === 'harmattan' ? 'Dry and hazy mornings and evenings.' : 'Expect afternoon showers.' });
    }
  }

  function academicReminders(ctx) {
    const a = ctx.academic;
    if (!a || a.phase !== 'semester') return;
    a.reminded = a.reminded || {};
    const sd = ctx.day - a.startDay + 1, hour = ctx.minutes / 60;
    const once = (key, fn) => { if (!a.reminded[key]) { a.reminded[key] = true; fn(); } };

    if (sd === 1 && hour >= 7) once('start', () => meta.notify({ icon: '📚', title: 'Semester has started', text: 'Check your timetable in the portal. First lectures are today.' }));
    if (sd === 2 && hour >= 18) once('ca', () => meta.notify({ icon: '✏️', title: 'CA tests tomorrow', text: 'Wednesday, 08:00 to 18:00 at any lecture hall. Revise tonight.' }));
    if (a.strike && sd === strikeDays.from - 1 && hour >= 18) once('strike', () => meta.notify({ icon: '📢', title: 'ASUU strike!', text: 'Lecturers are on strike from tomorrow. Lectures are suspended until Saturday. Exams still hold.' }));
    if (sd === 5 && hour >= 9) once('assign', () => { if (a.courses.some(c => !c.assign.done)) meta.notify({ icon: '📝', title: 'Assignments due today', text: 'Submit at the library before midnight.' }); });
    if (sd === 5 && hour >= 18) once('exam', () => meta.notify({ icon: '🧪', title: 'Exams tomorrow', text: 'Saturday, 08:00 to 20:00 at any lecture hall. Get some sleep.' }));
  }

  function update() {
    const ctx = getContext();
    const season = seasonFor({ term: ctx.term, day: ctx.day });
    const now = conditions({ day: ctx.day, minutes: ctx.minutes, season });

    if (!last || last.powerCut !== now.powerCut || last.raining !== now.raining || last.haze !== now.haze || last.waterShort !== now.waterShort) {
      announce(last, now, ctx);
      events.set('nepa', now.powerCut);
      events.set('rain', now.raining);
      events.set('harmattan', now.haze && !now.raining);
    }
    lastSeason = lastSeason ?? season;
    if (lastSeason !== season) { announce({ ...now }, now, ctx); lastSeason = season; }

    const struck = !!(ctx.academic && ctx.academic.strike && ctx.academic.phase === 'semester'
      && ctx.day - ctx.academic.startDay + 1 >= strikeDays.from && ctx.day - ctx.academic.startDay + 1 <= strikeDays.to);
    events.set('strike', struck);

    academicReminders(ctx);
    last = now;
    return now;
  }

  return { update, get current() { return last; } };
}
