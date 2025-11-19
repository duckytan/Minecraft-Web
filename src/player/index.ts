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

    return new BoundingBox(
      new THREE.Vector3(pos.x - halfWidth, pos.y - this.config.height, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y, pos.z + halfDepth)
    );
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

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDirection = new THREE.Vector3();

    if (this.keyboard.isForward()) {
      moveDirection.add(forward);
    }

    if (this.keyboard.isBackward()) {
      moveDirection.sub(forward);
    }

    if (this.keyboard.isLeft()) {
      moveDirection.sub(right);
    }

    if (this.keyboard.isRight()) {
      moveDirection.add(right);
    }

    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      moveDirection.multiplyScalar(swimSpeed);

      const horizontalMovement = new THREE.Vector3(moveDirection.x, 0, moveDirection.z);

      if (horizontalMovement.x !== 0) {
        this.applyMovement(new THREE.Vector3(horizontalMovement.x, 0, 0), 'x');
      }

      if (horizontalMovement.z !== 0) {
        this.applyMovement(new THREE.Vector3(0, 0, horizontalMovement.z), 'z');
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
    const verticalMovement = new THREE.Vector3(0, this.velocity.y * deltaTime, 0);
    this.applyMovement(verticalMovement, 'y');
  }

  /**
   * 行走模式更新
   */
  private updateWalking(deltaTime: number): void {
    const moveSpeed =
      this.config.moveSpeed *
      (this.keyboard.isSprint() ? this.config.sprintMultiplier : 1) *
      deltaTime;

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDirection = new THREE.Vector3();

    if (this.keyboard.isForward()) {
      moveDirection.add(forward);
    }

    if (this.keyboard.isBackward()) {
      moveDirection.sub(forward);
    }

    if (this.keyboard.isLeft()) {
      moveDirection.sub(right);
    }

    if (this.keyboard.isRight()) {
      moveDirection.add(right);
    }

    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      moveDirection.multiplyScalar(moveSpeed);

      const horizontalMovement = new THREE.Vector3(moveDirection.x, 0, moveDirection.z);

      if (horizontalMovement.x !== 0) {
        this.applyMovement(new THREE.Vector3(horizontalMovement.x, 0, 0), 'x');
      }

      if (horizontalMovement.z !== 0) {
        this.applyMovement(new THREE.Vector3(0, 0, horizontalMovement.z), 'z');
      }
    }

    if (this.keyboard.isJump() && this.isGrounded) {
      this.velocity.y = this.config.jumpVelocity;
      this.isGrounded = false;
    }

    this.velocity.y += this.config.gravity * deltaTime;

    const verticalMovement = new THREE.Vector3(0, this.velocity.y * deltaTime, 0);
    this.applyMovement(verticalMovement, 'y');
  }

  /**
   * 飞行模式更新（带加速度）
   */
  private updateFlying(deltaTime: number): void {
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() === 0) {
      forward.set(0, 0, -1);
    }
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const horizontalDirection = new THREE.Vector3();

    if (this.keyboard.isForward()) {
      horizontalDirection.add(forward);
    }

    if (this.keyboard.isBackward()) {
      horizontalDirection.sub(forward);
    }

    if (this.keyboard.isLeft()) {
      horizontalDirection.sub(right);
    }

    if (this.keyboard.isRight()) {
      horizontalDirection.add(right);
    }

    const hasHorizontalInput = horizontalDirection.lengthSq() > 0;
    if (hasHorizontalInput) {
      horizontalDirection.normalize();
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

      const desiredVelocity = new THREE.Vector3();

      if (hasHorizontalInput) {
        desiredVelocity.addScaledVector(horizontalDirection, targetSpeed);
      }

      desiredVelocity.y = verticalInput * this.config.flightVerticalSpeed;

      const lerpFactor = Math.min(1, this.config.flightAcceleration * deltaTime);
      this.flightVelocity.lerp(desiredVelocity, lerpFactor);
    } else {
      this.flightThrust = Math.max(0, this.flightThrust - this.config.flightDeceleration * deltaTime);
      const damping = Math.max(0, 1 - this.config.flightDeceleration * deltaTime);
      this.flightVelocity.multiplyScalar(damping);
      if (this.flightVelocity.length() < 0.05) {
        this.flightVelocity.set(0, 0, 0);
      }
    }

    const movement = this.flightVelocity.clone().multiplyScalar(deltaTime);

    if (movement.x !== 0) {
      this.applyMovement(new THREE.Vector3(movement.x, 0, 0), 'x');
    }

    if (movement.y !== 0) {
      this.applyMovement(new THREE.Vector3(0, movement.y, 0), 'y');
    }

    if (movement.z !== 0) {
      this.applyMovement(new THREE.Vector3(0, 0, movement.z), 'z');
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

    const oldPosition = this.camera.position.clone();
    this.camera.position.add(movement);

    const playerBox = this.getBoundingBox();

    // 检查玩家周围的方块
    const minX = Math.floor(playerBox.min.x);
    const maxX = Math.ceil(playerBox.max.x);
    const minY = Math.floor(playerBox.min.y);
    const maxY = Math.ceil(playerBox.max.y);
    const minZ = Math.floor(playerBox.min.z);
    const maxZ = Math.ceil(playerBox.max.z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const blockType = this.chunkManager.getBlock(x, y, z);
          if (blockType !== BlockType.AIR && blockType !== BlockType.WATER) {
            const blockBox = new BoundingBox(
              new THREE.Vector3(x - 0.5, y - 0.5, z - 0.5),
              new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5)
            );

            const collision = checkCollision(playerBox, blockBox);

            if (collision.collided) {
              this.camera.position.copy(oldPosition);

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
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    if (direction.lengthSq() === 0) {
      direction.set(0, 0, -1);
    } else {
      direction.normalize();
    }
    return direction;
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
