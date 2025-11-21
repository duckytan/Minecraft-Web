import { BlockType } from './block';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './chunkConstants';
import { perlin2D, perlin3D, octavePerlin2D, octavePerlin3D } from './perlinNoise';

/**
 * Perlin 噪声地形生成配置
 */
export interface PerlinTerrainConfig {
  scale: number;
  heightMultiplier: number;
  baseHeight: number;
  waterLevel: number;
  mountainScale: number;
  treeChance: number;
  caveThreshold: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  seed?: number;
}

export const DEFAULT_PERLIN_CONFIG: PerlinTerrainConfig = {
  scale: 0.03,
  heightMultiplier: 20,
  baseHeight: 20,
  waterLevel: 18,
  mountainScale: 0.015,
  treeChance: 0.02,
  caveThreshold: 0.6,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2.0
};

/**
 * 基于经典 Perlin 噪声的地形生成器
 * 性能优化：使用纯算法实现，无需外部依赖
 */
export class PerlinTerrainGenerator {
  private config: PerlinTerrainConfig;
  private seedOffset: { x: number; y: number; z: number };

  constructor(config: PerlinTerrainConfig = DEFAULT_PERLIN_CONFIG) {
    this.config = { ...DEFAULT_PERLIN_CONFIG, ...config };
    this.seedOffset = this.generateSeedOffset(this.config.seed);
  }

  /**
   * 根据种子生成偏移量
   */
  private generateSeedOffset(seed?: number): { x: number; y: number; z: number } {
    const s = seed !== undefined ? seed : Math.floor(Math.random() * 10000);
    // 使用简单的哈希函数生成偏移量
    const x = ((s * 73856093) ^ (s * 19349663)) % 10000;
    const y = ((s * 83492791) ^ (s * 50331653)) % 10000;
    const z = ((s * 12582917) ^ (s * 25165843)) % 10000;
    return { x, y, z };
  }

