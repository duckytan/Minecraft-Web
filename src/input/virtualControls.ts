import { KeyboardInput } from './keyboard';

/**
 * 虚拟控制器类 - 为移动设备提供触摸控制
 */
export class VirtualControls {
  private readonly keyboard: KeyboardInput;
  private readonly canvas: HTMLElement;
  private enabled = false;

  // DOM 元素
  private container: HTMLDivElement | null = null;
  private joystickContainer: HTMLDivElement | null = null;
  private joystickKnob: HTMLDivElement | null = null;
  private buttonsContainer: HTMLDivElement | null = null;

  // 摇杆状态
  private joystickActive = false;
  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private joystickDelta = { x: 0, y: 0 };
  private readonly joystickRadius = 50;
  private readonly joystickDeadzone = 0.15;

  // 视角控制
  private lookTouchId: number | null = null;
  private lookStartPos = { x: 0, y: 0 };
  private lookSensitivity = 0.003;

  // 回调
  private onMouseMove: ((deltaX: number, deltaY: number) => void) | null = null;
  private onLeftClick: (() => void) | null = null;
  private onRightClick: (() => void) | null = null;

  // 按钮状态
  private activeButtons = new Set<string>();

  private eventsBound = false;

  constructor(keyboard: KeyboardInput, canvas: HTMLElement) {
    this.keyboard = keyboard;
    this.canvas = canvas;
  }

  /**
   * 设置视角移动回调
   */
  setMouseMoveCallback(callback: (deltaX: number, deltaY: number) => void): void {
    this.onMouseMove = callback;
  }

  /**
   * 设置左键点击回调
   */
  setLeftClickCallback(callback: () => void): void {
    this.onLeftClick = callback;
  }

  /**
   * 设置右键点击回调
   */
  setRightClickCallback(callback: () => void): void {
    this.onRightClick = callback;
  }

  /**
   * 设置视角灵敏度
   */
  setLookSensitivity(sensitivity: number): void {
    this.lookSensitivity = sensitivity;
  }

