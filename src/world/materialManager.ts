import * as THREE from 'three';
import { BlockType } from './block';
import { BlockTextureGenerator } from './textures';

/**
 * 全局材质管理器 - 单例模式
 * 确保所有 chunk 共享相同的材质实例，大幅减少内存占用和绘制调用
 */
export class MaterialManager {
  private static instance: MaterialManager | null = null;
  private readonly materials = new Map<string, THREE.MeshLambertMaterial>();
  private readonly transparentMaterials = new Map<string, THREE.MeshLambertMaterial>();

  private constructor() {}

  static getInstance(): MaterialManager {
    if (!MaterialManager.instance) {
      MaterialManager.instance = new MaterialManager();
    }
    return MaterialManager.instance;
  }

  /**
   * 获取材质（自动缓存）
   */
  getMaterial(blockType: BlockType, faceType: 'top' | 'bottom' | 'side'): THREE.MeshLambertMaterial {
    const materialKey = `${blockType}_${faceType}`;

    // 透明方块使用单独的缓存
    if (this.isTransparent(blockType)) {
      if (!this.transparentMaterials.has(materialKey)) {
        const texture = BlockTextureGenerator.getTexture(blockType, faceType);
        const material = new THREE.MeshLambertMaterial({
          map: texture,
          transparent: true,
          opacity: this.getOpacity(blockType),
          side: THREE.FrontSide,
          depthTest: true,
          depthWrite: false,
          alphaTest: 0.1
        });
        this.transparentMaterials.set(materialKey, material);
      }
      return this.transparentMaterials.get(materialKey)!;
    }

    // 不透明方块
    if (!this.materials.has(materialKey)) {
      const texture = BlockTextureGenerator.getTexture(blockType, faceType);
      const material = new THREE.MeshLambertMaterial({
        map: texture,
        side: THREE.FrontSide,
        depthTest: true,
        depthWrite: true
      });
      this.materials.set(materialKey, material);
    }
    return this.materials.get(materialKey)!
  }

  /**
   * 判断方块是否透明
   */
  private isTransparent(blockType: BlockType): boolean {
    return blockType === BlockType.WATER || blockType === BlockType.GLASS;
  }

  /**
   * 获取方块不透明度
   */
  private getOpacity(blockType: BlockType): number {
    switch (blockType) {
      case BlockType.WATER:
        return 0.6;
      case BlockType.GLASS:
        return 0.7;
      default:
        return 1.0;
    }
  }

  /**
   * 获取所有已创建的材质（用于统计）
   */
  getMaterialCount(): number {
    return this.materials.size + this.transparentMaterials.size;
  }

  /**
   * 清理所有材质（用于重置）
   */
  dispose(): void {
    for (const material of this.materials.values()) {
      material.dispose();
    }
    for (const material of this.transparentMaterials.values()) {
      material.dispose();
    }
    this.materials.clear();
    this.transparentMaterials.clear();
  }

  /**
   * 重置单例（主要用于测试）
   */
  static reset(): void {
    if (MaterialManager.instance) {
      MaterialManager.instance.dispose();
      MaterialManager.instance = null;
    }
  }
}