  /**
   * 生成单个 Chunk 的地形
   */
  generateChunkTerrain(chunkX: number, chunkZ: number): Uint8Array {
    const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    blocks.fill(BlockType.AIR);

    // 基岩层
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;
        const bedrockDepth = 1 + Math.floor(Math.abs(perlin2D(worldX * 0.1, worldZ * 0.1)) * 2);
        for (let y = 0; y < bedrockDepth && y < CHUNK_HEIGHT; y++) {
          const index = this.getBlockIndex(x, y, z);
          blocks[index] = BlockType.BEDROCK;
        }
      }
    }

    // 生成高度图
    const heightMap: number[][] = [];
    const biomeMap: number[][] = [];

    for (let x = 0; x < CHUNK_SIZE; x++) {
      heightMap[x] = [];
      biomeMap[x] = [];
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;

        // 生物群系噪声
        const biomeValue = octavePerlin2D(
          (worldX + this.seedOffset.x) * 0.008,
          (worldZ + this.seedOffset.z) * 0.008,
          3,
          0.5,
          2.0
        );
        biomeMap[x][z] = biomeValue;

        // 基础地形噪声
        const baseNoise = octavePerlin2D(
          (worldX + this.seedOffset.x) * this.config.scale,
          (worldZ + this.seedOffset.z) * this.config.scale,
          this.config.octaves,
          this.config.persistence,
          this.config.lacunarity
        );

        // 山脉噪声
        const mountainNoise = octavePerlin2D(
          (worldX + this.seedOffset.x) * this.config.mountainScale,
          (worldZ + this.seedOffset.z) * this.config.mountainScale,
          this.config.octaves,
          this.config.persistence,
          this.config.lacunarity
        );

        // 根据生物群系混合噪声
        let combinedNoise: number;
        if (biomeValue > 0.4) {
          combinedNoise = baseNoise * 0.4 + mountainNoise * 0.6;
        } else if (biomeValue < -0.4) {
          combinedNoise = baseNoise * 0.8 + mountainNoise * 0.2;
        } else {
          combinedNoise = baseNoise * 0.6 + mountainNoise * 0.4;
        }

        let height = Math.floor(this.config.baseHeight + combinedNoise * this.config.heightMultiplier);
        height = Math.max(3, Math.min(CHUNK_HEIGHT - 5, height));

        heightMap[x][z] = height;
      }
    }

    // 生成地形方块（包含洞穴）
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

        for (let y = 1; y <= height; y++) {
          const isSurface = y === height;
          const isNearSurface = y >= height - 3;

          // 洞穴生成
          const caveNoise = octavePerlin3D(
            (worldX + this.seedOffset.x) * 0.05,
            (y + this.seedOffset.y) * 0.08,
            (worldZ + this.seedOffset.z) * 0.05,
            3,
            0.5,
            2.0
          );

          const isCave = caveNoise > this.config.caveThreshold && y < height - 2 && y > 5;

          if (isCave) {
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

        // 湖泊
        if (height < this.config.waterLevel) {
          for (let y = height + 1; y <= this.config.waterLevel; y++) {
            const index = this.getBlockIndex(x, y, z);
            blocks[index] = BlockType.WATER;
          }
        }
      }
    }

    // 生成树木
    for (let x = 2; x < CHUNK_SIZE - 2; x++) {
      for (let z = 2; z < CHUNK_SIZE - 2; z++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;
        const height = heightMap[x][z];
        const biomeValue = biomeMap[x][z];

        if (height >= this.config.waterLevel + 1) {
          const treeNoise = perlin2D(
            (worldX + this.seedOffset.x) * 0.1,
            (worldZ + this.seedOffset.z) * 0.1
          );

          let treeThreshold = this.config.treeChance;
          if (biomeValue > 0.3) {
            treeThreshold = this.config.treeChance * 0.5;
          } else if (biomeValue < -0.3) {
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
   * 生成树木
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
    const variation = Math.abs(perlin2D(x * 0.5, z * 0.5));

    if (slope > 3.2) {
      this.generateShrub(blocks, x, groundY, z);
      return;
    }

    if (variation < 0.18) {
      this.generateShrub(blocks, x, groundY, z);
      return;
    }

    const treeHeight = 4 + Math.floor(variation * 3);
    const trunkTop = groundY + treeHeight;

    if (trunkTop + 3 >= CHUNK_HEIGHT) {
      return;
    }

    // 检查空间
    for (let y = groundY + 1; y <= trunkTop + 2; y++) {
      const index = this.getBlockIndex(x, y, z);
      if (blocks[index] !== BlockType.AIR) {
        return;
      }
    }

    // 树干
    for (let y = groundY + 1; y <= trunkTop; y++) {
      const index = this.getBlockIndex(x, y, z);
      blocks[index] = BlockType.WOOD;
    }

    // 树冠
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
   * 生成灌木
   */
  private generateShrub(blocks: Uint8Array, x: number, groundY: number, z: number): void {
    const variation = Math.abs(perlin2D(x * 0.7, z * 0.7));
    const shrubHeight = 1 + Math.floor(variation * 2);

    for (let y = groundY + 1; y <= groundY + shrubHeight; y++) {
      const index = this.getBlockIndex(x, y, z);
      if (blocks[index] === BlockType.AIR) {
        blocks[index] = BlockType.WOOD;
      }
    }

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
   * 更新配置
   */
  updateConfig(config: Partial<PerlinTerrainConfig>): void {
    const oldSeed = this.config.seed;
    this.config = { ...this.config, ...config };

    if (config.seed !== undefined && config.seed !== oldSeed) {
      this.seedOffset = this.generateSeedOffset(config.seed);
    }
  }

  /**
   * 刷新种子
   */
  refreshSeed(): void {
    this.config.seed = Math.floor(Math.random() * 10000);
    this.seedOffset = this.generateSeedOffset(this.config.seed);
  }

  /**
   * 获取当前配置
   */
  getConfig(): PerlinTerrainConfig {
    return { ...this.config };
  }
}
