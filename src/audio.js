import { settings } from './settings.js';

/*
 * Procedural sound (spec F-260). Everything is synthesised with the Web Audio API, so there are no audio
 * files to download. The music loop is a simple Afrobeats-style placeholder until real music is licensed.
 * Browsers only allow audio after a tap, so the context is created on the first user gesture.
 */

let ctx = null;
let master = null;
let musicTimer = null;
let nextBeat = 0;
let beat = 0;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

/** Call once; starts audio on the first tap/keypress. */
export function unlockAudio() {
  const go = () => {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
    if (settings.music) startMusic();
  };
  window.addEventListener('pointerdown', go, { once: true });
  window.addEventListener('keydown', go, { once: true });
}

function tone(freq, { dur = 0.12, type = 'sine', gain = 0.2, at = 0, slideTo = null } = {}) {
  const c = ensure();
  if (!c || !settings.sound) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** For soundscape.js: the audio context and master gain (null until the first tap), and shared helpers. */
export const audioCore = () => (ensure() ? { ctx, master, noise: noiseBuffer() } : null);

let noiseBuf = null;
function noiseBuffer() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/** A short band-limited puff of noise (door whoosh, footstep). */
export function puff(dur, gain, freq, at = 0) {
  const c = ensure();
  if (!c || !settings.sound) return;
  const t0 = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer();
  const f = c.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0, Math.random());
  src.stop(t0 + dur + 0.05);
}
export const audioRunning = () => !!ctx && ctx.state === 'running';
export { tone };

const SFX = {
  click:   () => tone(660, { dur: 0.06, type: 'square', gain: 0.08 }),
  toast:   () => { tone(784, { dur: 0.16, gain: 0.07 }); tone(1175, { dur: 0.3, gain: 0.06, at: 0.09 }); },   // soft two-note chime
  door:    () => { tone(150, { dur: 0.16, type: 'triangle', gain: 0.12, slideTo: 95 }); tone(95, { dur: 0.1, type: 'sine', gain: 0.1, at: 0.12 }); puff(0.12, 0.05, 700); },
  doorOpen: () => { tone(110, { dur: 0.22, type: 'triangle', gain: 0.05, slideTo: 170 }); puff(0.14, 0.04, 900); },
  doorShut: () => { tone(120, { dur: 0.12, type: 'triangle', gain: 0.1, slideTo: 80 }); puff(0.08, 0.05, 600); },
  coin:    () => { tone(988, { dur: 0.07, gain: 0.12 }); tone(1319, { dur: 0.14, gain: 0.12, at: 0.07 }); },
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, { dur: 0.14, gain: 0.12, at: i * 0.08 })),
  fail:    () => { tone(330, { dur: 0.18, type: 'sawtooth', gain: 0.1 }); tone(220, { dur: 0.3, type: 'sawtooth', gain: 0.1, at: 0.15 }); },
  bell:    () => { tone(1200, { dur: 0.5, gain: 0.1 }); tone(1800, { dur: 0.4, gain: 0.06, at: 0.02 }); },
  power:   () => tone(300, { dur: 0.5, type: 'sawtooth', gain: 0.12, slideTo: 60 }),
  unlock:  () => [659, 880, 1175].forEach((f, i) => tone(f, { dur: 0.18, gain: 0.12, at: i * 0.1 }))
};
// short haptic pulses on phones for important moments (respects the vibration setting)
const VIBRATE = { coin: 15, fail: [40, 40, 40], unlock: [20, 30, 20], power: 60, bell: 25, success: [15, 25, 15] };

export const sfx = name => {
  try { SFX[name]?.(); } catch { /* audio is a nicety, never fatal */ }
  try { if (settings.vibration && VIBRATE[name] && navigator.vibrate) navigator.vibrate(VIBRATE[name]); } catch { /* unsupported */ }
};

/* ----- music: kick, hi-hat, bass and a plucked chord on a 16-step loop at 104 BPM ----- */
const BPM = 104;
const STEP = 60 / BPM / 4;
const BASS = [55, 0, 0, 55, 0, 62, 0, 55, 0, 0, 65, 0, 62, 0, 55, 0];
const CHORDS = [[220, 262, 330], [196, 247, 294], [175, 220, 262], [196, 247, 294]];

function noise(at, dur, gain, hp = 6000) {
  const c = ctx;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master);
  src.start(at);
}

function scheduleStep(step, at) {
  const c = ctx;
  const bar = Math.floor(step / 16) % 4;
  const i = step % 16;
  const mg = 0.55;                                    // music is quieter than effects
  if (i % 4 === 0) {                                  // kick
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(120, at);
    o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    g.gain.setValueAtTime(0.28 * mg, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(g).connect(master); o.start(at); o.stop(at + 0.18);
  }
  if (i % 2 === 1) noise(at, 0.04, 0.05 * mg);       // off-beat hi-hat
  if (i === 4 || i === 12) noise(at, 0.1, 0.07 * mg, 1800);   // clap
  if (BASS[i]) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = BASS[i] * (bar === 2 ? 0.8 : 1);
    g.gain.setValueAtTime(0.2 * mg, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + STEP * 1.6);
    o.connect(g).connect(master); o.start(at); o.stop(at + STEP * 1.7);
  }
  if (i % 8 === 2 || i % 8 === 6) {                   // chord pluck
    for (const f of CHORDS[bar]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.025 * mg, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + STEP * 1.2);
      o.connect(g).connect(master); o.start(at); o.stop(at + STEP * 1.3);
    }
  }
}

function pump() {
  if (!ctx || !settings.music || ctx.state !== 'running') return;
  while (nextBeat < ctx.currentTime + 0.3) {
    scheduleStep(beat++, Math.max(nextBeat, ctx.currentTime));
    nextBeat += STEP;
  }
}

export function startMusic() {
  const c = ensure();
  if (!c || musicTimer || !settings.music) return;
  nextBeat = c.currentTime + 0.1;
  musicTimer = setInterval(pump, 100);
}
export function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

/** Keep audio in step with the settings and pause it when the tab is hidden. */
export function syncAudio() {
  if (settings.music) startMusic(); else stopMusic();
}
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) { stopMusic(); ctx.suspend(); }
  else { ctx.resume(); syncAudio(); }
});
