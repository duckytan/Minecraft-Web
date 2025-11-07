import * as THREE from 'three';
import { Chunk, CHUNK_SIZE } from './chunk';
import { BlockType } from './block';

/**
 * ChunkManager 类 - 管理所有 Chunk 的生命周期
 */
export class ChunkManager {
  private readonly scene: THREE.Scene;
  private readonly chunks: Map<string, Chunk> = new Map();
  private readonly renderDistance: number;

  constructor(scene: THREE.Scene, renderDistance: number = 4) {
    this.scene = scene;
    this.renderDistance = renderDistance;
  }

  /**
   * 获取或创建 Chunk
   */
  public getOrCreateChunk(chunkX: number, chunkZ: number): Chunk {
    const key = Chunk.getChunkKey(chunkX, chunkZ);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      chunk = new Chunk(chunkX, chunkZ, this.scene);
      this.chunks.set(key, chunk);
    }

    return chunk;
  }

  /**
   * 获取 Chunk（不创建）
   */
  public getChunk(chunkX: number, chunkZ: number): Chunk | null {
    const key = Chunk.getChunkKey(chunkX, chunkZ);
    return this.chunks.get(key) || null;
  }

  /**
   * 移除 Chunk
   */
  public removeChunk(chunkX: number, chunkZ: number): void {
    const key = Chunk.getChunkKey(chunkX, chunkZ);
    const chunk = this.chunks.get(key);

    if (chunk) {
      chunk.unload();
      this.chunks.delete(key);
    }
  }

  /**
   * 根据玩家位置更新 Chunk
   */
  public updateChunks(playerPosition: THREE.Vector3): void {
    const playerChunkX = Math.floor(playerPosition.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPosition.z / CHUNK_SIZE);

    // 加载玩家周围的 Chunk
    const chunksToLoad: { x: number; z: number }[] = [];
    for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
      for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
        const chunkX = playerChunkX + x;
        const chunkZ = playerChunkZ + z;
        chunksToLoad.push({ x: chunkX, z: chunkZ });
      }
    }

    // 加载新 Chunk
    for (const { x, z } of chunksToLoad) {
      const chunk = this.getOrCreateChunk(x, z);
      if (!chunk.isLoaded()) {
        chunk.generateMesh();
      }
    }

    // 卸载远离的 Chunk
    const chunksToRemove: string[] = [];
    for (const [key, chunk] of this.chunks.entries()) {
      const dx = Math.abs(chunk.chunkX - playerChunkX);
      const dz = Math.abs(chunk.chunkZ - playerChunkZ);
      if (dx > this.renderDistance + 1 || dz > this.renderDistance + 1) {
        chunksToRemove.push(key);
      }
    }

    for (const key of chunksToRemove) {
      const [x, z] = key.split(',').map(Number);
      this.removeChunk(x, z);
    }
  }

  /**
   * 设置世界坐标处的方块
   */
  public setBlock(worldX: number, worldY: number, worldZ: number, blockType: BlockType): void {
    const coords = Chunk.worldToChunkCoords(worldX, worldZ);
    const chunk = this.getOrCreateChunk(coords.chunkX, coords.chunkZ);

    chunk.setBlock(coords.localX, worldY, coords.localZ, blockType);

    // 重新生成网格
    chunk.generateMesh();
  }

  /**
   * 获取世界坐标处的方块
   */
  public getBlock(worldX: number, worldY: number, worldZ: number): BlockType {
    const coords = Chunk.worldToChunkCoords(worldX, worldZ);
    const chunk = this.getChunk(coords.chunkX, coords.chunkZ);

    if (!chunk) {
      return BlockType.AIR;
    }

    return chunk.getBlock(coords.localX, worldY, coords.localZ);
  }

  /**
   * 获取所有已加载的 Chunk 网格（用于碰撞检测）
   */
  public getAllMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const chunk of this.chunks.values()) {
      const mesh = chunk.getMesh();
      if (mesh) {
        meshes.push(mesh);
      }
    }
    return meshes;
  }

  /**
   * 生成平坦地形
   */
  public generateFlatTerrain(centerChunkX: number, centerChunkZ: number, radius: number): void {
    for (let cx = centerChunkX - radius; cx <= centerChunkX + radius; cx++) {
      for (let cz = centerChunkZ - radius; cz <= centerChunkZ + radius; cz++) {
        const chunk = this.getOrCreateChunk(cx, cz);

        // 生成三层地形：草地、泥土、石头
        for (let x = 0; x < CHUNK_SIZE; x++) {
          for (let z = 0; z < CHUNK_SIZE; z++) {
            chunk.setBlock(x, 0, z, BlockType.STONE); // 底层石头
            chunk.setBlock(x, 1, z, BlockType.DIRT); // 中层泥土
            chunk.setBlock(x, 2, z, BlockType.GRASS); // 顶层草地
          }
        }

        chunk.generateMesh();
      }
    }
  }

  /**
   * 清除所有 Chunk
   */
  public clearAll(): void {
    for (const chunk of this.chunks.values()) {
      chunk.unload();
    }
    this.chunks.clear();
  }

  /**
   * 获取已加载的 Chunk 数量
   */
  public getLoadedChunkCount(): number {
    return this.chunks.size;
  }
}
