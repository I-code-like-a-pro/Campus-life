import { settings } from './settings.js';
import { audioCore, audioRunning, tone, puff } from './audio.js';
import { engineParams, ENGINES, hornFor, ambienceFor, footstepGap, nextChirpIn } from './soundlogic.js';

/*
 * Engines, horns, ambience and footsteps (see docs/AUDIO.md). All synthesised, all quiet, all silent when the
 * sound setting is off, before the first tap, or while the tab is hidden.
 */

/* ----- vehicle engine: a low saw and a square sub through a low-pass; pitch and volume follow the speed ----- */
let engine = null;

export function engineStart(kind) {
  engineStop();
  if (!settings.sound || !ENGINES[kind]) return;
  const a = audioCore();
  if (!a) return;
  const { ctx: c, master } = a;
  const p = engineParams(kind, 0, 1);
  const o1 = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator();
  o1.type = 'sawtooth'; o2.type = 'square';
  o1.frequency.value = p.freq; o2.frequency.value = p.freq / 2;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = p.cutoff;
  const g = c.createGain(); g.gain.value = 0.0001;
  const lfoG = c.createGain();                                 // slight putter
  lfo.frequency.value = 9; lfoG.gain.value = p.gain * 0.25;
  lfo.connect(lfoG).connect(g.gain);
  o1.connect(f); o2.connect(f); f.connect(g).connect(master);
  [o1, o2, lfo].forEach(o => o.start());
  g.gain.setTargetAtTime(p.gain, c.currentTime, 0.2);          // fade in
  engine = { c, kind, o1, o2, lfo, lfoG, f, g };
}

/** `speed` and `top` in world units per second; call every frame while riding. */
export function engineUpdate(speed, top) {
  if (!engine) return;
  if (!settings.sound || document.hidden) { engineStop(); return; }
  const { c } = engine, p = engineParams(engine.kind, speed, top), t = c.currentTime;
  engine.o1.frequency.setTargetAtTime(p.freq, t, 0.15);
  engine.o2.frequency.setTargetAtTime(p.freq / 2, t, 0.15);
  engine.f.frequency.setTargetAtTime(p.cutoff, t, 0.15);
  engine.g.gain.setTargetAtTime(p.gain, t, 0.15);
  engine.lfoG.gain.setTargetAtTime(p.gain * 0.25, t, 0.15);
}

export function engineStop() {
  const e = engine;
  engine = null;
  if (!e) return;
  const t = e.c.currentTime;
  e.g.gain.cancelScheduledValues(t);
  e.g.gain.setTargetAtTime(0.0001, t, 0.08);
  for (const o of [e.o1, e.o2, e.lfo]) { try { o.stop(t + 0.4); } catch { /* already stopped */ } }
  setTimeout(() => { try { e.g.disconnect(); } catch { /* gone */ } }, 600);
}
export const engineRunning = () => !!engine;

/* ----- horns: short and polite ----- */
const HORNS = {
  keke:   () => { tone(520, { dur: 0.09, type: 'square', gain: 0.035 }); tone(520, { dur: 0.09, type: 'square', gain: 0.035, at: 0.13 }); },
  bus:    () => { tone(300, { dur: 0.4, type: 'square', gain: 0.04 }); tone(378, { dur: 0.4, type: 'square', gain: 0.03 }); },
  swerve: () => { tone(620, { dur: 0.1, type: 'square', gain: 0.04 }); tone(620, { dur: 0.16, type: 'square', gain: 0.04, at: 0.14 }); }
};
export function horn(kind, wobble = 0) {
  const name = hornFor(kind, wobble);
  if (!name) return;
  try { HORNS[name](); } catch { /* audio is a nicety */ }
}

/* ----- ambience: birds by day, crickets at night, crowd murmur in a scene ----- */
let amb = { name: null, node: null };
let chirpIn = 1, stepTimer = 0, lastAmb = 'none';

function ambStop() {
  const n = amb.node;
  amb = { name: null, node: null };
  if (!n) return;
  n.g.gain.setTargetAtTime(0.0001, n.c.currentTime, 0.4);
  setTimeout(() => { try { n.src.stop(); n.lfo.stop(); n.g.disconnect(); } catch { /* gone */ } }, 2000);
}

function ambStart(name) {
  const a = audioCore();
  if (!a || !settings.sound) return;
  const { ctx: c, master, noise } = a;
  amb = { name, node: null };
  chirpIn = 0.5;
  if (name !== 'crowd') return;                                // birds and crickets are scheduled chirps, no node
  const src = c.createBufferSource(); src.buffer = noise; src.loop = true;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.7;
  const g = c.createGain(); g.gain.value = 0.0001;
  const lfo = c.createOscillator(), lg = c.createGain();       // the murmur slowly breathes
  lfo.frequency.value = 0.3; lg.gain.value = 120;
  lfo.connect(lg).connect(f.frequency); lfo.start();
  src.connect(f).connect(g).connect(master); src.start();
  g.gain.setTargetAtTime(0.035, c.currentTime, 0.8);
  amb.node = { c, src, g, lfo };
}

function chirp(name) {
  if (name === 'birds') {
    const base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) tone(base * (1 + 0.15 * (i % 2)), { dur: 0.07, gain: 0.012, at: i * 0.1, slideTo: base * 1.3 });
  } else if (name === 'crickets') {
    for (let i = 0; i < 3; i++) tone(4300, { dur: 0.035, gain: 0.006, at: i * 0.06 });
  }
}

/**
 * Call once per frame. info: { dt, hour, inside, placeType, sceneOn, riding, raining, walking, stride }.
 * Chooses ambience and footsteps with the pure rules in soundlogic.js. Does nothing until audio is unlocked.
 */
export function soundTick(info) {
  if (document.hidden) return;
  if (!settings.sound) { if (amb.name) ambStop(); lastAmb = 'none'; return; }
  if (!audioRunning()) return;
  const want = ambienceFor(info);
  if (want !== amb.name) { if (amb.name) ambStop(); if (want) ambStart(want); }
  lastAmb = amb.name || 'none';
  if (amb.name === 'birds' || amb.name === 'crickets') {
    chirpIn -= info.dt;
    if (chirpIn <= 0) { chirp(amb.name); chirpIn = nextChirpIn(amb.name, Math.random()); }
  }
  const gap = footstepGap({ walking: info.walking, inside: info.inside, riding: info.riding, reducedMotion: settings.reducedMotion, stride: info.stride });
  if (gap > 0) {
    stepTimer -= info.dt;
    if (stepTimer <= 0) { puff(0.05, 0.02, 300 + Math.random() * 120); stepTimer = gap; }
  } else stepTimer = 0.1;
}
export const ambienceNow = () => lastAmb;

document.addEventListener('visibilitychange', () => { if (document.hidden) engineStop(); });
