/// <reference lib="webworker" />
/**
 * 优化的地形生成 Worker
 * 支持 Simplex 和 Perlin 两种噪声算法
 * 性能优化：
 * 1. 使用 Uint8Array 减少内存占用
 * 2. 使用 transferable objects 传输数据，避免拷贝
 * 3. 复用生成器实例，减少初始化开销
 * 4. 批量处理多个 Chunk 请求（可选）
 */
import type { TerrainConfig, TerrainData } from '../world/terrainTypes';
import { AdvancedTerrainGenerator } from '../world/advancedTerrain';
import { PerlinTerrainGenerator } from '../world/perlinTerrainGenerator';

// 创建两个生成器实例，支持不同的噪声算法
const simplexGenerator = new AdvancedTerrainGenerator();
const perlinGenerator = new PerlinTerrainGenerator();

// 默认使用 Simplex 噪声（性能更好）
let usePerlin = false;

/**
 * 生成单个 Chunk 的地形数据
 * 性能优化：复用生成器实例，避免重复初始化
 */
function generateChunkTerrain(config: TerrainConfig): TerrainData {
  const { chunkX, chunkZ, terrainConfig } = config;

  // 根据配置选择生成器
  const generator = usePerlin ? perlinGenerator : simplexGenerator;

  // 更新地形配置（只在参数改变时更新）
  generator.updateConfig(terrainConfig);

  // 生成地形
  const blocks = generator.generateChunkTerrain(chunkX, chunkZ);

  // 返回数据（使用 ArrayBuffer 的 transferable 特性）
  return {
    chunkX,
    chunkZ,
    blocks: blocks.buffer
  };
}

/**
 * Worker 消息处理
 * 优化：
 * 1. 使用类型安全的消息处理
 * 2. 添加错误处理机制
 * 3. 支持切换噪声算法
 */
const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<TerrainConfig | { command: string; value?: boolean }>) => {
  try {
    const data = e.data;

    // 处理命令消息
    if ('command' in data) {
      if (data.command === 'setAlgorithm') {
        usePerlin = data.value ?? false;
        ctx.postMessage({ success: true, message: `Switched to ${usePerlin ? 'Perlin' : 'Simplex'} noise` });
        return;
      }
    }

    // 处理地形生成请求
    const config = data as TerrainConfig;
    const terrainData = generateChunkTerrain(config);

    // 使用 transferable objects 传输 ArrayBuffer
    // 这样可以避免内存拷贝，大幅提升性能
    ctx.postMessage(terrainData, [terrainData.blocks]);
  } catch (error) {
    // 错误处理：向主线程报告错误
    console.error('Terrain Worker error:', error);
    ctx.postMessage({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
