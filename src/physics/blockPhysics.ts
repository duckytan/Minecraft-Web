import { BlockType } from '../world/block';
import { ChunkManager, type BlockChange } from '../world/chunkManager';
import { CHUNK_HEIGHT, CHUNK_SIZE } from '../world/chunkConstants';
import {
  BLOCK_PHYSICS_UPDATE_INTERVAL,
  MAX_NEW_TIMERS_PER_STEP,
  MAX_SAND_UPDATES_PER_STEP,
  MAX_WATER_UPDATES_PER_STEP,
  SAND_CHUNK_SAMPLE_COUNT,
  SNOW_CHUNK_SAMPLE_COUNT,
  SOIL_CHUNK_SAMPLE_COUNT,
  WATER_CHUNK_SAMPLE_COUNT
} from '../core/constants';

interface BlockTimer {
  x: number;
  y: number;
  z: number;
  elapsed: number;
  targetTime: number;
}

type PlannedChanges = Map<string, BlockChange>;

const WATER_FLOW_DIRECTIONS = [
  { dx: 0, dy: -1, dz: 0 },
  { dx: 1, dy: 0, dz: 0 },
  { dx: 0, dy: 0, dz: 1 },
  { dx: -1, dy: 0, dz: 0 },
  { dx: 0, dy: 0, dz: -1 }
] as const;

const ADJACENT_DIRECTIONS = [
  { dx: 1, dy: 0, dz: 0 },
  { dx: -1, dy: 0, dz: 0 },
  { dx: 0, dy: 1, dz: 0 },
  { dx: 0, dy: -1, dz: 0 },
  { dx: 0, dy: 0, dz: 1 },
  { dx: 0, dy: 0, dz: -1 }
] as const;

export class BlockPhysicsSystem {
  private readonly chunkManager: ChunkManager;
  private enabled = true;
  private accumulator = 0;
  private readonly updateInterval = BLOCK_PHYSICS_UPDATE_INTERVAL;

  private readonly waterChunkSample = WATER_CHUNK_SAMPLE_COUNT;
  private readonly sandChunkSample = SAND_CHUNK_SAMPLE_COUNT;
  private readonly soilChunkSample = SOIL_CHUNK_SAMPLE_COUNT;
  private readonly snowChunkSample = SNOW_CHUNK_SAMPLE_COUNT;

  private readonly maxWaterUpdatesPerStep = MAX_WATER_UPDATES_PER_STEP;
  private readonly maxSandUpdatesPerStep = MAX_SAND_UPDATES_PER_STEP;
  private readonly maxNewTimersPerStep = MAX_NEW_TIMERS_PER_STEP;

  private readonly dirtTimers = new Map<string, BlockTimer>();
  private readonly grassTimers = new Map<string, BlockTimer>();
  private readonly snowTimers = new Map<string, BlockTimer>();

  constructor(chunkManager: ChunkManager) {
    this.chunkManager = chunkManager;
  }

  public enable(): void {
    this.enabled = true;
  }

