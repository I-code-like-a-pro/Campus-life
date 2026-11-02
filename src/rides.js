import * as THREE from 'three';
import { createCharacter } from './character.js';
import { VEHICLES, buildVehicle, pathLength, turnToward, stepAlong, toWorld, planeAltitude } from './vehicles.js';

/*
 * Rides. A vehicle appears beside the player, the player climbs aboard, the vehicle drives the route (turning smoothly,
 * wheels spinning, camera following) and the player steps out at the end. Used for keke and okada trips on campus and for the
 * bus or plane to university.
 *
 *   start({ kind, path, dest, stay, wobble }) -> Promise  (resolves when the player is out of the vehicle, or at the end if `stay`)
 *   arrive({ kind, from, path, dest })        -> Promise  (the player is already aboard and rides in, then steps out)
 *
 * Whatever happens, the player always ends up at `dest` (Skip jumps straight there).
 */

const ease = k => k * k * (3 - 2 * k);
const BOARD_SECONDS = 0.7, ALIGHT_SECONDS = 0.8;

export function createRides({ scene, camera, player, sfx = () => {} }) {
  let active = null;
  const leaving = [];

  const skipBtn = document.createElement('button');
  skipBtn.id = 'skipride';
  skipBtn.type = 'button';
  skipBtn.textContent = '⏭ Skip ride';
  skipBtn.hidden = true;
  skipBtn.addEventListener('click', () => skip());
  document.body.appendChild(skipBtn);

  function seatWorld(r, local) {
    const o = toWorld(local, r.heading);
    return { x: r.pos.x + o.x, y: local.y + r.alt, z: r.pos.z + o.z };
  }

  function place(r) {
    const g = r.model.group;
    g.position.set(r.pos.x, r.alt + (r.bob || 0), r.pos.z);
    g.rotation.set(r.pitch || 0, r.heading, 0, 'YXZ');
  }

  function addDriver(r) {
    const d = r.model.driver;
    if (!d) return;
    const who = createCharacter({ lite: true, shirt: r.kind === 'okada' ? 0x16a085 : 0x2f6fd0, skin: 0x5a3a26 });
    who.group.position.set(d.x, d.y, d.z);
    r.model.group.add(who.group);
    r.driverChar = who;
  }

  function finish(r) {
    player.group.visible = true;
    skipBtn.hidden = true;
    active = null;
    // the vehicle drives off a little way, then disappears
    leaving.push({ r, t: 0 });
    r.resolve();
  }

  function launch(opts) {
    if (active) return Promise.resolve();
    const { kind, path, dest, stay = false, wobble = 0, from = null, arrival = false, plane = null } = opts;
    const spec = VEHICLES[kind];
    const model = buildVehicle(kind);
    scene.add(model.group);
    const startPos = from || { x: player.group.position.x, z: player.group.position.z };
    const first = path[0] || dest;
    const heading = Math.atan2(first.x - startPos.x, first.z - startPos.z);
    // beside the player (on the exit side), or exactly at the start of the route when riding in
    const side = arrival ? { x: 0, z: 0 } : toWorld({ x: model.exit, z: 0 }, heading);
    const r = {
      kind, spec, model, path, dest, stay, wobble, arrival, planeMode: plane,
      pos: { x: startPos.x + side.x, z: startPos.z + side.z }, heading, pitch: 0, alt: 0, bob: 0,
      i: 0, v: 0, t: 0, phase: arrival ? 'drive' : 'board', total: 0, travelled: 0,
      playerStart: { x: player.group.position.x, z: player.group.position.z }, seatShift: 0
    };
    r.total = Math.max(1, pathLength(r.pos, path));
    if (plane === 'landing') r.alt = planeAltitude(0, 'landing');
    place(r);
    if (!arrival) model.group.scale.setScalar(0.01);
    addDriver(r);
    if (spec.hidePlayer && arrival) player.group.visible = false;
    skipBtn.hidden = false;
    sfx('door');
    return new Promise(resolve => { r.resolve = resolve; active = r; });
  }

  function update(dt) {
    for (let k = leaving.length - 1; k >= 0; k--) {
      const l = leaving[k], r = l.r;
      l.t += dt;
      const sp = Math.min(r.spec.speed, l.t * 12);
      r.pos.x += Math.sin(r.heading) * sp * dt;
      r.pos.z += Math.cos(r.heading) * sp * dt;
      place(r);
      for (const w of r.model.wheels) w.mesh.rotation.x += sp * dt / w.r;
      if (l.t > 1.6) { scene.remove(r.model.group); leaving.splice(k, 1); }
      else if (l.t > 1.2) r.model.group.scale.setScalar(Math.max(0.01, (1.6 - l.t) / 0.4));
    }
    if (!active) return;
    const r = active;
    r.t += dt;

    if (r.phase === 'board') {
      const k = Math.min(1, r.t / BOARD_SECONDS);
      r.model.group.scale.setScalar(Math.min(1, 0.01 + r.t / 0.3));
      const seat = seatWorld(r, r.model.seat);
      const e = ease(k);
      player.group.position.set(r.playerStart.x + (seat.x - r.playerStart.x) * e, seat.y * e, r.playerStart.z + (seat.z - r.playerStart.z) * e);
      player.group.rotation.y = r.heading;
      if (k >= 1) {
        r.phase = 'drive'; r.t = 0;
        if (r.spec.hidePlayer) player.group.visible = false;
      }
    } else if (r.phase === 'drive') {
      const remaining = Math.max(0, r.total - r.travelled);
      const brake = Math.sqrt(2 * r.spec.accel * 1.4 * remaining) + 0.8;
      r.v = Math.min(r.spec.speed, r.v + r.spec.accel * dt, brake);
      const next = r.path[Math.min(r.i, r.path.length - 1)];
      const want = Math.atan2(next.x - r.pos.x, next.z - r.pos.z);
      r.heading = turnToward(r.heading, want, r.spec.turn * dt);
      const step = stepAlong(r.pos, r.path, r.i, r.v * dt);
      r.pos.x = step.x; r.pos.z = step.z; r.i = step.i;
      r.travelled += step.moved;
      const progress = Math.min(1, r.travelled / r.total);
      if (r.kind === 'plane') {
        const mode = r.planeMode || 'takeoff';
        const a0 = planeAltitude(progress, mode), a1 = planeAltitude(Math.min(1, progress + 0.02), mode);
        r.alt = a0;
        r.pitch = -Math.atan2(a1 - a0, r.total * 0.02) * 0.9;
      }
      r.bob = r.kind === 'plane' ? 0 : Math.sin(r.t * 14) * 0.05 * (r.v / r.spec.speed);
      if (r.wobble) { r.heading += Math.sin(r.t * 9) * r.wobble * dt; r.bob += Math.sin(r.t * 18) * 0.06; }
      for (const w of r.model.wheels) w.mesh.rotation.x += r.v * dt / w.r;
      place(r);
      const seat = seatWorld(r, r.model.seat);
      player.group.position.set(seat.x, seat.y, seat.z);
      player.group.rotation.y = r.heading;
      if (step.done) {
        if (r.stay) { r.phase = 'done'; r.resolve(); skipBtn.hidden = true; }
        else { r.phase = 'alight'; r.t = 0; r.alightFrom = { x: player.group.position.x, y: player.group.position.y, z: player.group.position.z }; player.group.visible = true; sfx('door'); }
      }
    } else if (r.phase === 'alight') {
      const k = Math.min(1, r.t / ALIGHT_SECONDS), e = ease(k);
      const a = r.alightFrom, d = r.dest;
      player.group.position.set(a.x + (d.x - a.x) * e, a.y * (1 - e), a.z + (d.z - a.z) * e);
      if (k >= 1) { player.group.position.set(d.x, 0, d.z); finish(r); }
    }

    // camera follows the vehicle from behind and above (a little further back for the big ones)
    const far = r.kind === 'bus' || r.kind === 'plane';
    const target = new THREE.Vector3(r.pos.x, (far ? 18 : 15) + r.alt * 0.4, r.pos.z + (far ? 24 : 17));
    camera.position.lerp(target, Math.min(1, dt * 4));
    camera.lookAt(r.pos.x, 1.5 + r.alt * 0.6, r.pos.z);
  }

  /** Jump straight to the end of the ride. */
  function skip() {
    const r = active;
    if (!r) return;
    if (r.stay) { r.phase = 'done'; skipBtn.hidden = true; r.resolve(); return; }
    scene.remove(r.model.group);
    player.group.position.set(r.dest.x, 0, r.dest.z);
    player.group.visible = true;
    skipBtn.hidden = true;
    active = null;
    r.resolve();
  }

  /** Removes the vehicle of a ride that stayed aboard (after the caller has finished with it). */
  function clear() {
    if (active && active.phase === 'done') { scene.remove(active.model.group); active = null; }
    player.group.visible = true;
  }

  return {
    start: opts => launch(opts),
    arrive: opts => launch({ ...opts, arrival: true }),
    update, skip, clear,
    get active() { return !!active; },
    /** Where the player will end up (used so a save made mid-ride never records a spot outside the campus). */
    restPos: () => (active ? { x: active.dest.x, z: active.dest.z } : null)
  };
}
