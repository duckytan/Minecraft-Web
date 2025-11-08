export interface TerrainConfig {
  chunkX: number;
  chunkZ: number;
  chunkSize: number;
  chunkHeight: number;
  scale: number;
  heightMultiplier: number;
  baseHeight: number;
}

export interface TerrainData {
  chunkX: number;
  chunkZ: number;
  blocks: ArrayBuffer;
}
