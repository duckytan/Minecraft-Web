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

    this.keyboard = new KeyboardInput();
    new MouseLookController(this.renderer.domElement, this.camera, {
      onLockChange: (locked) => {
        this.hud.setPointerLockState(locked);
      }
    });

    this.player = new Player(this.camera, this.keyboard);

    // 创建 ChunkManager（渲染距离4，即9x9个chunk）
    this.chunkManager = new ChunkManager(this.scene, 4);

    // 初始化 Web Worker（可选，用于异步地形生成）
    // 如果 Worker 初始化失败，会自动回退到同步生成
    this.chunkManager.initWorker();

    // 生成初始地形（使用 Perlin 噪声）
    // 参数：centerX, centerZ, radius, scale, heightMultiplier, baseHeight
    this.chunkManager.generateTerrain(0, 0, 4, 0.05, 12, 15);

    // 创建 World 并集成 ChunkManager
    this.world = new World(this.scene, this.chunkManager);

    new BlockActionController(this.world, this.camera, () => this.player.getBoundingBox());

    this.setupEventListeners();

    console.log('✅ 游戏初始化完成（Chunk系统已启用）');
    console.log('🎮 操作提示：');
    console.log('  - WASD: 移动');
    console.log('  - Space: 跳跃');
    console.log('  - Shift: 加速');
    console.log('  - 左键: 破坏方块');
    console.log('  - 右键: 放置方块');
    console.log('  - 1-5: 切换方块类型');
    console.log(`📦 已加载 ${this.chunkManager.getLoadedChunkCount()} 个 Chunk`);
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

    // 使用 ChunkManager 的碰撞检测
    const colliders = this.chunkManager.getAllMeshes();
    this.player.update(deltaTime, colliders);

    this.renderer.render(this.scene, this.camera);

    this.hud.stats.end();
  };
}

const game = new Game();
game.start();
