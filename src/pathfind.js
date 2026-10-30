/*
 * Grid pathfinding for tap-to-walk (spec F-043). The campus is rasterised into a grid of 2-unit cells; cells touched by a
 * collider (grown by the player's radius) are blocked. A* finds a route, then it is straightened by dropping waypoints that
 * have a clear line of sight to the next one.
 */

export function buildGrid(colliders, bounds, { cell = 2, margin = 1.0 } = {}) {
  const w = Math.ceil((bounds.maxX - bounds.minX) / cell) + 1;
  const h = Math.ceil((bounds.maxZ - bounds.minZ) / cell) + 1;
  const blocked = new Uint8Array(w * h);
  for (const c of colliders) {
    const x0 = Math.max(0, Math.floor((c.x - c.hw - margin - bounds.minX) / cell));
    const x1 = Math.min(w - 1, Math.floor((c.x + c.hw + margin - bounds.minX) / cell));
    const z0 = Math.max(0, Math.floor((c.z - c.hd - margin - bounds.minZ) / cell));
    const z1 = Math.min(h - 1, Math.floor((c.z + c.hd + margin - bounds.minZ) / cell));
    for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) blocked[gz * w + gx] = 1;
  }
  return { w, h, cell, minX: bounds.minX, minZ: bounds.minZ, blocked };
}

const toCell = (g, p) => ({
  x: Math.max(0, Math.min(g.w - 1, Math.round((p.x - g.minX) / g.cell))),
  z: Math.max(0, Math.min(g.h - 1, Math.round((p.z - g.minZ) / g.cell)))
});
const toWorld = (g, c) => ({ x: g.minX + c.x * g.cell, z: g.minZ + c.z * g.cell });
const isBlocked = (g, x, z) => x < 0 || z < 0 || x >= g.w || z >= g.h || g.blocked[z * g.w + x] === 1;

/** Nearest walkable cell to `c` (searching outward in rings). */
function nearestFree(g, c) {
  if (!isBlocked(g, c.x, c.z)) return c;
  for (let r = 1; r < Math.max(g.w, g.h); r++) {
    let best = null, bestD = Infinity;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = c.x + dx, z = c.z + dz;
      if (!isBlocked(g, x, z)) { const d = dx * dx + dz * dz; if (d < bestD) { bestD = d; best = { x, z }; } }
    }
    if (best) return best;
  }
  return null;
}

function lineClear(g, a, b) {
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.z - a.z)) * 2;
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    if (isBlocked(g, Math.round(a.x + (b.x - a.x) * t), Math.round(a.z + (b.z - a.z) * t))) return false;
  }
  return true;
}

/** Returns an array of world waypoints from `from` to `to`, or null if no route exists. */
export function findPath(g, from, to) {
  const s = nearestFree(g, toCell(g, from));
  const e = nearestFree(g, toCell(g, to));
  if (!s || !e) return null;
  const key = c => c.z * g.w + c.x;
  const open = [{ ...s, f: 0, g: 0 }];
  const came = new Map();
  const best = new Map([[key(s), 0]]);
  const h = c => { const dx = Math.abs(c.x - e.x), dz = Math.abs(c.z - e.z); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.x === e.x && cur.z === e.z) {
      const cells = [{ x: cur.x, z: cur.z }];
      let k = key(cur);
      while (came.has(k)) { const p = came.get(k); cells.push(p); k = key(p); }
      cells.reverse();
      // straighten
      const out = [cells[0]];
      let anchor = 0;
      for (let i = 2; i < cells.length; i++) {
        if (!lineClear(g, cells[anchor], cells[i])) { out.push(cells[i - 1]); anchor = i - 1; }
      }
      if (cells.length > 1) out.push(cells[cells.length - 1]);
      const world = out.map(c => toWorld(g, c));
      world.shift();                       // we are already standing at the start
      world.push({ x: to.x, z: to.z });    // finish exactly on the target
      return world;
    }
    for (const [dx, dz, cost] of DIRS) {
      const nx = cur.x + dx, nz = cur.z + dz;
      if (isBlocked(g, nx, nz)) continue;
      if (dx && dz && (isBlocked(g, cur.x + dx, cur.z) || isBlocked(g, cur.x, cur.z + dz))) continue;   // no cutting corners
      const ng = cur.g + cost, nk = nz * g.w + nx;
      if (ng >= (best.get(nk) ?? Infinity)) continue;
      best.set(nk, ng);
      came.set(nk, { x: cur.x, z: cur.z });
      open.push({ x: nx, z: nz, g: ng, f: ng + h({ x: nx, z: nz }) });
    }
  }
  return null;
}
