import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = c => new THREE.MeshLambertMaterial({ color: c });
const vertexLambert = new THREE.MeshLambertMaterial({ vertexColors: true });   // for baked scenery (colour per vertex)

// Shared materials that the day/night system tints (lit windows and street lamps at night).
export const windowMat = new THREE.MeshBasicMaterial({ color: 0x35506b });
export const bulbMat = new THREE.MeshBasicMaterial({ color: 0x555555 });

export const BOUNDS = { minX: -57, maxX: 57, minZ: -57, maxZ: 58 };
export const SPAWN = { x: 0, z: 32 };

const signs = [];

// ---- Landmark badges --------------------------------------------------------------------------------------------
// Every sign is ONE sprite (one draw call). Up close it shows a big emoji badge with the name under it; far away it
// swaps to an emoji-only badge that grows with distance so you can still read the map at a glance. Textures are
// cached per emoji / per label, so two buildings of the same kind share one canvas.
const FONT = 'system-ui,"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
const badgeCache = new Map(), labelCache = new Map();
const NEAR_ON = 34, NEAR_OFF = 38;          // distance where the name appears / disappears (hysteresis stops flicker)
const FULL_W = 8, FULL_H = 3, BADGE = 2.1;  // world size of the full label and of the emoji-only badge

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
}

