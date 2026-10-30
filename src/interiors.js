import * as THREE from 'three';
import { createSign } from './world.js';

const lam = c => new THREE.MeshLambertMaterial({ color: c });

export const ENTERABLE = new Set(['hostel', 'home', 'cafe', 'canteen', 'library', 'lecture', 'biz', 'clinic']);

const W = 20;      // room width (x)
const D = 16;      // room depth (z): back wall at z = -8, open front edge at z = +8
const WALL_H = 6.5;

// wall tints so different buildings don't look identical
const WALLS = [0xf1e6d2, 0xdfe9ef, 0xf2dcd0, 0xe6efd9];
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Builds a walk-in interior far away from the campus at x = ox.
 * Returns { colliders, bounds, spawn, exit, spots } in world coordinates.
 * A spot is { name, title, emoji, x, z, r, actionIds, note }: stand within r to use it.
 */
export function buildInterior(scene, place, ox) {
  const g = new THREE.Group();
  g.position.set(ox, 0, 0);
  scene.add(g);
  const colliders = [], spots = [];
  const wall = WALLS[hash(place.name) % WALLS.length];

  const box = (w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const solid = (w, h, d, c, x, y, z) => {          // visible and blocks movement
    box(w, h, d, c, x, y, z);
    colliders.push({ x: ox + x, z, hw: w / 2, hd: d / 2 });
  };
  const tag = (emoji, text, x, y, z) => {
    const s = createSign(emoji, text);
    s.scale.multiplyScalar(0.42);
    s.position.set(x, y, z);
    g.add(s);
  };
  const spot = (label, emoji, x, z, r, actionIds, note, tagY = 3.4) => {
    spots.push({ name: `${place.name} › ${label}`, title: `${emoji} ${label}`, emoji, x: ox + x, z, r, actionIds, note });
    tag(emoji, label, x, tagY, z - 1);
  };

  // shell: floor, ground under the room, back and side walls (front is open so the camera can see in)
  const under = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), lam(0x23262b));
  under.rotation.x = -Math.PI / 2; under.position.y = -0.2; g.add(under);
  box(W, 0.3, D, place.type === 'canteen' ? 0xd9d2c3 : place.type === 'lecture' ? 0xb9b2a6 : 0xb98a5a, 0, -0.15, 0);
  box(W + 1, WALL_H, 0.5, wall, 0, WALL_H / 2, -D / 2 - 0.25);
  box(0.5, WALL_H, D, wall, -W / 2 - 0.25, WALL_H / 2, 0);
  box(0.5, WALL_H, D, wall, W / 2 + 0.25, WALL_H / 2, 0);
  box(W + 1, 0.4, 0.7, 0x5a4636, 0, WALL_H + 0.2, -D / 2 - 0.25);     // trim
  const win = new THREE.MeshBasicMaterial({ color: 0xbfe3ff });
  [-6, 6].forEach(x => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), win);
    w.position.set(x, 3.6, -D / 2 + 0.02);
    g.add(w);
  });

  // exit mat in the middle of the open front
  box(4, 0.06, 1.6, 0x0a8f4f, 0, 0.03, D / 2 - 1.1);
  tag('🚪', 'Exit', 0, 2.2, D / 2 - 1.1);

  const build = {
    hostel() {
      // bed
      solid(3.2, 0.7, 5.8, 0x6b4a2b, -6.5, 0.35, -4.6);
      box(2.9, 0.4, 5.4, 0x4a78c2, -6.5, 0.9, -4.6);
      box(2.2, 0.3, 1, 0xffffff, -6.5, 1.25, -6.8);
      // desk + laptop
      solid(5, 0.25, 2, 0x8a6a45, 4.5, 1.7, -6.6);
      box(0.3, 1.7, 1.6, 0x6b4a2b, 2.2, 0.85, -6.6);
      box(0.3, 1.7, 1.6, 0x6b4a2b, 6.8, 0.85, -6.6);
      box(1.6, 0.1, 1.1, 0x333b44, 4.5, 1.88, -6.5);
      box(1.6, 1.1, 0.1, 0x222a35, 4.5, 2.5, -7.05);
      // wardrobe
      solid(2.4, 5, 1.6, 0x7a5a38, 8.4, 2.5, -6.8);
      // shower corner
      box(4.2, 0.08, 4.2, 0x9fd3ea, -7.6, 0.04, 4.6);
      solid(0.2, 4.6, 4.2, 0xbcdff0, -5.4, 2.3, 4.6);
      box(0.18, 4.2, 0.18, 0xb0b8c0, -9.2, 2.1, 4.6);
      box(1, 0.2, 0.6, 0xb0b8c0, -8.8, 4.2, 4.6);
      // rug
      box(5, 0.04, 3, 0xc2694a, 1, 0.02, 1);
      spot('Bed', '🛏️', -6.5, -2.4, 3.8, ['sleep']);
      spot('Desk & phone', '📱', 4.5, -4.8, 3.4, ['phone', 'freelance']);
      spot('Shower', '🚿', -7.6, 3.4, 3.2, ['bathe']);
    },
    home() {
      build.hostel();                                        // same layout, plus a kitchen corner
      solid(3.2, 1.1, 1.6, 0xd6a96a, 6.6, 0.55, 3.4);
      solid(1.6, 4.2, 1.4, 0xe8edf0, 8.6, 2.1, -3.4);       // fridge
      spot('Kitchen', '🍲', 6.6, 1.2, 3.6, ['momfood']);
    },
    cafe() {
      [[-6, -2.4], [0, -2.4], [6, -2.4], [-6, 1.6], [0, 1.6], [6, 1.6]].forEach(([x, z]) => {
        solid(3.6, 0.2, 1.8, 0xb98a5a, x, 1.3, z);
        box(1.5, 1, 0.12, 0x222a35, x, 2.0, z - 0.5);
        box(1.3, 0.8, 0.02, 0x7cc4ff, x, 2.0, z - 0.43);      // lit screen
        box(1.0, 0.7, 1.0, 0x2f6fd0, x, 0.35, z + 1.4);        // chair
      });
      solid(8, 1.4, 1.4, 0x8a5a3a, 0, 0.7, -6.6);              // counter
      box(9, 2.2, 0.15, 0x1f4d33, 0, 4.2, -D / 2 + 0.15);      // price board
      spot('Computers', '🖥️', 0, 5.0, 4.2, ['browse', 'results']);
    },
    clinic() {
      solid(6, 1.2, 1.6, 0xd6a96a, -5, 0.6, -5.2);                          // reception and consulting desk
      box(1.4, 0.9, 0.12, 0x222a35, -5, 1.7, -5.6);
      [1, 5.5].forEach(z => {                                                // two beds along the left wall
        solid(3.2, 0.6, 4, 0xf4f4f4, -7.6, 0.3, z);
        box(3.0, 0.3, 3.2, 0x4a78c2, -7.6, 0.75, z + 0.3);
        box(2.2, 0.25, 0.9, 0xffffff, -7.6, 0.95, z - 1.4);
      });
      solid(8, 4, 1, 0xe9eef2, 5, 2, -7.2);                                  // pharmacy shelves with boxes
      [0xc0392b, 0x2f6fd0, 0x27ae60, 0xe5a52a].forEach((c, i) => box(1.4, 0.9, 0.5, c, 2.6 + i * 1.6, 1.8 + (i % 2), -6.6));
      solid(6, 1.2, 1.4, 0x8a5a3a, 5, 0.6, -4.6);                            // pharmacy counter
      box(0.5, 2.2, 0.15, 0x27ae60, 0, 3.4, -D / 2 + 0.15); box(2.2, 0.5, 0.15, 0x27ae60, 0, 3.4, -D / 2 + 0.15);   // green cross
      spot('Consulting room', '🩺', -4.5, -2.6, 3.4, ['consult']);
      spot('Pharmacy counter', '💊', 5, -2.6, 3.4, ['drugs', 'paracetamol']);
    },
    biz() {
      solid(10, 1.4, 1.6, 0x8a5a3a, 0, 0.7, -6.4);                         // counter
      [-6, 6].forEach(x => {                                                // photocopiers and printers
        solid(2.4, 1.6, 1.8, 0xe8edf0, x, 0.8, -6.5);
        box(2.0, 0.12, 1.4, 0x7cc4ff, x, 1.66, -6.5);
      });
      [[-6, 0], [0, 0], [6, 0]].forEach(([x, z]) => {                       // customers' desks
        solid(3.2, 0.2, 1.6, 0xb98a5a, x, 1.2, z);
        box(0.3, 1.2, 1.2, 0x6b4a2b, x - 1.3, 0.6, z); box(0.3, 1.2, 1.2, 0x6b4a2b, x + 1.3, 0.6, z);
        box(1.3, 0.9, 0.12, 0x222a35, x, 1.85, z - 0.5);
      });
      box(9, 2.2, 0.15, 0x1f4d33, 0, 4.2, -D / 2 + 0.15);                  // price board
      spot('Counter', '💼', 0, -3.6, 5.2, ['print', 'pos', 'handouts']);
    },
    canteen() {
      // serving counter with pots
      solid(14, 1.6, 1.8, 0x8a5a3a, 0, 0.8, -5.8);
      [-4.5, -1.5, 1.5, 4.5].forEach((x, i) => {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.9, 16), lam([0xc0392b, 0xe5a52a, 0x27ae60, 0xb8860b][i]));
        pot.position.set(x, 2.05, -5.8);
        g.add(pot);
      });
      box(14, 3, 0.2, 0x3b2a1f, 0, 3.5, -7.7);        // menu board
      // tables and stools
      [[-6, 0.5], [6, 0.5], [-6, 4.8], [6, 4.8], [0, 2.4]].forEach(([x, z]) => {
        solid(3, 0.2, 3, 0xd6a96a, x, 1.2, z);
        box(0.3, 1.2, 0.3, 0x6b4a2b, x, 0.6, z);
        [[-2.2, 0], [2.2, 0]].forEach(([dx]) => box(0.9, 0.7, 0.9, 0x8a3b2b, x + dx, 0.35, z));
      });
      spot('Food counter', '🍛', 0, -3.4, 5.5, ['jollof', 'pie', 'zobo', 'canteenjob']);
    },
    library() {
      // shelves along the back wall and two free-standing rows
      const shelf = (w, x, z) => {
        solid(w, 4.6, 1, 0x7a5a38, x, 2.3, z);
        for (let i = 0; i < 4; i++) {
          const books = box(w - 0.3, 0.7, 0.7, [0xc0392b, 0x2f6fd0, 0x27ae60, 0xe5a52a][i], 0, 0.95 + i * 1.0, z + 0.05);
          books.position.x = x;
        }
      };
      shelf(17, 0, -7.2);
      shelf(7, -5, -2.4); shelf(7, 5.5, -2.4);
      // study desks
      [[-6, 3], [0, 3], [6, 3]].forEach(([x, z]) => {
        solid(3.6, 0.2, 2, 0xb98a5a, x, 1.4, z);
        box(0.3, 1.4, 1.6, 0x6b4a2b, x - 1.5, 0.7, z);
        box(0.3, 1.4, 1.6, 0x6b4a2b, x + 1.5, 0.7, z);
        box(1.1, 0.6, 0.9, 0x2f6fd0, x, 0.3, z + 1.7);
      });
      spot('Study desks', '📚', 0, 0.6, 5.5, ['library'], '');   // actions come from academics.js
    },
    lecture() {
      box(10, 3.2, 0.15, 0x1f4d33, 0, 3.6, -D / 2 + 0.15);   // board
      box(10.4, 0.2, 0.2, 0xcfc6b4, 0, 1.95, -D / 2 + 0.2);
      solid(3, 1.4, 1.4, 0x7a5a38, 0, 0.7, -5.4);              // lecturer's podium
      for (let r = 0; r < 4; r++) {
        [-5.2, 5.2].forEach(x => {
          solid(6.4, 0.9, 1.4, 0xd6a96a, x, 0.9, -1.4 + r * 2.7);
          solid(6.4, 0.5, 0.8, 0x8a5a3a, x, 0.35, -0.2 + r * 2.7);
        });
      }
      spot('Lecture seats', '🎓', 0, 1.4, 5, ['lecture'], '', 4.6);   // actions come from academics.js
    }
  };
  (build[place.type] || build.hostel)();

  const npcAnchors = {
    lecture: { x: ox + 3.2, z: -3.4 },          // beside the podium, reachable from the aisle
    library: { x: ox, z: -4.6 },
    canteen: { x: ox + 5.5, z: -3.0 },
    biz:     { x: ox + 7, z: -3.5 },
    clinic:  { x: ox + 0.5, z: -3.0 },
    hostel:  { x: ox + 1.5, z: -2.5 },
    home:    { x: ox + 1.5, z: -2.5 }
  };
  const bounds = { minX: ox - W / 2 + 0.9, maxX: ox + W / 2 - 0.9, minZ: -D / 2 + 0.9, maxZ: D / 2 - 0.4 };
  return {
    colliders, bounds, spots, npcAnchor: npcAnchors[place.type] || null,
    spawn: { x: ox, z: D / 2 - 3.6 },
    exit: { x: ox, z: D / 2 - 1.1, r: 1.7 }
  };
}
