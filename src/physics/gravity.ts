import * as THREE from 'three';
import { ChunkManager } from '../world/chunkManager';
import { BlockType } from '../world/block';

/**
 * 支撑类型
 */
enum SupportType {
  BOTTOM = 'BOTTOM', // 下方支撑（最强）
  SIDE = 'SIDE', // 侧面支撑（中等）
  TOP = 'TOP' // 上方支撑（最弱）
}

/**
 * 支撑力权重
 */
const SUPPORT_WEIGHTS: Record<SupportType, number> = {
  [SupportType.BOTTOM]: 1.0, // 下方支撑力最大
  [SupportType.SIDE]: 0.3, // 侧面支撑力中等
  [SupportType.TOP]: 0.1 // 上方支撑力最弱（悬吊）
};

/**
 * 下落方块信息
 */
interface FallingBlock {
  position: THREE.Vector3;
  blockType: BlockType;
  startY: number;
  velocity: number;
  mesh: THREE.Mesh | null;
}

/**
 * 真实重力系统
 * 处理方块结构完整性检测和倒塌模拟
 */
export class GravitySystem {
  private readonly chunkManager: ChunkManager;
  private readonly scene: THREE.Scene;
  private enabled = false;

  // 下落中的方块
  private fallingBlocks: FallingBlock[] = [];
  
  // 支撑力阈值（低于此值则开始下落）
  private readonly supportThreshold = 0.5;
  
  // 最大检测深度（防止无限递归）
  private readonly maxDepth = 100;
  
  // 碎裂距离阈值
  private readonly shatterDistance = 3;
  
  // 重力加速度
  private readonly gravity = 20;

  constructor(chunkManager: ChunkManager, scene: THREE.Scene) {
    this.chunkManager = chunkManager;
    this.scene = scene;
  }

  /**
   * 启用重力系统
   */
  enable(): void {
    this.enabled = true;
    console.log('🌍 真实重力模式已启用');
  }

  /**
   * 禁用重力系统
   */
  disable(): void {
    this.enabled = false;
    // 清除所有下落中的方块
    this.clearFallingBlocks();
    console.log('🌍 真实重力模式已禁用');
  }

  /**
   * 切换重力系统
   */
  toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 检查方块破坏后的结构完整性
   * @param x 被破坏方块的 X 坐标
   * @param y 被破坏方块的 Y 坐标
   * @param z 被破坏方块的 Z 坐标
   */
  checkStructuralIntegrity(x: number, y: number, z: number): void {
    if (!this.enabled) return;

    // 检查周围 6 个方向的方块
    const neighbors = [
      { x: x + 1, y, z },
      { x: x - 1, y, z },
      { x, y: y + 1, z },
      { x, y: y - 1, z },
      { x, y, z: z + 1 },
      { x, y, z: z - 1 }
    ];

    for (const neighbor of neighbors) {
      const blockType = this.chunkManager.getBlock(neighbor.x, neighbor.y, neighbor.z);
      
      // 跳过空气和基岩
      if (blockType === BlockType.AIR || blockType === BlockType.BEDROCK) {
        continue;
      }

      // 检查该方块是否失去支撑
      const supportStrength = this.calculateSupportStrength(neighbor.x, neighbor.y, neighbor.z, new Set());
      
      if (supportStrength < this.supportThreshold) {
        // 找出所有连接的失去支撑的方块
        const connectedBlocks = this.findConnectedBlocks(neighbor.x, neighbor.y, neighbor.z, new Set());
        
        // 让这些方块开始下落
        this.makeBlocksFall(connectedBlocks);
      }
    }
  }

