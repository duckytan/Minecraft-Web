import * as THREE from 'three';
import { describe, expect, it, beforeEach } from 'vitest';

import { BlockType } from '@/world/block';
import { ChunkManager } from '@/world/chunkManager';
import { CHUNK_SIZE } from '@/world/chunk';

describe('ChunkManager', () => {
  let scene: THREE.Scene;
  let chunkManager: ChunkManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    chunkManager = new ChunkManager(scene, 2);
  });

  it('should create and get chunks', () => {
    const chunk1 = chunkManager.getOrCreateChunk(0, 0);
    expect(chunk1).toBeDefined();
    expect(chunk1.chunkX).toBe(0);
    expect(chunk1.chunkZ).toBe(0);

    const chunk2 = chunkManager.getOrCreateChunk(0, 0);
    expect(chunk2).toBe(chunk1); // 应该返回同一个实例
  });

  it('should return null for non-existent chunks', () => {
    const chunk = chunkManager.getChunk(5, 5);
    expect(chunk).toBeNull();
  });

  it('should remove chunks correctly', () => {
    chunkManager.getOrCreateChunk(1, 1);
    expect(chunkManager.getChunk(1, 1)).not.toBeNull();

    chunkManager.removeChunk(1, 1);
    expect(chunkManager.getChunk(1, 1)).toBeNull();
  });

  it('should set and get blocks at world coordinates', () => {
    chunkManager.setBlock(5, 10, 8, BlockType.GRASS);
    expect(chunkManager.getBlock(5, 10, 8)).toBe(BlockType.GRASS);

    chunkManager.setBlock(20, 5, 30, BlockType.STONE);
    expect(chunkManager.getBlock(20, 5, 30)).toBe(BlockType.STONE);
  });

  it('should return AIR for non-existent blocks', () => {
    expect(chunkManager.getBlock(100, 50, 100)).toBe(BlockType.AIR);
  });

  it('should generate flat terrain correctly', () => {
    chunkManager.generateFlatTerrain(0, 0, 1);

    // 应该创建了 3x3 个chunk
    expect(chunkManager.getLoadedChunkCount()).toBeGreaterThanOrEqual(9);

    // 检查地形层
    expect(chunkManager.getBlock(0, 0, 0)).toBe(BlockType.STONE); // 底层
    expect(chunkManager.getBlock(0, 1, 0)).toBe(BlockType.DIRT); // 中层
    expect(chunkManager.getBlock(0, 2, 0)).toBe(BlockType.GRASS); // 顶层
    expect(chunkManager.getBlock(0, 3, 0)).toBe(BlockType.AIR); // 上方应该是空气
  });

  it('should update chunks based on player position', () => {
    // 初始位置
    const initialPosition = new THREE.Vector3(0, 0, 0);
    chunkManager.updateChunks(initialPosition);

    const initialCount = chunkManager.getLoadedChunkCount();
    expect(initialCount).toBeGreaterThan(0);

    // 玩家移动到远处
    const farPosition = new THREE.Vector3(100 * CHUNK_SIZE, 0, 100 * CHUNK_SIZE);
    chunkManager.updateChunks(farPosition);

    // 应该卸载了旧的chunk并加载了新的
    const newCount = chunkManager.getLoadedChunkCount();
    expect(newCount).toBeGreaterThan(0);
  });

  it('should get all meshes from loaded chunks', () => {
    chunkManager.generateFlatTerrain(0, 0, 1);

    const meshes = chunkManager.getAllMeshes();
    expect(meshes.length).toBeGreaterThan(0);
    expect(meshes[0]).toBeInstanceOf(THREE.Mesh);
  });

  it('should clear all chunks', () => {
    chunkManager.generateFlatTerrain(0, 0, 1);
    expect(chunkManager.getLoadedChunkCount()).toBeGreaterThan(0);

    chunkManager.clearAll();
    expect(chunkManager.getLoadedChunkCount()).toBe(0);
  });

  it('should handle blocks across chunk boundaries', () => {
    // 在不同chunk中设置方块
    chunkManager.setBlock(0, 5, 0, BlockType.GRASS); // chunk (0,0)
    chunkManager.setBlock(CHUNK_SIZE, 5, 0, BlockType.DIRT); // chunk (1,0)
    chunkManager.setBlock(0, 5, CHUNK_SIZE, BlockType.STONE); // chunk (0,1)

    expect(chunkManager.getBlock(0, 5, 0)).toBe(BlockType.GRASS);
    expect(chunkManager.getBlock(CHUNK_SIZE, 5, 0)).toBe(BlockType.DIRT);
    expect(chunkManager.getBlock(0, 5, CHUNK_SIZE)).toBe(BlockType.STONE);
  });
});
