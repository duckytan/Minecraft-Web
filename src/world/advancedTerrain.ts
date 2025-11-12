import { createNoise2D, createNoise3D } from 'simplex-noise';
import { BlockType } from './block';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './chunk';

/**
 * 创建基于种子的随机数生成器（LCG 算法）
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state >>> 0) / 0x100000000;
  };
}

/**
 * 地形生成配置
 */
export interface AdvancedTerrainConfig {
  scale: number;
  heightMultiplier: number;
  baseHeight: number;
  waterLevel: number;
  mountainScale: number;
  treeChance: number;
  caveThreshold: number;
  seed?: number;
}

export const DEFAULT_TERRAIN_CONFIG: AdvancedTerrainConfig = {
  scale: 0.03, // 更大尺度的地形
  heightMultiplier: 20, // 更高的山峰
  baseHeight: 20,
  waterLevel: 18, // 水位线
  mountainScale: 0.015, // 山脉噪声尺度
  treeChance: 0.02, // 2% 的几率生成树木
  caveThreshold: 0.6 // 洞穴生成阈值（0-1，越大洞穴越少）
};

/**
 * 高级地形生成器
 * 支持：平原、山峰、山谷、湖泊、树木
 */
export class AdvancedTerrainGenerator {
  private noise2D: ReturnType<typeof createNoise2D>;
  private mountainNoise: ReturnType<typeof createNoise2D>;
  private treeNoise: ReturnType<typeof createNoise2D>;
  private biomeNoise: ReturnType<typeof createNoise2D>;
  private caveNoise: ReturnType<typeof createNoise3D>;
  private config: AdvancedTerrainConfig;
  private currentSeed?: number;

  constructor(config: AdvancedTerrainConfig = DEFAULT_TERRAIN_CONFIG) {
    this.config = { ...DEFAULT_TERRAIN_CONFIG, ...config };
    this.noise2D = createNoise2D();
    this.mountainNoise = createNoise2D();
    this.treeNoise = createNoise2D();
    this.biomeNoise = createNoise2D();
    this.caveNoise = createNoise3D();
    this.initializeNoiseGenerators();
  }

  /**
   * 初始化噪声生成器（支持种子）
   */
  private initializeNoiseGenerators(force = false): void {
    const baseSeed =
      this.config.seed !== undefined
        ? this.config.seed >>> 0
        : !force && this.currentSeed !== undefined
          ? this.currentSeed >>> 0
          : Math.floor(Math.random() * 0xffffffff);

    if (!force && this.currentSeed === baseSeed) {
      return;
    }

    this.currentSeed = baseSeed;
    this.config.seed = baseSeed;

    const makeRandom = (offset: number): (() => number) => {
      const seed = (baseSeed + offset * 0x9e3779b9) >>> 0; // 0x9e3779b9 = 2654435769
      return createSeededRandom(seed || 1);
    };

    this.noise2D = createNoise2D(makeRandom(1));
    this.mountainNoise = createNoise2D(makeRandom(2));
    this.treeNoise = createNoise2D(makeRandom(3));
    this.biomeNoise = createNoise2D(makeRandom(4));
    this.caveNoise = createNoise3D(makeRandom(5));
  }