  /**
   * 计算方块的支撑力
   * @param x 方块 X 坐标
   * @param y 方块 Y 坐标
   * @param z 方块 Z 坐标
   * @param visited 已访问的方块集合（防止循环）
   * @param depth 当前递归深度
   * @returns 支撑力强度（0-1+）
   */
  private calculateSupportStrength(
    x: number,
    y: number,
    z: number,
    visited: Set<string>,
    depth: number = 0
  ): number {
    // 防止无限递归
    if (depth > this.maxDepth) {
      return 0;
    }

    const key = `${x},${y},${z}`;
    if (visited.has(key)) {
      return 0;
    }
    visited.add(key);

    // 检查下方支撑
    const bottomBlock = this.chunkManager.getBlock(x, y - 1, z);
    if (bottomBlock === BlockType.BEDROCK) {
      return 10; // 基岩提供无限支撑
    }
    if (bottomBlock !== BlockType.AIR && bottomBlock !== BlockType.WATER) {
      // 下方有方块，检查该方块的支撑力
      const bottomSupport = this.calculateSupportStrength(x, y - 1, z, visited, depth + 1);
      if (bottomSupport > this.supportThreshold) {
        return SUPPORT_WEIGHTS[SupportType.BOTTOM] * bottomSupport;
      }
    }

    // 检查侧面支撑
    let sideSupport = 0;
    const sides = [
      { x: x + 1, y, z },
      { x: x - 1, y, z },
      { x, y, z: z + 1 },
      { x, y, z: z - 1 }
    ];

    for (const side of sides) {
      const sideBlock = this.chunkManager.getBlock(side.x, side.y, side.z);
      if (sideBlock === BlockType.BEDROCK) {
        return 10; // 基岩提供无限支撑
      }
      if (sideBlock !== BlockType.AIR && sideBlock !== BlockType.WATER) {
        const sideSupportStr = this.calculateSupportStrength(side.x, side.y, side.z, visited, depth + 1);
        sideSupport = Math.max(sideSupport, sideSupportStr * SUPPORT_WEIGHTS[SupportType.SIDE]);
      }
    }

    // 检查上方支撑（悬吊）
    let topSupport = 0;
    const topBlock = this.chunkManager.getBlock(x, y + 1, z);
    if (topBlock === BlockType.BEDROCK) {
      return 10; // 基岩提供无限支撑
    }
    if (topBlock !== BlockType.AIR && topBlock !== BlockType.WATER) {
      const topSupportStr = this.calculateSupportStrength(x, y + 1, z, visited, depth + 1);
      topSupport = topSupportStr * SUPPORT_WEIGHTS[SupportType.TOP];
    }

    return Math.max(sideSupport, topSupport);
  }

