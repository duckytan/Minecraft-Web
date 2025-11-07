import { describe, expect, it } from 'vitest';

import { BLOCK_COLORS, BLOCK_SIZE, BlockType } from '@/world/block';

describe('Block Types', () => {
  it('should have all block types defined', () => {
    expect(BlockType.AIR).toBe(0);
    expect(BlockType.GRASS).toBe(1);
    expect(BlockType.DIRT).toBe(2);
    expect(BlockType.STONE).toBe(3);
    expect(BlockType.WOOD).toBe(4);
    expect(BlockType.LEAVES).toBe(5);
  });

  it('should have correct colors for all block types', () => {
    expect(BLOCK_COLORS[BlockType.AIR]).toBe(0x000000);
    expect(BLOCK_COLORS[BlockType.GRASS]).toBe(0x5cb85c);
    expect(BLOCK_COLORS[BlockType.DIRT]).toBe(0x8b6f47);
    expect(BLOCK_COLORS[BlockType.STONE]).toBe(0x808080);
    expect(BLOCK_COLORS[BlockType.WOOD]).toBe(0x8b4513);
    expect(BLOCK_COLORS[BlockType.LEAVES]).toBe(0x228b22);
  });

  it('should have correct block size', () => {
    expect(BLOCK_SIZE).toBe(1);
  });
});
