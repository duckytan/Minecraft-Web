import * as THREE from 'three';
import { KeyboardInput } from '../input/keyboard';
import { BoundingBox, checkCollision } from '../physics/collision';

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

  constructor(camera: THREE.PerspectiveCamera, keyboard: KeyboardInput, config?: PlayerConfig) {
    this.camera = camera;
    this.keyboard = keyboard;
    this.config = { ...DEFAULT_CONFIG, ...config };
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

  update(deltaTime: number, colliders: THREE.Object3D[]): void {
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
        this.applyMovement(new THREE.Vector3(horizontalMovement.x, 0, 0), colliders, 'x');
      }

      if (horizontalMovement.z !== 0) {
        this.applyMovement(new THREE.Vector3(0, 0, horizontalMovement.z), colliders, 'z');
      }
    }

    if (this.keyboard.isJump() && this.isGrounded) {
      this.velocity.y = this.config.jumpVelocity;
      this.isGrounded = false;
    }

    this.velocity.y += this.config.gravity * deltaTime;

    const verticalMovement = new THREE.Vector3(0, this.velocity.y * deltaTime, 0);
    this.applyMovement(verticalMovement, colliders, 'y');
  }

  private applyMovement(
    movement: THREE.Vector3,
    colliders: THREE.Object3D[],
    axis: 'x' | 'y' | 'z'
  ): void {
    const oldPosition = this.camera.position.clone();
    this.camera.position.add(movement);

    const playerBox = this.getBoundingBox();

    for (const collider of colliders) {
      const blockBox = this.getBlockBoundingBox(collider);
      const collision = checkCollision(playerBox, blockBox);

      if (collision.collided) {
        this.camera.position.copy(oldPosition);

        if (axis === 'y') {
          if (this.velocity.y < 0) {
            this.isGrounded = true;
          }
          this.velocity.y = 0;
        }

        break;
      }
    }
  }

  private getBlockBoundingBox(block: THREE.Object3D): BoundingBox {
    const geometry = (block as THREE.Mesh).geometry;

    if (geometry && geometry.boundingBox) {
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!.clone();
      box.applyMatrix4(block.matrixWorld);

      return new BoundingBox(
        new THREE.Vector3(box.min.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z)
      );
    }

    const pos = block.position;
    const size = 0.5;

    return new BoundingBox(
      new THREE.Vector3(pos.x - size, pos.y - size, pos.z - size),
      new THREE.Vector3(pos.x + size, pos.y + size, pos.z + size)
    );
  }

  getPosition(): THREE.Vector3 {
    return this.camera.position;
  }
}
