import * as THREE from 'three';
import { LIGHT_SCALE } from './engine.js';
import { windowMat, bulbMat } from './world.js';

const RATE = 2;   // game minutes per real second (a full day is about 12 real minutes)

// [hour, value] keyframes across the 24h day
const SKY = [[0, '#0a0f2c'], [5, '#0a0f2c'], [6.5, '#ff9a5a'], [8, '#8fd3ff'], [17, '#8fd3ff'], [18.5, '#ff7a4a'], [20, '#0a0f2c'], [24, '#0a0f2c']];
const LIGHT = [[0, 0.08], [5, 0.08], [7, 0.6], [8.5, 1], [16.5, 1], [18.5, 0.5], [20, 0.1], [24, 0.08]];

// Fired once as the clock crosses the hour: [hour, icon, title, message]
export const SCHEDULE = [
  [8,  '🔔', 'Lecture bell', '8AM class has started. Run to the Lecture Hall!'],
  [13, '🍛', 'Canteen is open', 'Jollof rice and plantain time. The queue is long!'],
  [18, '🌆', 'Evening gathering', 'Everybody is gathering at the field.'],
  [22, '🔒', 'Hostel curfew', 'Go and sleep, tomorrow is another day.']
];

const GREY = new THREE.Color(0x6c7a86);
const DUST = new THREE.Color(0xc9a878);

function sample(table, hour) {
  for (let i = 0; i < table.length - 1; i++) {
    const [h0, a] = table[i], [h1, b] = table[i + 1];
    if (hour >= h0 && hour <= h1) {
      const t = (hour - h0) / (h1 - h0);
      return typeof a === 'string'
        ? new THREE.Color(a).lerp(new THREE.Color(b), t)
        : a + (b - a) * t;
    }
  }
  const first = table[0][1];
  return typeof first === 'string' ? new THREE.Color(first) : first;
}

export function createDayNight() {
  const state = { minutes: 7 * 60, day: 1 };

  /** Advance the clock; returns the schedule entries crossed this tick. */
  function advance(dt) {
    const before = state.minutes;
    state.minutes += dt * RATE;
    let wrapped = false;
    if (state.minutes >= 1440) { state.minutes -= 1440; state.day++; wrapped = true; }
    return SCHEDULE.filter(s => {
      const m = s[0] * 60;
      return wrapped ? (before < m || state.minutes >= m) : (before < m && state.minutes >= m);
    });
  }

  /** Update sky, fog, lights and the lit windows / lamps for the current time and weather. */
  function apply(engine, { raining, haze, blackout }) {
    const hour = state.minutes / 60;
    const light = sample(LIGHT, hour);
    const sky = sample(SKY, hour);
    if (raining) sky.lerp(GREY, 0.55);
    if (haze) sky.lerp(DUST, 0.6);

    engine.scene.background = sky;
    engine.scene.fog.color.copy(sky);
    engine.scene.fog.near = haze ? 8 : raining ? 25 : 45;
    engine.scene.fog.far = haze ? 55 : raining ? 85 : 120;

    engine.ambient.intensity = (0.28 + 0.55 * light) * LIGHT_SCALE;
    engine.sun.intensity = (0.1 + 0.9 * light) * (raining ? 0.6 : 1) * LIGHT_SCALE;
    engine.sun.color.setHex(hour > 17 || hour < 7.5 ? 0xffc89a : 0xffffff);

    const night = 1 - Math.min(1, light * 1.2);
    const lit = night > 0.35 && !blackout;
    windowMat.color.setHex(lit ? 0xffd27a : blackout ? 0x1a2430 : 0x35506b);
    bulbMat.color.setHex(lit ? 0xfff2b0 : 0x3a3f45);
    return { night };
  }

  /** Jump forward by game minutes (used by actions like sleeping). */
  const skip = minutes => advance(minutes / RATE);

  return { state, advance, skip, apply, setHour: h => { state.minutes = h * 60; } };
}

export function formatTime(minutes) {
  const m = Math.floor(minutes) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
