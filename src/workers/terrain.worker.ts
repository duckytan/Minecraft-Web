/// <reference lib="webworker" />
import type { TerrainConfig, TerrainData } from '../world/terrainTypes';
import { AdvancedTerrainGenerator } from '../world/advancedTerrain';

const terrainGenerator = new AdvancedTerrainGenerator();

/**
 * 生成单个 Chunk 的地形数据
 */
function generateChunkTerrain(config: TerrainConfig): TerrainData {
  const { chunkX, chunkZ, terrainConfig } = config;

  // 更新地形配置
  terrainGenerator.updateConfig(terrainConfig);

  // 生成地形
  const blocks = terrainGenerator.generateChunkTerrain(chunkX, chunkZ);

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
