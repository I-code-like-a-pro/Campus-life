import * as THREE from 'three';
import { createCharacter } from './character.js';

/*
 * Football on the Sports Centre pitch.
 *  - A ball sits on the pitch all the time. Walk into it to dribble, hold the Kick button (or Space) to strike it.
 *  - At busy times (late afternoon, weekends) six students are playing 3 v 3. You can mess about with their ball,
 *    or join a timed scored match: you and two teammates (blue, attacking east) against three opponents (red).
 *  - When nobody is around it is just you and the ball.
 */

export const BALL_R = 0.45;
export const MATCH_SECONDS = 150;
export const KICK_MIN = 11, KICK_MAX = 24, KICK_REACH = 2.3;
const GOAL_HALF = 2.5;
const FRICTION = 1.7;
const TOUCH = 1.15;
const AI_SPEED = 5.2;

const hash01 = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Are students playing right now? Evenings on weekdays, most of the day at weekends, and the odd empty day. */
export function footballersPresent(day, hour) {
  const weekend = (day - 1) % 7 >= 5;
  const [from, to] = weekend ? [10, 19] : [16, 20];
  return hour >= from && hour < to && hash01(day) > 0.15;
}

/** Moves the ball one step: friction, bouncing off the pitch edge, and goals. Returns 'east' / 'west' when it crosses a goal line. */
export function stepBall(ball, dt, f) {
  const k = Math.exp(-FRICTION * dt);
  ball.vx *= k; ball.vz *= k;
  if (Math.hypot(ball.vx, ball.vz) < 0.05) ball.vx = ball.vz = 0;
  ball.x += ball.vx * dt; ball.z += ball.vz * dt;
  const inMouth = Math.abs(ball.z - f.z) < GOAL_HALF;
  const east = f.x + f.hw - 0.7, west = f.x - f.hw + 0.7;
  if (inMouth && ball.x > east) return 'east';
  if (inMouth && ball.x < west) return 'west';
  const maxX = f.x + f.hw - 0.4, minX = f.x - f.hw + 0.4, maxZ = f.z + f.hd - 0.4, minZ = f.z - f.hd + 0.4;
  if (ball.x > maxX) { ball.x = maxX; ball.vx = -Math.abs(ball.vx) * 0.55; }
  if (ball.x < minX) { ball.x = minX; ball.vx = Math.abs(ball.vx) * 0.55; }
  if (ball.z > maxZ) { ball.z = maxZ; ball.vz = -Math.abs(ball.vz) * 0.55; }
  if (ball.z < minZ) { ball.z = minZ; ball.vz = Math.abs(ball.vz) * 0.55; }
  return null;
}

/** A body (player or footballer) running into the ball pushes it along. (vx, vz) is the body's own velocity. */
export function touchBall(ball, body, vx, vz) {
  const dx = ball.x - body.x, dz = ball.z - body.z, d = Math.hypot(dx, dz);
  if (d >= TOUCH) return false;
  const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
  ball.x = body.x + nx * TOUCH; ball.z = body.z + nz * TOUCH;
  const speed = Math.hypot(vx, vz);
  if (speed > 0.8) {
    const push = Math.max(speed * 1.3, 4);
    const dirX = nx * 0.5 + vx / speed * 0.5, dirZ = nz * 0.5 + vz / speed * 0.5, dl = Math.hypot(dirX, dirZ) || 1;
    ball.vx = dirX / dl * push; ball.vz = dirZ / dl * push;
  } else {
    ball.vx += nx * 1.5; ball.vz += nz * 1.5;
  }
  return true;
}

