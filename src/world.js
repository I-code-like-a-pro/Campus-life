import * as THREE from 'three';

const lambert = c => new THREE.MeshLambertMaterial({ color: c });

// Shared materials that the day/night system tints (lit windows and street lamps at night).
export const windowMat = new THREE.MeshBasicMaterial({ color: 0x35506b });
export const bulbMat = new THREE.MeshBasicMaterial({ color: 0x555555 });

export const BOUNDS = { minX: -57, maxX: 57, minZ: -57, maxZ: 58 };
export const SPAWN = { x: 0, z: 32 };

const signs = [];

/** Fades labels with distance from the camera so far-away signs stop cluttering the screen (spec F-241). */
export function updateSigns(camPos) {
  for (const s of signs) {
    if (!s.parent) continue;
    const d = s.getWorldPosition(_v).distanceTo(camPos);
    s.material.opacity = Math.max(0.12, Math.min(1, 1 - (d - 32) / 40));
  }
}
const _v = new THREE.Vector3();

/** A floating label (emoji + text on a dark pill). Default size is 8 x 2 world units. */
export function createSign(emoji, text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(10,25,20,.82)';
  g.beginPath();
  if (g.roundRect) g.roundRect(4, 4, 504, 120, 28); else g.rect(4, 4, 504, 120);
  g.fill();
  g.fillStyle = '#fff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = `${emoji} ${text}`;
  let size = 54;
  g.font = `700 ${size}px system-ui,"Segoe UI Emoji",sans-serif`;
  while (g.measureText(label).width > 480 && size > 24) {   // shrink long names to fit
    size -= 2;
    g.font = `700 ${size}px system-ui,"Segoe UI Emoji",sans-serif`;
  }
  g.fillText(label, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(8, 2, 1);
  signs.push(s);
  return s;
}

/**
 * Builds a campus into `scene` from a definition in campuses.js.
 * Returns { colliders, places } where `places` are the interactable spots:
 * { name, emoji, type, x, z, hw, hd, door: {x, z}, doorPivot, face }.
 */
export function buildCampus(scene, campus, extraReserved = []) {
  const colliders = [];
  const places = [];
  const reserved = [...extraReserved]; // [x, z, halfWidth, halfDepth] kept free of trees

  const box = (w, h, d, c, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(c));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  const flat = (w, d, c, x, z, y) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lambert(c));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    scene.add(m);
  };

  function sign(emoji, text, x, y, z) {
    const s = createSign(emoji, text);
    s.position.set(x, y, z);
    scene.add(s);
  }

  function building(o) {
    const g = new THREE.Group();
    box(o.w, o.h, o.d, o.color, 0, o.h / 2, 0, g);
    box(o.w + 1, 0.8, o.d + 1, o.roof, 0, o.h + 0.4, 0, g);
    const face = o.z > 0 ? -1 : 1;                      // door faces the central path
    const fz = face * (o.d / 2 + 0.05);

    // dark doorway behind a hinged door that swings open when you get close
    const doorway = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), new THREE.MeshBasicMaterial({ color: 0x15110e }));
    doorway.position.set(0, 1.6, face * (o.d / 2 + 0.04));
    if (face < 0) doorway.rotation.y = Math.PI;
    g.add(doorway);
    const hinge = new THREE.Group();
    hinge.position.set(-1.2, 0, fz);
    box(2.4, 3.2, 0.2, 0x5a3a22, 1.2, 1.6, 0, hinge);
    box(0.15, 0.15, 0.3, 0xd9b45a, 2.0, 1.5, 0, hinge);   // handle
    g.add(hinge);

    const rows = Math.max(1, Math.floor((o.h - 3) / 3));
    const cols = Math.max(2, Math.floor(o.w / 4));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = (c - (cols - 1) / 2) * (o.w / cols) * 0.95;
        if (r === 0 && Math.abs(wx) < 2) continue;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), windowMat);
        m.position.set(wx, 2.4 + r * 3, fz + face * 0.02);
        if (face < 0) m.rotation.y = Math.PI;
        g.add(m);
      }
    }
    g.position.set(o.x, 0, o.z);
    scene.add(g);
    sign(o.emoji, o.name, o.x, o.h + 3.2, o.z);
    colliders.push({ x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2 });
    reserved.push([o.x, o.z, o.w / 2 + 3, o.d / 2 + 3]);
    places.push({
      name: o.name, emoji: o.emoji, type: o.type, x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2,
      door: { x: o.x, z: o.z + face * (o.d / 2 + 2.5) },
      doorPivot: hinge, face, doorOpen: 0
    });
  }

  function tree(x, z) {
    const s = 0.8 + Math.random() * 0.7;
    box(0.5 * s, 2.4 * s, 0.5 * s, 0x6b4a2b, x, 1.2 * s, z);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.9 * s, 10, 8), lambert(0x2f8f3a));
    crown.position.set(x, 3.8 * s, z);
    scene.add(crown);
    colliders.push({ x, z, hw: 0.6, hd: 0.6 });
  }

  function lamp(x, z) {
    box(0.18, 5, 0.18, 0x333b44, x, 2.5, z);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), bulbMat);
    b.position.set(x, 5.2, z);
    scene.add(b);
  }

  // ground and paths
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), lambert(campus.ground));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  flat(6, 110, 0xcfc6b4, 0, 0, 0.03);       // main path
  flat(100, 6, 0xcfc6b4, -10, 0, 0.04);     // cross path

  // sports field (optional)
  const f = campus.field;
  if (f) {
    flat(f.w, f.d, 0x3f9a45, f.x, f.z, 0.05);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.6, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(f.x, 0.07, f.z);
    scene.add(ring);
    box(0.2, 3, 5, 0xffffff, f.x + f.w / 2 - 0.5, 1.5, f.z);
    box(0.2, 3, 5, 0xffffff, f.x - f.w / 2 + 0.5, 1.5, f.z);
    sign('⚽', f.name, f.x, 5, f.z);
    reserved.push([f.x, f.z, f.w / 2 + 3, f.d / 2 + 3]);
    places.push({
      name: f.name, emoji: '⚽', type: 'field', x: f.x, z: f.z, hw: f.w / 2, hd: f.d / 2,
      door: { x: f.x - f.w / 2 - 2, z: f.z }
    });
  }

  campus.buildings.forEach(building);

  // main gate (campuses only)
  if (campus.gate !== false) {
    box(1.6, 8, 1.6, 0xf4f1ea, -5, 4, 52);
    box(1.6, 8, 1.6, 0xf4f1ea, 5, 4, 52);
    box(12.4, 1.6, 1.8, new THREE.Color(campus.accent).getHex(), 0, 8.6, 52);
    sign('🎓', campus.short, 0, 11.6, 52);
    colliders.push({ x: -5, z: 52, hw: 0.8, hd: 0.8 }, { x: 5, z: 52, hw: 0.8, hd: 0.8 });
    flat(14, 4, 0xcfc6b4, 0, 56, 0.03);
  }

  // features
  if (campus.features.includes('lagoon')) {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(14, 140), new THREE.MeshLambertMaterial({ color: 0x2d8fd0 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(-58, 0.06, 0);
    scene.add(water);
    colliders.push({ x: -58, z: 0, hw: 7, hd: 70 });
    sign('🌊', 'Lagoon', -46, 4, 0);
  }
  if (campus.features.includes('amphitheatre') && campus.amphitheatre) {
    const a = campus.amphitheatre;
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {            // steps get higher the further out they are
      const r = 3 + i * 1.9;
      const step = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.45 * (i + 1), 24, 1, false, 0, Math.PI), lambert(0xcfc6b4 - i * 0x0a0a0a));
      step.position.y = 0.225 * (i + 1);
      g.add(step);
    }
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.3, 20), lambert(0x8a5a3a));
    stage.position.y = 0.15;
    stage.position.z = 0.4;
    g.add(stage);
    g.position.set(a.x, 0, a.z);
    g.rotation.y = Math.PI / 2;               // open side faces the main path
    scene.add(g);
    sign('🎭', 'Amphitheatre', a.x, 7, a.z);
    colliders.push({ x: a.x + 3.5, z: a.z, hw: 5, hd: 8 });
    reserved.push([a.x, a.z, 12, 12]);
  }

  // street lamps along the paths
  for (let z = -36; z <= 44; z += 16) { lamp(-4, z); lamp(4, z); }
  for (let x = -44; x <= 30; x += 18) {
    if (Math.abs(x) > 6) { lamp(x, -4); lamp(x, 4); }
  }

  // trees
  let placed = 0, guard = 0;
  while (placed < campus.trees && guard++ < 1500) {
    const x = (Math.random() - 0.5) * 112, z = (Math.random() - 0.5) * 112;
    if (Math.abs(x) < 6 || Math.abs(z) < 5 || Math.abs(x) > 56 || Math.abs(z) > 58) continue;
    if (campus.features.includes('lagoon') && x < -46) continue;
    if (reserved.some(r => Math.abs(x - r[0]) < r[2] && Math.abs(z - r[1]) < r[3])) continue;
    tree(x, z);
    placed++;
  }

  // boundary fence
  [[0, -60, 130, 0.4], [0, 60, 130, 0.4], [-60, 0, 0.4, 130], [60, 0, 0.4, 130]]
    .forEach(fn => box(fn[2], 1.4, fn[3], 0x8a8f94, fn[0], 0.7, fn[1]));

  return { colliders, places };
}

