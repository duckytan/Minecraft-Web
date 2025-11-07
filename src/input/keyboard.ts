export class KeyboardInput {
  private keys: Map<string, boolean> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys.set(e.code, true);
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.set(e.code, false);
    });
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

  reset(): void {
    this.keys.clear();
  }
}
