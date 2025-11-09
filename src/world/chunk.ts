import * as THREE from 'three';
import { BlockType, BLOCK_SIZE } from './block';
import { BlockTextureGenerator } from './textures';

/**
 * Chunk 尺寸常量
 */
export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

/**
 * Chunk 类 - 管理一个 16x64x16 的方块区域
 */
export class Chunk {
  public readonly chunkX: number;
  public readonly chunkZ: number;
  private blocks: Uint8Array; // 使用 Uint8Array 节省内存
  private mesh: THREE.Mesh | null = null;
  private readonly scene: THREE.Scene;

  constructor(chunkX: number, chunkZ: number, scene: THREE.Scene) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.scene = scene;
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
  public setBlock(x: number, y: number, z: number, blockType: BlockType): void {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return;
    }
    const index = this.getBlockIndex(x, y, z);
    this.blocks[index] = blockType;
  }

  /**
   * 使用外部数据替换整个 Chunk 的方块数组
   */
  public applyBlocksData(blocks: Uint8Array): void {
    if (blocks.length !== CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE) {
      throw new Error('Invalid block data length for chunk');
    }
    this.blocks = blocks;
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
    // 如果已有网格，先移除
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((m) => m.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const groups: Array<{ start: number; count: number; materialIndex: number }> = [];
    const materials: THREE.MeshLambertMaterial[] = [];
    const materialMap = new Map<string, number>();

    // 世界坐标偏移
    const worldOffsetX = this.chunkX * CHUNK_SIZE;
    const worldOffsetZ = this.chunkZ * CHUNK_SIZE;

    // 遍历所有方块
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const blockType = this.getBlock(x, y, z);
          if (blockType === BlockType.AIR) continue;

          const worldX = worldOffsetX + x;
          const worldZ = worldOffsetZ + z;

          // 检查六个面是否需要渲染（简单面剔除）
          this.addBlockFaces(
            x,
            y,
            z,
            worldX,
            worldZ,
            blockType,
            positions,
            normals,
            uvs,
            indices,
            groups,
            materials,
            materialMap
          );
        }
      }
    }

    // 如果没有可见方块，不创建网格
    if (positions.length === 0) {
      return;
    }

    // 设置几何体属性
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingBox();

    // 添加材质分组
    for (const group of groups) {
      geometry.addGroup(group.start, group.count, group.materialIndex);
    }

    this.mesh = new THREE.Mesh(geometry, materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  /**
   * 为方块添加可见面（带纹理）
   */
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
    materialMap: Map<string, number>
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
        check: () => this.getBlock(x, y, z + 1) === BlockType.AIR,
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
        check: () => this.getBlock(x, y, z - 1) === BlockType.AIR,
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
        check: () => this.getBlock(x + 1, y, z) === BlockType.AIR,
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
        check: () => this.getBlock(x - 1, y, z) === BlockType.AIR,
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
        check: () => this.getBlock(x, y + 1, z) === BlockType.AIR,
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
        check: () => this.getBlock(x, y - 1, z) === BlockType.AIR,
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
        const texture = BlockTextureGenerator.getTexture(blockType, face.faceType);
        const material = new THREE.MeshLambertMaterial({ map: texture });
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

  /**
   * 卸载 Chunk（从场景移除网格）
   */
  public unload(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((m) => m.dispose());
      } else {
        this.mesh.material.dispose();
      }
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
