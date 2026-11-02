/*
 * Pure sound decisions (no Web Audio here, so they can be unit tested). audio.js turns these numbers into sound.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Engine character per vehicle: idle and top pitch (Hz), loudness range, and how dark the filter is. */
export const ENGINES = {
  keke:  { idle: 62, top: 120, gainIdle: 0.016, gainTop: 0.04, cutoff: 520 },
  okada: { idle: 74, top: 170, gainIdle: 0.014, gainTop: 0.036, cutoff: 650 },
  bus:   { idle: 48, top: 92,  gainIdle: 0.02,  gainTop: 0.048, cutoff: 420 },
  plane: { idle: 70, top: 150, gainIdle: 0.022, gainTop: 0.05, cutoff: 900 }
};

/** Pitch, volume and filter for a vehicle at `speed` out of its `top` speed. Always gentle: gain never exceeds 0.05. */
export function engineParams(kind, speed, top) {
  const e = ENGINES[kind] || ENGINES.keke;
  const k = top > 0 ? clamp(speed / top, 0, 1) : 0;
  return {
    freq: e.idle + (e.top - e.idle) * k,
    gain: e.gainIdle + (e.gainTop - e.gainIdle) * k,
    cutoff: e.cutoff * (0.8 + 0.5 * k)
  };
}

/** Which vehicles honk when they pull away. */
export const HORN_ON_DEPARTURE = { keke: 'keke', bus: 'bus' };
export const hornFor = (kind, wobble = 0) => (kind === 'okada' ? (wobble > 0 ? 'swerve' : null) : HORN_ON_DEPARTURE[kind] || null);

/**
 * Which background ambience should play.
 *   outdoors by day (6 to 18)  -> 'birds'
 *   outdoors by night          -> 'crickets'
 *   inside while a scene is on -> 'crowd' (auditorium only)
 *   otherwise                  -> null
 * Never while riding. Rain hushes the birds and crickets.
 */
export function ambienceFor({ hour = 12, inside = false, placeType = null, sceneOn = false, riding = false, raining = false } = {}) {
  if (riding) return null;
  if (inside) return placeType === 'auditorium' && sceneOn ? 'crowd' : null;
  if (raining) return null;
  return hour >= 6 && hour < 18 ? 'birds' : 'crickets';
}

/** Footsteps: only on foot outdoors, never with reduced motion. Returns the seconds between steps, or 0 for silence. */
export function footstepGap({ walking = false, inside = false, riding = false, reducedMotion = false, stride = 1 } = {}) {
  if (!walking || inside || riding || reducedMotion) return 0;
  return clamp(0.42 / Math.max(0.3, stride), 0.28, 0.7);
}

/** Seconds until the next random chirp for an ambience (rnd is a number in 0..1). */
export function nextChirpIn(kind, rnd = 0.5) {
  if (kind === 'birds') return 1.5 + rnd * 4;
  if (kind === 'crickets') return 0.8 + rnd * 0.8;
  return 0;
}