  public disable(): void {
    this.enabled = false;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public reset(): void {
    this.dirtTimers.clear();
    this.grassTimers.clear();
    this.snowTimers.clear();
    this.accumulator = 0;
  }

  public update(deltaTime: number): void {
    if (!this.enabled) {
      return;
    }

    this.accumulator += deltaTime;

    while (this.accumulator >= this.updateInterval) {
      this.performStep(this.updateInterval);
      this.accumulator -= this.updateInterval;
    }
  }

  private performStep(stepTime: number): void {
    const plannedChanges: PlannedChanges = new Map();

    this.updateWaterBlocks(plannedChanges);
    this.updateSandBlocks(plannedChanges);
    this.updateDirtBlocks(plannedChanges, stepTime);
    this.updateGrassBlocks(plannedChanges, stepTime);
    this.updateSnowBlocks(plannedChanges, stepTime);

    if (plannedChanges.size > 0) {
      this.chunkManager.applyBlockChanges(Array.from(plannedChanges.values()));
    }
  }

  private updateWaterBlocks(planned: PlannedChanges): void {
    const chunks = this.chunkManager.getAllChunks();
    if (chunks.length === 0) {
      return;
    }

    const selectedChunks = this.selectRandomChunks(chunks, this.waterChunkSample);
    let updates = 0;

    for (const chunk of selectedChunks) {
      if (updates >= this.maxWaterUpdatesPerStep) {
        break;
      }

      const baseX = chunk.chunkX * CHUNK_SIZE;
      const baseZ = chunk.chunkZ * CHUNK_SIZE;

      for (let y = CHUNK_HEIGHT - 1; y >= 0 && updates < this.maxWaterUpdatesPerStep; y--) {
        for (let lx = 0; lx < CHUNK_SIZE && updates < this.maxWaterUpdatesPerStep; lx++) {
          for (let lz = 0; lz < CHUNK_SIZE && updates < this.maxWaterUpdatesPerStep; lz++) {
            if (chunk.getBlock(lx, y, lz) !== BlockType.WATER) {
              continue;
            }

            const worldX = baseX + lx;
            const worldZ = baseZ + lz;
            const key = this.getBlockKey(worldX, y, worldZ);
            const pending = planned.get(key);

            if (pending && pending.type !== BlockType.WATER) {
              continue;
            }

            if (this.tryFlowWater(worldX, y, worldZ, planned)) {
              updates++;
            }
          }
        }
      }
    }
  }

  private tryFlowWater(x: number, y: number, z: number, planned: PlannedChanges): boolean {
    const currentType = this.getPlannedBlockType(x, y, z, planned);

    if (currentType !== BlockType.WATER) {
      return false;
    }

    for (const dir of WATER_FLOW_DIRECTIONS) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      const nz = z + dir.dz;

      if (ny < 0 || ny >= CHUNK_HEIGHT) {
        continue;
      }

      const neighborType = this.getPlannedBlockType(nx, ny, nz, planned);
      if (neighborType !== BlockType.AIR) {
        continue;
      }

      this.queueChange(planned, nx, ny, nz, BlockType.WATER);
      this.queueChange(planned, x, y, z, BlockType.AIR);
      return true;
    }

    return false;
  }

  private updateSandBlocks(planned: PlannedChanges): void {
    const chunks = this.chunkManager.getAllChunks();
    if (chunks.length === 0) {
      return;
    }

    const selectedChunks = this.selectRandomChunks(chunks, this.sandChunkSample);
    let updates = 0;

    for (const chunk of selectedChunks) {
      if (updates >= this.maxSandUpdatesPerStep) {
        break;
      }

      const baseX = chunk.chunkX * CHUNK_SIZE;
      const baseZ = chunk.chunkZ * CHUNK_SIZE;

      for (let y = 1; y < CHUNK_HEIGHT && updates < this.maxSandUpdatesPerStep; y++) {
        for (let lx = 0; lx < CHUNK_SIZE && updates < this.maxSandUpdatesPerStep; lx++) {
          for (let lz = 0; lz < CHUNK_SIZE && updates < this.maxSandUpdatesPerStep; lz++) {
            if (chunk.getBlock(lx, y, lz) !== BlockType.SAND) {
              continue;
            }

            const worldX = baseX + lx;
            const worldZ = baseZ + lz;
            const currentType = this.getPlannedBlockType(worldX, y, worldZ, planned);

            if (currentType !== BlockType.SAND) {
              continue;
            }

            const belowType = this.getPlannedBlockType(worldX, y - 1, worldZ, planned);
            if (belowType !== BlockType.AIR && belowType !== BlockType.WATER) {
              continue;
            }

            this.queueChange(planned, worldX, y, worldZ, BlockType.AIR);
            this.queueChange(planned, worldX, y - 1, worldZ, BlockType.SAND);
            updates++;
          }
        }
      }
    }
  }