  /**
   * 启用虚拟控制器
   */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.createUI();
    this.bindEvents();
  }

  /**
   * 禁用虚拟控制器
   */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.cleanup();
  }

  /**
   * 创建虚拟控制器 UI
   */
  private createUI(): void {
    // 主容器
    this.container = document.createElement('div');
    this.container.id = 'virtual-controls';
    this.container.className = 'virtual-controls';

    // 左侧摇杆区域
    this.joystickContainer = document.createElement('div');
    this.joystickContainer.className = 'virtual-joystick';
    this.joystickContainer.innerHTML = `
      <div class="joystick-base"></div>
      <div class="joystick-knob"></div>
    `;
    this.joystickKnob = this.joystickContainer.querySelector('.joystick-knob') as HTMLDivElement;

    // 右侧按钮区域
    this.buttonsContainer = document.createElement('div');
    this.buttonsContainer.className = 'virtual-buttons';
    this.buttonsContainer.innerHTML = `
      <div class="button-group-top-right">
        <button class="virtual-button break-button" data-action="break">⛏️</button>
        <button class="virtual-button place-button" data-action="place">🧱</button>
      </div>
      <div class="button-group-bottom-right">
        <button class="virtual-button jump-button" data-action="jump">🚀</button>
        <button class="virtual-button sprint-button" data-action="sprint">⚡</button>
      </div>
      <div class="button-group-top-left">
        <button class="virtual-button flight-button" data-action="flight">✈️</button>
      </div>
    `;

    this.container.appendChild(this.joystickContainer);
    this.container.appendChild(this.buttonsContainer);
    document.body.appendChild(this.container);
  }

  /**
   * 绑定触摸事件
   */
  private bindEvents(): void {
    if (!this.container || this.eventsBound) return;

    // 摇杆触摸事件
    this.joystickContainer?.addEventListener('touchstart', this.handleJoystickStart);
    this.joystickContainer?.addEventListener('touchmove', this.handleJoystickMove);
    this.joystickContainer?.addEventListener('touchend', this.handleJoystickEnd);
    this.joystickContainer?.addEventListener('touchcancel', this.handleJoystickEnd);

    // 按钮触摸事件
    const buttons = this.buttonsContainer?.querySelectorAll<HTMLButtonElement>('.virtual-button');
    buttons?.forEach((button) => {
      button.addEventListener('touchstart', this.handleButtonPress);
      button.addEventListener('touchend', this.handleButtonRelease);
      button.addEventListener('touchcancel', this.handleButtonRelease);
    });

    // 画布触摸事件（用于视角控制）
    this.canvas.addEventListener('touchstart', this.handleLookStart);
    this.canvas.addEventListener('touchmove', this.handleLookMove);
    this.canvas.addEventListener('touchend', this.handleLookEnd);
    this.canvas.addEventListener('touchcancel', this.handleLookEnd);

    this.eventsBound = true;
  }

  /**
   * 解绑触摸事件
   */
  private unbindEvents(): void {
    if (!this.eventsBound) return;

    // 摇杆触摸事件
    this.joystickContainer?.removeEventListener('touchstart', this.handleJoystickStart);
    this.joystickContainer?.removeEventListener('touchmove', this.handleJoystickMove);
    this.joystickContainer?.removeEventListener('touchend', this.handleJoystickEnd);
    this.joystickContainer?.removeEventListener('touchcancel', this.handleJoystickEnd);

    // 按钮触摸事件
    const buttons = this.buttonsContainer?.querySelectorAll<HTMLButtonElement>('.virtual-button');
    buttons?.forEach((button) => {
      button.removeEventListener('touchstart', this.handleButtonPress);
      button.removeEventListener('touchend', this.handleButtonRelease);
      button.removeEventListener('touchcancel', this.handleButtonRelease);
    });

    // 画布触摸事件
    this.canvas.removeEventListener('touchstart', this.handleLookStart);
    this.canvas.removeEventListener('touchmove', this.handleLookMove);
    this.canvas.removeEventListener('touchend', this.handleLookEnd);
    this.canvas.removeEventListener('touchcancel', this.handleLookEnd);

    this.eventsBound = false;
  }

  /**
   * 摇杆触摸开始
   */
  private handleJoystickStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.joystickActive) return;

    const touch = e.touches[0];
    this.joystickTouchId = touch.identifier;
    this.joystickActive = true;

    const rect = this.joystickContainer!.getBoundingClientRect();
    this.joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    this.updateJoystick(touch.clientX, touch.clientY);
  };

  /**
   * 摇杆触摸移动
   */
  private handleJoystickMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.joystickActive) return;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier === this.joystickTouchId) {
        this.updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  /**
   * 摇杆触摸结束
   */
  private handleJoystickEnd = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.joystickActive) return;

    let touchEnded = true;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.joystickTouchId) {
        touchEnded = false;
        break;
      }
    }

    if (touchEnded) {
      this.joystickActive = false;
      this.joystickTouchId = null;
      this.joystickDelta = { x: 0, y: 0 };
      this.updateJoystickVisual();
      this.updateKeyboardFromJoystick();
    }
  };

  /**
   * 更新摇杆位置
   */
  private updateJoystick(clientX: number, clientY: number): void {
    const dx = clientX - this.joystickCenter.x;
    const dy = clientY - this.joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.joystickRadius) {
      this.joystickDelta.x = (dx / distance) * this.joystickRadius;
      this.joystickDelta.y = (dy / distance) * this.joystickRadius;
    } else {
      this.joystickDelta.x = dx;
      this.joystickDelta.y = dy;
    }

    this.updateJoystickVisual();
    this.updateKeyboardFromJoystick();
  }

  /**
   * 更新摇杆视觉效果
   */
  private updateJoystickVisual(): void {
    if (!this.joystickKnob) return;
    this.joystickKnob.style.transform = `translate(${this.joystickDelta.x}px, ${this.joystickDelta.y}px)`;
  }

  /**
   * 根据摇杆输入更新键盘状态
   */
  private updateKeyboardFromJoystick(): void {
    const normX = this.joystickDelta.x / this.joystickRadius;
    const normY = this.joystickDelta.y / this.joystickRadius;

    // 应用死区
    const deadzone = this.joystickDeadzone;
    
    // 前后
    if (normY < -deadzone) {
      this.setKeyState('KeyW', true);
      this.setKeyState('KeyS', false);
    } else if (normY > deadzone) {
      this.setKeyState('KeyW', false);
      this.setKeyState('KeyS', true);
    } else {
      this.setKeyState('KeyW', false);
      this.setKeyState('KeyS', false);
    }

    // 左右
    if (normX < -deadzone) {
      this.setKeyState('KeyA', true);
      this.setKeyState('KeyD', false);
    } else if (normX > deadzone) {
      this.setKeyState('KeyA', false);
      this.setKeyState('KeyD', true);
    } else {
      this.setKeyState('KeyA', false);
      this.setKeyState('KeyD', false);
    }
  }

  /**
   * 设置键盘按键状态
   */
  private setKeyState(keyCode: string, pressed: boolean): void {
    this.keyboard.setKeyState(keyCode, pressed);
  }

  /**
   * 视角控制触摸开始
   */
  private handleLookStart = (e: TouchEvent): void => {
    // 忽略在摇杆和按钮上的触摸
    const target = e.target as HTMLElement;
    if (target.closest('.virtual-joystick') || target.closest('.virtual-buttons')) {
      return;
    }

    // 使用第一个非摇杆的触摸点
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier !== this.joystickTouchId && this.lookTouchId === null) {
        this.lookTouchId = touch.identifier;
        this.lookStartPos = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  /**
   * 视角控制触摸移动
   */
  private handleLookMove = (e: TouchEvent): void => {
    if (this.lookTouchId === null) return;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier === this.lookTouchId) {
        const deltaX = touch.clientX - this.lookStartPos.x;
        const deltaY = touch.clientY - this.lookStartPos.y;

        // 调用鼠标移动回调
        if (this.onMouseMove) {
          this.onMouseMove(deltaX * this.lookSensitivity, deltaY * this.lookSensitivity);
        }

        this.lookStartPos = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  /**
   * 视角控制触摸结束
   */
  private handleLookEnd = (e: TouchEvent): void => {
    if (this.lookTouchId === null) return;

    let touchEnded = true;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.lookTouchId) {
        touchEnded = false;
        break;
      }
    }

    if (touchEnded) {
      this.lookTouchId = null;
    }
  };

  /**
   * 按钮按下
   */
  private handleButtonPress = (e: Event): void => {
    e.preventDefault();
    const button = e.target as HTMLElement;
    const action = button.dataset.action;
    if (!action) return;

    this.activeButtons.add(action);
    button.classList.add('active');

    switch (action) {
      case 'jump':
        this.setKeyState('Space', true);
        break;
      case 'sprint':
        this.setKeyState('ShiftLeft', true);
        break;
      case 'flight':
        // 触发飞行模式切换（模拟 F 键按下）
        this.setKeyState('KeyF', true);
        // 立即释放，避免重复触发
        setTimeout(() => this.setKeyState('KeyF', false), 50);
        break;
      case 'break':
        if (this.onLeftClick) {
          this.onLeftClick();
        }
        break;
      case 'place':
        if (this.onRightClick) {
          this.onRightClick();
        }
        break;
    }
  };

  /**
   * 按钮释放
   */
  private handleButtonRelease = (e: Event): void => {
    e.preventDefault();
    const button = e.target as HTMLElement;
    const action = button.dataset.action;
    if (!action) return;

    this.activeButtons.delete(action);
    button.classList.remove('active');

    switch (action) {
      case 'jump':
        this.setKeyState('Space', false);
        break;
      case 'sprint':
        this.setKeyState('ShiftLeft', false);
        break;
    }
  };

  /**
   * 清理 UI 和事件
   */
  private cleanup(): void {
    // 清除所有按键状态
    this.setKeyState('KeyW', false);
    this.setKeyState('KeyS', false);
    this.setKeyState('KeyA', false);
    this.setKeyState('KeyD', false);
    this.setKeyState('Space', false);
    this.setKeyState('ShiftLeft', false);

    // 解绑事件
    this.unbindEvents();

    // 移除 DOM
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.joystickContainer = null;
    this.joystickKnob = null;
    this.buttonsContainer = null;

    // 重置状态
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.lookTouchId = null;
    this.activeButtons.clear();
  }

  /**
   * 更新（每帧调用）
   */
  update(): void {
    // 当前无需每帧更新逻辑
  }

  /**
   * 当前是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 销毁
   */
  dispose(): void {
    this.disable();
  }
}