export function createFootball({ scene, field, onGoal, onMatchEnd }) {
  const f = { x: field.x, z: field.z, hw: field.w / 2, hd: field.d / 2 };
  const ball = { x: f.x, z: f.z, vx: 0, vz: 0 };

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 14, 10), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  const patch = new THREE.Mesh(new THREE.IcosahedronGeometry(BALL_R * 1.02, 0), new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true }));
  patch.scale.setScalar(0.62);
  mesh.add(patch);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.09;
  scene.add(mesh, shadow);

  // three a side. Team 0 (blue) attacks east, team 1 (red) attacks west. Slot 0 is the one you take over in a match.
  const HOMES = [
    [0, -0.45, 0], [0, -0.15, 0.55], [0, -0.15, -0.55],
    [1, 0.45, 0], [1, 0.15, 0.55], [1, 0.15, -0.55]
  ];
  const players = HOMES.map(([team, hx, hz], i) => {
    const char = createCharacter({
      shirt: team === 0 ? 0x2f6fd0 : 0xd04a2f, trousers: team === 0 ? 0xf2f2f2 : 0x222222,
      skin: [0x7a4a2c, 0x5a3a26, 0x8d5a3a, 0x3b2418][i % 4], lite: true
    });
    char.group.visible = false;
    scene.add(char.group);
    const home = { x: f.x + hx * f.hw * 2, z: f.z + hz * f.hd * 2 };
    return { char, team, home, x: home.x, z: home.z, vx: 0, vz: 0, cd: 0, shown: false };
  });

  let present = false;
  const match = { active: false, time: 0, score: [0, 0], pause: 0, goals: 0 };

  function resetKickoff() {
    ball.x = f.x; ball.z = f.z; ball.vx = ball.vz = 0;
    for (const p of players) { p.x = p.home.x; p.z = p.home.z; p.vx = p.vz = 0; p.cd = 0.5; }
  }

  function aiStep(p, dt, chasing) {
    const target = chasing ? ball : { x: p.home.x + (ball.x - f.x) * 0.35, z: p.home.z + (ball.z - f.z) * 0.25 };
    const dx = target.x - p.x, dz = target.z - p.z, d = Math.hypot(dx, dz);
    const speed = chasing ? AI_SPEED : AI_SPEED * 0.6;
    if (d > 0.6) { p.vx = dx / d * speed; p.vz = dz / d * speed; } else { p.vx = p.vz = 0; }
    p.x += p.vx * dt; p.z += p.vz * dt;
    p.x = Math.max(f.x - f.hw + 1, Math.min(f.x + f.hw - 1, p.x));
    p.z = Math.max(f.z - f.hd + 1, Math.min(f.z + f.hd - 1, p.z));
    p.cd -= dt;
    if (chasing && Math.hypot(ball.x - p.x, ball.z - p.z) < TOUCH + 0.1 && p.cd <= 0) {
      const gx = f.x + (p.team === 0 ? f.hw : -f.hw), gz = f.z + (Math.random() - 0.5) * 3.5;
      const ax = gx - ball.x, az = gz - ball.z, al = Math.hypot(ax, az) || 1;
      const power = 9 + Math.random() * 6;
      ball.vx = ax / al * power; ball.vz = az / al * power;
      p.cd = 0.7;
    } else if (chasing) {
      touchBall(ball, p, p.vx, p.vz);
    }
  }

  function aiUpdate(dt) {
    const solo = match.active;
    for (const team of [0, 1]) {
      let chaser = null, best = Infinity;
      for (const p of players) {
        if (p.team !== team || (solo && p === players[0])) continue;
        const d = Math.hypot(ball.x - p.x, ball.z - p.z);
        if (d < best) { best = d; chaser = p; }
      }
      for (const p of players) {
        if (p.team !== team || (solo && p === players[0])) continue;
        aiStep(p, dt, p === chaser);
      }
    }
    for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {   // don't stack on each other
      const a = players[i], b = players[j];
      if (match.active && (a === players[0] || b === players[0])) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < 1.1 && d > 1e-4) { const push = (1.1 - d) / 2; a.x -= dx / d * push; a.z -= dz / d * push; b.x += dx / d * push; b.z += dz / d * push; }
    }
  }

  function endMatch(quit = false) {
    if (!match.active) return;
    match.active = false;
    onMatchEnd?.({ score: [...match.score], goals: match.goals, quit, mates: ['a', 'b'] });
  }

  /**
   * ctx: { day, hour, player: {x, z}, pvx, pvz, outdoors }
   * Returns the data the HUD needs.
   */
  function update(dt, ctx) {
    const near = Math.hypot(ctx.player.x - f.x, ctx.player.z - f.z) < 90;
    const wasPresent = present;
    present = ctx.outdoors !== false && footballersPresent(ctx.day, ctx.hour);
    if (!ctx.outdoors && match.active) endMatch(true);
    if (present && !wasPresent) resetKickoff();
    if (!present && match.active) endMatch(true);

    const onPitch = Math.abs(ctx.player.x - f.x) < f.hw + 2 && Math.abs(ctx.player.z - f.z) < f.hd + 2;
    if (match.active && !(Math.abs(ctx.player.x - f.x) < f.hw + 8 && Math.abs(ctx.player.z - f.z) < f.hd + 8)) endMatch(true);

    if (near) {
      let scored = null;
      if (match.pause > 0) match.pause -= dt;
      else {
        if (onPitch && ctx.outdoors !== false) touchBall(ball, ctx.player, ctx.pvx, ctx.pvz);
        if (present) aiUpdate(dt);
        scored = stepBall(ball, dt, f);
      }
      if (scored) {
        const team = scored === 'east' ? 0 : 1;      // team 0 scores in the east goal
        if (match.active) { match.score[team] += 1; if (team === 0) match.goals += 1; }
        onGoal?.({ team, byPlayerTeam: team === 0, inMatch: match.active });
        resetKickoff();
        match.pause = 1.4;
      }
      if (match.active) {
        match.time -= dt;
        if (match.time <= 0) endMatch(false);
      }
    }

    // visuals
    mesh.position.set(ball.x, BALL_R, ball.z);
    const sp = Math.hypot(ball.vx, ball.vz);
    if (sp > 0.1) { mesh.rotation.x += ball.vz * dt * 2; mesh.rotation.z -= ball.vx * dt * 2; }
    shadow.position.set(ball.x, 0.09, ball.z);
    mesh.visible = shadow.visible = near;
    players.forEach((p, i) => {
      const show = present && near && !(match.active && i === 0);
      p.char.group.visible = show;
      if (!show) return;
      p.char.group.position.set(p.x, 0, p.z);
      if (Math.hypot(p.vx, p.vz) > 0.3) p.char.group.rotation.y = Math.atan2(p.vx, p.vz);
      p.char.update(dt, Math.hypot(p.vx, p.vz) > 0.3 ? 0.9 : 0);
    });

    return hud(onPitch);
  }

  function hud(onPitch) {
    return { present, active: match.active, score: match.score, timeLeft: Math.max(0, match.time), onPitch, cheer: match.pause > 0 };
  }

  /** Strike the ball in the direction you face, if it is within reach. `charge` is 0..1. */
  function kick(player, facing, charge = 0.5) {
    if (Math.hypot(ball.x - player.x, ball.z - player.z) > KICK_REACH) return false;
    const power = KICK_MIN + (KICK_MAX - KICK_MIN) * Math.max(0, Math.min(1, charge));
    ball.vx = Math.sin(facing) * power; ball.vz = Math.cos(facing) * power;
    return true;
  }

  function startMatch() {
    if (!present || match.active) return false;
    match.active = true; match.time = MATCH_SECONDS; match.score = [0, 0]; match.goals = 0; match.pause = 1;
    resetKickoff();
    return true;
  }

  return { update, kick, startMatch, endMatch, ball, field: f, get present() { return present; }, get active() { return match.active; } };
}
