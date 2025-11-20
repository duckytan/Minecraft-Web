import { BlockType, BLOCK_SIZE } from './block';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './chunkConstants';

export type FaceType = 'top' | 'bottom' | 'side';

interface MaskCell {
  blockType: BlockType;
  direction: 1 | -1; // 法线方向，+1 表示正方向，-1 表示负方向
  faceType: FaceType;
}

export interface MeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  quads: Array<{ start: number; count: number; blockType: BlockType; faceType: FaceType }>;
}

interface GreedyMesherOptions {
  chunkX: number;
  chunkZ: number;
  getBlock: (x: number, y: number, z: number) => BlockType;
  getNeighborBlock?: (worldX: number, worldY: number, worldZ: number) => BlockType;
}

/**
 * 贪婪网格合并器
 * 将相邻同类型方块的面合并成大矩形，大幅减少顶点数量
 */
export class GreedyMesher {
  private readonly chunkX: number;
  private readonly chunkZ: number;
  private readonly getBlock: (x: number, y: number, z: number) => BlockType;
  private readonly getNeighborBlock?: (worldX: number, worldY: number, worldZ: number) => BlockType;

  private static readonly dims: [number, number, number] = [CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_SIZE];

  constructor(options: GreedyMesherOptions) {
    this.chunkX = options.chunkX;
    this.chunkZ = options.chunkZ;
    this.getBlock = options.getBlock;
    this.getNeighborBlock = options.getNeighborBlock;
  }

  public generate(): MeshData {
    const meshData: MeshData = {
      positions: [],
      normals: [],
      uvs: [],
      indices: [],
      quads: []
    };

    const dimensions = GreedyMesher.dims;

    // 依次处理 X / Y / Z 方向的面
    for (let axis = 0; axis < 3; axis++) {
      const u = (axis + 1) % 3;
      const v = (axis + 2) % 3;
      const maskSize = dimensions[u] * dimensions[v];
      const mask: Array<MaskCell | null> = new Array(maskSize).fill(null);

      const x = [0, 0, 0];
      const q = [0, 0, 0];
      q[axis] = 1;

      for (x[axis] = -1; x[axis] < dimensions[axis]; ) {
        let n = 0;
        for (x[v] = 0; x[v] < dimensions[v]; ++x[v]) {
          for (x[u] = 0; x[u] < dimensions[u]; ++x[u]) {
            const a = this.getBlockAt(x[0], x[1], x[2]);
            const b = this.getBlockAt(x[0] + q[0], x[1] + q[1], x[2] + q[2]);
            mask[n++] = this.getMaskCell(axis, a, b);
          }
        }

        ++x[axis];
        const plane = x[axis];

        n = 0;
        for (let j = 0; j < dimensions[v]; ++j) {
          for (let i = 0; i < dimensions[u]; ) {
            const cell = mask[n];
            if (!cell) {
              i++;
              n++;
              continue;
            }

            let width = 1;
            while (i + width < dimensions[u]) {
              const nextCell = mask[n + width];
              if (!nextCell || !this.canMerge(cell, nextCell)) {
                break;
              }
              width++;
            }

            let height = 1;
            heightLoop: while (j + height < dimensions[v]) {
              for (let k = 0; k < width; ++k) {
                const nextCell = mask[n + k + height * dimensions[u]];
                if (!nextCell || !this.canMerge(cell, nextCell)) {
                  break heightLoop;
                }
              }
              height++;
            }

            const base: [number, number, number] = [0, 0, 0];
            base[axis] = plane;
            base[u] = i;
            base[v] = j;
            if (cell.direction === -1) {
              base[axis] -= 1;
            }

            const du: [number, number, number] = [0, 0, 0];
            const dv: [number, number, number] = [0, 0, 0];
            du[u] = width;
            dv[v] = height;

            this.emitQuad(meshData, base, du, dv, axis, width, height, cell);

            for (let h = 0; h < height; ++h) {
              for (let w = 0; w < width; ++w) {
                mask[n + w + h * dimensions[u]] = null;
              }
            }

            i += width;
            n += width;
          }
        }
      }
    }

    return meshData;
  }

