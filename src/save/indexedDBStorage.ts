import { CHUNK_HEIGHT, CHUNK_SIZE } from '../world/chunk';

export interface ChunkReference {
  chunkX: number;
  chunkZ: number;
}

export interface StoredChunkData extends ChunkReference {
  blocks: Uint8Array;
}

interface IndexedDBStorageOptions {
  dbName?: string;
  storeName?: string;
  indexedDB?: IDBFactory | null;
}

interface IDBChunkRecord {
  id: string;
  chunkX: number;
  chunkZ: number;
  blocks: ArrayBuffer;
  updatedAt: number;
}

/**
 * 使用 IndexedDB 存储 Chunk 数据，支持内存回退。
 */
export class IndexedDBStorage {
  private readonly dbName: string;

  private readonly storeName: string;

  private readonly indexedDBFactory: IDBFactory | null;

  private dbPromise: Promise<IDBDatabase> | null;

  private readonly memoryStore = new Map<string, Uint8Array>();

  constructor(options: IndexedDBStorageOptions = {}) {
    this.dbName = options.dbName ?? 'minecraft-web';
    this.storeName = options.storeName ?? 'chunks';
    this.indexedDBFactory = options.indexedDB ?? (typeof indexedDB === 'undefined' ? null : indexedDB);
    this.dbPromise = this.indexedDBFactory ? this.openDatabase() : null;
  }

  get isSupported(): boolean {
    return this.indexedDBFactory !== null;
  }

  async saveChunks(chunks: StoredChunkData[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    if (!this.isSupported) {
      for (const chunk of chunks) {
        const key = this.getChunkKey(chunk);
        this.memoryStore.set(key, chunk.blocks.slice());
      }
      return;
    }

    const db = await this.ensureDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction error'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));

      for (const chunk of chunks) {
        const record: IDBChunkRecord = {
          id: this.getChunkKey(chunk),
          chunkX: chunk.chunkX,
          chunkZ: chunk.chunkZ,
          blocks: chunk.blocks.slice().buffer,
          updatedAt: Date.now()
        };
        store.put(record);
      }
    });
  }

  async loadChunks(references: ChunkReference[]): Promise<StoredChunkData[]> {
    if (references.length === 0) {
      return [];
    }

    if (!this.isSupported) {
      const result: StoredChunkData[] = [];
      for (const ref of references) {
        const key = this.getChunkKey(ref);
        const blocks = this.memoryStore.get(key);
        if (blocks) {
          result.push({ chunkX: ref.chunkX, chunkZ: ref.chunkZ, blocks: blocks.slice() });
        }
      }
      return result;
    }

    const db = await this.ensureDatabase();
    const chunks: StoredChunkData[] = [];

    await Promise.all(
      references.map(
        (ref) =>
          new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(this.getChunkKey(ref));

            request.onsuccess = () => {
              const record = request.result as IDBChunkRecord | undefined;
              if (record?.blocks) {
                const blocks = new Uint8Array(record.blocks.slice(0));
                if (blocks.length === CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE) {
                  chunks.push({ chunkX: ref.chunkX, chunkZ: ref.chunkZ, blocks });
                }
              }
              resolve();
            };

            request.onerror = () => reject(request.error ?? new Error('IndexedDB get error'));
          })
      )
    );

    return chunks;
  }

  async clearAll(): Promise<void> {
    if (!this.isSupported) {
      this.memoryStore.clear();
      return;
    }

    const db = await this.ensureDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction error'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));

      store.clear();
    });
  }

  async hasData(): Promise<boolean> {
    if (!this.isSupported) {
      return this.memoryStore.size > 0;
    }

    const db = await this.ensureDatabase();
    return await new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve((request.result ?? 0) > 0);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB count error'));
    });
  }

  private getChunkKey(ref: ChunkReference): string {
    return `${ref.chunkX}:${ref.chunkZ}`;
  }

  private async ensureDatabase(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      throw new Error('IndexedDB is not supported in this environment');
    }
    return this.dbPromise;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = this.indexedDBFactory!.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open error'));
      request.onblocked = () => reject(new Error('IndexedDB open blocked'));
    });
  }
}
