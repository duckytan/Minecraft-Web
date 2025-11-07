import * as THREE from 'three';
import { RaycastController, RaycastHit } from './raycast';
import { World } from '../world/world';
import { BlockType } from '../world/block';
import { BoundingBox } from '../physics/collision';

export interface BlockActionOptions {
  maxDistance?: number;
  currentBlockType?: BlockType;
}

export class BlockActionController {
  private readonly world: World;

  private readonly camera: THREE.PerspectiveCamera;

  private readonly raycast: RaycastController;

  private currentBlockType: BlockType;

  private readonly playerBoundingBox: () => BoundingBox;

  constructor(
    world: World,
    camera: THREE.PerspectiveCamera,
    playerBoundingBox: () => BoundingBox,
    options?: BlockActionOptions
  ) {
    this.world = world;
    this.camera = camera;
    this.raycast = new RaycastController(options?.maxDistance || 5);
    this.currentBlockType = options?.currentBlockType || BlockType.DIRT;
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

    window.addEventListener('keydown', (event: KeyboardEvent) => {
      const key = parseInt(event.key, 10);
      if (key >= 1 && key <= 5) {
        this.setCurrentBlockType(key);
      }
    });
  }

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

    const blockPos = hit.object.position;
    this.world.removeBlock(
      Math.round(blockPos.x),
      Math.round(blockPos.y),
      Math.round(blockPos.z)
    );
  }

  private handlePlaceBlock(): void {
    const hit = this.castRay();

    if (!hit) {
      return;
    }

    const blockPos = hit.object.position;
    const normal = hit.normal;

    const newBlockPos = new THREE.Vector3(
      Math.round(blockPos.x + normal.x),
      Math.round(blockPos.y + normal.y),
      Math.round(blockPos.z + normal.z)
    );

    if (this.wouldCollideWithPlayer(newBlockPos)) {
      return;
    }

    this.world.setBlock(newBlockPos.x, newBlockPos.y, newBlockPos.z, this.currentBlockType);
  }

  private wouldCollideWithPlayer(blockPos: THREE.Vector3): boolean {
    const playerBox = this.playerBoundingBox();
    const blockBox = new BoundingBox(
      new THREE.Vector3(blockPos.x - 0.5, blockPos.y - 0.5, blockPos.z - 0.5),
      new THREE.Vector3(blockPos.x + 0.5, blockPos.y + 0.5, blockPos.z + 0.5)
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
}
