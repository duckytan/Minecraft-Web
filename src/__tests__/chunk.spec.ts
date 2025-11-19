import * as THREE from 'three';
import { describe, expect, it, beforeEach } from 'vitest';

import { BlockType } from '@/world/block';
import { Chunk } from '@/world/chunk';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '@/world/chunkConstants';

describe('Chunk', () => {
  let scene: THREE.Scene;
  let chunk: Chunk;

  beforeEach(() => {
    scene = new THREE.Scene();
    chunk = new Chunk(0, 0, scene);
  });

  it('should create a chunk with correct coordinates', () => {
    expect(chunk.chunkX).toBe(0);
    expect(chunk.chunkZ).toBe(0);
  });

  it('should set and get blocks correctly', () => {
    chunk.setBlock(0, 0, 0, BlockType.GRASS);
    expect(chunk.getBlock(0, 0, 0)).toBe(BlockType.GRASS);

    chunk.setBlock(5, 10, 5, BlockType.STONE);
    expect(chunk.getBlock(5, 10, 5)).toBe(BlockType.STONE);
  });

  it('should return AIR for out-of-bounds coordinates', () => {
    expect(chunk.getBlock(-1, 0, 0)).toBe(BlockType.AIR);
    expect(chunk.getBlock(CHUNK_SIZE, 0, 0)).toBe(BlockType.AIR);
    expect(chunk.getBlock(0, CHUNK_HEIGHT, 0)).toBe(BlockType.AIR);
    expect(chunk.getBlock(0, 0, CHUNK_SIZE)).toBe(BlockType.AIR);
  });

  it('should ignore setting blocks at out-of-bounds coordinates', () => {
    chunk.setBlock(-1, 0, 0, BlockType.GRASS);
    chunk.setBlock(CHUNK_SIZE, 0, 0, BlockType.GRASS);
    // No error should be thrown
    expect(chunk.getBlock(0, 0, 0)).toBe(BlockType.AIR);
  });

  it('should generate chunk key correctly', () => {
    expect(chunk.getKey()).toBe('0,0');
    
    const chunk2 = new Chunk(2, -3, scene);
    expect(chunk2.getKey()).toBe('2,-3');
    
    expect(Chunk.getChunkKey(5, 10)).toBe('5,10');
  });

  it('should start with no mesh loaded', () => {
    expect(chunk.isLoaded()).toBe(false);
    expect(chunk.getMesh()).toBeNull();
  });

  it('should generate mesh when blocks are present', () => {
    // 添加一些方块
    chunk.setBlock(0, 0, 0, BlockType.GRASS);
    chunk.setBlock(1, 0, 0, BlockType.DIRT);
    chunk.setBlock(0, 0, 1, BlockType.STONE);

    chunk.generateMesh();

    expect(chunk.isLoaded()).toBe(true);
    expect(chunk.getMesh()).toBeInstanceOf(THREE.Mesh);
  });

  it('should not generate mesh when all blocks are AIR', () => {
    // 不添加任何方块，全为AIR
    chunk.generateMesh();

    expect(chunk.isLoaded()).toBe(false);
    expect(chunk.getMesh()).toBeNull();
  });

  it('should unload mesh correctly', () => {
    chunk.setBlock(0, 0, 0, BlockType.GRASS);
    chunk.generateMesh();

    expect(chunk.isLoaded()).toBe(true);

    chunk.unload();

    expect(chunk.isLoaded()).toBe(false);
    expect(chunk.getMesh()).toBeNull();
  });

  it('should convert world coordinates to chunk coordinates', () => {
    const coords1 = Chunk.worldToChunkCoords(10, 5);
    expect(coords1.chunkX).toBe(0);
    expect(coords1.chunkZ).toBe(0);
    expect(coords1.localX).toBe(10);
    expect(coords1.localZ).toBe(5);

    const coords2 = Chunk.worldToChunkCoords(20, 35);
    expect(coords2.chunkX).toBe(1);
    expect(coords2.chunkZ).toBe(2);
    expect(coords2.localX).toBe(4);
    expect(coords2.localZ).toBe(3);

    const coords3 = Chunk.worldToChunkCoords(-5, -8);
    expect(coords3.chunkX).toBe(-1);
    expect(coords3.chunkZ).toBe(-1);
  });

  it('should regenerate mesh when called multiple times', () => {
    chunk.setBlock(0, 0, 0, BlockType.GRASS);
    chunk.generateMesh();

    const firstMesh = chunk.getMesh();
    expect(firstMesh).toBeInstanceOf(THREE.Mesh);

    // 修改方块并重新生成
    chunk.setBlock(1, 1, 1, BlockType.STONE);
    chunk.generateMesh();

    const secondMesh = chunk.getMesh();
    expect(secondMesh).toBeInstanceOf(THREE.Mesh);
    // 应该是不同的实例（旧的被销毁）
    expect(secondMesh).not.toBe(firstMesh);
  });
});
