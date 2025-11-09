import type { AdvancedTerrainConfig } from './advancedTerrain';

export interface TerrainConfig {
  chunkX: number;
  chunkZ: number;
  chunkSize: number;
  chunkHeight: number;
  terrainConfig: AdvancedTerrainConfig;
}

export interface TerrainData {
  chunkX: number;
  chunkZ: number;
  blocks: ArrayBuffer;
}
