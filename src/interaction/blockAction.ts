import * as THREE from 'three';
import { RaycastController, RaycastHit } from './raycast';
import { World } from '../world/world';
import { BlockType, BLOCK_SIZE } from '../world/block';
import { BoundingBox } from '../physics/collision';

export interface BlockActionOptions {
  maxDistance?: number;
  currentBlockType?: BlockType;
  getSelectedBlockType?: () => BlockType;
}

export class BlockActionController {
  private readonly world: World;

  private readonly camera: THREE.PerspectiveCamera;

  private readonly raycast: RaycastController;

  private currentBlockType: BlockType;

  private static readonly POSITION_EPSILON = 1e-3;

  private readonly playerBoundingBox: () => BoundingBox;

  private readonly getSelectedBlockType?: () => BlockType;

  constructor(
    world: World,
    camera: THREE.PerspectiveCamera,
    playerBoundingBox: () => BoundingBox,
    options?: BlockActionOptions
  ) {
    this.world = world;
    this.camera = camera;
    this.raycast = new RaycastController(options?.maxDistance || 5);
    this.getSelectedBlockType = options?.getSelectedBlockType;
    this.currentBlockType =
      options?.currentBlockType ?? (this.getSelectedBlockType ? this.getSelectedBlockType() : BlockType.DIRT);
    this.playerBoundingBox = playerBoundingBox;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('mousedown', (event: MouseEvent) => {
      if (document.pointerLockElement === null) {
        return;
      }

      if (event.button === 0) {
        this.handleBreakBlock();
      } else if (event.button === 2) {
        this.handlePlaceBlock();
      }
    });

    window.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
    });

    if (!this.getSelectedBlockType) {
      window.addEventListener('keydown', this.handleKeyDownForSelection);
    }
  }

  private readonly handleKeyDownForSelection = (event: KeyboardEvent): void => {
    const key = parseInt(event.key, 10);
    if (Number.isNaN(key)) {
      return;
    }

    if (key >= 1 && key <= 5) {
      this.setCurrentBlockType(key);
    }
  };

  private setCurrentBlockType(slot: number): void {
    const blockTypes = [BlockType.GRASS, BlockType.DIRT, BlockType.STONE, BlockType.WOOD, BlockType.LEAVES];

    if (slot >= 1 && slot <= blockTypes.length) {
      this.currentBlockType = blockTypes[slot - 1];
      console.log(`切换到方块类型: ${BlockType[this.currentBlockType]}`);
    }
  }

  private handleBreakBlock(): void {
    const hit = this.castRay();

    if (!hit) {
      return;
    }

    const blockPos = this.getTargetBlockPosition(hit, 'remove');

    this.world.removeBlock(blockPos.x, blockPos.y, blockPos.z);
  }

  private handlePlaceBlock(): void {
    const hit = this.castRay();

    if (!hit) {
      return;
    }

    const newBlockPos = this.getTargetBlockPosition(hit, 'place');

    if (this.wouldCollideWithPlayer(newBlockPos)) {
      return;
    }

    const blockType = this.getSelectedBlockType ? this.getSelectedBlockType() : this.currentBlockType;
    this.world.setBlock(newBlockPos.x, newBlockPos.y, newBlockPos.z, blockType);
  }

  private wouldCollideWithPlayer(blockPos: THREE.Vector3): boolean {
    const playerBox = this.playerBoundingBox();
    const worldCenter = this.toWorldCenter(blockPos);
    const halfSize = BLOCK_SIZE / 2;
    const blockBox = new BoundingBox(
      new THREE.Vector3(worldCenter.x - halfSize, worldCenter.y - halfSize, worldCenter.z - halfSize),
      new THREE.Vector3(worldCenter.x + halfSize, worldCenter.y + halfSize, worldCenter.z + halfSize)
    );

    return playerBox.intersects(blockBox);
  }

  private castRay(): RaycastHit | null {
    const blocks = this.world.getAllBlocks();
    return this.raycast.cast(this.camera, blocks);
  }

  getCastRayFromCamera(): RaycastHit | null {
    const blocks = this.world.getAllBlocks();
    return this.raycast.cast(this.camera, blocks);
  }

  private getTargetBlockPosition(hit: RaycastHit, action: 'place' | 'remove'): THREE.Vector3 {
    const point = hit.point.clone();
    const offsetMagnitude = BLOCK_SIZE / 2 + BlockActionController.POSITION_EPSILON;
    const direction = action === 'remove' ? -1 : 1;

    point.addScaledVector(hit.normal, offsetMagnitude * direction);

    return new THREE.Vector3(
      Math.round(point.x / BLOCK_SIZE),
      Math.round(point.y / BLOCK_SIZE),
      Math.round(point.z / BLOCK_SIZE)
    );
  }

  private toWorldCenter(blockPos: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      blockPos.x * BLOCK_SIZE,
      blockPos.y * BLOCK_SIZE,
      blockPos.z * BLOCK_SIZE
    );
  }
}
