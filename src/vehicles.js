import * as THREE from 'three';

/*
 * Vehicles you can ride: keke, okada (local trips), bus and plane (the trip to university). Models are simple blocky shapes
 * in the same style as the rest of the world, and every model faces +z (the same way a character faces at rotation 0).
 * The maths for moving along a route is pure so it can be tested.
 */

export const VEHICLES = {
  keke:  { speed: 12,   accel: 16, turn: 6,   hidePlayer: false },
  okada: { speed: 16,   accel: 22, turn: 7.5, hidePlayer: false },
  bus:   { speed: 18,   accel: 9,  turn: 3.5, hidePlayer: true },
  plane: { speed: 26,   accel: 12, turn: 2,   hidePlayer: true }
};

/* ---------------- pure helpers ---------------- */

export const pathLength = (from, path) => {
  let len = 0, p = from;
  for (const q of path) { len += Math.hypot(q.x - p.x, q.z - p.z); p = q; }
  return len;
};

/** Real seconds a ride lasts (a little extra for speeding up and slowing down). */
export const rideSeconds = (kind, length) => length / VEHICLES[kind].speed + 1.2;

/** Smallest signed turn from angle `a` towards angle `b`, limited to `max` radians. */
export function turnToward(a, b, max) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + Math.max(-max, Math.min(max, d));
}

/** Moves a point up to `dist` along the waypoints, starting at waypoint `i`. Returns the new position, index and whether it finished. */
export function stepAlong(pos, path, i, dist) {
  let { x, z } = pos, left = dist;
  while (i < path.length) {
    const t = path[i], dx = t.x - x, dz = t.z - z, d = Math.hypot(dx, dz);
    if (d <= left) { x = t.x; z = t.z; left -= d; i += 1; continue; }
    x += dx / d * left; z += dz / d * left; left = 0;
    break;
  }
  return { x, z, i, done: i >= path.length, moved: dist - left };
}

/** Point `dist` to the side (local +x) of something at (x, z) facing `heading` (heading 0 faces +z). */
export const sideOf = (x, z, heading, dist) => ({ x: x + Math.cos(heading) * dist, z: z - Math.sin(heading) * dist });

/** Rotates a local offset (x to the right, z forward) into the world for something facing `heading`. */
export const toWorld = (local, heading) => ({
  x: local.x * Math.cos(heading) + local.z * Math.sin(heading),
  z: -local.x * Math.sin(heading) + local.z * Math.cos(heading)
});

/** Cuts the end off a route so a vehicle stops `gap` units before the destination (the player walks the last bit). */
export function stopShort(from, path, gap) {
  if (!path.length) return path;
  const out = path.slice();
  const last = out[out.length - 1], prev = out.length > 1 ? out[out.length - 2] : from;
  const d = Math.hypot(last.x - prev.x, last.z - prev.z);
  if (d > gap + 0.5) {
    const k = (d - gap) / d;
    out[out.length - 1] = { x: prev.x + (last.x - prev.x) * k, z: prev.z + (last.z - prev.z) * k };
  } else if (out.length > 1) out.pop();
  return out;
}

/** Plane height as a fraction of the trip: lifting off during the second part, or coming down during the first part. */
export const planeAltitude = (progress, mode) => (mode === 'landing'
  ? Math.max(0, 1 - progress / 0.6) * 38
  : Math.max(0, (progress - 0.35) / 0.65) * 46);

/* ---------------- models ---------------- */

const lam = (c, opacity = 1) => new THREE.MeshLambertMaterial({ color: c, transparent: opacity < 1, opacity });

function parts() {
  const g = new THREE.Group();
  const wheels = [];
  const box = (w, h, d, c, x, y, z, opacity = 1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c, opacity));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const wheel = (r, width, x, y, z) => {
    const geo = new THREE.CylinderGeometry(r, r, width, 14);
    geo.rotateZ(Math.PI / 2);
    const m = new THREE.Mesh(geo, lam(0x1a1a1a));
    const hub = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, r * 0.5, r * 0.5), lam(0xb8b8b8));
    m.add(hub);
    m.position.set(x, y, z);
    g.add(m);
    wheels.push({ mesh: m, r });
  };
  const light = (w, h, x, y, z, c = 0xfff2b0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), new THREE.MeshBasicMaterial({ color: c }));
    m.position.set(x, y, z);
    g.add(m);
  };
  return { g, wheels, box, wheel, light };
}

