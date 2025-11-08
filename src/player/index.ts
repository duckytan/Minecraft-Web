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
}

const DEFAULT_CONFIG: Required<PlayerConfig> = {
  moveSpeed: 5,
  sprintMultiplier: 1.5,
  jumpVelocity: 8,
  gravity: -25,
  width: 0.6,
  height: 1.8,
  depth: 0.6
};

export class Player {
  private readonly camera: THREE.PerspectiveCamera;

  private readonly keyboard: KeyboardInput;

  private readonly config: Required<PlayerConfig>;

  private velocity = new THREE.Vector3();

  private isGrounded = false;

  private chunkManager: ChunkManager | null = null;

  constructor(camera: THREE.PerspectiveCamera, keyboard: KeyboardInput, config?: PlayerConfig) {
    this.camera = camera;
    this.keyboard = keyboard;
    this.config = { ...DEFAULT_CONFIG, ...config };
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

  private applyMovement(movement: THREE.Vector3, axis: 'x' | 'y' | 'z'): void {
    if (!this.chunkManager) {
      // 如果没有 ChunkManager，直接移动（向后兼容）
      this.camera.position.add(movement);
      if (axis === 'y') {
        this.isGrounded = false;
      }
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
          if (blockType !== BlockType.AIR) {
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
