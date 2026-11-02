/*
 * Performance tooling (docs/PERFORMANCE.md).
 *  - BUDGETS: draw-call, triangle and FPS limits for each place. The spec ceiling is 150 draw calls, 250k triangles and a
 *    30 fps floor on a low-end Android; the numbers below are tighter so there is headroom for NPCs, weather and events.
 *  - checkBudget(): pure comparison, unit tested.
 *  - createPerfOverlay(): a small on-screen readout (FPS, draw calls, triangles, memory). OFF by default. Turn it on with
 *    ?perf=1 in the address, or the Settings toggle that appears after ?perf=1 has been used once.
 */

export const PLACE_KEYS = ['campus', 'hostel', 'home', 'cafe', 'canteen', 'library', 'lecture', 'biz', 'clinic', 'registry', 'auditorium', 'books', 'bank', 'chapel', 'mosque'];

/** Limits per place (the same numbers appear in the table in docs/PERFORMANCE.md; a test keeps them in step). */
export const BUDGETS = {
  campus:     { label: 'Campus (outdoors)',  drawCalls: 120, triangles: 250000, minFps: 30 },
  hostel:     { label: 'Hostel room',        drawCalls: 80,  triangles: 80000,  minFps: 30 },
  home:       { label: 'Family House',       drawCalls: 80,  triangles: 80000,  minFps: 30 },
  cafe:       { label: 'Cafe',               drawCalls: 80,  triangles: 80000,  minFps: 30 },
  canteen:    { label: 'Canteen',            drawCalls: 80,  triangles: 80000,  minFps: 30 },
  library:    { label: 'Library',            drawCalls: 80,  triangles: 80000,  minFps: 30 },
  lecture:    { label: 'Lecture hall',       drawCalls: 80,  triangles: 80000,  minFps: 30 },
  biz:        { label: 'Business centre',    drawCalls: 80,  triangles: 80000,  minFps: 30 },
  clinic:     { label: 'Clinic',             drawCalls: 80,  triangles: 80000,  minFps: 30 },
  registry:   { label: 'Registry',           drawCalls: 80,  triangles: 80000,  minFps: 30 },
  auditorium: { label: 'Auditorium (scene)', drawCalls: 100, triangles: 120000, minFps: 30 },
  books:      { label: 'Bookshop',           drawCalls: 80,  triangles: 80000,  minFps: 30 },
  bank:       { label: 'Bank and ATM',       drawCalls: 80,  triangles: 80000,  minFps: 30 },
  chapel:     { label: 'Chapel',             drawCalls: 80,  triangles: 80000,  minFps: 30 },
  mosque:     { label: 'Mosque',             drawCalls: 80,  triangles: 80000,  minFps: 30 }
};
export const SPEC_CEILING = { drawCalls: 150, triangles: 250000, minFps: 30 };

/** Compares one measurement to the budget for `place`. Returns { ok, problems[] }. Missing numbers are not counted as failures. */
export function checkBudget(place, sample, budgets = BUDGETS) {
  const b = budgets[place];
  if (!b) return { ok: false, problems: [`no budget for "${place}"`] };
  const problems = [];
  if (Number.isFinite(sample.drawCalls) && sample.drawCalls > b.drawCalls) problems.push(`draw calls ${sample.drawCalls} > ${b.drawCalls}`);
  if (Number.isFinite(sample.triangles) && sample.triangles > b.triangles) problems.push(`triangles ${sample.triangles} > ${b.triangles}`);
  if (Number.isFinite(sample.fps) && sample.fps > 0 && sample.fps < b.minFps) problems.push(`fps ${sample.fps} < ${b.minFps}`);
  return { ok: problems.length === 0, problems };
}

/** Rolling FPS from frame timestamps (ms). Pure, so it can be tested. */
export function createFpsMeter(windowMs = 1000) {
  let frames = 0, start = null, fps = 0;
  return {
    tick(now) {
      if (start === null) start = now;
      frames++;
      if (now - start >= windowMs) { fps = Math.round((frames * 1000) / (now - start)); frames = 0; start = now; }
      return fps;
    },
    get fps() { return fps; }
  };
}

