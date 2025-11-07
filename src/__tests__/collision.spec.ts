import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { BoundingBox, checkCollision } from '@/physics/collision';

const createBoundingBox = (min: THREE.Vector3, max: THREE.Vector3): BoundingBox =>
  new BoundingBox(min, max);

describe('BoundingBox', () => {
  it('should determine intersection correctly', () => {
    const boxA = createBoundingBox(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));
    const boxB = createBoundingBox(new THREE.Vector3(0.5, 0, 0.5), new THREE.Vector3(1.5, 1, 1.5));

    expect(boxA.intersects(boxB)).toBe(true);

    const boxC = createBoundingBox(new THREE.Vector3(2, 2, 2), new THREE.Vector3(3, 3, 3));
    expect(boxA.intersects(boxC)).toBe(false);
  });

  it('should clone bounding box correctly', () => {
    const box = createBoundingBox(new THREE.Vector3(1, 2, 3), new THREE.Vector3(4, 5, 6));
    const clone = box.clone();

    expect(clone).not.toBe(box);
    expect(clone.min).not.toBe(box.min);
    expect(clone.max).not.toBe(box.max);
    expect(clone.min.equals(box.min)).toBe(true);
    expect(clone.max.equals(box.max)).toBe(true);
  });

  it('should translate bounding box by offset', () => {
    const box = createBoundingBox(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));
    const translated = box.translate(new THREE.Vector3(2, 3, 4));

    expect(translated.min.equals(new THREE.Vector3(2, 3, 4))).toBe(true);
    expect(translated.max.equals(new THREE.Vector3(3, 4, 5))).toBe(true);
    // original should remain unchanged
    expect(box.min.equals(new THREE.Vector3(0, 0, 0))).toBe(true);
    expect(box.max.equals(new THREE.Vector3(1, 1, 1))).toBe(true);
  });
});

describe('checkCollision', () => {
  it('should return no collision when boxes do not intersect', () => {
    const player = createBoundingBox(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));
    const block = createBoundingBox(new THREE.Vector3(2, 2, 2), new THREE.Vector3(3, 3, 3));

    expect(checkCollision(player, block)).toEqual({ collided: false });
  });

  it('should detect collision with smallest overlap axis', () => {
    const player = createBoundingBox(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1.5, 1));
    const block = createBoundingBox(new THREE.Vector3(0.5, 0, 0), new THREE.Vector3(1.5, 1, 1));

    const result = checkCollision(player, block);

    expect(result.collided).toBe(true);
    expect(result.axis).toBe('x');
    expect(result.overlap).toBeCloseTo(0.5, 6);
  });

  it('should choose Y axis when it has minimum overlap', () => {
    const player = createBoundingBox(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1.5, 1));
    const block = createBoundingBox(new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(1, 2.2, 1));

    const result = checkCollision(player, block);

    expect(result.axis).toBe('y');
    expect(result.overlap).toBeCloseTo(0.3, 6);
  });

  it('should choose Z axis when it has minimum overlap', () => {
    const player = createBoundingBox(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));
    const block = createBoundingBox(new THREE.Vector3(0, 0, 0.75), new THREE.Vector3(1, 1, 1.75));

    const result = checkCollision(player, block);

    expect(result.axis).toBe('z');
    expect(result.overlap).toBeCloseTo(0.25, 6);
  });
});
