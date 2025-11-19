import type { ChunkManager } from '../world/chunkManager';
import type { Player } from '../player';
import { BlockType } from '../world/block';
import { CHUNK_HEIGHT, CHUNK_SIZE } from '../world/chunkConstants';

interface PlayerSaveData {
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
  };
}

interface ChunkData {
  chunkX: number;
  chunkZ: number;
  blocks: number[];
}

interface SaveData {
  version: string;
  timestamp: number;
  player: PlayerSaveData;
  world: {
    chunks: ChunkData[];
  };
}

const SAVE_KEY = 'minecraft-web-save';
const CURRENT_VERSION = '1.0.0';

export class SaveManager {
  private chunkManager: ChunkManager;

  private player: Player;

  constructor(chunkManager: ChunkManager, player: Player) {
    this.chunkManager = chunkManager;
    this.player = player;
  }

  save(): boolean {
    try {
      const saveData: SaveData = {
        version: CURRENT_VERSION,
        timestamp: Date.now(),
        player: this.getPlayerData(),
        world: {
          chunks: this.getChunksData()
        }
      };

      const jsonData = JSON.stringify(saveData);
      localStorage.setItem(SAVE_KEY, jsonData);

      console.log('💾 游戏已保存', {
        playerPos: saveData.player.position,
        chunks: saveData.world.chunks.length,
        timestamp: new Date(saveData.timestamp).toLocaleString()
      });

      return true;
    } catch (error) {
      console.error('❌ 保存失败:', error);
      return false;
    }
  }

  load(): boolean {
    try {
      const jsonData = localStorage.getItem(SAVE_KEY);

      if (!jsonData) {
        console.warn('⚠️ 未找到存档');
        return false;
      }

      const saveData: SaveData = JSON.parse(jsonData);

      if (!this.validateSaveData(saveData)) {
        console.error('❌ 存档数据无效');
        return false;
      }

      this.applyPlayerData(saveData.player);
      this.applyChunksData(saveData.world.chunks);

      console.log('📂 存档已加载', {
        playerPos: saveData.player.position,
        chunks: saveData.world.chunks.length,
        timestamp: new Date(saveData.timestamp).toLocaleString()
      });

      return true;
    } catch (error) {
      console.error('❌ 加载失败:', error);
      return false;
    }
  }

  deleteSave(): boolean {
    try {
      localStorage.removeItem(SAVE_KEY);
      console.log('🗑️ 存档已删除');
      return true;
    } catch (error) {
      console.error('❌ 删除存档失败:', error);
      return false;
    }
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  private getPlayerData(): PlayerSaveData {
    const position = this.player.getPosition();
    const rotation = this.player.getRotation();

    return {
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      },
      rotation: {
        x: rotation.x,
        y: rotation.y
      }
    };
  }

  private getChunksData(): ChunkData[] {
    const chunksData: ChunkData[] = [];
    const chunks = this.chunkManager.getAllChunks();

    for (const chunk of chunks) {
      const blockData = chunk.getBlocksData();

      if (!this.hasNonAirBlocks(blockData)) {
        continue;
      }

      chunksData.push({
        chunkX: chunk.chunkX,
        chunkZ: chunk.chunkZ,
        blocks: Array.from(blockData)
      });
    }

    return chunksData;
  }

  private hasNonAirBlocks(blocks: Uint8Array): boolean {
    for (const block of blocks) {
      if (block !== BlockType.AIR) {
        return true;
      }
    }
    return false;
  }

  private validateSaveData(data: SaveData): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.version || !data.timestamp || !data.player || !data.world) {
      return false;
    }

    if (
      !data.player.position ||
      typeof data.player.position.x !== 'number' ||
      typeof data.player.position.y !== 'number' ||
      typeof data.player.position.z !== 'number'
    ) {
      return false;
    }

    if (
      !data.player.rotation ||
      typeof data.player.rotation.x !== 'number' ||
      typeof data.player.rotation.y !== 'number'
    ) {
      return false;
    }

    if (!Array.isArray(data.world.chunks)) {
      return false;
    }

    const expectedLength = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;

    for (const chunk of data.world.chunks) {
      if (
        !chunk ||
        typeof chunk !== 'object' ||
        typeof chunk.chunkX !== 'number' ||
        typeof chunk.chunkZ !== 'number' ||
        !Array.isArray(chunk.blocks) ||
        chunk.blocks.length !== expectedLength
      ) {
        return false;
      }

      for (const value of chunk.blocks) {
        if (typeof value !== 'number') {
          return false;
        }
      }
    }

    return true;
  }

  private applyPlayerData(playerData: PlayerSaveData): void {
    this.player.setPosition(playerData.position.x, playerData.position.y, playerData.position.z);
    this.player.setRotation(playerData.rotation.x, playerData.rotation.y);
  }

  private applyChunksData(chunksData: ChunkData[]): void {
    // 清除现有的 Chunk
    this.chunkManager.clearAll();

    const expectedLength = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;

    // 应用保存的 Chunk 数据
    for (const chunkData of chunksData) {
      if (chunkData.blocks.length !== expectedLength) {
        console.warn('⚠️ 存档 Chunk 数据长度不正确，已跳过', chunkData);
        continue;
      }

      const chunk = this.chunkManager.getOrCreateChunk(chunkData.chunkX, chunkData.chunkZ);

      const blocks = new Uint8Array(chunkData.blocks);
      chunk.applyBlocksData(blocks);
      chunk.generateMesh();
    }
  }
}
