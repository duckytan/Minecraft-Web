import * as THREE from 'three';
import { Chunk } from './chunk';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './chunkConstants';
import { BlockType } from './block';
import type { TerrainConfig, TerrainData } from './terrainTypes';
import {
  AdvancedTerrainGenerator,
  DEFAULT_TERRAIN_CONFIG,
  type AdvancedTerrainConfig
} from './advancedTerrain';
import {
  PerlinTerrainGenerator,
  DEFAULT_PERLIN_CONFIG,
  type PerlinTerrainConfig
} from './perlinTerrainGenerator';
import { ChunkLoadQueue } from './chunkLoadQueue';
import { DEFAULT_RENDER_DISTANCE_PC, MAX_CHUNKS_LOAD_PER_FRAME } from '../core/constants';

export interface BlockChange {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

type TerrainAlgorithm = 'simplex' | 'perlin';
type TerrainConfigUpdate = Partial<AdvancedTerrainConfig & PerlinTerrainConfig>;

/**
 * ChunkManager 类 - 管理所有 Chunk 的生命周期
 */
export class ChunkManager {
  private readonly scene: THREE.Scene;
  private readonly chunks: Map<string, Chunk> = new Map();
  private readonly renderDistance: number;
  private readonly advancedTerrain: AdvancedTerrainGenerator;
  private terrainWorker: Worker | null = null;
  private pendingChunks: Map<string, Array<{ resolve: (data: TerrainData) => void; reject: (error: Error) => void }>> =
    new Map();
  private readonly loadingChunks: Set<string> = new Set();
  private readonly loadQueue: ChunkLoadQueue;
  private lastPlayerDirection = new THREE.Vector3(0, 0, -1);

  constructor(scene: THREE.Scene, renderDistance: number = DEFAULT_RENDER_DISTANCE_PC) {
    this.scene = scene;
    this.renderDistance = renderDistance;
    this.advancedTerrain = new AdvancedTerrainGenerator(DEFAULT_TERRAIN_CONFIG);
    this.loadQueue = new ChunkLoadQueue(MAX_CHUNKS_LOAD_PER_FRAME);
  }

  /**
   * 获取或创建 Chunk
   */
  public getOrCreateChunk(chunkX: number, chunkZ: number): Chunk {
    const key = Chunk.getChunkKey(chunkX, chunkZ);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      chunk = new Chunk(chunkX, chunkZ, this.scene, (worldX, worldY, worldZ) =>
        this.getBlock(worldX, worldY, worldZ)
      );
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
   * 根据玩家位置更新 Chunk（使用加载队列和优先级）
   */
  public updateChunks(playerPosition: THREE.Vector3, playerDirection?: THREE.Vector3): void {
    if (playerDirection) {
      this.lastPlayerDirection.copy(playerDirection);
    }

    const playerChunkX = Math.floor(playerPosition.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPosition.z / CHUNK_SIZE);

    // 将需要加载的 chunk 添加到队列
    for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
      for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
        const chunkX = playerChunkX + x;
        const chunkZ = playerChunkZ + z;
        const chunk = this.getChunk(chunkX, chunkZ);

        // 只将未加载且未在加载中的 chunk 加入队列
        if (!chunk || !chunk.isLoaded()) {
          const key = Chunk.getChunkKey(chunkX, chunkZ);
          if (!this.loadingChunks.has(key)) {
            this.loadQueue.enqueue(chunkX, chunkZ, playerPosition, this.lastPlayerDirection);
          }
        }
      }
    }

