import * as THREE from 'three';

// three.js r155+ dropped the legacy light scaling, so light intensities are multiplied by this
// to keep the look the same as the original prototype.
export const LIGHT_SCALE = Math.PI;

export function createEngine() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8fd3ff, 45, 120);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  const ambient = new THREE.AmbientLight(0xffffff, 0.7 * LIGHT_SCALE);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9 * LIGHT_SCALE);
  sun.position.set(30, 50, 20);
  scene.add(ambient, sun);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 66 : 55;   // wider view in portrait (phones)
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, ambient, sun };
}