  private getBlockAt(x: number, y: number, z: number): BlockType {
    if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_SIZE) {
      return this.getBlock(x, y, z);
    }

    if (!this.getNeighborBlock || y < 0 || y >= CHUNK_HEIGHT) {
      return BlockType.AIR;
    }

    const worldX = this.chunkX * CHUNK_SIZE + x;
    const worldZ = this.chunkZ * CHUNK_SIZE + z;
    return this.getNeighborBlock(worldX, y, worldZ);
  }

  private getMaskCell(axis: number, a: BlockType, b: BlockType): MaskCell | null {
    if (this.shouldRenderFace(a, b)) {
      return {
        blockType: a,
        direction: 1,
        faceType: axis === 1 ? 'top' : 'side'
      };
    }

    if (this.shouldRenderFace(b, a)) {
      return {
        blockType: b,
        direction: -1,
        faceType: axis === 1 ? 'bottom' : 'side'
      };
    }

    return null;
  }

  private shouldRenderFace(block: BlockType, neighbor: BlockType): boolean {
    if (block === BlockType.AIR) {
      return false;
    }

    // 透明方块（水、玻璃、树叶）的特殊处理
    if (block === BlockType.WATER) {
      return neighbor !== BlockType.WATER;
    }

    if (block === BlockType.GLASS) {
      return neighbor !== BlockType.GLASS;
    }

    if (block === BlockType.LEAVES) {
      return neighbor !== BlockType.LEAVES;
    }

    // 不透明方块只在相邻是空气或透明方块时渲染面
    return (
      neighbor === BlockType.AIR ||
      neighbor === BlockType.WATER ||
      neighbor === BlockType.GLASS ||
      neighbor === BlockType.LEAVES
    );
  }

  private canMerge(a: MaskCell, b: MaskCell): boolean {
    return a.blockType === b.blockType && a.direction === b.direction && a.faceType === b.faceType;
  }

  private emitQuad(
    meshData: MeshData,
    base: [number, number, number],
    du: [number, number, number],
    dv: [number, number, number],
    axis: number,
    width: number,
    height: number,
    cell: MaskCell
  ): void {
    const vertices = [
      this.toWorldPosition(base),
      this.toWorldPosition([base[0] + du[0], base[1] + du[1], base[2] + du[2]]),
      this.toWorldPosition([
        base[0] + du[0] + dv[0],
        base[1] + du[1] + dv[1],
        base[2] + du[2] + dv[2]
      ]),
      this.toWorldPosition([base[0] + dv[0], base[1] + dv[1], base[2] + dv[2]])
    ];

    const normal: [number, number, number] = [0, 0, 0];
    normal[axis] = cell.direction;

    const baseIndex = meshData.positions.length / 3;
    for (const vertex of vertices) {
      meshData.positions.push(...vertex);
      meshData.normals.push(...normal);
    }

    const uvs = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height]
    ];

    for (const uv of uvs) {
      meshData.uvs.push(...uv);
    }

    const indexStart = meshData.indices.length;
    if (cell.direction === 1) {
      meshData.indices.push(
        baseIndex,
        baseIndex + 1,
        baseIndex + 2,
        baseIndex,
        baseIndex + 2,
        baseIndex + 3
      );
    } else {
      meshData.indices.push(
        baseIndex,
        baseIndex + 2,
        baseIndex + 1,
        baseIndex,
        baseIndex + 3,
        baseIndex + 2
      );
    }

    meshData.quads.push({
      start: indexStart,
      count: 6,
      blockType: cell.blockType,
      faceType: cell.faceType
    });
  }

  private toWorldPosition(pos: [number, number, number]): [number, number, number] {
    return [
      (this.chunkX * CHUNK_SIZE + pos[0]) * BLOCK_SIZE - BLOCK_SIZE / 2,
      pos[1] * BLOCK_SIZE - BLOCK_SIZE / 2,
      (this.chunkZ * CHUNK_SIZE + pos[2]) * BLOCK_SIZE - BLOCK_SIZE / 2
    ];
  }
}