/** Swing building doors open as the player gets near (call every frame while outside). */
export function updateDoors(places, playerPos, dt) {
  for (const p of places) {
    if (!p.doorPivot) continue;
    const d = Math.hypot(playerPos.x - p.door.x, playerPos.z - p.door.z);
    const target = d < 7 ? 1 : 0;
    p.doorOpen += (target - p.doorOpen) * Math.min(1, dt * 6);
    p.doorPivot.rotation.y = -p.face * p.doorOpen * 1.35;
  }
}

// Push a circle (radius r) at `pos` out of every box collider and keep it inside `bounds`.
export function resolveCollisions(pos, colliders, r = 0.75, bounds = BOUNDS) {
  for (const c of colliders) {
    const nx = Math.max(c.x - c.hw, Math.min(pos.x, c.x + c.hw));
    const nz = Math.max(c.z - c.hd, Math.min(pos.z, c.z + c.hd));
    const dx = pos.x - nx, dz = pos.z - nz, dd = Math.hypot(dx, dz);
    if (dd < r) {
      if (dd > 1e-4) { pos.x = nx + dx / dd * r; pos.z = nz + dz / dd * r; }
      else pos.x += r;
    }
  }
  pos.x = Math.max(bounds.minX, Math.min(bounds.maxX, pos.x));
  pos.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, pos.z));
}