function paintBadge(g, cx, cy, r, emoji) {
  g.fillStyle = 'rgba(10,25,20,.88)';
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.lineWidth = Math.max(3, r * 0.08);
  g.strokeStyle = '#ffffff';
  g.beginPath(); g.arc(cx, cy, r - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${Math.round(r * 1.1)}px ${FONT}`;
  g.fillText(emoji, cx, cy + r * 0.06);
}

const toTexture = c => {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

function badgeTexture(emoji) {
  let t = badgeCache.get(emoji);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  paintBadge(c.getContext('2d'), 64, 64, 60, emoji);
  t = toTexture(c);
  badgeCache.set(emoji, t);
  return t;
}

function labelTexture(emoji, text) {
  const key = `${emoji}|${text}`;
  let t = labelCache.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const g = c.getContext('2d');
  paintBadge(g, 256, 62, 60, emoji);
  g.fillStyle = 'rgba(10,25,20,.88)';
  roundRect(g, 4, 130, 504, 58, 29); g.fill();
  g.fillStyle = '#fff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 40;
  g.font = `700 ${size}px ${FONT}`;
  while (g.measureText(text).width > 470 && size > 20) { size -= 2; g.font = `700 ${size}px ${FONT}`; }
  g.fillText(text, 256, 160);
  t = toTexture(c);
  labelCache.set(key, t);
  return t;
}

const _v = new THREE.Vector3();

/**
 * Per-frame: pick the label style and size from the camera distance (spec F-241).
 * Allocation-free; only touches a sprite's texture when its mode actually changes.
 */
export function updateSigns(camPos) {
  for (const g of signs) {
    if (!g.parent) continue;
    const sp = g.children[0], u = g.userData;
    const d = g.getWorldPosition(_v).distanceTo(camPos);
    const full = d < (u.full ? NEAR_OFF : NEAR_ON);
    if (full !== u.full) {
      u.full = full;
      sp.material.map = full ? u.labelTex : u.badgeTex;
      sp.material.needsUpdate = true;
    }
    if (full) {
      const k = Math.min(1, Math.max(0.4, d / 20));              // shrink when the camera is right next to it
      sp.scale.set(FULL_W * k, FULL_H * k, 1);
    } else {
      const k = Math.min(2.4, Math.max(1, d / 30));            // keep far badges readable
      sp.scale.set(BADGE * k, BADGE * k, 1);
    }
    sp.material.opacity = d < 80 ? 1 : Math.max(0.35, 1 - (d - 80) / 90);
  }
}

/** A floating landmark badge (emoji + name). Returns a Group so callers can position and scale it freely. */
export function createSign(emoji, text) {
  const g = new THREE.Group();
  const labelTex = labelTexture(emoji, text), badgeTex = badgeTexture(emoji);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false, fog: false }));
  sp.scale.set(FULL_W, FULL_H, 1);
  g.add(sp);
  g.userData = { full: true, labelTex, badgeTex };
  signs.push(g);
  return g;
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
  // Trees, lamps and windows are collected here and drawn as a few instanced meshes at the end (keeps draw calls low on phones).
  const treeSpots = [], lampSpots = [], windowSpots = [];

  // Static scenery (building bodies and roofs, paths, fences, gate...) is baked with vertex colours into ONE mesh at the
  // end of this function, so it costs a single draw call instead of one per box.
  const baked = [];
  const colored = (geo, c) => {
    const col = new THREE.Color(c), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  const boxGeo = (w, h, d, c, x, y, z) => colored(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c);
  const box = (w, h, d, c, x, y, z) => { baked.push(boxGeo(w, h, d, c, x, y, z)); };
  const flat = (w, d, c, x, z, y) => { baked.push(colored(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(x, y, z), c)); };

  function sign(emoji, text, x, y, z) {
    const s = createSign(emoji, text);
    s.position.set(x, y, z);
    scene.add(s);
  }

  function building(o) {
    box(o.w, o.h, o.d, o.color, o.x, o.h / 2, o.z);
    box(o.w + 1, 0.8, o.d + 1, o.roof, o.x, o.h + 0.4, o.z);
    const face = o.z > 0 ? -1 : 1;                      // door faces the central path
    const fz = face * (o.d / 2 + 0.05);

    // dark doorway behind a hinged door that swings open when you get close
    const doorway = new THREE.PlaneGeometry(2.4, 3.2);
    if (face < 0) doorway.rotateY(Math.PI);
    baked.push(colored(doorway.translate(o.x, 1.6, o.z + face * (o.d / 2 + 0.04)), 0x15110e));
    const hinge = new THREE.Group();
    hinge.position.set(o.x - 1.2, 0, o.z + fz);
    hinge.add(new THREE.Mesh(                                              // door and handle in one mesh
      mergeGeometries([boxGeo(2.4, 3.2, 0.2, 0x5a3a22, 1.2, 1.6, 0), boxGeo(0.15, 0.15, 0.3, 0xd9b45a, 2.0, 1.5, 0)]),
      vertexLambert));
    scene.add(hinge);

    const rows = Math.max(1, Math.floor((o.h - 3) / 3));
    const cols = Math.max(2, Math.floor(o.w / 4));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = (c - (cols - 1) / 2) * (o.w / cols) * 0.95;
        if (r === 0 && Math.abs(wx) < 2) continue;
        windowSpots.push({ x: o.x + wx, y: 2.4 + r * 3, z: o.z + fz + face * 0.02, ry: face < 0 ? Math.PI : 0 });
      }
    }
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
    treeSpots.push({ x, z, s: 0.8 + Math.random() * 0.7 });
    colliders.push({ x, z, hw: 0.6, hd: 0.6 });
  }

  function lamp(x, z) {
    lampSpots.push({ x, z });
    colliders.push({ x, z, hw: 0.3, hd: 0.3 });
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
    // Fence all round the pitch (solid), with one gap in the west side: the entrance.
    const fx0 = f.x - f.w / 2 - 0.6, fx1 = f.x + f.w / 2 + 0.6, fz0 = f.z - f.d / 2 - 0.6, fz1 = f.z + f.d / 2 + 0.6, gap = 2.4;
    const fence = (xa, za, xb, zb) => {
      const len = Math.hypot(xb - xa, zb - za), cx = (xa + xb) / 2, cz = (za + zb) / 2, alongX = Math.abs(xb - xa) > 0;
      box(alongX ? len : 0.12, 0.12, alongX ? 0.12 : len, 0xeeeeee, cx, 1.0, cz);
      box(alongX ? len : 0.12, 0.12, alongX ? 0.12 : len, 0xeeeeee, cx, 0.5, cz);
      for (let t = 0; t <= len + 0.01; t += len) box(0.2, 1.3, 0.2, 0x8a8a8a, alongX ? xa + t : xa, 0.65, alongX ? za : za + t);
      colliders.push({ x: cx, z: cz, hw: alongX ? len / 2 : 0.15, hd: alongX ? 0.15 : len / 2 });
    };
    fence(fx0, fz0, fx1, fz0); fence(fx0, fz1, fx1, fz1);          // long sides
    fence(fx1, fz0, fx1, fz1);                                       // east end
    fence(fx0, fz0, fx0, f.z - gap); fence(fx0, f.z + gap, fx0, fz1);   // west end, with the entrance between
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

  // ---- neighbourhood details: stepping-stone paths, grass patches, flower beds, benches, noticeboards, fences ----
  // All of it is collected as plain data and drawn at the end as ONE instanced box mesh + ONE instanced sphere mesh
  // (per-instance colours), so this whole block costs 2 draw calls however much is added.
  const decorBoxes = [], decorBlobs = [];
  {
    let seed = [...campus.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);
    const rand = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pick = list => list[Math.floor(rand() * list.length)];
    const pb = (w, h, d, c, x, y, z, ry = 0) => decorBoxes.push({ w, h, d, c, x, y, z, ry });
    const pl = (sx, sy, sz, c, x, y, z) => decorBlobs.push({ sx, sy, sz, c, x, y, z });
    const inBox = (x, z, m, c) => Math.abs(x - c.x) < c.hw + m && Math.abs(z - c.z) < c.hd + m;
    const free = (x, z, m = 1) => Math.abs(x) < 54 && Math.abs(z) < 56
      && !colliders.some(c => inBox(x, z, m, c));
    const stoneOk = (x, z) => free(x, z, 0.4) && !extraReserved.some(r => Math.abs(x - r[0]) < r[2] && Math.abs(z - r[1]) < r[3]);

    // wide grass patches in slightly different greens so the ground is not one flat colour
    const g0 = new THREE.Color(campus.ground);
    const patchCount = campus.id === 'home' ? 16 : 9;
    for (let i = 0, tries = 0; i < patchCount && tries++ < 80;) {
      const x = (rand() - 0.5) * 108, z = (rand() - 0.5) * 108, w = 5 + rand() * 8, d = 4 + rand() * 6;
      if (Math.abs(x) < 5 + w / 2 || Math.abs(z) < 4 + d / 2 || !free(x, z, Math.max(w, d) / 2)) continue;
      pb(w, 0.02, d, g0.clone().offsetHSL(0, 0.02, rand() < 0.5 ? -0.045 : 0.05).getHex(), x, 0.012, z);
      i++;
    }

    // a flower bed: a low bush with a ring of blossoms
    const FLOWERS = [0xf2c94c, 0xeb5757, 0xf2994a, 0xffffff, 0xbb6bd9, 0xff8fb1];
    const bed = (x, z, n = 5) => {
      pl(1.0, 0.55, 1.0, 0x2f7d36, x, 0.3, z);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand();
        pl(0.22, 0.22, 0.22, pick(FLOWERS), x + Math.cos(a) * 0.65, 0.62, z + Math.sin(a) * 0.65);
      }
      reserved.push([x, z, 1.6, 1.6]);
    };
    const bench = (x, z, dir) => {                  // dir = the way the person sitting looks (+1 or -1 along z)
      pb(2.6, 0.14, 0.8, 0x8a5a3a, x, 0.55, z);
      pb(2.6, 0.55, 0.12, 0x7a4a2a, x, 0.95, z - dir * 0.36);
      pb(0.14, 0.55, 0.7, 0x333b44, x - 1.15, 0.27, z); pb(0.14, 0.55, 0.7, 0x333b44, x + 1.15, 0.27, z);
      colliders.push({ x, z, hw: 1.35, hd: 0.5 });
    };
    const board = (x, z, dir) => {                  // a noticeboard on two posts with a few pinned papers
      pb(0.15, 2.4, 0.15, 0x5a3a22, x - 0.9, 1.2, z); pb(0.15, 2.4, 0.15, 0x5a3a22, x + 0.9, 1.2, z);
      pb(2.3, 1.5, 0.14, 0x6b4a2b, x, 1.95, z);
      pb(2.05, 1.25, 0.06, 0xd9a864, x, 1.95, z + dir * 0.08);
      [[-0.6, 0.25, 0xffffff], [0.1, 0.35, 0xbfe3ff], [0.65, 0.2, 0xffe9a8], [-0.2, -0.3, 0xffffff]]
        .forEach(([dx, dy, c]) => pb(0.5, 0.42, 0.04, c, x + dx, 1.95 + dy, z + dir * 0.13));
      colliders.push({ x, z, hw: 1.2, hd: 0.3 });
    };
    const washingLine = (x, z) => {                 // two poles, a line and a few clothes: hostels feel lived in
      pb(0.12, 3, 0.12, 0x555b61, x, 1.5, z - 3); pb(0.12, 3, 0.12, 0x555b61, x, 1.5, z + 3);
      pb(0.04, 0.04, 6, 0xdddddd, x, 2.9, z);
      [-2.1, -0.7, 0.8, 2.2].forEach(dz => pb(0.05, 1.0, 0.8, pick([0xffffff, 0x4a78c2, 0xe5a52a, 0xc0392b, 0x27ae60]), x, 2.35, z + dz));
      colliders.push({ x, z: z - 3, hw: 0.2, hd: 0.2 }, { x, z: z + 3, hw: 0.2, hd: 0.2 });
    };

    for (const o of campus.buildings) {
      const face = o.z > 0 ? -1 : 1;
      const doorZ = o.z + face * (o.d / 2 + 2.5);
      const frontZ = o.z + face * (o.d / 2 + 1.3);

      // stepping stones from the door to the nearest path (straight, or sideways to the main path if something is in the way)
      if (Math.abs(o.x) > 4) {
        const toCross = [];
        for (let z = doorZ; Math.abs(z) > 3.4 && z * doorZ > 0; z -= Math.sign(doorZ) * 2.4) toCross.push([o.x, z]);
        const toMain = [];
        for (let x = o.x; Math.abs(x) > 3.4; x -= Math.sign(o.x) * 2.4) toMain.push([x, doorZ]);
        const route = [toCross, toMain].find(r => r.length && r.every(([x, z]) => stoneOk(x, z)));
        if (route) {
          for (const [x, z] of route) pb(1.5, 0.06, 1.5, pick([0xbdb3a0, 0xc9bfac, 0xaaa391]), x + (rand() - 0.5) * 0.2, 0.05, z + (rand() - 0.5) * 0.2, (rand() - 0.5) * 0.3);
          const mid = route[Math.floor(route.length / 2)];
          reserved.push([mid[0], mid[1], Math.abs(route[0][0] - route[route.length - 1][0]) / 2 + 1.5, Math.abs(route[0][1] - route[route.length - 1][1]) / 2 + 1.5]);
        }
      }
      // corner flower beds beside the doorway
      [-1, 1].forEach(sd => { const x = o.x + sd * (o.w / 2 - 0.9), z = o.z + face * (o.d / 2 + 1.1); if (free(x, z, 0.3)) bed(x, z); });
      // a bench and a noticeboard on the larger buildings
      if (o.w >= 12 && o.type !== 'park' && o.type !== 'shop') {
        const bx = o.x + o.w / 2 - 3.4, nx = o.x - (o.w / 2 - 3.4);
        if (free(bx, frontZ, 0.2)) bench(bx, frontZ, face);
        if (free(nx, frontZ, 0.2)) board(nx, o.z + face * (o.d / 2 + 0.9), face);
      }
      if (o.type === 'hostel') {
        const wx = o.x + (o.x > 0 ? -1 : 1) * (o.w / 2 + 2.6);        // beside the wall that faces the main path
        if (free(wx, o.z, 3.2)) washingLine(wx, o.z);
      }
    }

    // Family House: a low compound fence along both sides and the back, open at the front
    if (campus.id === 'home') {
      const h = campus.buildings.find(b => b.type === 'home');
      if (h) {
        const x0 = h.x - h.w / 2 - 4, x1 = h.x + h.w / 2 + 4, z0 = h.z - h.d / 2 - 5.5, z1 = h.z + h.d / 2 + 4.5;
        const rail = (xa, za, xb, zb) => {
          const len = Math.hypot(xb - xa, zb - za), alongX = Math.abs(xb - xa) > 0;
          const cx = (xa + xb) / 2, cz = (za + zb) / 2;
          pb(alongX ? len : 0.1, 0.1, alongX ? 0.1 : len, 0xf1e9d8, cx, 0.95, cz);
          pb(alongX ? len : 0.1, 0.1, alongX ? 0.1 : len, 0xf1e9d8, cx, 0.5, cz);
          for (let t = 0; t <= len + 0.01; t += 1.6) pb(0.16, 1.15, 0.16, 0xcdb88e, alongX ? xa + t : xa, 0.58, alongX ? za : za + t);
          colliders.push({ x: cx, z: cz, hw: alongX ? len / 2 : 0.15, hd: alongX ? 0.15 : len / 2 });
        };
        rail(x0, z0, x0, z1); rail(x1, z0, x1, z1); rail(x0, z1, x1, z1);
        reserved.push([h.x, (z0 + z1) / 2, (x1 - x0) / 2 + 1, (z1 - z0) / 2 + 1]);
      }
      // loose flower clusters on open grass
      for (let i = 0, tries = 0; i < 9 && tries++ < 60;) {
        const x = (rand() - 0.5) * 100, z = (rand() - 0.5) * 100;
        if (Math.abs(x) < 7 || Math.abs(z) < 6 || !free(x, z, 1.5)) continue;
        bed(x, z, 6); i++;
      }
    }

    // Sports Centre: spectator benches behind the north fence, a fixtures board by the entrance, corner flags, a scoreboard
    if (f) {
      const nz = f.z - f.d / 2 - 2.6;
      [-6, 0, 6].forEach(dx => bench(f.x + dx, nz, 1));
      board(f.x - f.w / 2 - 3.2, f.z + 5.5, 1);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const x = f.x + sx * (f.w / 2 - 0.5), z = f.z + sz * (f.d / 2 - 0.5);
        pb(0.08, 2, 0.08, 0xffffff, x, 1, z); pb(0.5, 0.35, 0.04, 0xe5393f, x + 0.25, 1.8, z);
      });
      const sx = f.x + f.w / 2 - 3.5, sz = f.z - f.d / 2 - 2.2;
      pb(0.2, 3.2, 0.2, 0x555b61, sx - 1.6, 1.6, sz); pb(0.2, 3.2, 0.2, 0x555b61, sx + 1.6, 1.6, sz);
      pb(4.2, 1.5, 0.25, 0x1d2630, sx, 3.4, sz); pb(1.1, 0.8, 0.1, 0xffd54a, sx - 0.9, 3.4, sz + 0.15); pb(1.1, 0.8, 0.1, 0xffd54a, sx + 0.9, 3.4, sz + 0.15);
      colliders.push({ x: sx, z: sz, hw: 2.2, hd: 0.3 });
    }
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

  // batch the repeated small objects: one draw call per kind instead of one per object
  const dummy = new THREE.Object3D();
  const instanced = (geometry, material, spots, place) => {
    if (!spots.length) return;
    const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
    spots.forEach((t, i) => {
      dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
      place(dummy, t);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitSphere = (seg) => new THREE.SphereGeometry(1, seg, Math.max(6, seg - 2));
  instanced(unitBox, lambert(0x6b4a2b), treeSpots, (d, t) => { d.position.set(t.x, 1.2 * t.s, t.z); d.scale.set(0.5 * t.s, 2.4 * t.s, 0.5 * t.s); });
  instanced(unitSphere(10), lambert(0x2f8f3a), treeSpots, (d, t) => { d.position.set(t.x, 3.8 * t.s, t.z); d.scale.setScalar(1.9 * t.s); });
  instanced(unitBox, lambert(0x333b44), lampSpots, (d, t) => { d.position.set(t.x, 2.5, t.z); d.scale.set(0.18, 5, 0.18); });
  instanced(unitSphere(10), bulbMat, lampSpots, (d, t) => { d.position.set(t.x, 5.2, t.z); d.scale.setScalar(0.45); });
  instanced(new THREE.PlaneGeometry(1.5, 1.5), windowMat, windowSpots, (d, w) => { d.position.set(w.x, w.y, w.z); d.rotation.y = w.ry; });

  // all baked scenery as one mesh
  if (baked.length) {
    const mesh = new THREE.Mesh(mergeGeometries(baked), vertexLambert);
    mesh.frustumCulled = false;
    scene.add(mesh);
    baked.forEach(b => b.dispose());
  }

  // neighbourhood details (see above): two more draw calls in total, colours come from per-instance colour
  const tint = new THREE.Color();
  if (decorBoxes.length) {
    const m = new THREE.InstancedMesh(unitBox, new THREE.MeshLambertMaterial({ color: 0xffffff }), decorBoxes.length);
    decorBoxes.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(0, b.ry, 0); dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tint.setHex(b.c));
    });
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.frustumCulled = false;
    scene.add(m);
  }
  if (decorBlobs.length) {
    const m = new THREE.InstancedMesh(unitSphere(8), new THREE.MeshLambertMaterial({ color: 0xffffff }), decorBlobs.length);
    decorBlobs.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(b.sx, b.sy, b.sz);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tint.setHex(b.c));
    });
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.frustumCulled = false;
    scene.add(m);
  }

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
// Two passes so being pushed out of one box can't leave you inside the next, and if the centre is already
// inside a box it is pushed out through the nearest side (never always the same way, which could tunnel through a wall).
export function resolveCollisions(pos, colliders, r = 0.75, bounds = BOUNDS) {
  for (let pass = 0; pass < 2; pass++) {
    for (const c of colliders) {
      const nx = Math.max(c.x - c.hw, Math.min(pos.x, c.x + c.hw));
      const nz = Math.max(c.z - c.hd, Math.min(pos.z, c.z + c.hd));
      const dx = pos.x - nx, dz = pos.z - nz, dd = Math.hypot(dx, dz);
      if (dd >= r) continue;
      if (dd > 1e-4) { pos.x = nx + dx / dd * r; pos.z = nz + dz / dd * r; continue; }
      // centre inside the box: leave by the closest face
      const toLeft = pos.x - (c.x - c.hw), toRight = (c.x + c.hw) - pos.x;
      const toBack = pos.z - (c.z - c.hd), toFront = (c.z + c.hd) - pos.z;
      const m = Math.min(toLeft, toRight, toBack, toFront);
      if (m === toLeft) pos.x = c.x - c.hw - r;
      else if (m === toRight) pos.x = c.x + c.hw + r;
      else if (m === toBack) pos.z = c.z - c.hd - r;
      else pos.z = c.z + c.hd + r;
    }
  }
  pos.x = Math.max(bounds.minX, Math.min(bounds.maxX, pos.x));
  pos.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, pos.z));
}
