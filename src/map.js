/*
 * Campus map (spec F-043): a minimap in the HUD and a full map screen. Tap a building (or any spot) to get
 * directions, walk there automatically, or take a keke or okada. Drawing is done on a plain 2D canvas.
 */

const HALF = 60;                                   // the playable area is roughly -60..60 in x and z
const hex = n => `#${(n >>> 0).toString(16).padStart(6, '0')}`;

/**
 * scene: { campus, places, desks, player: {x,z}, npcs: [{x,z}], target: {x,z}|null, indoors }
 */
export function drawWorld(ctx, size, scene, { labels = true, time = 0 } = {}) {
  const k = size / (HALF * 2);
  const X = x => (x + HALF) * k, Z = z => (z + HALF) * k;
  const { campus } = scene;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = hex(campus.ground);
  ctx.fillRect(0, 0, size, size);

  // water on the west edge of lagoon campuses
  if (campus.features?.includes('lagoon')) { ctx.fillStyle = '#2d8fd0'; ctx.fillRect(0, 0, X(-51), size); }

  // paths
  ctx.fillStyle = '#d9cfbb';
  ctx.fillRect(X(-3), Z(-55), 6 * k, 110 * k);       // main path
  ctx.fillRect(X(-60), Z(-3), 100 * k, 6 * k);       // cross path

  // sports field
  if (campus.field) {
    const f = campus.field;
    ctx.fillStyle = '#3f9a45';
    ctx.fillRect(X(f.x - f.w / 2), Z(f.z - f.d / 2), f.w * k, f.d * k);
  }

  const def = name => campus.buildings.find(b => b.name === name);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of scene.places) {
    const b = def(p.name);
    ctx.fillStyle = b ? hex(b.color) : '#3f9a45';
    if (b) {
      ctx.fillRect(X(p.x - p.hw), Z(p.z - p.hd), p.hw * 2 * k, p.hd * 2 * k);
      ctx.strokeStyle = hex(b.roof);
      ctx.lineWidth = Math.max(1, k * 0.5);
      ctx.strokeRect(X(p.x - p.hw), Z(p.z - p.hd), p.hw * 2 * k, p.hd * 2 * k);
    }
    ctx.font = `${Math.max(9, Math.round(k * 7))}px system-ui, "Segoe UI Emoji", sans-serif`;
    ctx.fillStyle = '#000';
    ctx.fillText(p.emoji, X(p.x), Z(p.z));
    if (labels) {
      ctx.font = `600 ${Math.max(8, Math.round(k * 3.4))}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(10,20,15,.85)';
      const w = ctx.measureText(p.name).width + 6;
      ctx.fillRect(X(p.x) - w / 2, Z(p.z + p.hd) + 1, w, Math.round(k * 4.4));
      ctx.fillStyle = '#fff';
      ctx.fillText(p.name, X(p.x), Z(p.z + p.hd) + 1 + Math.round(k * 2.2));
    }
  }

  // registration desks while clearance is under way
  for (const d of scene.desks || []) {
    ctx.fillStyle = hex(d.canopy);
    ctx.fillRect(X(d.x - 3), Z(d.z - 2.3), 6 * k, 4.6 * k);
    ctx.font = `${Math.max(9, Math.round(k * 5))}px system-ui, "Segoe UI Emoji", sans-serif`;
    ctx.fillStyle = '#000';
    ctx.fillText(d.emoji, X(d.x), Z(d.z));
  }

  // people
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (const n of scene.npcs || []) { ctx.beginPath(); ctx.arc(X(n.x), Z(n.z), Math.max(1.5, k * 0.9), 0, Math.PI * 2); ctx.fill(); }

  // guide target: pulsing ring
  if (scene.target) {
    const r = k * (3 + Math.sin(time / 250));
    ctx.strokeStyle = '#ffd54a';
    ctx.lineWidth = Math.max(2, k * 0.9);
    ctx.beginPath(); ctx.arc(X(scene.target.x), Z(scene.target.z), r, 0, Math.PI * 2); ctx.stroke();
  }

  // you
  if (!scene.indoors) {
    ctx.fillStyle = '#2f6fd0';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1.5, k * 0.8);
    ctx.beginPath(); ctx.arc(X(scene.player.x), Z(scene.player.z), Math.max(3, k * 2), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.font = `700 ${Math.max(9, Math.round(k * 4))}px system-ui, sans-serif`;
  ctx.fillText('N', size / 2, Math.max(8, k * 3));
}

/** Converts a pointer position on the canvas into a destination: a building, a desk, or a spot on the ground. */
export function pickDestination(scene, size, px, py) {
  const k = size / (HALF * 2);
  const x = px / k - HALF, z = py / k - HALF;
  const hit = scene.places.find(p => Math.abs(x - p.x) <= p.hw + 2 && Math.abs(z - p.z) <= p.hd + 2);
  if (hit) return { label: hit.name, emoji: hit.emoji, x: hit.door.x, z: hit.door.z };
  const desk = (scene.desks || []).find(d => Math.abs(x - d.x) <= 4 && Math.abs(z - d.z) <= 3);
  if (desk) return { label: desk.name, emoji: desk.emoji, x: desk.x, z: desk.z + 3 };
  return { label: 'that spot', emoji: '📍', x: Math.max(-56, Math.min(56, x)), z: Math.max(-56, Math.min(57, z)) };
}

export function createMapUI({ getScene, onDestination }) {
  const layer = document.getElementById('maplayer');
  const canvas = document.getElementById('mapcanvas');
  const hint = document.getElementById('maphint');
  const ctx = canvas.getContext('2d');
  let raf = null;

  function size() {
    const s = Math.floor(Math.min(window.innerWidth - 32, window.innerHeight - 190, 420));
    canvas.width = canvas.height = Math.max(240, s);
    canvas.style.width = canvas.style.height = `${canvas.width}px`;
  }
  function loop(t) {
    if (layer.hidden) return;
    drawWorld(ctx, canvas.width, getScene(), { time: t });
    raf = requestAnimationFrame(loop);
  }

  function open() {
    size();
    const scene = getScene();
    hint.textContent = scene.indoors ? 'You are inside a building. Step outside to travel.' : 'Tap a building or any spot to go there.';
    layer.hidden = false;
    raf = requestAnimationFrame(loop);
  }
  function close() { layer.hidden = true; cancelAnimationFrame(raf); }

  canvas.addEventListener('pointerdown', e => {
    const scene = getScene();
    if (scene.indoors) return;
    const r = canvas.getBoundingClientRect();
    const dest = pickDestination(scene, canvas.width, (e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height));
    close();
    onDestination(dest);
  });
  document.getElementById('mapclose').addEventListener('click', close);
  layer.addEventListener('pointerdown', e => { if (e.target === layer) close(); });

  return { open, close, get isOpen() { return !layer.hidden; } };
}

/** The small always-on map in the corner. Tapping it opens the full map. */
export function createMinimap({ getScene, onTap }) {
  const el = document.getElementById('minimap');
  const ctx = el.getContext('2d');
  let last = 0;
  el.addEventListener('click', onTap);
  return {
    /** Call every frame; it only redraws a few times per second. */
    update(now) {
      if (el.hidden || now - last < 250) return;
      last = now;
      drawWorld(ctx, el.width, getScene(), { labels: false, time: now });
    },
    setVisible(v) { el.hidden = !v; }
  };
}