  private updateDirtBlocks(planned: PlannedChanges, stepTime: number): void {
    const removals: string[] = [];

    for (const [key, timer] of this.dirtTimers) {
      const currentType = this.getPlannedBlockType(timer.x, timer.y, timer.z, planned);
      if (currentType !== BlockType.DIRT) {
        removals.push(key);
        continue;
      }

      if (!this.hasWaterNearby(timer.x, timer.y, timer.z, 3, planned)) {
        removals.push(key);
        continue;
      }

      timer.elapsed += stepTime;
      if (timer.elapsed >= timer.targetTime) {
        this.queueChange(planned, timer.x, timer.y, timer.z, BlockType.GRASS);
        removals.push(key);
      }
    }

    for (const key of removals) {
      this.dirtTimers.delete(key);
    }

    const chunks = this.chunkManager.getAllChunks();
    if (chunks.length === 0) {
      return;
    }

    const selectedChunks = this.selectRandomChunks(chunks, this.soilChunkSample);
    let addedTimers = 0;

    for (const chunk of selectedChunks) {
      if (addedTimers >= this.maxNewTimersPerStep) {
        break;
      }

      const baseX = chunk.chunkX * CHUNK_SIZE;
      const baseZ = chunk.chunkZ * CHUNK_SIZE;

      for (let y = 0; y < CHUNK_HEIGHT && addedTimers < this.maxNewTimersPerStep; y++) {
        for (let lx = 0; lx < CHUNK_SIZE && addedTimers < this.maxNewTimersPerStep; lx++) {
          for (let lz = 0; lz < CHUNK_SIZE && addedTimers < this.maxNewTimersPerStep; lz++) {
            if (chunk.getBlock(lx, y, lz) !== BlockType.DIRT) {
              continue;
            }

            const worldX = baseX + lx;
            const worldZ = baseZ + lz;
            const key = this.getBlockKey(worldX, y, worldZ);

            if (this.dirtTimers.has(key)) {
              continue;
            }

            const currentType = this.getPlannedBlockType(worldX, y, worldZ, planned);
            if (currentType !== BlockType.DIRT) {
              continue;
            }

            if (!this.hasWaterNearby(worldX, y, worldZ, 3, planned)) {
              continue;
            }

            this.dirtTimers.set(key, {
              x: worldX,
              y,
              z: worldZ,
              elapsed: 0,
              targetTime: 5 + Math.random() * 5
            });
            addedTimers++;
          }
        }
      }
    }
  }

  private updateGrassBlocks(planned: PlannedChanges, stepTime: number): void {
    const removals: string[] = [];

    for (const [key, timer] of this.grassTimers) {
      const currentType = this.getPlannedBlockType(timer.x, timer.y, timer.z, planned);
      if (currentType !== BlockType.GRASS) {
        removals.push(key);
        continue;
      }

      if (this.hasWaterNearby(timer.x, timer.y, timer.z, 3, planned)) {
        removals.push(key);
        continue;
      }

      timer.elapsed += stepTime;
      if (timer.elapsed >= timer.targetTime) {
        this.queueChange(planned, timer.x, timer.y, timer.z, BlockType.DIRT);
        removals.push(key);
      }
    }

    for (const key of removals) {
      this.grassTimers.delete(key);
    }

    const chunks = this.chunkManager.getAllChunks();
    if (chunks.length === 0) {
      return;
    }

    const selectedChunks = this.selectRandomChunks(chunks, this.soilChunkSample);
    let addedTimers = 0;

    for (const chunk of selectedChunks) {
      if (addedTimers >= this.maxNewTimersPerStep) {
        break;
      }

      const baseX = chunk.chunkX * CHUNK_SIZE;
      const baseZ = chunk.chunkZ * CHUNK_SIZE;

      for (let y = 0; y < CHUNK_HEIGHT && addedTimers < this.maxNewTimersPerStep; y++) {
        for (let lx = 0; lx < CHUNK_SIZE && addedTimers < this.maxNewTimersPerStep; lx++) {
          for (let lz = 0; lz < CHUNK_SIZE && addedTimers < this.maxNewTimersPerStep; lz++) {
            if (chunk.getBlock(lx, y, lz) !== BlockType.GRASS) {
              continue;
            }

            const worldX = baseX + lx;
            const worldZ = baseZ + lz;
            const key = this.getBlockKey(worldX, y, worldZ);

            if (this.grassTimers.has(key)) {
              continue;
            }

            const currentType = this.getPlannedBlockType(worldX, y, worldZ, planned);
            if (currentType !== BlockType.GRASS) {
              continue;
            }

            if (this.hasWaterNearby(worldX, y, worldZ, 3, planned)) {
              continue;
            }

            this.grassTimers.set(key, {
              x: worldX,
              y,
              z: worldZ,
              elapsed: 0,
              targetTime: 10 + Math.random() * 10
            });
            addedTimers++;
          }
        }
      }
    }
  }

