export class KeyboardInput {
  private keys: Map<string, boolean> = new Map();
  private onFlightToggleCallbacks: Array<() => void> = [];

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // F键切换飞行模式（只在按下时触发一次）
      if (e.code === 'KeyF' && !this.keys.get(e.code)) {
        this.onFlightToggleCallbacks.forEach((callback) => callback());
      }

      this.keys.set(e.code, true);
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.set(e.code, false);
    });
  }

  /**
   * 注册飞行模式切换回调
   */
  onFlightToggle(callback: () => void): void {
    this.onFlightToggleCallbacks.push(callback);
  }

  isPressed(keyCode: string): boolean {
    return this.keys.get(keyCode) === true;
  }

  isForward(): boolean {
    return this.isPressed('KeyW');
  }

  isBackward(): boolean {
    return this.isPressed('KeyS');
  }

  isLeft(): boolean {
    return this.isPressed('KeyA');
  }

  isRight(): boolean {
    return this.isPressed('KeyD');
  }

  isJump(): boolean {
    return this.isPressed('Space');
  }

  isSprint(): boolean {
    return this.isPressed('ShiftLeft') || this.isPressed('ShiftRight');
  }

  isDescend(): boolean {
    return this.isPressed('ShiftLeft') || this.isPressed('ShiftRight');
  }

  reset(): void {
    this.keys.clear();
  }
}