function keke() {
  const { g, wheels, box, wheel, light } = parts();
  box(3.0, 0.6, 4.6, 0xf1c40f, 0, 1.1, -0.3);          // body
  box(3.04, 0.3, 4.64, 0x1f2a35, 0, 0.7, -0.3);        // black skirt
  box(2.0, 1.5, 1.5, 0xf1c40f, 0, 1.55, 2.5);          // nose
  box(2.1, 0.12, 1.6, 0x1f2a35, 0, 2.35, 2.5);         // nose top
  for (const [x, z] of [[-1.4, -2.2], [1.4, -2.2], [-1.4, 1.4], [1.4, 1.4]]) box(0.2, 3.4, 0.2, 0x1f2a35, x, 3.0, z);
  box(3.4, 0.22, 4.6, 0x1f2a35, 0, 4.8, -0.4, 0.4);    // roof (see-through so you can see the passenger from above)
  box(2.4, 0.5, 1.2, 0x2b2b2b, 0, 1.6, -1.4);         // passenger bench
  box(2.4, 1.0, 0.2, 0x2b2b2b, 0, 2.2, -2.0);         // backrest
  box(1.2, 0.12, 0.12, 0x444444, 0, 2.5, 1.9);         // handlebar
  light(0.5, 0.4, 0, 1.6, 3.3);
  wheel(0.75, 0.4, 0, 0.75, 2.9);
  wheel(0.75, 0.4, -1.7, 0.75, -1.9);
  wheel(0.75, 0.4, 1.7, 0.75, -1.9);
  return { group: g, wheels, seat: { x: 0, y: 0.65, z: -1.4 }, driver: { x: 0, y: 0.7, z: 1.0 }, exit: 3.2, size: 5 };
}

function okada() {
  const { g, wheels, box, wheel, light } = parts();
  box(0.9, 0.8, 2.6, 0xc0392b, 0, 1.6, 0);             // frame
  box(0.8, 0.6, 1.0, 0xe74c3c, 0, 2.2, 0.7);           // tank
  box(0.9, 0.3, 2.0, 0x111111, 0, 2.0, -0.7);          // seat
  box(0.2, 1.6, 0.2, 0x333333, 0, 1.7, 1.5);           // fork
  box(1.8, 0.12, 0.12, 0x333333, 0, 2.55, 1.5);        // handlebar
  box(0.6, 0.5, 0.5, 0x222222, 0, 1.2, -1.5);          // engine block
  light(0.4, 0.3, 0, 2.2, 1.75);
  light(0.35, 0.2, 0, 1.9, -1.8, 0xff3030);
  wheel(0.9, 0.35, 0, 0.9, 1.7);
  wheel(0.9, 0.35, 0, 0.9, -1.7);
  return { group: g, wheels, seat: { x: 0, y: 0.95, z: -0.85 }, driver: { x: 0, y: 0.95, z: 0.4 }, exit: 1.8, size: 4.4 };
}

function bus() {
  const { g, wheels, box, wheel, light } = parts();
  box(3.6, 2.0, 11, 0xf5c518, 0, 1.7, 0);
  box(3.6, 1.8, 11, 0xf5c518, 0, 3.6, 0);
  box(3.64, 0.4, 11.04, 0x111111, 0, 2.5, 0);          // the black stripe on a danfo
  box(3.4, 0.15, 10.8, 0xdddddd, 0, 4.55, 0);
  for (const s of [-1, 1]) {
    box(0.05, 1.0, 9.5, 0x2b4a66, s * 1.81, 3.7, 0);   // windows
    box(0.06, 1.4, 1.6, 0x2b2b2b, s * 1.82, 1.9, 2.8); // door
  }
  box(3.0, 1.2, 0.05, 0x2b4a66, 0, 3.7, 5.52);        // windscreen
  light(0.5, 0.4, -1.2, 1.6, 5.55);
  light(0.5, 0.4, 1.2, 1.6, 5.55);
  light(0.5, 0.3, -1.2, 1.6, -5.55, 0xff3030);
  light(0.5, 0.3, 1.2, 1.6, -5.55, 0xff3030);
  for (const [x, z] of [[-1.9, 3.5], [1.9, 3.5], [-1.9, -3.5], [1.9, -3.5]]) wheel(0.85, 0.5, x, 0.85, z);
  return { group: g, wheels, seat: { x: 0, y: 1.2, z: 0 }, driver: null, exit: 3.4, size: 11 };
}

function plane() {
  const { g, wheels, box, wheel } = parts();
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 18, 16).rotateX(Math.PI / 2), lam(0xf4f4f4));
  fus.position.set(0, 3.2, 0);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.4, 16).rotateX(Math.PI / 2), lam(0xdddddd));
  nose.position.set(0, 3.2, 10.7);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 16).rotateX(-Math.PI / 2), lam(0xf4f4f4));
  tail.position.set(0, 3.4, -11);
  g.add(fus, nose, tail);
  box(18, 0.25, 3.2, 0xdddddd, 0, 2.8, 0.5);          // wings
  box(0.25, 3.2, 2.4, 0x0a8f4f, 0, 5.6, -9.2);        // tail fin in the Campus Life green
  box(6, 0.2, 1.6, 0xdddddd, 0, 3.6, -9.4);
  box(3.3, 0.35, 18.02, 0x0a8f4f, 0, 2.4, 0);          // stripe along the belly
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) box(0.05, 0.5, 0.6, 0x2b4a66, s * 1.62, 3.6, 6 - i * 1.6);   // windows
  wheel(0.6, 0.3, 0, 0.7, 4);
  wheel(0.7, 0.4, -1.8, 0.7, -1);
  wheel(0.7, 0.4, 1.8, 0.7, -1);
  return { group: g, wheels, seat: { x: 0, y: 2, z: 1 }, driver: null, exit: 3.2, size: 20 };
}

const BUILDERS = { keke, okada, bus, plane };
export const buildVehicle = kind => BUILDERS[kind]();
