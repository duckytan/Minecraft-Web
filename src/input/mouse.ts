import * as THREE from 'three';

export interface MouseLookOptions {
  sensitivity?: number;
  onLockChange?: (locked: boolean) => void;
}

export class MouseLookController {
  private readonly domElement: HTMLElement;

  private readonly camera: THREE.PerspectiveCamera;

  private sensitivity: number;

  private isLocked = false;

  private yaw = 0;

  private pitch = 0;

  private readonly onLockChange?: (locked: boolean) => void;

  constructor(domElement: HTMLElement, camera: THREE.PerspectiveCamera, options?: MouseLookOptions) {
    this.domElement = domElement;
    this.camera = camera;
    this.sensitivity = options?.sensitivity ?? 0.002;
    this.onLockChange = options?.onLockChange;

    this.camera.rotation.order = 'YXZ';
    this.bindEvents();
  }

  setSensitivity(sensitivity: number): void {
    this.sensitivity = sensitivity;
  }

  private bindEvents(): void {
    this.domElement.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('mousemove', this.handleMouseMove);
  }

  private handleDocumentClick = (): void => {
    if (!this.isLocked) {
      this.domElement.focus();
      this.domElement.requestPointerLock();
    }
  };

  private handlePointerLockChange = (): void => {
    const locked = document.pointerLockElement === this.domElement;
    this.isLocked = locked;

    // 无论锁定或释放都确保 canvas 获得焦点，避免键盘事件丢失
    this.domElement.focus();

    this.onLockChange?.(locked);
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.isLocked) {
      return;
    }

    this.updateRotation(event.movementX * this.sensitivity, event.movementY * this.sensitivity);
  };

  /**
   * 更新相机旋转（可从外部调用，用于虚拟控制器）
   */
  updateRotation(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX;
    this.pitch -= deltaY;

    const maxPitch = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  dispose(): void {
    this.domElement.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('mousemove', this.handleMouseMove);
  }
}
