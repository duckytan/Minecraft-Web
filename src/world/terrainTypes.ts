import type { AdvancedTerrainConfig } from './advancedTerrain';
import type { PerlinTerrainConfig } from './perlinTerrainGenerator';

export interface TerrainConfig {
  chunkX: number;
  chunkZ: number;
  chunkSize: number;
  chunkHeight: number;
  terrainConfig: AdvancedTerrainConfig | PerlinTerrainConfig;
}

export interface TerrainData {
  chunkX: number;
  chunkZ: number;
  blocks: ArrayBufferLike;
}