  private updateSnowBlocks(planned: PlannedChanges, stepTime: number): void {
    const removals: string[] = [];

    for (const [key, timer] of this.snowTimers) {
      const currentType = this.getPlannedBlockType(timer.x, timer.y, timer.z, planned);
      if (currentType !== BlockType.SNOW) {
        removals.push(key);
        continue;
      }

      const aboveType = this.getPlannedBlockType(timer.x, timer.y + 1, timer.z, planned);
      if (aboveType !== BlockType.AIR) {
        removals.push(key);
        continue;
      }

      timer.elapsed += stepTime;
      if (timer.elapsed >= timer.targetTime) {
        this.queueChange(planned, timer.x, timer.y, timer.z, BlockType.WATER);
        removals.push(key);
      }
    }

    for (const key of removals) {
      this.snowTimers.delete(key);
    }

    const chunks = this.chunkManager.getAllChunks();
    if (chunks.length === 0) {
      return;
    }

    const selectedChunks = this.selectRandomChunks(chunks, this.snowChunkSample);
    let addedTimers = 0;

    for (const chunk of selectedChunks) {
      if (addedTimers >= this.maxNewTimersPerStep) {
        break;
      }

      const baseX = chunk.chunkX * CHUNK_SIZE;
      const baseZ = chunk.chunkZ * CHUNK_SIZE;

      for (let y = 0; y < CHUNK_HEIGHT && addedTimers < this.maxNewTimersPerStep; y++) {
        for (let lx = 0; lx < CHUNK_SIZE && addedTimers < this.maxNewTimersPerStep; lx++) {
          for (let lz = 0; lz < CHUNK_SIZE && addedTimers < this.maxNewTimersPerStep; lz++) {
            if (chunk.getBlock(lx, y, lz) !== BlockType.SNOW) {
              continue;
            }

            const worldX = baseX + lx;
            const worldZ = baseZ + lz;
            const key = this.getBlockKey(worldX, y, worldZ);

            if (this.snowTimers.has(key)) {
              continue;
            }

            const currentType = this.getPlannedBlockType(worldX, y, worldZ, planned);
            if (currentType !== BlockType.SNOW) {
              continue;
            }

            const aboveType = this.getPlannedBlockType(worldX, y + 1, worldZ, planned);
            if (aboveType !== BlockType.AIR) {
              continue;
            }

            const adjacentSnow = this.countAdjacentSnow(worldX, y, worldZ, planned);
            const baseTime = 6 + Math.random() * 4;
            const extraTime = adjacentSnow * 2.5;

            this.snowTimers.set(key, {
              x: worldX,
              y,
              z: worldZ,
              elapsed: 0,
              targetTime: baseTime + extraTime
            });
            addedTimers++;
          }
        }
      }
    }
  }

  private hasWaterNearby(
    x: number,
    y: number,
    z: number,
    radius: number,
    planned: PlannedChanges
  ): boolean {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const ny = y + dy;
          if (ny < 0 || ny >= CHUNK_HEIGHT) {
            continue;
          }

          const blockType = this.getPlannedBlockType(x + dx, ny, z + dz, planned);
          if (blockType === BlockType.WATER) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private countAdjacentSnow(x: number, y: number, z: number, planned: PlannedChanges): number {
    let count = 0;

    for (const dir of ADJACENT_DIRECTIONS) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      const nz = z + dir.dz;

      if (ny < 0 || ny >= CHUNK_HEIGHT) {
        continue;
      }

      if (this.getPlannedBlockType(nx, ny, nz, planned) === BlockType.SNOW) {
        count++;
      }
    }

    return count;
  }

  private getPlannedBlockType(x: number, y: number, z: number, planned: PlannedChanges): BlockType {
    if (y < 0 || y >= CHUNK_HEIGHT) {
      return BlockType.AIR;
    }

    const key = this.getBlockKey(x, y, z);
    const change = planned.get(key);
    if (change) {
      return change.type;
    }

    return this.chunkManager.getBlock(x, y, z);
  }

  private queueChange(planned: PlannedChanges, x: number, y: number, z: number, type: BlockType): void {
    const key = this.getBlockKey(x, y, z);
    planned.set(key, { x, y, z, type });
  }

  private getBlockKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  private selectRandomChunks<T>(chunks: T[], count: number): T[] {
    if (chunks.length <= count) {
      return chunks;
    }

    const selected: T[] = [];
    const indices = new Set<number>();

    while (indices.size < count) {
      const index = Math.floor(Math.random() * chunks.length);
      if (indices.has(index)) {
        continue;
      }
      indices.add(index);
      selected.push(chunks[index]);
    }

    return selected;
  }
}
