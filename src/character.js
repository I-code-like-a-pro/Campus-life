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
  const { shirt = 0x2f6fd0, skin = 0x7a4a2c, trousers = 0x222a35, hair = 0x1b1210, modelUrl = null, height = 3.2, lite = false } = opts;

  const group = new THREE.Group();          // position / rotation are driven from outside
  const rig = new THREE.Group();            // everything visual lives here so it can be swapped
  group.add(rig);

  const limb = (x, y, w, h, color) => {     // pivot at the joint, mesh hangs below it
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), lambert(color));
    m.position.y = -h / 2;
    pivot.add(m);
    rig.add(pivot);
    return pivot;
  };

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 0.6), lambert(shirt));
  torso.position.y = 1.9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, lite ? 8 : 16, lite ? 6 : 12), lambert(skin));
  head.position.y = 2.95;
  rig.add(torso, head);

  let armL = null, armR = null;
  if (!lite) {
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), lambert(hair));
    hairCap.position.y = 3.0;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.12), lambert(skin));
    nose.position.set(0, 2.92, 0.42);
    rig.add(hairCap, nose);
    armL = limb(-0.72, 2.45, 0.3, 1.05, skin);
    armR = limb(0.72, 2.45, 0.3, 1.05, skin);
    const sleeveL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.34), lambert(shirt)); sleeveL.position.y = -0.2; armL.add(sleeveL);
    const sleeveR = sleeveL.clone(); armR.add(sleeveR);
  }
  const legL = limb(-0.28, 1.3, 0.42, 1.3, trousers);
  const legR = limb(0.28, 1.3, 0.42, 1.3, trousers);

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
