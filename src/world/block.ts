export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  BEDROCK = 6,
  WATER = 7,
  SAND = 8,
  SNOW = 9,
  GLASS = 10,
  LAVA = 11,
  OBSIDIAN = 12,
  COAL_ORE = 13
}

export const BLOCK_COLORS: Record<BlockType, number> = {
  [BlockType.AIR]: 0x000000,
  [BlockType.GRASS]: 0x7ec850,
  [BlockType.DIRT]: 0x9b7653,
  [BlockType.STONE]: 0x999999,
  [BlockType.WOOD]: 0xa0724e,
  [BlockType.LEAVES]: 0x4caf50,
  [BlockType.BEDROCK]: 0x2a2a2a,
  [BlockType.WATER]: 0x4fc3f7,
  [BlockType.SAND]: 0xedc9af,
  [BlockType.SNOW]: 0xffffff,
  [BlockType.GLASS]: 0xbfe7f5,
  [BlockType.LAVA]: 0xff6b35,
  [BlockType.OBSIDIAN]: 0x1a0933,
  [BlockType.COAL_ORE]: 0x4a4a4a
};

export const BLOCK_SIZE = 1;

export interface BlockData {
  type: BlockType;
  x: number;
  y: number;
  z: number;
}
