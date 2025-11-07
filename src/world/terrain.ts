import * as THREE from 'three';
import { BLOCK_COLORS, BLOCK_SIZE, BlockType } from './block';

export interface TerrainConfig {
  width: number;
  depth: number;
  height: number;
}

const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
  width: 16,
  depth: 16,
  height: 3
};

export function generateFlatTerrain(config: TerrainConfig = DEFAULT_TERRAIN_CONFIG): THREE.Group {
  const { width, depth, height } = config;
  const terrainGroup = new THREE.Group();

  const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  geometry.computeBoundingBox();

  for (let x = 0; x < width; x += 1) {
    for (let z = 0; z < depth; z += 1) {
      for (let y = 0; y < height; y += 1) {
        const blockType = getBlockTypeForLayer(y, height);
        if (blockType === BlockType.AIR) {
          continue;
        }

        const material = new THREE.MeshLambertMaterial({
          color: BLOCK_COLORS[blockType]
        });

        const cube = new THREE.Mesh(geometry, material);
        cube.castShadow = y === height - 1;
        cube.receiveShadow = true;
        cube.position.set(
          x * BLOCK_SIZE - (width * BLOCK_SIZE) / 2 + BLOCK_SIZE / 2,
          y * BLOCK_SIZE,
          z * BLOCK_SIZE - (depth * BLOCK_SIZE) / 2 + BLOCK_SIZE / 2
        );

        terrainGroup.add(cube);
      }
    }
  }

  terrainGroup.name = 'FlatTerrain';
  return terrainGroup;
}

function getBlockTypeForLayer(layer: number, totalHeight: number): BlockType {
  if (layer === totalHeight - 1) {
    return BlockType.GRASS;
  }

  if (layer >= totalHeight - 3) {
    return BlockType.DIRT;
  }

  return BlockType.STONE;
}
