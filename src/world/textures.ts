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
        this.generateBedrockTexture(ctx);
        break;
      case BlockType.WATER:
        this.generateWaterTexture(ctx);
        break;
      case BlockType.SAND:
        this.generateSandTexture(ctx);
        break;
      case BlockType.SNOW:
        this.generateSnowTexture(ctx);
        break;
      case BlockType.GLASS:
        this.generateGlassTexture(ctx);
        break;
      case BlockType.LAVA:
        this.generateLavaTexture(ctx);
        break;
      case BlockType.OBSIDIAN:
        this.generateObsidianTexture(ctx);
        break;
      case BlockType.COAL_ORE:
        this.generateCoalOreTexture(ctx);
        break;
      default:
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
      ctx.fillStyle = '#7ec850';
      ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

      for (let i = 0; i < 45; i++) {
        const x = Math.floor(Math.random() * TEXTURE_SIZE);
        const y = Math.floor(Math.random() * TEXTURE_SIZE);
        const brightness = Math.random() > 0.5 ? 25 : -25;
        const color = this.adjustBrightness('#7ec850', brightness);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }

      for (let i = 0; i < 8; i++) {
        const x = Math.floor(Math.random() * TEXTURE_SIZE);
        const y = Math.floor(Math.random() * TEXTURE_SIZE);
        ctx.fillStyle = '#5a9e3d';
        ctx.fillRect(x, y, 2, 1);
      }
    } else if (face === 'side') {
      ctx.fillStyle = '#7ec850';
      ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE / 2);

      ctx.fillStyle = '#9b7653';
      ctx.fillRect(0, TEXTURE_SIZE / 2, TEXTURE_SIZE, TEXTURE_SIZE / 2);

      ctx.fillStyle = 'rgba(155, 118, 83, 0.4)';
      ctx.fillRect(0, TEXTURE_SIZE / 2 - 1, TEXTURE_SIZE, 2);

      for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * TEXTURE_SIZE);
        const y = Math.floor(Math.random() * TEXTURE_SIZE);
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 1, 1);
      }
    } else {
      this.generateDirtTexture(ctx);
    }
  }

  /**
   * 泥土纹理
   * - 棕色基础 + 随机颗粒
   */
  private static generateDirtTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#9b7653';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    for (let i = 0; i < 60; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const brightness = Math.random() * 40 - 20;
      const color = this.adjustBrightness('#9b7653', brightness);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

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
    ctx.fillStyle = '#999999';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    for (let i = 0; i < 80; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const brightness = Math.random() * 30 - 15;
      const color = this.adjustBrightness('#999999', brightness);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

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
    ctx.fillStyle = '#a0724e';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    if (face === 'top' || face === 'bottom') {
      const centerX = TEXTURE_SIZE / 2;
      const centerY = TEXTURE_SIZE / 2;

      for (let radius = 2; radius < TEXTURE_SIZE / 2; radius += 2) {
        ctx.strokeStyle = this.adjustBrightness('#a0724e', radius % 4 === 0 ? -18 : -6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      for (let x = 0; x < TEXTURE_SIZE; x += 2) {
        ctx.fillStyle = this.adjustBrightness('#a0724e', x % 4 === 0 ? -12 : -6);
        ctx.fillRect(x, 0, 1, TEXTURE_SIZE);
      }

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
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    for (let i = 0; i < 60; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const brightness = Math.random() * 40 - 20;
      const color = this.adjustBrightness('#4caf50', brightness);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x, y, 1, 1);
    }

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
  private static generateBedrockTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const brightness = Math.random() * 20 - 10;
      const color = this.adjustBrightness('#2a2a2a', brightness);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

    ctx.strokeStyle = 'rgba(120, 120, 120, 0.3)';
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
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    for (let y = 0; y < TEXTURE_SIZE; y += 2) {
      const brightness = Math.sin(y * 0.6) * 18;
      ctx.fillStyle = this.adjustBrightness('#4fc3f7', brightness);
      ctx.fillRect(0, y, TEXTURE_SIZE, 1);
    }

    for (let i = 0; i < 18; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  private static generateSandTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#edc9af';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    for (let i = 0; i < 50; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      ctx.fillStyle = Math.random() > 0.5 ? '#d8b087' : '#f0d9be';
      ctx.fillRect(x, y, 1, 1);
    }

    for (let y = 0; y < TEXTURE_SIZE; y += 4) {
      ctx.fillStyle = 'rgba(216, 176, 135, 0.2)';
      ctx.fillRect(0, y, TEXTURE_SIZE, 1);
    }
  }

  private static generateSnowTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#fdfdfd';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    for (let i = 0; i < 25; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const brightness = Math.random() > 0.6 ? 30 : -15;
      ctx.fillStyle = this.adjustBrightness('#fdfdfd', brightness);
      ctx.fillRect(x, y, 1, 1);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, TEXTURE_SIZE);
    gradient.addColorStop(0, 'rgba(210, 230, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(150, 180, 255, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  }

  private static generateGlassTexture(ctx: CanvasRenderingContext2D): void {
    // 使用不透明的浅蓝色作为基础，透明度由材质的 opacity 控制
    ctx.fillStyle = '#bfe7f5';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, TEXTURE_SIZE - 2, TEXTURE_SIZE - 2);

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(2 + i * 4, 2, 1, TEXTURE_SIZE - 4);
    }

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(173, 216, 230, 0.3)';
      ctx.fillRect(2, 2 + i * 4, TEXTURE_SIZE - 4, 1);
    }
  }

  private static generateLavaTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * TEXTURE_SIZE, Math.random() * TEXTURE_SIZE);
      ctx.lineTo(Math.random() * TEXTURE_SIZE, Math.random() * TEXTURE_SIZE);
      ctx.stroke();
    }

    for (let i = 0; i < 40; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const color = Math.random() > 0.5 ? '#ff9448' : '#d8491f';
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  private static generateObsidianTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1a0933';
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    for (let i = 0; i < 70; i++) {
      const x = Math.floor(Math.random() * TEXTURE_SIZE);
      const y = Math.floor(Math.random() * TEXTURE_SIZE);
      const brightness = Math.random() * 40 - 20;
      const color = this.adjustBrightness('#1a0933', brightness);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }

    ctx.strokeStyle = 'rgba(122, 86, 255, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * TEXTURE_SIZE, Math.random() * TEXTURE_SIZE);
      ctx.lineTo(Math.random() * TEXTURE_SIZE, Math.random() * TEXTURE_SIZE);
      ctx.stroke();
    }
  }

  private static generateCoalOreTexture(ctx: CanvasRenderingContext2D): void {
    this.generateStoneTexture(ctx);

    for (let i = 0; i < 12; i++) {
      const x = Math.floor(Math.random() * (TEXTURE_SIZE - 2));
      const y = Math.floor(Math.random() * (TEXTURE_SIZE - 2));
      const size = Math.floor(Math.random() * 2) + 2;
      ctx.fillStyle = '#1f1f1f';
      ctx.fillRect(x, y, size, size);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
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
