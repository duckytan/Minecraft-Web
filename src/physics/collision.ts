import * as THREE from 'three';

export class BoundingBox {
  constructor(
    public min: THREE.Vector3,
    public max: THREE.Vector3
  ) {}

  intersects(other: BoundingBox): boolean {
    return (
      this.min.x <= other.max.x &&
      this.max.x >= other.min.x &&
      this.min.y <= other.max.y &&
      this.max.y >= other.min.y &&
      this.min.z <= other.max.z &&
      this.max.z >= other.min.z
    );
  }

  clone(): BoundingBox {
    return new BoundingBox(this.min.clone(), this.max.clone());
  }

  translate(offset: THREE.Vector3): BoundingBox {
    return new BoundingBox(
      this.min.clone().add(offset),
      this.max.clone().add(offset)
    );
  }
}

export interface CollisionResult {
  collided: boolean;
  axis?: 'x' | 'y' | 'z';
  overlap?: number;
}

export function checkCollision(playerBox: BoundingBox, blockBox: BoundingBox): CollisionResult {
  if (!playerBox.intersects(blockBox)) {
    return { collided: false };
  }

  const overlapX = Math.min(
    playerBox.max.x - blockBox.min.x,
    blockBox.max.x - playerBox.min.x
  );
  const overlapY = Math.min(
    playerBox.max.y - blockBox.min.y,
    blockBox.max.y - playerBox.min.y
  );
  const overlapZ = Math.min(
    playerBox.max.z - blockBox.min.z,
    blockBox.max.z - playerBox.min.z
  );

  const minOverlap = Math.min(overlapX, overlapY, overlapZ);

  let axis: 'x' | 'y' | 'z';
  if (minOverlap === overlapX) {
    axis = 'x';
  } else if (minOverlap === overlapY) {
    axis = 'y';
  } else {
    axis = 'z';
  }

  return {
    collided: true,
    axis,
    overlap: minOverlap
  };
}
