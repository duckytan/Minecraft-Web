import * as THREE from 'three';

export const SKY_COLOR = 0x87ceeb;

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(30, 50, -20);
  directionalLight.castShadow = true;

  scene.add(ambientLight);
  scene.add(directionalLight);

  return scene;
}
