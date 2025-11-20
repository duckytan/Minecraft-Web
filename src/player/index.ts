import * as THREE from 'three';
import { KeyboardInput } from '../input/keyboard';
import { BoundingBox, checkCollision } from '../physics/collision';
import { ChunkManager } from '../world/chunkManager';
import { BlockType } from '../world/block';

export interface PlayerConfig {
  moveSpeed?: number;
  sprintMultiplier?: number;
  jumpVelocity?: number;
  gravity?: number;
  width?: number;
  height?: number;
  depth?: number;
  // 飞行模式参数
  flightSpeed?: number;
  flightAcceleration?: number;
  flightMaxSpeed?: number;
  flightDeceleration?: number;
  flightVerticalSpeed?: number;
}

const DEFAULT_CONFIG: Required<PlayerConfig> = {
  moveSpeed: 5,
  sprintMultiplier: 1.5,
  jumpVelocity: 8,
  gravity: -25,
  width: 0.6,
  height: 1.8,
  depth: 0.6,
  // 飞行模式默认参数
  flightSpeed: 6,
  flightAcceleration: 2.5,
  flightMaxSpeed: 24,
  flightDeceleration: 3,
  flightVerticalSpeed: 8
};

export class Player {
  private readonly camera: THREE.PerspectiveCamera;

  private readonly keyboard: KeyboardInput;

  private readonly config: Required<PlayerConfig>;

  private velocity = new THREE.Vector3();

  private flightVelocity = new THREE.Vector3();

  private flightThrust = 0;

  private isFlying = false;

  private isGrounded = false;

  private isInWater = false;

  private chunkManager: ChunkManager | null = null;

