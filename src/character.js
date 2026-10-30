import * as THREE from 'three';

const lambert = c => new THREE.MeshLambertMaterial({ color: c });

/**
 * A character: returns { group, update(dt, walking) }.
 *
 * The built-in look is a simple blocky human (head, hair, torso, swinging arms and legs) so there is
 * something human-shaped on screen. When real art arrives, pass `modelUrl` (a .glb in /public/assets/models)
 * and the placeholder is swapped for the model once it loads. If the model has animations named
 * "Idle" / "Walk" they are played automatically.
 *
 * `lite: true` builds a cheaper 4-mesh version for ambient crowds (keeps draw calls low on phones).
 */
export function createCharacter(opts = {}) {
  const { shirt = 0x2f6fd0, skin = 0x7a4a2c, trousers = 0x222a35, hair = 0x1b1210, modelUrl = null, height = 3.2, lite = false,
    female = false, hairStyle = female ? 'long' : 'short', shoes = 0xf2f2f2 } = opts;

  const group = new THREE.Group();          // position / rotation are driven from outside
  const rig = new THREE.Group();            // everything visual lives here so it can be swapped
  group.add(rig);

  const put = (geo, color, x, y, z, parent = rig) => {
    const m = new THREE.Mesh(geo, lambert(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const seg = lite ? 8 : 14;
  // Figure about 7.5 heads tall: total 3.4 units before scaling to `height`.
  const sh = female ? 0.46 : 0.54;                       // half shoulder width

  // torso: chest, then a slimmer waist, then hips
  put(new THREE.BoxGeometry(sh * 2, 0.62, 0.44), shirt, 0, 2.38, 0);
  if (!lite) {
    put(new THREE.BoxGeometry(sh * 2 - 0.16, 0.42, 0.4), shirt, 0, 1.95, 0);
    put(new THREE.BoxGeometry(sh * 2 - 0.1 + (female ? 0.08 : 0), 0.3, 0.42), trousers, 0, 1.68, 0);
    put(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 8), skin, 0, 2.78, 0);            // neck
  }

  // head
  const head = put(new THREE.SphereGeometry(0.27, seg, Math.max(6, seg - 2)), skin, 0, 3.04, 0);
  head.scale.set(0.92, 1.08, 0.98);
  if (!lite) {
    put(new THREE.BoxGeometry(0.06, 0.05, 0.05), 0x14100e, -0.1, 3.08, 0.25);        // eyes
    put(new THREE.BoxGeometry(0.06, 0.05, 0.05), 0x14100e, 0.1, 3.08, 0.25);
    put(new THREE.BoxGeometry(0.07, 0.1, 0.08), skin, 0, 3.0, 0.27);                  // nose
    put(new THREE.BoxGeometry(0.06, 0.1, 0.07), skin, -0.25, 3.02, 0);                // ears
    put(new THREE.BoxGeometry(0.06, 0.1, 0.07), skin, 0.25, 3.02, 0);
  }
  // hair
  const HAIR = {
    short: () => put(new THREE.SphereGeometry(0.29, seg, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 3.08, -0.01),
    afro: () => put(new THREE.SphereGeometry(0.36, seg, 10), hair, 0, 3.12, -0.04),
    long: () => {
      const cap = put(new THREE.SphereGeometry(0.29, seg, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 3.08, -0.01);
      if (!lite) put(new THREE.BoxGeometry(0.5, 0.7, 0.16), hair, 0, 2.78, -0.2);
      return cap;
    },
    bald: () => null
  };
  (HAIR[hairStyle] || HAIR.short)();

  // arms: sleeve + forearm + hand hang from the shoulder pivot
  const arm = side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (sh + 0.1), 2.6, 0);
    put(new THREE.CylinderGeometry(0.11, 0.1, 0.5, 8), shirt, 0, -0.25, 0, pivot);
    if (!lite) {
      put(new THREE.CylinderGeometry(0.085, 0.07, 0.5, 8), skin, 0, -0.72, 0, pivot);
      put(new THREE.SphereGeometry(0.08, 8, 6), skin, 0, -1.0, 0, pivot);
    } else {
      put(new THREE.CylinderGeometry(0.085, 0.07, 0.5, 6), skin, 0, -0.72, 0, pivot);
    }
    rig.add(pivot);
    return pivot;
  };
  const armL = lite ? null : arm(-1), armR = lite ? null : arm(1);

  // legs: trousers, then shoes
  const leg = side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.2, 1.62, 0);
    put(new THREE.CylinderGeometry(0.16, 0.115, 1.48, lite ? 6 : 8), trousers, 0, -0.74, 0, pivot);
    put(new THREE.BoxGeometry(0.27, 0.14, 0.46), shoes, 0, -1.55, 0.08, pivot);
    rig.add(pivot);
    return pivot;
  };
  const legL = leg(-1), legR = leg(1);

  rig.scale.setScalar(height / 3.4);

  let phase = 0, mixer = null, actions = null;

  if (modelUrl) loadModel(modelUrl);

  async function loadModel(url) {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(url);
      const model = gltf.scene;
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      model.scale.setScalar(height / (size.y || 1));
      rig.clear();
      rig.scale.setScalar(1);
      rig.add(model);
      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        const find = n => gltf.animations.find(a => a.name.toLowerCase().includes(n));
        const idle = find('idle'), walk = find('walk');
        actions = { idle: idle && mixer.clipAction(idle), walk: walk && mixer.clipAction(walk) };
        (actions.idle || actions.walk)?.play();
      }
    } catch (err) {
      console.warn('Could not load character model, keeping the placeholder:', url, err);
    }
  }

  function update(dt, walking) {
    if (mixer) {
      if (actions.walk && actions.idle) {
        const w = walking > 0.08;
        actions.walk.setEffectiveWeight(w ? 1 : 0); actions.idle.setEffectiveWeight(w ? 0 : 1);
        actions.walk.play(); actions.idle.play();
      }
      mixer.update(dt);
      return;
    }
    const moving = walking > 0.08;
    phase += dt * 11 * (moving ? Math.max(0.5, walking) : 0);
    const swing = moving ? Math.sin(phase) * 0.8 : 0;
    legL.rotation.x = swing; legR.rotation.x = -swing;
    if (armL) { armL.rotation.x = -swing * 0.9; armR.rotation.x = swing * 0.9; }
    rig.position.y = moving ? Math.abs(Math.sin(phase)) * 0.12 : 0;
  }

  return { group, update };
}

/**
 * Draws a translucent outline of the character wherever something is in front of it (a building, a wall, a tree), so the
 * player never "disappears" behind scenery. It only appears where the real body is hidden (depth test is inverted).
 */
export function addXray(group, color = 0x8fd0ff) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthFunc: THREE.GreaterDepth, depthWrite: false });
  const meshes = [];
  group.traverse(o => { if (o.isMesh && !o.userData.xray) meshes.push(o); });
  for (const m of meshes) {
    const ghost = new THREE.Mesh(m.geometry, mat);
    ghost.userData.xray = true;
    ghost.renderOrder = 10;
    m.add(ghost);                 // a child of the part, so it follows every animated limb
  }
}
