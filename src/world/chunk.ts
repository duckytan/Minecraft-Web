import * as THREE from 'three';
import { BlockType } from './block';
import { MaterialManager } from './materialManager';
import { GreedyMesher } from './greedyMesher';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './chunkConstants';

export { CHUNK_SIZE, CHUNK_HEIGHT } from './chunkConstants';

/**
 * Chunk 类 - 管理一个 16x64x16 的方块区域
 */
export class Chunk {
  public readonly chunkX: number;
  public readonly chunkZ: number;
  private blocks: Uint8Array; // 使用 Uint8Array 节省内存
  private mesh: THREE.Mesh | null = null;
  private readonly scene: THREE.Scene;
  private readonly getNeighborBlock?: (worldX: number, worldY: number, worldZ: number) => BlockType;
  private version = 0;

  constructor(
    chunkX: number,
    chunkZ: number,
    scene: THREE.Scene,
    getNeighborBlock?: (worldX: number, worldY: number, worldZ: number) => BlockType
  ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.scene = scene;
    this.getNeighborBlock = getNeighborBlock;
    // 初始化方块数据 (16 * 64 * 16 = 16384 个方块)
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    this.blocks.fill(BlockType.AIR);
  }

  /**
   * 获取 Chunk 的唯一键
   */
  public static getChunkKey(chunkX: number, chunkZ: number): string {
    return `${chunkX},${chunkZ}`;
  }

  public getKey(): string {
    return Chunk.getChunkKey(this.chunkX, this.chunkZ);
  }

  /**
   * 设置方块类型
   */
  public setBlock(x: number, y: number, z: number, blockType: BlockType): boolean {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return false;
    }

    const index = this.getBlockIndex(x, y, z);
    if (this.blocks[index] === blockType) {
      return false;
    }