/** Is the overlay requested by the address? ?perf=1 (or ?perf) turns on, ?perf=0 turns off, anything else leaves it. */
export function perfFromSearch(search = '') {
  const m = /[?&]perf(?:=([^&]*))?(?:&|$)/.exec(search);
  if (!m) return null;
  return m[1] === undefined || m[1] === '1' || m[1] === 'true' ? true : m[1] === '0' || m[1] === 'false' ? false : null;
}

/** One line of text for the overlay. */
export function formatSample(place, s, verdict) {
  const mem = s.heapMb ? ` heap ${s.heapMb}MB` : '';
  return `${place} ${s.fps || '--'}fps  calls ${s.drawCalls}  tris ${Math.round(s.triangles / 1000)}k  geo ${s.geometries} tex ${s.textures}${mem}${verdict && !verdict.ok ? '  OVER BUDGET' : ''}`;
}

/** Reads renderer.info. Call right after render(): three resets the per-frame counters at the start of each render. */
export function readInfo(renderer, fps = 0) {
  const info = renderer.info;
  const heap = typeof performance !== 'undefined' && performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0;
  return {
    fps, drawCalls: info.render.calls, triangles: info.render.triangles, lines: info.render.lines, points: info.render.points,
    geometries: info.memory.geometries, textures: info.memory.textures, heapMb: heap
  };
}

/**
 * Creates the overlay element (hidden until setVisible(true)).
 * `getPlace()` returns a key of BUDGETS ('campus' or a building type). Call `frame(now)` once per frame after rendering.
 * `last` holds the latest sample and `report()` returns a pasteable line for docs/PERFORMANCE.md.
 */
export function createPerfOverlay({ renderer, getPlace = () => 'campus', doc = typeof document !== 'undefined' ? document : null }) {
  const meter = createFpsMeter(500);
  let el = null, visible = false, last = null, lastPaint = 0;
  const peak = { drawCalls: 0, triangles: 0, minFps: 999 };

  function ensure() {
    if (el || !doc) return;
    el = doc.createElement('div');
    el.id = 'perf';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;left:6px;bottom:2px;z-index:50;pointer-events:none;font:11px/1.3 ui-monospace,Menlo,Consolas,monospace;' +
      'color:#c8ffd9;background:rgba(0,0,0,.72);padding:2px 6px;border-radius:6px;max-width:calc(100vw - 12px);white-space:normal';
    doc.body.append(el);
  }

  function setVisible(v) {
    visible = !!v;
    if (visible) { ensure(); if (el) el.hidden = false; } else if (el) el.hidden = true;
  }

  function frame(now) {
    const fps = meter.tick(now);
    if (!visible) return;
    const place = getPlace();
    last = readInfo(renderer, fps);
    peak.drawCalls = Math.max(peak.drawCalls, last.drawCalls);
    peak.triangles = Math.max(peak.triangles, last.triangles);
    if (fps > 0) peak.minFps = Math.min(peak.minFps, fps);
    if (now - lastPaint > 500 && el) {                 // repaint twice a second: writing text every frame would itself cost time
      lastPaint = now;
      el.textContent = formatSample(place, last, checkBudget(place, last));
    }
  }

  /** A pasteable result row: place | fps | calls | triangles | verdict. */
  function report() {
    const place = getPlace();
    const s = last || readInfo(renderer, meter.fps);
    const v = checkBudget(place, s);
    return `| ${place} | ${s.fps} | ${s.drawCalls} | ${s.triangles} | ${v.ok ? 'within budget' : v.problems.join('; ')} |`;
  }

  return { frame, setVisible, report, peak, get last() { return last; }, get visible() { return visible; } };
}

/** First-run default for graphics quality on weak hardware. A player's own choice always wins (see settings.js). */
export function suggestQuality({ deviceMemory, hardwareConcurrency, saveData } = {}) {
  if (saveData) return 'low';
  if (Number.isFinite(deviceMemory) && deviceMemory <= 2) return 'low';
  if (Number.isFinite(hardwareConcurrency) && hardwareConcurrency <= 4 && Number.isFinite(deviceMemory) && deviceMemory <= 4) return 'low';
  return 'medium';
}
