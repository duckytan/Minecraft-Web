import { createNoise2D } from 'simplex-noise';
import { BlockType } from './block';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './chunk';

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
  seed?: number;
}

export const DEFAULT_TERRAIN_CONFIG: AdvancedTerrainConfig = {
  scale: 0.03, // 更大尺度的地形
  heightMultiplier: 20, // 更高的山峰
  baseHeight: 20,
  waterLevel: 18, // 水位线
  mountainScale: 0.015, // 山脉噪声尺度
  treeChance: 0.02 // 2% 的几率生成树木
};

/**
 * 高级地形生成器
 * 支持：平原、山峰、山谷、湖泊、树木
 */
export class AdvancedTerrainGenerator {
  private noise2D: ReturnType<typeof createNoise2D>;
  private mountainNoise: ReturnType<typeof createNoise2D>;
  private treeNoise: ReturnType<typeof createNoise2D>;
  private config: AdvancedTerrainConfig;

  constructor(config: AdvancedTerrainConfig = DEFAULT_TERRAIN_CONFIG) {
    this.noise2D = createNoise2D();
    this.mountainNoise = createNoise2D();
    this.treeNoise = createNoise2D();
    this.config = config;
  }

  /**
   * 生成单个 Chunk 的地形
   */
  generateChunkTerrain(chunkX: number, chunkZ: number): Uint8Array {
    const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    blocks.fill(BlockType.AIR);

    // 先生成基岩层（y=0）
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const index = this.getBlockIndex(x, 0, z);
        blocks[index] = BlockType.BEDROCK;
      }
    }

    // 生成地形高度图
    const heightMap: number[][] = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      heightMap[x] = [];
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;

        // 基础地形噪声
        const baseNoise = this.noise2D(worldX * this.config.scale, worldZ * this.config.scale);

        // 山脉噪声（更大尺度）
        const mountainNoise = this.mountainNoise(
          worldX * this.config.mountainScale,
          worldZ * this.config.mountainScale
        );

        // 组合噪声：基础地形 + 山脉
        const combinedNoise = baseNoise * 0.6 + mountainNoise * 0.4;

        // 计算高度
        let height = Math.floor(this.config.baseHeight + combinedNoise * this.config.heightMultiplier);

        // 限制高度范围
        height = Math.max(1, Math.min(CHUNK_HEIGHT - 5, height));

        heightMap[x][z] = height;
      }
    }

    // 根据高度图生成方块
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const height = heightMap[x][z];

        // 生成地形层
        for (let y = 1; y <= height; y++) {
          let blockType: BlockType;

          if (y === height) {
            // 顶层
            if (height < this.config.waterLevel) {
              blockType = BlockType.DIRT; // 水下是泥土
            } else {
              blockType = BlockType.GRASS; // 水上是草地
            }
          } else if (y >= height - 3) {
            blockType = BlockType.DIRT;
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
    for (let x = 1; x < CHUNK_SIZE - 1; x++) {
      for (let z = 1; z < CHUNK_SIZE - 1; z++) {
        const height = heightMap[x][z];

        // 只在草地上生成树木
        if (height >= this.config.waterLevel) {
          const worldX = chunkX * CHUNK_SIZE + x;
          const worldZ = chunkZ * CHUNK_SIZE + z;

          // 使用噪声决定是否生成树木
          const treeNoise = this.treeNoise(worldX * 0.1, worldZ * 0.1);
          if (treeNoise > 1 - this.config.treeChance) {
            this.generateTree(blocks, x, height, z);
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
    z: number
  ): void {
    const treeHeight = 4 + Math.floor(Math.random() * 2); // 4-5格高
    const trunkTop = groundY + treeHeight;

    // 检查树木是否会超出 Chunk 高度
    if (trunkTop + 3 >= CHUNK_HEIGHT) {
      return;
    }

    // 生成树干
    for (let y = groundY + 1; y <= trunkTop; y++) {
      const index = this.getBlockIndex(x, y, z);
      blocks[index] = BlockType.WOOD;
    }

    // 生成树叶（球形）
    const leafY = trunkTop;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          const lx = x + dx;
          const ly = leafY + dy;
          const lz = z + dz;

          // 检查是否在 Chunk 内
          if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) {
            continue;
          }

          // 球形判断
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (distance <= 2.5 && !(dx === 0 && dz === 0 && dy < 0)) {
            const index = this.getBlockIndex(lx, ly, lz);
            // 只替换空气方块
            if (blocks[index] === BlockType.AIR) {
              blocks[index] = BlockType.LEAVES;
            }
          }
        }
      }
    }
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
  updateConfig(config: Partial<AdvancedTerrainConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): AdvancedTerrainConfig {
    return { ...this.config };
  }
}
