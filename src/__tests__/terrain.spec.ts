import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { BLOCK_COLORS, BLOCK_SIZE, BlockType } from '@/world/block';
import { generateFlatTerrain, TerrainConfig } from '@/world/terrain';

describe('generateFlatTerrain', () => {
  it('should create terrain group with expected size and properties', () => {
    const group = generateFlatTerrain();

    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.name).toBe('FlatTerrain');
    // Default config width/depth = 16, height = 3
    expect(group.children.length).toBe(16 * 16 * 3);

    for (const child of group.children) {
      expect(child).toBeInstanceOf(THREE.Mesh);
      const mesh = child as THREE.Mesh;
      expect(mesh.receiveShadow).toBe(true);

      const layer = Math.round(mesh.position.y / BLOCK_SIZE);
      if (layer === 2) {
        expect(mesh.castShadow).toBe(true);
        expect((mesh.material as THREE.MeshLambertMaterial).color.getHex()).toBe(
          BLOCK_COLORS[BlockType.GRASS]
        );
      } else {
        expect(mesh.castShadow).toBe(false);
        expect((mesh.material as THREE.MeshLambertMaterial).color.getHex()).toBe(
          BLOCK_COLORS[BlockType.DIRT]
        );
      }
    }
  });

  it('should assign block types based on custom height', () => {
    const config: TerrainConfig = {
      width: 2,
      depth: 2,
      height: 4
    };
    const group = generateFlatTerrain(config);
    const materialsByLayer = new Map<number, number>();

    for (const child of group.children) {
      const mesh = child as THREE.Mesh;
      const layer = Math.round(mesh.position.y / BLOCK_SIZE);
      const color = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
      materialsByLayer.set(layer, color);
    }

    expect(materialsByLayer.get(3)).toBe(BLOCK_COLORS[BlockType.GRASS]);
    expect(materialsByLayer.get(2)).toBe(BLOCK_COLORS[BlockType.DIRT]);
    expect(materialsByLayer.get(1)).toBe(BLOCK_COLORS[BlockType.DIRT]);
    expect(materialsByLayer.get(0)).toBe(BLOCK_COLORS[BlockType.STONE]);
  });
});
