import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { SaveManager } from '../save/saveManager';
import { ChunkManager } from '../world/chunkManager';
import { Player } from '../player';
import { KeyboardInput } from '../input/keyboard';
import { BlockType } from '../world/block';

describe('SaveManager', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let chunkManager: ChunkManager;
  let keyboard: KeyboardInput;
  let player: Player;
  let saveManager: SaveManager;

  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    chunkManager = new ChunkManager(scene, 1);
    keyboard = new KeyboardInput();
    player = new Player(camera, keyboard);
    saveManager = new SaveManager(chunkManager, player);
  });

  afterEach(() => {
    chunkManager.dispose();
    localStorage.clear();
  });

  describe('save', () => {
    it('应该成功保存游戏状态', () => {
      player.setPosition(10, 20, 30);
      player.setRotation(0.5, 1.0);

      const result = saveManager.save();

      expect(result).toBe(true);
      expect(saveManager.hasSave()).toBe(true);
    });

    it('应该保存玩家位置', () => {
      player.setPosition(10, 20, 30);
      saveManager.save();

      const savedData = JSON.parse(localStorage.getItem('minecraft-web-save')!);

      expect(savedData.player.position).toEqual({
        x: 10,
        y: 20,
        z: 30
      });
    });

    it('应该保存玩家旋转', () => {
      player.setRotation(0.5, 1.0);
      saveManager.save();

      const savedData = JSON.parse(localStorage.getItem('minecraft-web-save')!);

      expect(savedData.player.rotation).toEqual({
        x: 0.5,
        y: 1.0
      });
    });

    it('应该保存世界数据', () => {
      // 创建一个简单的 Chunk 并添加一些方块
      chunkManager.generateFlatTerrain(0, 0, 0);

      saveManager.save();

      const savedData = JSON.parse(localStorage.getItem('minecraft-web-save')!);

      expect(savedData.world.chunks).toBeDefined();
      expect(Array.isArray(savedData.world.chunks)).toBe(true);
      expect(savedData.world.chunks.length).toBeGreaterThan(0);
    });

    it('应该包含版本信息和时间戳', () => {
      saveManager.save();

      const savedData = JSON.parse(localStorage.getItem('minecraft-web-save')!);

      expect(savedData.version).toBe('1.0.0');
      expect(typeof savedData.timestamp).toBe('number');
      expect(savedData.timestamp).toBeGreaterThan(0);
    });
  });

  describe('load', () => {
    it('当没有存档时应该返回 false', () => {
      const result = saveManager.load();

      expect(result).toBe(false);
    });

    it('应该成功加载已保存的游戏', () => {
      player.setPosition(10, 20, 30);
      player.setRotation(0.5, 1.0);
      saveManager.save();

      // 重置玩家位置
      player.setPosition(0, 0, 0);
      player.setRotation(0, 0);

      const result = saveManager.load();

      expect(result).toBe(true);
    });

    it('应该恢复玩家位置', () => {
      player.setPosition(10, 20, 30);
      saveManager.save();

      player.setPosition(0, 0, 0);
      saveManager.load();

      const position = player.getPosition();

      expect(position.x).toBe(10);
      expect(position.y).toBe(20);
      expect(position.z).toBe(30);
    });

    it('应该恢复玩家旋转', () => {
      player.setRotation(0.5, 1.0);
      saveManager.save();

      player.setRotation(0, 0);
      saveManager.load();

      const rotation = player.getRotation();

      expect(rotation.x).toBe(0.5);
      expect(rotation.y).toBe(1.0);
    });

    it('应该清除现有世界并加载保存的世界', () => {
      chunkManager.generateFlatTerrain(0, 0, 0);
      const initialChunkCount = chunkManager.getLoadedChunkCount();
      saveManager.save();

      chunkManager.clearAll();
      expect(chunkManager.getLoadedChunkCount()).toBe(0);

      saveManager.load();

      expect(chunkManager.getLoadedChunkCount()).toBe(initialChunkCount);
    });

    it('当存档数据无效时应该返回 false', () => {
      localStorage.setItem('minecraft-web-save', 'invalid json');

      const result = saveManager.load();

      expect(result).toBe(false);
    });

    it('当存档数据缺少必需字段时应该返回 false', () => {
      localStorage.setItem('minecraft-web-save', JSON.stringify({ invalid: true }));

      const result = saveManager.load();

      expect(result).toBe(false);
    });
  });

  describe('deleteSave', () => {
    it('应该成功删除存档', () => {
      saveManager.save();
      expect(saveManager.hasSave()).toBe(true);

      const result = saveManager.deleteSave();

      expect(result).toBe(true);
      expect(saveManager.hasSave()).toBe(false);
    });

    it('当没有存档时仍应该返回 true', () => {
      const result = saveManager.deleteSave();

      expect(result).toBe(true);
    });
  });

  describe('hasSave', () => {
    it('当没有存档时应该返回 false', () => {
      expect(saveManager.hasSave()).toBe(false);
    });

    it('当有存档时应该返回 true', () => {
      saveManager.save();

      expect(saveManager.hasSave()).toBe(true);
    });

    it('删除存档后应该返回 false', () => {
      saveManager.save();
      saveManager.deleteSave();

      expect(saveManager.hasSave()).toBe(false);
    });
  });

  describe('chunk data handling', () => {
    it('应该只保存非空的 Chunk', () => {
      const chunk = chunkManager.getOrCreateChunk(0, 0);

      // 设置一些方块
      chunk.setBlock(0, 0, 0, BlockType.STONE);
      chunk.setBlock(1, 1, 1, BlockType.GRASS);
      chunk.generateMesh();

      saveManager.save();

      const savedData = JSON.parse(localStorage.getItem('minecraft-web-save')!);

      expect(savedData.world.chunks.length).toBeGreaterThan(0);
    });

    it('应该正确序列化和反序列化方块数据', () => {
      const chunk = chunkManager.getOrCreateChunk(0, 0);

      chunk.setBlock(0, 0, 0, BlockType.STONE);
      chunk.setBlock(1, 1, 1, BlockType.GRASS);
      chunk.setBlock(2, 2, 2, BlockType.DIRT);
      chunk.generateMesh();

      saveManager.save();
      chunkManager.clearAll();
      saveManager.load();

      const loadedChunk = chunkManager.getChunk(0, 0);

      expect(loadedChunk).not.toBeNull();
      expect(loadedChunk!.getBlock(0, 0, 0)).toBe(BlockType.STONE);
      expect(loadedChunk!.getBlock(1, 1, 1)).toBe(BlockType.GRASS);
      expect(loadedChunk!.getBlock(2, 2, 2)).toBe(BlockType.DIRT);
    });

    it('应该保存多个 Chunk', () => {
      chunkManager.generateFlatTerrain(0, 0, 1);

      saveManager.save();

      const savedData = JSON.parse(localStorage.getItem('minecraft-web-save')!);

      // 应该有多个 Chunk (3x3 = 9 个)
      expect(savedData.world.chunks.length).toBeGreaterThan(1);
    });
  });
});
