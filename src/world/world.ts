import * as THREE from 'three';
import { BlockType, BLOCK_COLORS, BLOCK_SIZE } from './block';

export class World {
  private readonly scene: THREE.Scene;

  private readonly blocks: Map<string, THREE.Mesh> = new Map();

  private readonly geometry: THREE.BoxGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    this.geometry.computeBoundingBox();
  }

  private getBlockKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  setBlock(x: number, y: number, z: number, blockType: BlockType): THREE.Mesh | null {
    if (blockType === BlockType.AIR) {
      return this.removeBlock(x, y, z);
    }

    const key = this.getBlockKey(x, y, z);

    if (this.blocks.has(key)) {
      return null;
    }

    const material = new THREE.MeshLambertMaterial({
      color: BLOCK_COLORS[blockType]
    });

    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.scene.add(mesh);
    this.blocks.set(key, mesh);

    return mesh;
  }

  removeBlock(x: number, y: number, z: number): null {
    const key = this.getBlockKey(x, y, z);
    const block = this.blocks.get(key);

    if (block) {
      this.scene.remove(block);
      this.blocks.delete(key);
    }

    return null;
  }

  getBlock(x: number, y: number, z: number): THREE.Mesh | null {
    const key = this.getBlockKey(x, y, z);
    return this.blocks.get(key) || null;
  }

  getAllBlocks(): THREE.Mesh[] {
    return Array.from(this.blocks.values());
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  clearAll(): void {
    for (const block of this.blocks.values()) {
      this.scene.remove(block);
    }
    this.blocks.clear();
  }

  importTerrain(terrainGroup: THREE.Group): void {
    terrainGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const x = Math.round(child.position.x);
        const y = Math.round(child.position.y);
        const z = Math.round(child.position.z);

        const key = this.getBlockKey(x, y, z);
        this.blocks.set(key, child);
      }
    });
  }
}
