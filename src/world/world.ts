import * as THREE from 'three';
import { BlockType } from './block';
import { Chunk } from './chunk';
import { ChunkManager } from './chunkManager';

export class World {
  private readonly scene: THREE.Scene;

  private readonly chunkManager: ChunkManager;

  constructor(scene: THREE.Scene, chunkManager?: ChunkManager) {
    this.scene = scene;
    this.chunkManager = chunkManager ?? new ChunkManager(scene);
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getChunkManager(): ChunkManager {
    return this.chunkManager;
  }

  setBlock(x: number, y: number, z: number, blockType: BlockType): THREE.Mesh | null {
    this.chunkManager.setBlock(x, y, z, blockType);
    const { chunkX, chunkZ } = Chunk.worldToChunkCoords(x, z);
    return this.chunkManager.getChunk(chunkX, chunkZ)?.getMesh() ?? null;
  }

  removeBlock(x: number, y: number, z: number): null {
    this.chunkManager.setBlock(x, y, z, BlockType.AIR);
    return null;
  }

  getBlock(x: number, y: number, z: number): BlockType {
    return this.chunkManager.getBlock(x, y, z);
  }

  getAllBlocks(): THREE.Mesh[] {
    return this.chunkManager.getAllMeshes();
  }

  clearAll(): void {
    this.chunkManager.clearAll();
  }

  importTerrain(terrainGroup: THREE.Group): void {
    terrainGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const position = child.position.clone();
        const blockPos = new THREE.Vector3(
          Math.round(position.x),
          Math.round(position.y),
          Math.round(position.z)
        );
        this.setBlock(blockPos.x, blockPos.y, blockPos.z, BlockType.GRASS);
      }
    });
  }
}