  /**
   * 找出所有连接的方块（使用 BFS）
   * @param startX 起始方块 X 坐标
   * @param startY 起始方块 Y 坐标
   * @param startZ 起始方块 Z 坐标
   * @param visited 已访问的方块集合
   * @returns 连接的方块位置数组
   */
  private findConnectedBlocks(
    startX: number,
    startY: number,
    startZ: number,
    visited: Set<string>
  ): Array<{ x: number; y: number; z: number; blockType: BlockType }> {
    const queue: Array<{ x: number; y: number; z: number }> = [{ x: startX, y: startY, z: startZ }];
    const connected: Array<{ x: number; y: number; z: number; blockType: BlockType }> = [];
    const maxBlocks = 500; // 限制最大方块数（避免卡顿）

    while (queue.length > 0 && connected.length < maxBlocks) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y},${current.z}`;

      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      const blockType = this.chunkManager.getBlock(current.x, current.y, current.z);
      
      // 跳过空气、水和基岩
      if (blockType === BlockType.AIR || blockType === BlockType.WATER || blockType === BlockType.BEDROCK) {
        continue;
      }

      // 检查支撑力
      const support = this.calculateSupportStrength(current.x, current.y, current.z, new Set());
      if (support < this.supportThreshold) {
        connected.push({ ...current, blockType });

        // 添加 6 个相邻方块到队列
        const neighbors = [
          { x: current.x + 1, y: current.y, z: current.z },
          { x: current.x - 1, y: current.y, z: current.z },
          { x: current.x, y: current.y + 1, z: current.z },
          { x: current.x, y: current.y - 1, z: current.z },
          { x: current.x, y: current.y, z: current.z + 1 },
          { x: current.x, y: current.y, z: current.z - 1 }
        ];

        for (const neighbor of neighbors) {
          const neighborKey = `${neighbor.x},${neighbor.y},${neighbor.z}`;
          if (!visited.has(neighborKey)) {
            queue.push(neighbor);
          }
        }
      }
    }

    return connected;
  }

  /**
   * 让方块开始下落
   * @param blocks 要下落的方块数组
   */
  private makeBlocksFall(blocks: Array<{ x: number; y: number; z: number; blockType: BlockType }>): void {
    if (blocks.length === 0) return;

    console.log(`💥 检测到 ${blocks.length} 个方块失去支撑，开始下落`);

    for (const block of blocks) {
      // 从世界中移除方块
      this.chunkManager.setBlock(block.x, block.y, block.z, BlockType.AIR);

      // 创建下落方块
      const fallingBlock: FallingBlock = {
        position: new THREE.Vector3(block.x, block.y, block.z),
        blockType: block.blockType,
        startY: block.y,
        velocity: 0,
        mesh: null
      };

      // 创建临时网格用于动画
      this.createFallingBlockMesh(fallingBlock);
      this.fallingBlocks.push(fallingBlock);
    }
  }

  /**
   * 为下落方块创建临时网格
   */
  private createFallingBlockMesh(block: FallingBlock): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const color = this.getBlockColor(block.blockType);
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(block.position);
    this.scene.add(mesh);
    block.mesh = mesh;
  }

  /**
   * 获取方块颜色
   */
  private getBlockColor(blockType: BlockType): number {
    switch (blockType) {
      case BlockType.GRASS:
        return 0x5a9e3d;
      case BlockType.DIRT:
        return 0x8b6f47;
      case BlockType.STONE:
        return 0x7a7a7a;
      case BlockType.WOOD:
        return 0x8b5a2b;
      case BlockType.LEAVES:
        return 0x3d8b3d;
      default:
        return 0xffffff;
    }
  }

  /**
   * 更新重力系统（每帧调用）
   * @param deltaTime 时间增量
   */
  update(deltaTime: number): void {
    if (!this.enabled || this.fallingBlocks.length === 0) return;

    const toRemove: number[] = [];

    for (let i = 0; i < this.fallingBlocks.length; i++) {
      const block = this.fallingBlocks[i];

      // 应用重力
      block.velocity += this.gravity * deltaTime;
      block.position.y -= block.velocity * deltaTime;

      // 更新网格位置
      if (block.mesh) {
        block.mesh.position.y = block.position.y;
      }

      // 检查是否落地
      const groundY = Math.floor(block.position.y);
      const groundBlock = this.chunkManager.getBlock(
        Math.floor(block.position.x),
        groundY - 1,
        Math.floor(block.position.z)
      );

      if (groundBlock !== BlockType.AIR && groundBlock !== BlockType.WATER) {
        // 计算下落距离
        const fallDistance = block.startY - groundY;

        if (fallDistance > this.shatterDistance) {
          // 下落超过阈值，方块碎裂消失
          console.log(`💥 方块从 ${fallDistance} 格高度摔落，已碎裂`);
        } else {
          // 下落距离不足，放置方块
          this.chunkManager.setBlock(
            Math.floor(block.position.x),
            groundY,
            Math.floor(block.position.z),
            block.blockType
          );
        }

        // 移除临时网格
        if (block.mesh) {
          this.scene.remove(block.mesh);
          block.mesh.geometry.dispose();
          (block.mesh.material as THREE.Material).dispose();
        }

        toRemove.push(i);
      }
    }

    // 从数组中移除已处理的方块（从后往前移除避免索引问题）
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.fallingBlocks.splice(toRemove[i], 1);
    }
  }

  /**
   * 清除所有下落中的方块
   */
  private clearFallingBlocks(): void {
    for (const block of this.fallingBlocks) {
      if (block.mesh) {
        this.scene.remove(block.mesh);
        block.mesh.geometry.dispose();
        (block.mesh.material as THREE.Material).dispose();
      }
    }
    this.fallingBlocks = [];
  }

  /**
   * 销毁
   */
  dispose(): void {
    this.clearFallingBlocks();
  }
}