    // 每帧加载一批 chunk（限流）
    const batch = this.loadQueue.getNextBatch();
    for (const task of batch) {
      this.getOrCreateChunk(task.chunkX, task.chunkZ);
      this.loadChunkTerrain(task.chunkX, task.chunkZ)
        .then(() => {
          this.loadQueue.markLoaded(task.chunkX, task.chunkZ);
        })
        .catch((error) => {
          console.error(`Failed to load chunk (${task.chunkX}, ${task.chunkZ})`, error);
          this.loadQueue.markLoaded(task.chunkX, task.chunkZ);
        });
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

    const changed = chunk.setBlock(coords.localX, worldY, coords.localZ, blockType);

    if (changed) {
      chunk.generateMesh();

      const neighborKeys = new Set<string>();
      this.collectBoundaryNeighborKeys(coords.chunkX, coords.chunkZ, coords.localX, coords.localZ, neighborKeys);
      this.regenerateNeighborChunks(neighborKeys);
    }
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
   * 收集边界方块相邻的 Chunk 键
   */
  private collectBoundaryNeighborKeys(
    chunkX: number,
    chunkZ: number,
    localX: number,
    localZ: number,
    neighborKeys: Set<string>
  ): void {
    if (localX === 0) {
      neighborKeys.add(Chunk.getChunkKey(chunkX - 1, chunkZ));
    }
    if (localX === CHUNK_SIZE - 1) {
      neighborKeys.add(Chunk.getChunkKey(chunkX + 1, chunkZ));
    }
    if (localZ === 0) {
      neighborKeys.add(Chunk.getChunkKey(chunkX, chunkZ - 1));
    }
    if (localZ === CHUNK_SIZE - 1) {
      neighborKeys.add(Chunk.getChunkKey(chunkX, chunkZ + 1));
    }
  }

  /**
   * 重新生成相邻 Chunk 的网格
   */
  private regenerateNeighborChunks(neighborKeys: Set<string>): void {
    for (const key of neighborKeys) {
      const [nx, nz] = key.split(',').map(Number);
      const neighborChunk = this.getChunk(nx, nz);
      if (neighborChunk && neighborChunk.isLoaded()) {
        neighborChunk.generateMesh();
      }
    }
  }

  /**
   * 批量应用方块变化（用于方块物理系统）
   * 优化性能：按 chunk 分组，每个 chunk 只重新生成一次网格
   */
  public applyBlockChanges(changes: BlockChange[]): void {
    if (changes.length === 0) {
      return;
    }

    const affectedChunks = new Set<string>();
    const neighborChunks = new Set<string>();

    for (const change of changes) {
      const coords = Chunk.worldToChunkCoords(change.x, change.z);
      const chunk = this.getChunk(coords.chunkX, coords.chunkZ);

      if (!chunk) {
        continue;
      }

      chunk.setBlock(coords.localX, change.y, coords.localZ, change.type);
      affectedChunks.add(chunk.getKey());
      this.collectBoundaryNeighborKeys(coords.chunkX, coords.chunkZ, coords.localX, coords.localZ, neighborChunks);
    }

    for (const chunkKey of affectedChunks) {
      const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
      const chunk = this.getChunk(chunkX, chunkZ);
      if (chunk) {
        chunk.generateMesh();
      }
    }

    this.regenerateNeighborChunks(neighborChunks);
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
   * 生成平坦地形（向后兼容）
   */
  public generateFlatTerrain(centerChunkX: number, centerChunkZ: number, radius: number): void {
    for (let cx = centerChunkX - radius; cx <= centerChunkX + radius; cx++) {
      for (let cz = centerChunkZ - radius; cz <= centerChunkZ + radius; cz++) {
        const chunk = this.getOrCreateChunk(cx, cz);

        // 生成三层地形：草地、泥土、石头
        for (let x = 0; x < CHUNK_SIZE; x++) {
          for (let z = 0; z < CHUNK_SIZE; z++) {
            chunk.setBlock(x, 0, z, BlockType.BEDROCK); // 底层基岩
            chunk.setBlock(x, 1, z, BlockType.STONE); // 次层石头
            chunk.setBlock(x, 2, z, BlockType.DIRT); // 中层泥土
            chunk.setBlock(x, 3, z, BlockType.GRASS); // 顶层草地
          }
        }

        chunk.generateMesh();
      }
    }
  }

  /**
   * 使用高级地形生成器创建地形（同步）
   * 支持山峰、山谷、湖泊和树木
   * @param centerChunkX 中心 Chunk X 坐标
   * @param centerChunkZ 中心 Chunk Z 坐标
   * @param radius 生成半径（单位：Chunk）
   * @param config 可选的地形配置覆盖
   */
  public generateTerrain(
    centerChunkX: number,
    centerChunkZ: number,
    radius: number,
    config?: Partial<AdvancedTerrainConfig>
  ): void {
    if (config) {
      this.advancedTerrain.updateConfig(config);
    }

    for (let cx = centerChunkX - radius; cx <= centerChunkX + radius; cx++) {
      for (let cz = centerChunkZ - radius; cz <= centerChunkZ + radius; cz++) {
        this.loadChunkTerrainSync(cx, cz);
      }
    }
  }

  /**
   * 初始化 Web Worker（需要手动调用）
   */
  public initWorker(): void {
    if (this.terrainWorker) {
      return;
    }

    try {
      this.terrainWorker = new Worker(new URL('../workers/terrain.worker.ts', import.meta.url), {
        type: 'module'
      });

      this.terrainWorker.onmessage = (e: MessageEvent<TerrainData>) => {
        const data = e.data;
        const key = Chunk.getChunkKey(data.chunkX, data.chunkZ);
        const pendings = this.pendingChunks.get(key);

        if (pendings && pendings.length > 0) {
          // 通知所有等待该 Chunk 的 Promise
          for (const pending of pendings) {
            pending.resolve(data);
          }
          this.pendingChunks.delete(key);
          this.loadingChunks.delete(key);
        }
      };

      this.terrainWorker.onerror = (error) => {
        console.error('Terrain worker error:', error);
        for (const [key, pendings] of this.pendingChunks.entries()) {
          for (const pending of pendings) {
            pending.reject(new Error('Worker error'));
          }
          this.loadingChunks.delete(key);
        }
        this.pendingChunks.clear();
      };

      console.log('✅ Terrain Worker 已初始化');
    } catch (error) {
      console.warn('⚠️ Worker 初始化失败，将使用同步生成:', error);
    }
  }

  /**
   * 加载单个 Chunk 的地形（使用 Worker 或回退到同步）
   */
  private async loadChunkTerrain(chunkX: number, chunkZ: number): Promise<void> {
    if (this.terrainWorker) {
      try {
        const data = await this.generateChunkTerrainAsync(chunkX, chunkZ);
        const chunk = this.getOrCreateChunk(data.chunkX, data.chunkZ);
        const blocks = new Uint8Array(data.blocks);
        chunk.applyBlocksData(blocks);
        chunk.generateMesh();
      } catch (error) {
        console.error(`Worker failed for chunk (${chunkX}, ${chunkZ}), using sync fallback:`, error);
        this.loadChunkTerrainSync(chunkX, chunkZ);
      }
    } else {
      this.loadChunkTerrainSync(chunkX, chunkZ);
    }
  }

  /**
   * 同步加载单个 Chunk 的地形
   */
  private loadChunkTerrainSync(chunkX: number, chunkZ: number): void {
    const chunk = this.getOrCreateChunk(chunkX, chunkZ);
    const blocks = this.advancedTerrain.generateChunkTerrain(chunkX, chunkZ);

    chunk.applyBlocksData(blocks);
    chunk.generateMesh();
  }

  /**
   * 使用 Web Worker 异步生成单个 Chunk 的地形
   */
  private async generateChunkTerrainAsync(chunkX: number, chunkZ: number): Promise<TerrainData> {
    const key = Chunk.getChunkKey(chunkX, chunkZ);

    // 如果已经在加载中，等待现有的 Promise
    if (this.loadingChunks.has(key)) {
      return new Promise((resolve, reject) => {
        const pendings = this.pendingChunks.get(key);
        if (pendings) {
          pendings.push({ resolve, reject });
        } else {
          this.pendingChunks.set(key, [{ resolve, reject }]);
        }
      });
    }

    this.loadingChunks.add(key);

    return new Promise((resolve, reject) => {
      if (!this.terrainWorker) {
        this.loadingChunks.delete(key);
        reject(new Error('Worker not initialized'));
        return;
      }

      this.pendingChunks.set(key, [{ resolve, reject }]);

      const config: TerrainConfig = {
        chunkX,
        chunkZ,
        chunkSize: CHUNK_SIZE,
        chunkHeight: CHUNK_HEIGHT,
        terrainConfig: this.advancedTerrain.getConfig()
      };

      this.terrainWorker.postMessage(config);
    });
  }

  /**
   * 异步生成地形（使用 Web Worker）
   * @param centerChunkX 中心 Chunk X 坐标
   * @param centerChunkZ 中心 Chunk Z 坐标
   * @param radius 生成半径（单位：Chunk）
   * @param scale 噪声缩放（越小越平滑，推荐 0.05-0.1）
   * @param heightMultiplier 高度乘数（影响地形起伏，推荐 8-16）
   * @param baseHeight 基础高度（地形最低点，推荐 10-20）
   */
  public async generateTerrainAsync(
    centerChunkX: number,
    centerChunkZ: number,
    radius: number,
    config?: Partial<AdvancedTerrainConfig>
  ): Promise<void> {
    if (config) {
      this.advancedTerrain.updateConfig(config);
    }

    // 确保 Worker 已初始化
    if (!this.terrainWorker) {
      console.warn('Worker not initialized, falling back to sync generation');
      this.generateTerrain(centerChunkX, centerChunkZ, radius, config);
      return;
    }

    const promises: Promise<void>[] = [];

    for (let cx = centerChunkX - radius; cx <= centerChunkX + radius; cx++) {
      for (let cz = centerChunkZ - radius; cz <= centerChunkZ + radius; cz++) {
        const promise = this.generateChunkTerrainAsync(cx, cz).then((data) => {
          const chunk = this.getOrCreateChunk(data.chunkX, data.chunkZ);
          // 将 ArrayBuffer 转换回 Uint8Array
          const blocks = new Uint8Array(data.blocks);
          chunk.applyBlocksData(blocks);
          chunk.generateMesh();
        });

        promises.push(promise);
      }
    }

    await Promise.all(promises);
  }

  /**
   * 更新地形配置
   */
  public updateTerrainConfig(config: Partial<AdvancedTerrainConfig>): void {
    this.advancedTerrain.updateConfig(config);
  }

  public refreshTerrainSeed(): void {
    this.advancedTerrain.refreshSeed();
  }

  /**
   * 获取当前地形配置
   */
  public getTerrainConfig(): AdvancedTerrainConfig {
    return this.advancedTerrain.getConfig();
  }

  /**
   * 清除所有 Chunk
   */
  public clearAll(): void {
    for (const chunk of this.chunks.values()) {
      chunk.unload();
    }
    this.chunks.clear();
    this.loadQueue.clear();
  }

  /**
   * 终止 Worker
   */
  public dispose(): void {
    if (this.terrainWorker) {
      this.terrainWorker.terminate();
      this.terrainWorker = null;
      this.pendingChunks.clear();
      this.loadingChunks.clear();
    }
    this.clearAll();
  }

  /**
   * 获取已加载的 Chunk 数量
   */
  public getLoadedChunkCount(): number {
    return this.chunks.size;
  }

  /**
   * 获取所有已加载的 Chunk
   */
  public getAllChunks(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  /**
   * 重新生成所有已加载 Chunk 的网格
   * 用于恢复页面可见性或 WebGL 上下文丢失后的场景
   */
  public regenerateAllMeshes(): void {
    console.log('🔄 重新生成所有 Chunk 网格...');
    let count = 0;
    for (const chunk of this.chunks.values()) {
      // 只重新生成有方块数据的 chunk
      chunk.generateMesh();
      count++;
    }
    console.log(`✅ 已重新生成 ${count} 个 Chunk 的网格`);
  }
}
