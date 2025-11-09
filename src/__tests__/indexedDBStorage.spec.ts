import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDBStorage } from '../save/indexedDBStorage';
import { BlockType } from '../world/block';
import { CHUNK_HEIGHT, CHUNK_SIZE } from '../world/chunk';

describe('IndexedDBStorage', () => {
  let storage: IndexedDBStorage;

  beforeEach(() => {
    // IndexedDB 在 jsdom 中不可用，测试将使用内存存储
    storage = new IndexedDBStorage();
  });

  afterEach(async () => {
    await storage.clearAll();
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(storage).toBeDefined();
      expect(storage.isSupported).toBe(false); // jsdom 环境不支持 IndexedDB
    });

    it('初始状态应该没有数据', async () => {
      const hasData = await storage.hasData();
      expect(hasData).toBe(false);
    });
  });

  describe('saveChunks', () => {
    it('应该能保存单个 Chunk', async () => {
      const chunkSize = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
      const blocks = new Uint8Array(chunkSize);
      blocks.fill(BlockType.STONE);

      await storage.saveChunks([{ chunkX: 0, chunkZ: 0, blocks }]);

      const hasData = await storage.hasData();
      expect(hasData).toBe(true);
    });

    it('应该能保存多个 Chunk', async () => {
      const chunkSize = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
      const chunks = [
        { chunkX: 0, chunkZ: 0, blocks: new Uint8Array(chunkSize).fill(BlockType.STONE) },
        { chunkX: 1, chunkZ: 0, blocks: new Uint8Array(chunkSize).fill(BlockType.GRASS) },
        { chunkX: 0, chunkZ: 1, blocks: new Uint8Array(chunkSize).fill(BlockType.DIRT) }
      ];

      await storage.saveChunks(chunks);

      const hasData = await storage.hasData();
      expect(hasData).toBe(true);
    });

    it('保存空数组不应该报错', async () => {
      await expect(storage.saveChunks([])).resolves.not.toThrow();
    });

    it('应该能覆盖已存在的 Chunk', async () => {
      const chunkSize = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
      const blocks1 = new Uint8Array(chunkSize).fill(BlockType.STONE);
      const blocks2 = new Uint8Array(chunkSize).fill(BlockType.GRASS);

      await storage.saveChunks([{ chunkX: 0, chunkZ: 0, blocks: blocks1 }]);
      await storage.saveChunks([{ chunkX: 0, chunkZ: 0, blocks: blocks2 }]);

      const loaded = await storage.loadChunks([{ chunkX: 0, chunkZ: 0 }]);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].blocks[0]).toBe(BlockType.GRASS);
    });
  });

  describe('loadChunks', () => {
    it('应该能加载已保存的 Chunk', async () => {
      const chunkSize = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
      const blocks = new Uint8Array(chunkSize);
      blocks[0] = BlockType.STONE;
      blocks[100] = BlockType.GRASS;

      await storage.saveChunks([{ chunkX: 1, chunkZ: 2, blocks }]);

      const loaded = await storage.loadChunks([{ chunkX: 1, chunkZ: 2 }]);

      expect(loaded).toHaveLength(1);
      expect(loaded[0].chunkX).toBe(1);
      expect(loaded[0].chunkZ).toBe(2);
      expect(loaded[0].blocks[0]).toBe(BlockType.STONE);
      expect(loaded[0].blocks[100]).toBe(BlockType.GRASS);
    });

    it('加载不存在的 Chunk 应该返回空数组', async () => {
      const loaded = await storage.loadChunks([{ chunkX: 99, chunkZ: 99 }]);
      expect(loaded).toHaveLength(0);
    });

    it('应该能批量加载多个 Chunk', async () => {
      const chunkSize = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
      const chunks = [
        { chunkX: 0, chunkZ: 0, blocks: new Uint8Array(chunkSize).fill(BlockType.STONE) },
        { chunkX: 1, chunkZ: 0, blocks: new Uint8Array(chunkSize).fill(BlockType.GRASS) },
        { chunkX: 0, chunkZ: 1, blocks: new Uint8Array(chunkSize).fill(BlockType.DIRT) }
      ];

      await storage.saveChunks(chunks);

      const loaded = await storage.loadChunks([
        { chunkX: 0, chunkZ: 0 },
        { chunkX: 1, chunkZ: 0 },
        { chunkX: 0, chunkZ: 1 }
      ]);

      expect(loaded).toHaveLength(3);
      expect(loaded[0].blocks[0]).toBe(BlockType.STONE);
      expect(loaded[1].blocks[0]).toBe(BlockType.GRASS);
      expect(loaded[2].blocks[0]).toBe(BlockType.DIRT);
    });

    it('部分存在的 Chunk 请求应该只返回存在的', async () => {
      const chunkSize = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
      await storage.saveChunks([{ chunkX: 0, chunkZ: 0, blocks: new Uint8Array(chunkSize).fill(BlockType.STONE) }]);

      const loaded = await storage.loadChunks([
        { chunkX: 0, chunkZ: 0 },
        { chunkX: 99, chunkZ: 99 }
      ]);

      expect(loaded).toHaveLength(1);
      expect(loaded[0].chunkX).toBe(0);
      expect(loaded[0].chunkZ).toBe(0);
    });

    it('加载空数组不应该报错', async () => {
      const loaded = await storage.loadChunks([]);
      expect(loaded).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('应该清除所有数据', async () => {
      const chunkSize = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
      const chunks = [
        { chunkX: 0, chunkZ: 0, blocks: new Uint8Array(chunkSize).fill(BlockType.STONE) },
        { chunkX: 1, chunkZ: 1, blocks: new Uint8Array(chunkSize).fill(BlockType.GRASS) }
      ];

      await storage.saveChunks(chunks);
      expect(await storage.hasData()).toBe(true);

      await storage.clearAll();
      expect(await storage.hasData()).toBe(false);
    });

    it('清除后加载应该返回空结果', async () => {
      const chunkSize = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
      await storage.saveChunks([{ chunkX: 0, chunkZ: 0, blocks: new Uint8Array(chunkSize).fill(BlockType.STONE) }]);
      await storage.clearAll();

      const loaded = await storage.loadChunks([{ chunkX: 0, chunkZ: 0 }]);
      expect(loaded).toHaveLength(0);
    });

    it('空数据库清除不应该报错', async () => {
      await expect(storage.clearAll()).resolves.not.toThrow();
    });
  });

  describe('数据完整性', () => {
    it('保存和加载的数据应该完全一致', async () => {
      const chunkSize = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
      const blocks = new Uint8Array(chunkSize);

      // 填充一些测试数据
      for (let i = 0; i < chunkSize; i++) {
        blocks[i] = (i % 6) + 1; // 循环使用 1-6 的方块类型
      }

      await storage.saveChunks([{ chunkX: 5, chunkZ: 7, blocks }]);
      const loaded = await storage.loadChunks([{ chunkX: 5, chunkZ: 7 }]);

      expect(loaded).toHaveLength(1);
      expect(loaded[0].blocks).toEqual(blocks);
    });

    it('修改加载的数据不应该影响存储的数据', async () => {
      const chunkSize = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
      const blocks = new Uint8Array(chunkSize).fill(BlockType.STONE);

      await storage.saveChunks([{ chunkX: 0, chunkZ: 0, blocks }]);

      const loaded1 = await storage.loadChunks([{ chunkX: 0, chunkZ: 0 }]);
      loaded1[0].blocks[0] = BlockType.GRASS; // 修改加载的数据

      const loaded2 = await storage.loadChunks([{ chunkX: 0, chunkZ: 0 }]);
      expect(loaded2[0].blocks[0]).toBe(BlockType.STONE); // 存储的数据未被修改
    });
  });
});
