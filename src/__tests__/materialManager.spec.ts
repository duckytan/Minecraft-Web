import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { MaterialManager } from '@/world/materialManager';
import { BlockType } from '@/world/block';

describe('MaterialManager', () => {
  let materialManager: MaterialManager;

  beforeEach(() => {
    materialManager = MaterialManager.getInstance();
  });

  afterEach(() => {
    MaterialManager.reset();
  });

  it('should be a singleton', () => {
    const instance1 = MaterialManager.getInstance();
    const instance2 = MaterialManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  describe('不透明方块材质', () => {
    it('应该正确配置深度测试和深度写入', () => {
      const material = materialManager.getMaterial(BlockType.GRASS, 'top');
      
      expect(material.depthTest).toBe(true);
      expect(material.depthWrite).toBe(true);
      expect(material.side).toBe(THREE.FrontSide);
      expect(material.transparent).toBe(false);
    });

    it('应该为不同方块类型创建不同的材质', () => {
      const grassMaterial = materialManager.getMaterial(BlockType.GRASS, 'top');
      const stoneMaterial = materialManager.getMaterial(BlockType.STONE, 'top');
      
      expect(grassMaterial).not.toBe(stoneMaterial);
    });

    it('应该为相同方块类型和面缓存材质', () => {
      const material1 = materialManager.getMaterial(BlockType.GRASS, 'top');
      const material2 = materialManager.getMaterial(BlockType.GRASS, 'top');
      
      expect(material1).toBe(material2);
    });
  });

  describe('透明方块材质', () => {
    it('水方块应该配置透明属性', () => {
      const material = materialManager.getMaterial(BlockType.WATER, 'top');
      
      expect(material.transparent).toBe(true);
      expect(material.opacity).toBe(0.6);
      expect(material.depthTest).toBe(true);
      expect(material.depthWrite).toBe(false);
      expect(material.alphaTest).toBe(0.1);
      expect(material.side).toBe(THREE.FrontSide);
    });

    it('玻璃方块应该配置透明属性', () => {
      const material = materialManager.getMaterial(BlockType.GLASS, 'side');
      
      expect(material.transparent).toBe(true);
      expect(material.opacity).toBe(0.7);
      expect(material.depthTest).toBe(true);
      expect(material.depthWrite).toBe(false);
      expect(material.alphaTest).toBe(0.1);
    });

    it('透明材质应该单独缓存', () => {
      const waterMaterial = materialManager.getMaterial(BlockType.WATER, 'top');
      const glassMaterial = materialManager.getMaterial(BlockType.GLASS, 'top');
      
      expect(waterMaterial).not.toBe(glassMaterial);
    });
  });

  describe('材质管理', () => {
    it('应该正确统计材质数量', () => {
      materialManager.getMaterial(BlockType.GRASS, 'top');
      materialManager.getMaterial(BlockType.GRASS, 'side');
      materialManager.getMaterial(BlockType.STONE, 'top');
      
      expect(materialManager.getMaterialCount()).toBe(3);
    });

    it('应该能够清理所有材质', () => {
      materialManager.getMaterial(BlockType.GRASS, 'top');
      materialManager.getMaterial(BlockType.STONE, 'side');
      
      expect(materialManager.getMaterialCount()).toBeGreaterThan(0);
      
      materialManager.dispose();
      
      expect(materialManager.getMaterialCount()).toBe(0);
    });
  });
});
