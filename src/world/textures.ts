import * as THREE from 'three';
import { BlockType } from './block';

// 纹理尺寸（像素化风格）
const TEXTURE_SIZE = 16;

/**
 * 程序化生成方块纹理
 * 参考Minecraft的做法，使用Canvas 2D生成像素化纹理
 */
export class BlockTextureGenerator {
  private static textureCache = new Map<string, THREE.CanvasTexture>();

  /**
   * 为指定方块类型和面生成纹理
   * @param blockType 方块类型
   * @param face 方块面（top/bottom/side）
   */
  static getTexture(blockType: BlockType, face: 'top' | 'bottom' | 'side'): THREE.CanvasTexture {
    const cacheKey = `${blockType}_${face}`;

    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext('2d')!;

    // 根据方块类型生成纹理
    switch (blockType) {
      case BlockType.GRASS:
        this.generateGrassTexture(ctx, face);
        break;
      case BlockType.DIRT:
        this.generateDirtTexture(ctx);
        break;
      case BlockType.STONE:
        this.generateStoneTexture(ctx);
        break;
      case BlockType.WOOD:
        this.generateWoodTexture(ctx, face);
        break;
      case BlockType.LEAVES:
        this.generateLeavesTexture(ctx);
        break;
      case BlockType.BEDROCK:
        this.generateBedrockTexture(ctx, face);
        break;
      case BlockType.WATER:
        this.generateWaterTexture(ctx);
        break;
      default:
        // 默认纯色
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // 像素化效果
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  /**
   * 草方块纹理
   * - 顶部：绿色草地 + 杂点
   * - 侧面：上半绿色 + 下半棕色（草土过渡）
   * - 底部：泥土纹理
   */
  private static generateGrassTexture(ctx: CanvasRenderingContext2D, face: string): void {
    if (face === 'top') {
      // 草地顶部
      ctx.fillStyle = '#5a9e3d';
      ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

      // 添加深浅杂点
      for (let i = 0; i < 40; i++) {
        const x = Math.floor(Math.random() * TEXTURE_SIZE);
        const y = Math.floor(Math.random() * TEXTURE_SIZE);
        const brightness = Math.random() > 0.5 ? 20 : -20;
        const color = this.adjustBrightness('#5a9e3d', brightness);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    } else if (face === 'side') {
      // 草方块侧面（上半绿色，下半棕色）
      ctx.fillStyle = '#5a9e3d';
      ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE / 2);

      ctx.fillStyle = '#8b6f47';
      ctx.fillRect(0, TEXTURE_SIZE / 2, TEXTURE_SIZE, TEXTURE_SIZE / 2);

      // 添加过渡带
      ctx.fillStyle = 'rgba(139, 111, 71, 0.3)';
      ctx.fillRect(0, TEXTURE_SIZE / 2 - 1, TEXTURE_SIZE, 2);

      // 添加纹理细节
      for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * TEXTURE_SIZE);
        const y = Math.floor(Math.random() * TEXTURE_SIZE);
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 1, 1);
      }
    } else {
      // 底部使用泥土纹理
      this.generateDirtTexture(ctx);
    }
  }

  /**
   * 泥土纹理
   * - 棕色基础 + 随机颗粒
   */
  private static generateDirtTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#8b6f47';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    // 添加颗粒感
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const brightness = Math.random() * 40 - 20;
      const color = this.adjustBrightness('#8b6f47', brightness);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

    // 添加一些小块状纹理
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  /**
   * 石头纹理
   * - 灰色基础 + 裂纹 + 颜色变化
   */
  private static generateStoneTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    // 添加深浅变化
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const brightness = Math.random() * 30 - 15;
      const color = this.adjustBrightness('#7a7a7a', brightness);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

    // 添加裂纹
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const startX = Math.random() * TEXTURE_SIZE;
      const startY = Math.random() * TEXTURE_SIZE;
      ctx.moveTo(startX, startY);
      const endX = startX + (Math.random() - 0.5) * 8;
      const endY = startY + (Math.random() - 0.5) * 8;
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  /**
   * 木头纹理
   * - 棕色基础 + 木纹
   * - 顶部/底部：年轮纹理
   * - 侧面：垂直纹理
   */
  private static generateWoodTexture(ctx: CanvasRenderingContext2D, face: string): void {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    if (face === 'top' || face === 'bottom') {
      // 年轮纹理（同心圆）
      const centerX = TEXTURE_SIZE / 2;
      const centerY = TEXTURE_SIZE / 2;

      for (let radius = 2; radius < TEXTURE_SIZE / 2; radius += 2) {
        ctx.strokeStyle = this.adjustBrightness('#8b5a2b', (radius % 4 === 0 ? -15 : -5));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // 侧面垂直纹理
      for (let x = 0; x < TEXTURE_SIZE; x += 2) {
        ctx.fillStyle = this.adjustBrightness('#8b5a2b', x % 4 === 0 ? -10 : -5);
        ctx.fillRect(x, 0, 1, TEXTURE_SIZE);
      }

      // 添加一些随机纹理
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(Math.random() * TEXTURE_SIZE);
        const y = Math.floor(Math.random() * TEXTURE_SIZE);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(x, y, 1, Math.random() * 4 + 2);
      }
    }
  }

  /**
   * 树叶纹理
   * - 绿色基础 + 随机孔洞
   */
  private static generateLeavesTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#3d8b3d';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    // 添加深浅变化
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const brightness = Math.random() * 40 - 20;
      const color = this.adjustBrightness('#3d8b3d', brightness);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

    // 添加孔洞（透明感）
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x, y, 1, 1);
    }

    // 添加亮点（光照效果）
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  /**
   * 调整颜色亮度
   * @param hex 十六进制颜色
   * @param amount 亮度调整值（-255 到 255）
   */
  private static adjustBrightness(hex: string, amount: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const r = Math.max(0, Math.min(255, rgb.r + amount));
    const g = Math.max(0, Math.min(255, rgb.g + amount));
    const b = Math.max(0, Math.min(255, rgb.b + amount));

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * 将十六进制颜色转换为RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  }

  /**
   * 基岩纹理
   * - 深黑色基础 + 细微裂纹
   */
  private static generateBedrockTexture(ctx: CanvasRenderingContext2D, _face: string): void {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    // 添加深浅变化（非常细微）
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const brightness = Math.random() * 20 - 10;
      const color = this.adjustBrightness('#1a1a1a', brightness);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

    // 添加裂纹
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const startX = Math.random() * TEXTURE_SIZE;
      const startY = Math.random() * TEXTURE_SIZE;
      ctx.moveTo(startX, startY);
      const endX = startX + (Math.random() - 0.5) * 6;
      const endY = startY + (Math.random() - 0.5) * 6;
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  /**
   * 水纹理
   * - 蓝色基础 + 波纹效果
   */
  private static generateWaterTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    // 添加波纹（水平线）
    for (let y = 0; y < TEXTURE_SIZE; y += 2) {
      const brightness = Math.sin(y * 0.5) * 15;
      ctx.fillStyle = this.adjustBrightness('#4a90e2', brightness);
      ctx.fillRect(0, y, TEXTURE_SIZE, 1);
    }

    // 添加随机亮点（反光效果）
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  /**
   * 清空纹理缓存（用于测试或重新生成）
   */
  static clearCache(): void {
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
  }
}
