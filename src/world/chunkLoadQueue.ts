import * as THREE from 'three';
import { CHUNK_SIZE } from './chunk';

/**
 * Chunk 加载队列任务
 */
export interface ChunkLoadTask {
  chunkX: number;
  chunkZ: number;
  priority: number;
}

/**
 * Chunk 加载队列管理器
 * 限制每帧加载的 chunk 数量，优先加载玩家前方和附近的 chunk
 */
export class ChunkLoadQueue {
  private queue: ChunkLoadTask[] = [];
  private loading = new Set<string>();
  private readonly maxLoadsPerFrame: number;

  constructor(maxLoadsPerFrame: number = 2) {
    this.maxLoadsPerFrame = maxLoadsPerFrame;
  }

  /**
   * 添加加载任务（如果不存在）
   */
  public enqueue(chunkX: number, chunkZ: number, playerPosition: THREE.Vector3, playerDirection: THREE.Vector3): void {
    const key = `${chunkX},${chunkZ}`;
    if (this.loading.has(key)) {
      return;
    }

    // 检查是否已在队列中
    if (this.queue.some(task => task.chunkX === chunkX && task.chunkZ === chunkZ)) {
      return;
    }

    const priority = this.calculatePriority(chunkX, chunkZ, playerPosition, playerDirection);
    this.queue.push({ chunkX, chunkZ, priority });

    // 按优先级排序（高优先级在前）
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 获取下一批要加载的 chunk
   */
  public getNextBatch(): ChunkLoadTask[] {
    const batch: ChunkLoadTask[] = [];
    while (batch.length < this.maxLoadsPerFrame && this.queue.length > 0) {
      const task = this.queue.shift()!;
      const key = `${task.chunkX},${task.chunkZ}`;
      this.loading.add(key);
      batch.push(task);
    }
    return batch;
  }

  /**
   * 标记 chunk 加载完成
   */
  public markLoaded(chunkX: number, chunkZ: number): void {
    const key = `${chunkX},${chunkZ}`;
    this.loading.delete(key);
  }

  /**
   * 清空队列
   */
  public clear(): void {
    this.queue = [];
    this.loading.clear();
  }

  /**
   * 获取队列长度
   */
  public get length(): number {
    return this.queue.length;
  }

  /**
   * 计算 chunk 的加载优先级
   * 优先级 = (1 / 距离) * (1 + 方向加权)
   */
  private calculatePriority(
    chunkX: number,
    chunkZ: number,
    playerPosition: THREE.Vector3,
    playerDirection: THREE.Vector3
  ): number {
    // chunk 中心的世界坐标
    const chunkCenterX = (chunkX + 0.5) * CHUNK_SIZE;
    const chunkCenterZ = (chunkZ + 0.5) * CHUNK_SIZE;

    // 距离
    const dx = chunkCenterX - playerPosition.x;
    const dz = chunkCenterZ - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance === 0) {
      return 1000; // 玩家所在 chunk 最高优先级
    }

    // 方向向量（从玩家指向 chunk）
    const toChunkX = dx / distance;
    const toChunkZ = dz / distance;

    // 玩家朝向的归一化向量（只考虑 XZ 平面）
    const dirLength = Math.sqrt(playerDirection.x * playerDirection.x + playerDirection.z * playerDirection.z);
    const playerDirX = dirLength > 0 ? playerDirection.x / dirLength : 0;
    const playerDirZ = dirLength > 0 ? playerDirection.z / dirLength : 0;

    // 点积（范围 -1 到 1）
    const dotProduct = toChunkX * playerDirX + toChunkZ * playerDirZ;

    // 方向加权：玩家前方的 chunk 优先级更高
    // dotProduct = 1 时（正前方），加权 2
    // dotProduct = 0 时（侧面），加权 1
    // dotProduct = -1 时（后方），加权 0.5
    const directionWeight = Math.max(0.5, 1 + dotProduct);

    // 最终优先级
    return (1 / (distance + 1)) * directionWeight;
  }
}
