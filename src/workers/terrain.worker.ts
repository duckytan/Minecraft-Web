/// <reference lib="webworker" />
import { createNoise2D } from 'simplex-noise';
import { BlockType } from '../world/block';
import type { TerrainConfig, TerrainData } from '../world/terrainTypes';

const noise2D = createNoise2D();

/**
 * 生成单个 Chunk 的地形数据
 */
function generateChunkTerrain(config: TerrainConfig): TerrainData {
  const { chunkX, chunkZ, chunkSize, chunkHeight, scale, heightMultiplier, baseHeight } = config;

  // 创建方块数据数组
  const blocks = new Uint8Array(chunkSize * chunkHeight * chunkSize);
  blocks.fill(BlockType.AIR);

  // 为每个列生成地形
  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      // 计算世界坐标
      const worldX = chunkX * chunkSize + x;
      const worldZ = chunkZ * chunkSize + z;

      // 使用 Perlin 噪声计算高度
      const noiseValue = noise2D(worldX * scale, worldZ * scale);
      const height = Math.floor(baseHeight + noiseValue * heightMultiplier);

      // 确保高度在合法范围内
      const clampedHeight = Math.max(0, Math.min(chunkHeight - 1, height));

      // 生成地形层
      for (let y = 0; y <= clampedHeight; y++) {
        let blockType: BlockType;

        if (y === clampedHeight) {
          // 顶层：草地
          blockType = BlockType.GRASS;
        } else if (y >= clampedHeight - 3) {
          // 次顶层（3层）：泥土
          blockType = BlockType.DIRT;
        } else {
          // 底层：石头
          blockType = BlockType.STONE;
        }

        // 计算索引
        const index = x + y * chunkSize + z * chunkSize * chunkHeight;
        blocks[index] = blockType;
      }
    }
  }

  return {
    chunkX,
    chunkZ,
    blocks: blocks.buffer
  };
}

/**
 * Worker 消息处理
 */
const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<TerrainConfig>) => {
  const config = e.data;
  const terrainData = generateChunkTerrain(config);

  // 发送生成结果（传输 ArrayBuffer，提高性能）
  ctx.postMessage(terrainData, [terrainData.blocks]);
};
