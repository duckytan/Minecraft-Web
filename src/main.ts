import './styles/main.css';
import * as THREE from 'three';
import { createScene } from './core/scene';
import { createCamera, updateCameraAspect } from './core/camera';
import { createRenderer } from './core/renderer';
import { generateFlatTerrain } from './world/terrain';
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

  private readonly hud: ReturnType<typeof initHUD>;

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

    this.world = new World(this.scene);

    const terrain = generateFlatTerrain();
    this.scene.add(terrain);
    this.world.importTerrain(terrain);

    new BlockActionController(this.world, this.camera, () => this.player.getBoundingBox());

    this.setupEventListeners();

    console.log('✅ 游戏初始化完成');
    console.log('🎮 操作提示：');
    console.log('  - WASD: 移动');
    console.log('  - Space: 跳跃');
    console.log('  - Shift: 加速');
    console.log('  - 左键: 破坏方块');
    console.log('  - 右键: 放置方块');
    console.log('  - 1-5: 切换方块类型');
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

    const colliders = this.world.getAllBlocks();
    this.player.update(deltaTime, colliders);

    this.renderer.render(this.scene, this.camera);

    this.hud.stats.end();
  };
}

const game = new Game();
game.start();
