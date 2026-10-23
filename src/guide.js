import * as THREE from 'three';

const $ = id => document.getElementById(id);

/**
 * A waypoint: a glowing pillar over the target in the world, and a HUD arrow + distance that points to it.
 * `set({ x, z, label })` starts guiding, `clear()` stops. `update()` returns true on the frame you arrive.
 */
export function createGuide(scene) {
  const pill = $('guide'), arrow = $('garrow'), text = $('gtext');
  let target = null;

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 34, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
  );
  beacon.visible = false;
  scene.add(beacon);

  function set(t) {
    target = t;
    beacon.position.set(t.x, 17, t.z);
    beacon.visible = true;
  }
  function clear() {
    target = null;
    beacon.visible = false;
    pill.hidden = true;
  }

  function update(playerPos, indoors) {
    if (!target) return false;
    if (indoors) { pill.hidden = true; beacon.visible = false; return false; }
    const dx = target.x - playerPos.x, dz = target.z - playerPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 4.5) { clear(); return true; }
    beacon.visible = true;
    pill.hidden = false;
    // the camera looks "up" the screen toward -z, so a target at -z is straight ahead
    arrow.style.transform = `rotate(${Math.atan2(dx, -dz) * 180 / Math.PI}deg)`;
    text.textContent = `${target.label} · ${Math.round(dist)} m`;
    return false;
  }

  return { set, clear, update, get target() { return target; } };
}

/** Human words for where `to` is, seen from `from` (north is up the screen). */
export function describeWay(from, to) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const dist = Math.round(Math.hypot(dx, dz));
  const names = ['up the screen (north)', 'up and to the right (north-east)', 'to the right (east)', 'down and to the right (south-east)',
    'down the screen (south)', 'down and to the left (south-west)', 'to the left (west)', 'up and to the left (north-west)'];
  const angle = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
  return { dist, dir: names[Math.round(angle / 45) % 8] };
}
