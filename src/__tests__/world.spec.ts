import * as THREE from 'three';
import { describe, expect, it, beforeEach } from 'vitest';

import { BlockType } from '@/world/block';
import { World } from '@/world/world';

describe('World', () => {
  let scene: THREE.Scene;
  let world: World;

  beforeEach(() => {
    scene = new THREE.Scene();
    world = new World(scene);
  });

  it('should add a block successfully', () => {
    const mesh = world.setBlock(0, 0, 0, BlockType.GRASS);

    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh).not.toBeNull();
    expect(world.getBlock(0, 0, 0)).toBe(BlockType.GRASS);
  });

  it('should not add air blocks', () => {
    const result = world.setBlock(0, 0, 0, BlockType.AIR);
    expect(result).toBeNull();
    expect(world.getBlock(0, 0, 0)).toBe(BlockType.AIR);
  });

  it('should update block if position already occupied', () => {
    world.setBlock(1, 1, 1, BlockType.STONE);
    const result = world.setBlock(1, 1, 1, BlockType.GRASS);

    expect(result).not.toBeNull();
    expect(world.getBlock(1, 1, 1)).toBe(BlockType.GRASS);
  });

  it('should remove a block', () => {
    world.setBlock(2, 2, 2, BlockType.DIRT);
    expect(world.getBlock(2, 2, 2)).toBe(BlockType.DIRT);

    world.removeBlock(2, 2, 2);
    expect(world.getBlock(2, 2, 2)).toBe(BlockType.AIR);
  });

  it('should return all blocks correctly', () => {
    world.setBlock(0, 0, 0, BlockType.GRASS);
    world.setBlock(1, 1, 1, BlockType.STONE);
    world.setBlock(2, 2, 2, BlockType.WOOD);

    const blocks = world.getAllBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(1);
  });

  it('should clear all blocks', () => {
    world.setBlock(0, 0, 0, BlockType.GRASS);
    world.setBlock(1, 1, 1, BlockType.STONE);
    world.setBlock(2, 2, 2, BlockType.WOOD);

    expect(world.getAllBlocks().length).toBeGreaterThanOrEqual(1);

    world.clearAll();
    expect(world.getAllBlocks().length).toBe(0);
  });

  it('should import terrain correctly', () => {
    const terrainGroup = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(i, 0, 0);
      terrainGroup.add(mesh);
    }

    world.importTerrain(terrainGroup);
    expect(world.getAllBlocks().length).toBeGreaterThanOrEqual(1);

    expect(world.getBlock(0, 0, 0)).toBe(BlockType.GRASS);
    expect(world.getBlock(4, 0, 0)).toBe(BlockType.GRASS);
  });

  it('should return the same scene instance', () => {
    expect(world.getScene()).toBe(scene);
  });
});
