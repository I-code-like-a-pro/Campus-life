import * as THREE from 'three';

// duration is in real seconds. `weather` events are mutually exclusive.
export const DEFS = {
  nepa:      { icon: '💡', title: 'Power cut!', msg: 'Total blackout across campus. Phone torch time 🔦', dur: 25, end: 'Power is back! 🎉' },
  rain:      { icon: '🌧️', title: 'It is raining', msg: 'Run to a shelter before you get soaked!', dur: 35, end: 'The rain has stopped. The sun is out again ☀️', weather: true },
  harmattan: { icon: '🌫️', title: 'Harmattan has arrived', msg: 'Dust everywhere, dry lips and cold morning!', dur: 40, end: 'The harmattan haze is clearing', weather: true },
  strike:    { icon: '📢', title: 'ASUU strike!', msg: 'Lecturers have downed tools. No lectures until further notice 😭', dur: 14 }
};

/**
 * Campus events (blackout, weather, strike). Nothing starts on its own: they are started by game
 * logic with `start(id, override?)`, e.g. from alerts.js. `onAnnounce(icon, title, msg)` is called
 * when one starts or ends.
 */
export function createEvents(scene, onAnnounce) {
  const active = {};
  let indoors = false;

  // rain particles
  const COUNT = 700;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 50;
    pos[i * 3 + 1] = Math.random() * 30;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb8d4ff, size: 0.22, transparent: true, opacity: 0.8 }));
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);

  function start(id, override = {}) {
    const d = DEFS[id];
    if (!d || active[id]) return;
    if (d.weather) for (const k of Object.keys(active)) if (DEFS[k].weather) delete active[k];
    active[id] = d.dur;
    onAnnounce(d.icon, override.title ?? d.title, override.msg ?? d.msg);
  }

  /** Turns an event on or off from game logic (condition-driven events, see eventengine.js). */
  function set(id, on) {
    const d = DEFS[id];
    if (!d) return;
    if (on) {
      if (d.weather) for (const k of Object.keys(active)) if (DEFS[k].weather) delete active[k];
      active[id] = Infinity;
    } else delete active[id];
  }

  function update(dt, focus) {
    for (const k of Object.keys(active)) {
      active[k] -= dt;
      if (active[k] <= 0) {
        delete active[k];
        if (DEFS[k].end) onAnnounce(DEFS[k].icon, 'Update', DEFS[k].end);
      }
    }

    rain.visible = !!active.rain && !indoors;
    if (rain.visible) {
      for (let i = 0; i < COUNT; i++) {
        pos[i * 3 + 1] -= 38 * dt;
        if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 30;
      }
      geo.attributes.position.needsUpdate = true;
      rain.position.set(focus.x, 0, focus.z);
    }
  }

  return {
    start,
    set,
    update,
    setIndoors(v) { indoors = v; },
    get raining() { return !!active.rain; },
    get haze() { return !!active.harmattan; },
    get blackout() { return !!active.nepa; },
    get strike() { return !!active.strike; }
  };
}