  // 缓存对象，避免重复创建
  private readonly tempVector1 = new THREE.Vector3();
  private readonly tempVector2 = new THREE.Vector3();
  private readonly tempVector3 = new THREE.Vector3();
  private readonly cachedForward = new THREE.Vector3();
  private readonly cachedRight = new THREE.Vector3();
  private readonly cachedUp = new THREE.Vector3(0, 1, 0);
  private readonly cachedBoundingBox = new BoundingBox(new THREE.Vector3(), new THREE.Vector3());
  private readonly cachedBlockBox = new BoundingBox(new THREE.Vector3(), new THREE.Vector3());
  private readonly cachedOldPosition = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, keyboard: KeyboardInput, config?: PlayerConfig) {
    this.camera = camera;
    this.keyboard = keyboard;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.keyboard.onFlightToggle(() => {
      this.toggleFlightMode();
    });
  }

  setChunkManager(chunkManager: ChunkManager): void {
    this.chunkManager = chunkManager;
  }

  getBoundingBox(): BoundingBox {
    const pos = this.camera.position;
    const halfWidth = this.config.width / 2;
    const halfDepth = this.config.depth / 2;

    this.cachedBoundingBox.min.set(pos.x - halfWidth, pos.y - this.config.height, pos.z - halfDepth);
    this.cachedBoundingBox.max.set(pos.x + halfWidth, pos.y, pos.z + halfDepth);
    return this.cachedBoundingBox;
  }

  update(deltaTime: number): void {
    if (this.isFlying) {
      this.updateFlying(deltaTime);
      return;
    }

    this.isInWater = this.checkWaterState();

    if (this.isInWater) {
      this.updateSwimming(deltaTime);
    } else {
      this.updateWalking(deltaTime);
    }
  }

  /**
   * 检查玩家是否在水中
   */
  private checkWaterState(): boolean {
    if (!this.chunkManager) {
      return false;
    }

    const box = this.getBoundingBox();
    const minX = Math.floor(box.min.x);
    const maxX = Math.ceil(box.max.x);
    const minY = Math.floor(box.min.y);
    const maxY = Math.ceil(box.max.y);
    const minZ = Math.floor(box.min.z);
    const maxZ = Math.ceil(box.max.z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.chunkManager.getBlock(x, y, z) === BlockType.WATER) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 游泳模式更新
   */
  private updateSwimming(deltaTime: number): void {
    const swimSpeed = this.config.moveSpeed * 0.7 * deltaTime; // 水中移动速度较慢

    // 使用缓存对象
    this.camera.getWorldDirection(this.cachedForward);
    this.cachedForward.y = 0;
    if (this.cachedForward.lengthSq() === 0) {
      this.cachedForward.set(0, 0, -1);
    } else {
      this.cachedForward.normalize();
    }
    this.cachedRight.crossVectors(this.cachedForward, this.cachedUp).normalize();

    this.tempVector1.set(0, 0, 0);

    if (this.keyboard.isForward()) {
      this.tempVector1.add(this.cachedForward);
    }

    if (this.keyboard.isBackward()) {
      this.tempVector1.sub(this.cachedForward);
    }

    if (this.keyboard.isLeft()) {
      this.tempVector1.sub(this.cachedRight);
    }

    if (this.keyboard.isRight()) {
      this.tempVector1.add(this.cachedRight);
    }

    if (this.tempVector1.length() > 0) {
      this.tempVector1.normalize();
      this.tempVector1.multiplyScalar(swimSpeed);

      if (this.tempVector1.x !== 0) {
        this.tempVector2.set(this.tempVector1.x, 0, 0);
        this.applyMovement(this.tempVector2, 'x');
      }

      if (this.tempVector1.z !== 0) {
        this.tempVector2.set(0, 0, this.tempVector1.z);
        this.applyMovement(this.tempVector2, 'z');
      }
    }

    // 水中垂直移动
    const verticalSpeed = 3;
    if (this.keyboard.isJump()) {
      // 向上游
      this.velocity.y = verticalSpeed;
    } else if (this.keyboard.isDescend()) {
      // 向下游
      this.velocity.y = -verticalSpeed;
    } else {
      // 浮力效果（缓慢上升）
      this.velocity.y = Math.min(1, this.velocity.y + 0.5 * deltaTime);
    }

    // 应用垂直移动（带阻力）
    this.velocity.y *= 0.95; // 水中阻力
    this.tempVector2.set(0, this.velocity.y * deltaTime, 0);
    this.applyMovement(this.tempVector2, 'y');
  }

  /**
   * 行走模式更新
   */
  private updateWalking(deltaTime: number): void {
    const moveSpeed =
      this.config.moveSpeed *
      (this.keyboard.isSprint() ? this.config.sprintMultiplier : 1) *
      deltaTime;

    // 使用缓存对象
    this.camera.getWorldDirection(this.cachedForward);
    this.cachedForward.y = 0;
    if (this.cachedForward.lengthSq() === 0) {
      this.cachedForward.set(0, 0, -1);
    } else {
      this.cachedForward.normalize();
    }
    this.cachedRight.crossVectors(this.cachedForward, this.cachedUp).normalize();

    this.tempVector1.set(0, 0, 0);

    if (this.keyboard.isForward()) {
      this.tempVector1.add(this.cachedForward);
    }

    if (this.keyboard.isBackward()) {
      this.tempVector1.sub(this.cachedForward);
    }

    if (this.keyboard.isLeft()) {
      this.tempVector1.sub(this.cachedRight);
    }

    if (this.keyboard.isRight()) {
      this.tempVector1.add(this.cachedRight);
    }

    if (this.tempVector1.length() > 0) {
      this.tempVector1.normalize();
      this.tempVector1.multiplyScalar(moveSpeed);

      if (this.tempVector1.x !== 0) {
        this.tempVector2.set(this.tempVector1.x, 0, 0);
        this.applyMovement(this.tempVector2, 'x');
      }

      if (this.tempVector1.z !== 0) {
        this.tempVector2.set(0, 0, this.tempVector1.z);
        this.applyMovement(this.tempVector2, 'z');
      }
    }

    if (this.keyboard.isJump() && this.isGrounded) {
      this.velocity.y = this.config.jumpVelocity;
      this.isGrounded = false;
    }

    this.velocity.y += this.config.gravity * deltaTime;

    this.tempVector2.set(0, this.velocity.y * deltaTime, 0);
    this.applyMovement(this.tempVector2, 'y');
  }

  /**
   * 飞行模式更新（带加速度）
   */
  private updateFlying(deltaTime: number): void {
    // 使用缓存对象
    this.camera.getWorldDirection(this.cachedForward);
    this.cachedForward.y = 0;
    if (this.cachedForward.lengthSq() === 0) {
      this.cachedForward.set(0, 0, -1);
    } else {
      this.cachedForward.normalize();
    }
    this.cachedRight.crossVectors(this.cachedForward, this.cachedUp).normalize();

    this.tempVector1.set(0, 0, 0);

    if (this.keyboard.isForward()) {
      this.tempVector1.add(this.cachedForward);
    }

    if (this.keyboard.isBackward()) {
      this.tempVector1.sub(this.cachedForward);
    }

    if (this.keyboard.isLeft()) {
      this.tempVector1.sub(this.cachedRight);
    }

    if (this.keyboard.isRight()) {
      this.tempVector1.add(this.cachedRight);
    }

    const hasHorizontalInput = this.tempVector1.lengthSq() > 0;
    if (hasHorizontalInput) {
      this.tempVector1.normalize();
    }

    const verticalInput = (this.keyboard.isJump() ? 1 : 0) - (this.keyboard.isDescend() ? 1 : 0);
    const hasVerticalInput = verticalInput !== 0;
    const hasInput = hasHorizontalInput || hasVerticalInput;

    if (hasInput) {
      this.flightThrust = Math.min(1, this.flightThrust + this.config.flightAcceleration * deltaTime);
      const targetSpeed = THREE.MathUtils.lerp(
        this.config.flightSpeed,
        this.config.flightMaxSpeed,
        this.flightThrust
      );

      this.tempVector2.set(0, 0, 0);

      if (hasHorizontalInput) {
        this.tempVector2.addScaledVector(this.tempVector1, targetSpeed);
      }

      this.tempVector2.y = verticalInput * this.config.flightVerticalSpeed;

      const lerpFactor = Math.min(1, this.config.flightAcceleration * deltaTime);
      this.flightVelocity.lerp(this.tempVector2, lerpFactor);
    } else {
      this.flightThrust = Math.max(0, this.flightThrust - this.config.flightDeceleration * deltaTime);
      const damping = Math.max(0, 1 - this.config.flightDeceleration * deltaTime);
      this.flightVelocity.multiplyScalar(damping);
      if (this.flightVelocity.length() < 0.05) {
        this.flightVelocity.set(0, 0, 0);
      }
    }

    this.tempVector3.copy(this.flightVelocity).multiplyScalar(deltaTime);

    if (this.tempVector3.x !== 0) {
      this.tempVector2.set(this.tempVector3.x, 0, 0);
      this.applyMovement(this.tempVector2, 'x');
    }

    if (this.tempVector3.y !== 0) {
      this.tempVector2.set(0, this.tempVector3.y, 0);
      this.applyMovement(this.tempVector2, 'y');
    }

    if (this.tempVector3.z !== 0) {
      this.tempVector2.set(0, 0, this.tempVector3.z);
      this.applyMovement(this.tempVector2, 'z');
    }
  }

  /**
   * 切换飞行模式
   */
  toggleFlightMode(): void {
    this.isFlying = !this.isFlying;

    if (this.isFlying) {
      // 进入飞行模式，重置速度
      this.velocity.set(0, 0, 0);
      this.flightVelocity.set(0, 0, 0);
      this.isGrounded = false;
    } else {
      // 退出飞行模式，重置飞行速度
      this.flightVelocity.set(0, 0, 0);
    }

    console.log(`飞行模式: ${this.isFlying ? '开启' : '关闭'}`);
  }

  /**
   * 获取飞行模式状态
   */
  isFlightMode(): boolean {
    return this.isFlying;
  }

  private applyMovement(movement: THREE.Vector3, axis: 'x' | 'y' | 'z'): void {
    if (!this.chunkManager) {
      // 如果没有 ChunkManager，直接移动（向后兼容）
      this.camera.position.add(movement);
      if (axis === 'y') {
        this.isGrounded = false;
      }
      return;
    }

    // 飞行模式下不检测碰撞
    if (this.isFlying) {
      this.camera.position.add(movement);
      return;
    }

    this.cachedOldPosition.copy(this.camera.position);
    this.camera.position.add(movement);

    // 使用缓存的 BoundingBox，更新其值
    const pos = this.camera.position;
    const halfWidth = this.config.width / 2;
    const halfDepth = this.config.depth / 2;
    this.cachedBoundingBox.min.set(pos.x - halfWidth, pos.y - this.config.height, pos.z - halfDepth);
    this.cachedBoundingBox.max.set(pos.x + halfWidth, pos.y, pos.z + halfDepth);

    // 检查玩家周围的方块
    const minX = Math.floor(this.cachedBoundingBox.min.x);
    const maxX = Math.ceil(this.cachedBoundingBox.max.x);
    const minY = Math.floor(this.cachedBoundingBox.min.y);
    const maxY = Math.ceil(this.cachedBoundingBox.max.y);
    const minZ = Math.floor(this.cachedBoundingBox.min.z);
    const maxZ = Math.ceil(this.cachedBoundingBox.max.z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const blockType = this.chunkManager.getBlock(x, y, z);
          if (blockType !== BlockType.AIR && blockType !== BlockType.WATER) {
            // 使用缓存的 blockBox
            this.cachedBlockBox.min.set(x - 0.5, y - 0.5, z - 0.5);
            this.cachedBlockBox.max.set(x + 0.5, y + 0.5, z + 0.5);

            const collision = checkCollision(this.cachedBoundingBox, this.cachedBlockBox);

            if (collision.collided) {
              this.camera.position.copy(this.cachedOldPosition);

              if (axis === 'y') {
                if (this.velocity.y < 0) {
                  this.isGrounded = true;
                }
                this.velocity.y = 0;
              }

              return;
            }
          }
        }
      }
    }

    if (axis === 'y') {
      this.isGrounded = false;
    }
  }

  getPosition(): THREE.Vector3 {
    return this.camera.position;
  }

  getForwardDirection(): THREE.Vector3 {
    this.camera.getWorldDirection(this.cachedForward);
    this.cachedForward.y = 0;
    if (this.cachedForward.lengthSq() === 0) {
      this.cachedForward.set(0, 0, -1);
    } else {
      this.cachedForward.normalize();
    }
    return this.cachedForward;
  }

  isSwimming(): boolean {
    return this.isInWater && !this.isFlying;
  }

  getRotation(): { x: number; y: number } {
    return {
      x: this.camera.rotation.x,
      y: this.camera.rotation.y
    };
  }

  setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.isGrounded = false;
  }

  setRotation(x: number, y: number): void {
    this.camera.rotation.x = x;
    this.camera.rotation.y = y;
  }
}