    this.blocks[index] = blockType;
    this.version++;
    return true;
  }

  /**
   * 使用外部数据替换整个 Chunk 的方块数组
   */
  public applyBlocksData(blocks: Uint8Array): void {
    if (blocks.length !== CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE) {
      throw new Error('Invalid block data length for chunk');
    }
    this.blocks = blocks;
    this.version++;
  }

  /**
   * 获取 Chunk 的方块数据副本
   */
  public getBlocksData(): Uint8Array {
    return this.blocks.slice();
  }

  /**
   * 获取方块类型
   */
  public getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return BlockType.AIR;
    }
    const index = this.getBlockIndex(x, y, z);
    return this.blocks[index];
  }

  /**
   * 计算方块在数组中的索引
   */
  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT;
  }

  /**
   * 生成 Chunk 的网格（使用程序化纹理）
   */
  public generateMesh(): void {
    // 如果已有网格，先移除（但不销毁材质，因为材质由 MaterialManager 统一管理）
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      // 不再销毁材质，因为材质是共享的
      this.mesh = null;
    }

    const mesher = new GreedyMesher({
      chunkX: this.chunkX,
      chunkZ: this.chunkZ,
      getBlock: (x, y, z) => this.getBlock(x, y, z),
      getNeighborBlock: this.getNeighborBlock
    });

    const meshData = mesher.generate();

    // 如果没有可见方块，直接返回
    if (meshData.positions.length === 0) {
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(meshData.uvs, 2));
    geometry.setIndex(meshData.indices);
    geometry.computeBoundingBox();

    const materialManager = MaterialManager.getInstance();
    const materials: THREE.MeshLambertMaterial[] = [];
    const materialMap = new Map<string, number>();

    for (const quad of meshData.quads) {
      const materialKey = `${quad.blockType}_${quad.faceType}`;
      let materialIndex = materialMap.get(materialKey);
      if (materialIndex === undefined) {
        const material = materialManager.getMaterial(quad.blockType, quad.faceType);
        materialIndex = materials.length;
        materials.push(material);
        materialMap.set(materialKey, materialIndex);
      }

      geometry.addGroup(quad.start, quad.count, materialIndex);
    }

    this.mesh = new THREE.Mesh(geometry, materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  /**
   * 为方块添加可见面（带纹理）- 已废弃，使用贪婪网格合并代替
   */
  /*
  private addBlockFaces(
    x: number,
    y: number,
    z: number,
    worldX: number,
    worldZ: number,
    blockType: BlockType,
    positions: number[],
    normals: number[],
    uvs: number[],
    indices: number[],
    groups: Array<{ start: number; count: number; materialIndex: number }>,
    materials: THREE.MeshLambertMaterial[],
    materialMap: Map<string, number>,
    materialManager: MaterialManager
  ): void {
    const halfSize = BLOCK_SIZE / 2;
    const wx = worldX * BLOCK_SIZE;
    const wy = y * BLOCK_SIZE;
    const wz = worldZ * BLOCK_SIZE;

    // UV坐标（标准方形）
    const faceUVs = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1]
    ];

    const shouldRenderFace = (neighbor: BlockType): boolean => {
      if (blockType === BlockType.WATER) {
        return neighbor !== BlockType.WATER;
      }
      return neighbor === BlockType.AIR || neighbor === BlockType.WATER;
    };

    // 定义六个面的法向量和顶点偏移
    const faces = [
      // 前面 (+Z)
      {
        normal: [0, 0, 1],
        vertices: [
          [-halfSize, -halfSize, halfSize],
          [halfSize, -halfSize, halfSize],
          [halfSize, halfSize, halfSize],
          [-halfSize, halfSize, halfSize]
        ],
        check: () => shouldRenderFace(this.getBlock(x, y, z + 1)),
        faceType: 'side' as const
      },
      // 后面 (-Z)
      {
        normal: [0, 0, -1],
        vertices: [
          [halfSize, -halfSize, -halfSize],
          [-halfSize, -halfSize, -halfSize],
          [-halfSize, halfSize, -halfSize],
          [halfSize, halfSize, -halfSize]
        ],
        check: () => shouldRenderFace(this.getBlock(x, y, z - 1)),
        faceType: 'side' as const
      },
      // 右面 (+X)
      {
        normal: [1, 0, 0],
        vertices: [
          [halfSize, -halfSize, halfSize],
          [halfSize, -halfSize, -halfSize],
          [halfSize, halfSize, -halfSize],
          [halfSize, halfSize, halfSize]
        ],
        check: () => shouldRenderFace(this.getBlock(x + 1, y, z)),
        faceType: 'side' as const
      },
      // 左面 (-X)
      {
        normal: [-1, 0, 0],
        vertices: [
          [-halfSize, -halfSize, -halfSize],
          [-halfSize, -halfSize, halfSize],
          [-halfSize, halfSize, halfSize],
          [-halfSize, halfSize, -halfSize]
        ],
        check: () => shouldRenderFace(this.getBlock(x - 1, y, z)),
        faceType: 'side' as const
      },
      // 上面 (+Y)
      {
        normal: [0, 1, 0],
        vertices: [
          [-halfSize, halfSize, halfSize],
          [halfSize, halfSize, halfSize],
          [halfSize, halfSize, -halfSize],
          [-halfSize, halfSize, -halfSize]
        ],
        check: () => shouldRenderFace(this.getBlock(x, y + 1, z)),
        faceType: 'top' as const
      },
      // 下面 (-Y)
      {
        normal: [0, -1, 0],
        vertices: [
          [-halfSize, -halfSize, -halfSize],
          [halfSize, -halfSize, -halfSize],
          [halfSize, -halfSize, halfSize],
          [-halfSize, -halfSize, halfSize]
        ],
        check: () => shouldRenderFace(this.getBlock(x, y - 1, z)),
        faceType: 'bottom' as const
      }
    ];

    // 为每个可见面添加顶点
    for (const face of faces) {
      if (!face.check()) continue;

      // 获取或创建材质
      const materialKey = `${blockType}_${face.faceType}`;
      let materialIndex = materialMap.get(materialKey);

      if (materialIndex === undefined) {
        const material = materialManager.getMaterial(blockType, face.faceType);
        materialIndex = materials.length;
        materials.push(material);
        materialMap.set(materialKey, materialIndex);
      }

      const groupStart = indices.length;
      const baseIndex = positions.length / 3;

      // 添加四个顶点
      for (let i = 0; i < face.vertices.length; i++) {
        const vertex = face.vertices[i];
        positions.push(wx + vertex[0], wy + vertex[1], wz + vertex[2]);
        normals.push(face.normal[0], face.normal[1], face.normal[2]);
        uvs.push(faceUVs[i][0], faceUVs[i][1]);
      }

      // 添加两个三角形的索引（逆时针顺序）
      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
      indices.push(baseIndex, baseIndex + 2, baseIndex + 3);

      // 添加材质组（6个索引 = 2个三角形）
      groups.push({
        start: groupStart,
        count: 6,
        materialIndex
      });
    }
  }
  */

  /**
   * 卸载 Chunk（从场景移除网格）
   */
  public unload(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      // 材质由 MaterialManager 统一管理，不在此处销毁
      this.mesh = null;
    }
  }

  /**
   * 检查 Chunk 是否已加载（有网格）
   */
  public isLoaded(): boolean {
    return this.mesh !== null;
  }

  /**
   * 获取 Chunk 网格（用于碰撞检测）
   */
  public getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  /**
   * 获取方块的世界坐标
   */
  public static worldToChunkCoords(
    worldX: number,
    worldZ: number
  ): { chunkX: number; chunkZ: number; localX: number; localZ: number } {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    const localX = worldX - chunkX * CHUNK_SIZE;
    const localZ = worldZ - chunkZ * CHUNK_SIZE;
    return { chunkX, chunkZ, localX, localZ };
  }
}
