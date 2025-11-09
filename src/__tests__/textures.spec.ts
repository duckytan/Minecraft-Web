import * as THREE from 'three';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { BlockTextureGenerator } from '../world/textures';
import { BlockType } from '../world/block';

// Vitest 在 JSDOM 环境下运行，确保 THREE.CanvasTexture 可用

describe('BlockTextureGenerator', () => {
  beforeEach(() => {
    BlockTextureGenerator.clearCache();
  });

  afterEach(() => {
    BlockTextureGenerator.clearCache();
  });

  it('should cache textures for identical block type and face', () => {
    const textureA = BlockTextureGenerator.getTexture(BlockType.GRASS, 'top');
    const textureB = BlockTextureGenerator.getTexture(BlockType.GRASS, 'top');

    expect(textureA).toBe(textureB);
  });

  it('should return different textures for different block types', () => {
    const grassTexture = BlockTextureGenerator.getTexture(BlockType.GRASS, 'side');
    const stoneTexture = BlockTextureGenerator.getTexture(BlockType.STONE, 'side');

    expect(grassTexture).not.toBe(stoneTexture);
  });

  it('should return different textures for different faces of the same block', () => {
    const topTexture = BlockTextureGenerator.getTexture(BlockType.WOOD, 'top');
    const sideTexture = BlockTextureGenerator.getTexture(BlockType.WOOD, 'side');

    expect(topTexture).not.toBe(sideTexture);
  });

  it('should dispose textures when clearing cache', () => {
    const texture = BlockTextureGenerator.getTexture(BlockType.LEAVES, 'side');

    const disposeSpy = vi.spyOn(texture, 'dispose');

    BlockTextureGenerator.clearCache();

    expect(disposeSpy).toHaveBeenCalled();
  });

  it('should configure texture filtering for pixelated style', () => {
    const texture = BlockTextureGenerator.getTexture(BlockType.DIRT, 'top');

    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.minFilter).toBe(THREE.NearestFilter);
  });
});
