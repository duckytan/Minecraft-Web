export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  BEDROCK = 6,
  WATER = 7
}

export const BLOCK_COLORS: Record<BlockType, number> = {
  [BlockType.AIR]: 0x000000,
  [BlockType.GRASS]: 0x5cb85c,
  [BlockType.DIRT]: 0x8b6f47,
  [BlockType.STONE]: 0x808080,
  [BlockType.WOOD]: 0x8b4513,
  [BlockType.LEAVES]: 0x228b22,
  [BlockType.BEDROCK]: 0x1a1a1a,
  [BlockType.WATER]: 0x4a90e2
};

export const BLOCK_SIZE = 1;

export interface BlockData {
  type: BlockType;
  x: number;
  y: number;
  z: number;
}