  /**
   * 生成单个 Chunk 的地形
   * 优化版：支持洞穴、生物群系、沙滩等
   */
  generateChunkTerrain(chunkX: number, chunkZ: number): Uint8Array {
    const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    blocks.fill(BlockType.AIR);

    // 先生成基岩层（y=0，带一些随机性）
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;
        // 基岩层 1-3 层厚度（使用可重复的伪随机数）
        const noise = this.pseudoRandom3D(worldX, -1, worldZ);
        const bedrockDepth = 1 + Math.floor(noise * 3);
        for (let y = 0; y < bedrockDepth && y < CHUNK_HEIGHT; y++) {
          const index = this.getBlockIndex(x, y, z);
          blocks[index] = BlockType.BEDROCK;
        }
      }
    }

    // 生成地形高度图和生物群系数据
    const heightMap: number[][] = [];
    const biomeMap: number[][] = [];
    
    for (let x = 0; x < CHUNK_SIZE; x++) {
      heightMap[x] = [];
      biomeMap[x] = [];
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;

        // 生物群系噪声（-1 到 1）
        const biomeValue = this.biomeNoise(worldX * 0.008, worldZ * 0.008);
        biomeMap[x][z] = biomeValue;

        // 基础地形噪声
        const baseNoise = this.noise2D(worldX * this.config.scale, worldZ * this.config.scale);

        // 山脉噪声（更大尺度）
        const mountainNoise = this.mountainNoise(
          worldX * this.config.mountainScale,
          worldZ * this.config.mountainScale
        );

        // 根据生物群系调整地形
        let combinedNoise: number;
        if (biomeValue > 0.4) {
          // 山地生物群系：更高的山峰
          combinedNoise = baseNoise * 0.4 + mountainNoise * 0.6;
        } else if (biomeValue < -0.4) {
          // 平原生物群系：更平坦
          combinedNoise = baseNoise * 0.8 + mountainNoise * 0.2;
        } else {
          // 混合生物群系
          combinedNoise = baseNoise * 0.6 + mountainNoise * 0.4;
        }

        // 计算高度
        let height = Math.floor(this.config.baseHeight + combinedNoise * this.config.heightMultiplier);

        // 限制高度范围
        height = Math.max(3, Math.min(CHUNK_HEIGHT - 5, height));

        heightMap[x][z] = height;
      }
    }

    // 根据高度图生成方块（包含洞穴）
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;
        const height = heightMap[x][z];
        const biomeValue = biomeMap[x][z];

        const slope = this.calculateSlope(heightMap, x, z);
        const stoneHeight = this.config.baseHeight + this.config.heightMultiplier * 0.55;
        const isMountainBiome = biomeValue > 0.35;
        const isValleyBiome = biomeValue < -0.35;
        const isUnderWater = height < this.config.waterLevel;
        const nearWaterSurface = height <= this.config.waterLevel + 1;
        const highAltitude = height >= stoneHeight;

        // 生成地形层
        for (let y = 1; y <= height; y++) {
          const worldY = y;
          const isSurface = y === height;
          const isNearSurface = y >= height - 3;

          // 洞穴生成（使用 3D 噪声）
          const caveNoise = this.caveNoise(worldX * 0.05, worldY * 0.08, worldZ * 0.05);

          // 洞穴判断（不在表层，不在水下）
          const isCave = caveNoise > this.config.caveThreshold && y < height - 2 && y > 5;

          if (isCave) {
            // 洞穴空气
            const index = this.getBlockIndex(x, y, z);
            blocks[index] = BlockType.AIR;
            continue;
          }

          let blockType: BlockType;

          if (isSurface) {
            if (isUnderWater) {
              blockType = BlockType.DIRT;
            } else if (nearWaterSurface) {
              blockType = BlockType.DIRT;
            } else if (highAltitude || slope > 3.2 || isMountainBiome) {
              blockType = BlockType.STONE;
            } else if (isValleyBiome && slope < 1.5) {
              blockType = BlockType.GRASS;
            } else {
              blockType = BlockType.GRASS;
            }
          } else if (isNearSurface) {
            if (highAltitude || slope > 3.5 || isMountainBiome) {
              blockType = BlockType.STONE;
            } else {
              blockType = BlockType.DIRT;
            }
          } else {
            blockType = BlockType.STONE;
          }

          const index = this.getBlockIndex(x, y, z);
          blocks[index] = blockType;
        }

        // 生成湖泊（填充到水位线）
        if (height < this.config.waterLevel) {
          for (let y = height + 1; y <= this.config.waterLevel; y++) {
            const index = this.getBlockIndex(x, y, z);
            blocks[index] = BlockType.WATER;
          }
        }
      }
    }

    // 生成树木（第二遍，避免树木被水淹没）
    for (let x = 2; x < CHUNK_SIZE - 2; x++) {
      for (let z = 2; z < CHUNK_SIZE - 2; z++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;
        const height = heightMap[x][z];
        const biomeValue = biomeMap[x][z];

        // 只在草地上生成树木
        if (height >= this.config.waterLevel + 1) {
          // 使用噪声决定是否生成树木
          const treeNoise = this.treeNoise(worldX * 0.1, worldZ * 0.1);
          
          // 根据生物群系调整树木密度
          let treeThreshold = this.config.treeChance;
          if (biomeValue > 0.3) {
            // 山地：较少树木
            treeThreshold = this.config.treeChance * 0.5;
          } else if (biomeValue < -0.3) {
            // 平原：更多树木
            treeThreshold = this.config.treeChance * 1.5;
          }

          if (treeNoise > 1 - treeThreshold) {
            this.generateTree(blocks, x, height, z, heightMap);
          }
        }
      }
    }

    return blocks;
  }

  /**
   * 生成树木或灌木，带有更多变化
   */
  private generateTree(
    blocks: Uint8Array,
    x: number,
    groundY: number,
    z: number,
    heightMap: number[][]
  ): void {
    if (groundY + 5 >= CHUNK_HEIGHT) {
      return;
    }

    const slope = this.calculateSlope(heightMap, x, z);
    const variation = this.pseudoRandom3D(x, groundY, z);

    if (slope > 3.2) {
      // 陡坡不生成高树，改为矮灌木
      this.generateShrub(blocks, x, groundY, z, variation);
      return;
    }

    if (variation < 0.18) {
      // 少量灌木，提升生态多样性
      this.generateShrub(blocks, x, groundY, z, variation);
      return;
    }

    const treeHeight = 4 + Math.floor(variation * 3); // 4-6 格高度
    const trunkTop = groundY + treeHeight;

    if (trunkTop + 3 >= CHUNK_HEIGHT) {
      return;
    }

    // 检查空间是否足够
    for (let y = groundY + 1; y <= trunkTop + 2; y++) {
      const index = this.getBlockIndex(x, y, z);
      if (blocks[index] !== BlockType.AIR) {
        return;
      }
    }

    // 生成树干
    for (let y = groundY + 1; y <= trunkTop; y++) {
      const index = this.getBlockIndex(x, y, z);
      blocks[index] = BlockType.WOOD;
    }

    // 生成树冠（变体：圆锥 + 顶层）
    const canopyRadius = 2 + (variation > 0.6 ? 1 : 0);
    const leafBaseY = trunkTop - 1;

    for (let dy = -1; dy <= 2; dy++) {
      const radius = canopyRadius - Math.max(0, dy);
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const distance = Math.abs(dx) + Math.abs(dz);
          if (distance > radius + (dy > 0 ? 0 : 1)) {
            continue;
          }

          const lx = x + dx;
          const ly = leafBaseY + dy;
          const lz = z + dz;

          if (!this.isWithinChunk(lx, ly, lz)) {
            continue;
          }

          const leafIndex = this.getBlockIndex(lx, ly, lz);
          if (blocks[leafIndex] === BlockType.AIR) {
            blocks[leafIndex] = BlockType.LEAVES;
          }
        }
      }
    }
  }

  /**
   * 生成灌木（矮小的植物）
   */
  private generateShrub(blocks: Uint8Array, x: number, groundY: number, z: number, variation: number): void {
    const shrubHeight = 1 + Math.floor(variation * 2); // 1-2 格高度

    // 生成小树干
    for (let y = groundY + 1; y <= groundY + shrubHeight; y++) {
      const index = this.getBlockIndex(x, y, z);
      if (blocks[index] === BlockType.AIR) {
        blocks[index] = BlockType.WOOD;
      }
    }

    // 生成少量树叶
    const topY = groundY + shrubHeight;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > 1) {
          continue;
        }
        const lx = x + dx;
        const lz = z + dz;

        if (!this.isWithinChunk(lx, topY, lz)) {
          continue;
        }

        const leafIndex = this.getBlockIndex(lx, topY, lz);
        if (blocks[leafIndex] === BlockType.AIR) {
          blocks[leafIndex] = BlockType.LEAVES;
        }
      }
    }
  }

  /**
   * 计算地形坡度
   */
  private calculateSlope(heightMap: number[][], x: number, z: number): number {
    let maxDiff = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) {
          continue;
        }
        const nx = x + dx;
        const nz = z + dz;
        if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE) {
          const diff = Math.abs(heightMap[x][z] - heightMap[nx][nz]);
          if (diff > maxDiff) {
            maxDiff = diff;
          }
        }
      }
    }
    return maxDiff;
  }

  /**
   * 伪随机数生成（基于坐标）
   */
  private pseudoRandom3D(x: number, y: number, z: number): number {
    const seedMix =
      (x * 374761393 + y * 668265263 + z * 2147483647 + (this.currentSeed ?? 0)) >>> 0;
    const random = createSeededRandom(seedMix || 1);
    return random();
  }

  /**
   * 检查坐标是否在 Chunk 内
   */
  private isWithinChunk(x: number, y: number, z: number): boolean {
    return x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_SIZE;
  }

  /**
   * 计算方块索引
   */
  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT;
  }

  /**
   * 更新配置（并重新初始化噪声生成器）
   */
  updateConfig(config: Partial<AdvancedTerrainConfig>): void {
    const oldSeed = this.config.seed;
    this.config = { ...this.config, ...config };

    // 如果种子改变了，重新初始化噪声生成器
    if (config.seed !== undefined && config.seed !== oldSeed) {
      this.initializeNoiseGenerators(true);
    }
  }

  refreshSeed(): void {
    this.initializeNoiseGenerators(true);
  }

  /**
   * 获取当前配置
   */
  getConfig(): AdvancedTerrainConfig {
    return { ...this.config };
  }
}
