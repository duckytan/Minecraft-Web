import './styles/main.css';
import * as THREE from 'three';
import { createScene } from './core/scene';
import { createCamera, updateCameraAspect } from './core/camera';
import { createRenderer } from './core/renderer';
import { ChunkManager } from './world/chunkManager';
import { World } from './world/world';
import { KeyboardInput } from './input/keyboard';
import { MouseLookController } from './input/mouse';
import { Player } from './player';
import { BlockActionController } from './interaction/blockAction';
import { initHUD } from './ui/hud';
import { initHotbar } from './ui/hotbar';
import { SaveManager } from './save/saveManager';
import { initSaveControls } from './ui/saveControls';

class Game {
  private readonly scene: THREE.Scene;

  private readonly camera: THREE.PerspectiveCamera;

  private readonly renderer: THREE.WebGLRenderer;

  private readonly clock: THREE.Clock;

  private readonly keyboard: KeyboardInput;

  private readonly player: Player;

  private readonly world: World;

  private readonly chunkManager: ChunkManager;

  private readonly hud: ReturnType<typeof initHUD>;

  private readonly hotbar: ReturnType<typeof initHotbar>;

  private readonly saveManager: SaveManager;

  private lastChunkUpdate = 0;

  private readonly chunkUpdateInterval = 0.5; // 每0.5秒更新一次

  constructor() {
    this.scene = createScene();
    this.camera = createCamera();
    this.renderer = createRenderer();
    this.clock = new THREE.Clock();

    const app = document.getElementById('app');

    if (!app) {
      throw new Error('App element not found');
    }

    app.appendChild(this.renderer.domElement);

    this.hud = initHUD();
    this.hotbar = initHotbar();

    this.hud.overlay.addEventListener('click', (event) => {
      event.preventDefault();
      this.renderer.domElement.focus();
      if (document.pointerLockElement !== this.renderer.domElement) {
        this.renderer.domElement.requestPointerLock();
      }
    });

    this.keyboard = new KeyboardInput();
    new MouseLookController(this.renderer.domElement, this.camera, {
      onLockChange: (locked) => {
        this.hud.setPointerLockState(locked);
        // 无论锁定或释放都确保 canvas 获得焦点
        this.renderer.domElement.focus();
      }
    });

    // 初始焦点
    this.renderer.domElement.focus();

    // 确保任何时候点击 canvas 都会恢复焦点
    this.renderer.domElement.addEventListener('mousedown', () => {
      this.renderer.domElement.focus();
    });

    this.player = new Player(this.camera, this.keyboard);

    // 监听飞行模式变化，更新 HUD
    this.keyboard.onFlightToggle(() => {
      this.hud.setFlightMode(this.player.isFlightMode());
    });

    // 创建 ChunkManager（渲染距离4，即9x9个chunk）
    this.chunkManager = new ChunkManager(this.scene, 4);
    this.player.setChunkManager(this.chunkManager);

    // 初始化 Web Worker（可选，用于异步地形生成）
    // 如果 Worker 初始化失败，会自动回退到同步生成
    this.chunkManager.initWorker();

    // 生成初始地形（使用 Perlin 噪声）
    // 参数：centerX, centerZ, radius, scale, heightMultiplier, baseHeight
    this.chunkManager.generateTerrain(0, 0, 4, 0.05, 12, 15);

    // 将玩家设置到安全的初始位置（高于地形）
    this.player.setPosition(0, 30, 0);

    // 创建 World 并集成 ChunkManager
    this.world = new World(this.scene, this.chunkManager);

    new BlockActionController(this.world, this.camera, () => this.player.getBoundingBox(), {
      currentBlockType: this.hotbar.getSelectedBlock(),
      getSelectedBlockType: () => this.hotbar.getSelectedBlock()
    });

    // 初始化存档系统
    this.saveManager = new SaveManager(this.chunkManager, this.player);
    initSaveControls(this.saveManager);

    this.setupEventListeners();

    console.log('✅ 游戏初始化完成（Chunk系统已启用）');
    console.log('🎮 操作提示：');
    console.log('  - WASD: 移动');
    console.log('  - Space: 跳跃 / 飞行上升');
    console.log('  - Shift: 加速 / 飞行下降');
    console.log('  - F: 切换飞行模式');
    console.log('  - 左键: 破坏方块');
    console.log('  - 右键: 放置方块');
    console.log('  - 1-9: 切换方块类型（方块选择栏）');
    console.log('  - F5: 保存游戏');
    console.log('  - F9: 加载游戏');
    console.log(`📦 已加载 ${this.chunkManager.getLoadedChunkCount()} 个 Chunk`);

    // 检查是否有存档
    if (this.saveManager.hasSave()) {
      console.log('💾 检测到存档，按 F9 加载');
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      updateCameraAspect(this.camera);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  start(): void {
    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    this.hud.stats.begin();

    const deltaTime = this.clock.getDelta();

    // 定期更新 Chunk
    this.lastChunkUpdate += deltaTime;
    if (this.lastChunkUpdate >= this.chunkUpdateInterval) {
      this.chunkManager.updateChunks(this.player.getPosition());
      this.lastChunkUpdate = 0;
    }

    // 更新玩家（不再传递 colliders，使用 ChunkManager 的方块检测）
    this.player.update(deltaTime);

    this.renderer.render(this.scene, this.camera);

    this.hud.stats.end();
  };
}

const game = new Game();
game.start();
