import './styles/main.css';
import * as THREE from 'three';
import { createScene } from './core/scene';
import { createCamera, updateCameraAspect } from './core/camera';
import { createRenderer } from './core/renderer';
import { ChunkManager } from './world/chunkManager';
import { World } from './world/world';
import { KeyboardInput } from './input/keyboard';
import { MouseLookController } from './input/mouse';
import { VirtualControls } from './input/virtualControls';
import { Player } from './player';
import { BlockActionController } from './interaction/blockAction';
import { initHUD } from './ui/hud';
import { initHotbar } from './ui/hotbar';
import { SaveManager } from './save/saveManager';
import { initSaveControls } from './ui/saveControls';
import { SoundManager, SoundType } from './audio/soundManager';
import { SettingsManager, initSettings } from './ui/settings';
import type { GameSettings } from './ui/settings';
import { GravitySystem } from './physics/gravity';

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

  private readonly soundManager: SoundManager;

  private readonly settingsManager: SettingsManager;

  private readonly settingsUI: ReturnType<typeof initSettings>;

  private readonly mouseLook: MouseLookController;

  private readonly virtualControls: VirtualControls;

  private readonly gravitySystem: GravitySystem;

  private blockActionController: BlockActionController | null = null;

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

    // 初始化音频系统
    this.soundManager = new SoundManager();
    this.settingsManager = new SettingsManager();
    this.settingsManager.setSoundManager(this.soundManager);

    // 恢复用户设置
    const settings = this.settingsManager.getSettings();

    this.hud = initHUD();
    this.hotbar = initHotbar();

    // 根据设置显示/隐藏 FPS
    if (!settings.showFPS) {
      this.hud.stats.dom.style.display = 'none';
    }

    this.hud.overlay.addEventListener('click', async (event) => {
      event.preventDefault();
      this.renderer.domElement.focus();

      if (this.virtualControls.isEnabled()) {
        this.hud.setPointerLockState(true);
      } else if (document.pointerLockElement !== this.renderer.domElement) {
        this.renderer.domElement.requestPointerLock();
      }

      // 恢复音频上下文（某些浏览器需要用户交互）
      await this.soundManager.resume();
    });

    this.keyboard = new KeyboardInput();
    this.mouseLook = new MouseLookController(this.renderer.domElement, this.camera, {
      sensitivity: settings.mouseSensitivity,
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

    // 创建 ChunkManager（使用设置中的渲染距离）
    this.chunkManager = new ChunkManager(this.scene, settings.renderDistance);
    this.player.setChunkManager(this.chunkManager);

    // 应用 FOV 设置
    this.camera.fov = settings.fov;
    this.camera.updateProjectionMatrix();

    // 初始化 Web Worker（可选，用于异步地形生成）
    // 如果 Worker 初始化失败，会自动回退到同步生成
    this.chunkManager.initWorker();

    // 应用地图生成配置
    this.applyTerrainSettings(settings);

    // 生成初始地形（使用高级地形生成器）
    // 使用默认配置：山峰、山谷、湖泊、树木、洞穴
    this.chunkManager.generateTerrain(0, 0, settings.renderDistance);

    // 将玩家设置到安全的初始位置（高于地形）
    this.player.setPosition(0, 35, 0);

    // 创建 World 并集成 ChunkManager
    this.world = new World(this.scene, this.chunkManager);

    // 初始化重力系统
    this.gravitySystem = new GravitySystem(this.chunkManager, this.scene);
    if (settings.realGravity) {
      this.gravitySystem.enable();
    }

    this.blockActionController = new BlockActionController(
      this.world,
      this.camera,
      () => this.player.getBoundingBox(),
      {
        currentBlockType: this.hotbar.getSelectedBlock(),
        getSelectedBlockType: () => this.hotbar.getSelectedBlock(),
        onBlockPlaced: () => {
          this.soundManager.play(SoundType.PLACE_BLOCK, {
            volume: 0.6,
            playbackRate: 0.9 + Math.random() * 0.2
          });
        },
        onBlockBroken: (_blockType, position) => {
          this.soundManager.play(SoundType.BREAK_BLOCK, {
            volume: 0.65,
            playbackRate: 0.9 + Math.random() * 0.15
          });
          // 检查重力系统
          if (this.gravitySystem.isEnabled()) {
            this.gravitySystem.checkStructuralIntegrity(
              Math.floor(position.x),
              Math.floor(position.y),
              Math.floor(position.z)
            );
          }
        }
      }
    );

    // 初始化虚拟控制器
    this.virtualControls = new VirtualControls(this.keyboard, this.renderer.domElement);
    this.virtualControls.setMouseMoveCallback((deltaX, deltaY) => {
      this.mouseLook.updateRotation(deltaX, deltaY);
    });
    this.virtualControls.setLeftClickCallback(() => {
      this.blockActionController?.breakBlockViaVirtualControl();
    });
    this.virtualControls.setRightClickCallback(() => {
      this.blockActionController?.placeBlockViaVirtualControl();
    });
    this.virtualControls.setLookSensitivity(settings.mouseSensitivity);
    
    if (settings.virtualControls) {
      this.virtualControls.enable();
    }

    // 初始化存档系统
    this.saveManager = new SaveManager(this.chunkManager, this.player);
    initSaveControls(this.saveManager);

    // 初始化设置界面（并传入重新生成地图的回调）
    this.settingsUI = initSettings(this.settingsManager, () => {
      this.regenerateWorld();
    });

    // 监听设置变化
    this.settingsManager.onSettingsChanged((newSettings) => {
      // 更新鼠标灵敏度
      this.mouseLook.setSensitivity(newSettings.mouseSensitivity);
      this.virtualControls.setLookSensitivity(newSettings.mouseSensitivity);

      // 更新 FOV
      this.camera.fov = newSettings.fov;
      this.camera.updateProjectionMatrix();

      // 更新 FPS 显示
      this.hud.stats.dom.style.display = newSettings.showFPS ? 'block' : 'none';

      // 更新虚拟控制器
      if (newSettings.virtualControls && !this.virtualControls.isEnabled()) {
        this.virtualControls.enable();
        if (document.pointerLockElement === this.renderer.domElement) {
          document.exitPointerLock();
        }
        console.log('📱 虚拟按键已启用');
      } else if (!newSettings.virtualControls && this.virtualControls.isEnabled()) {
        this.virtualControls.disable();
        console.log('📱 虚拟按键已禁用');
      }

      // 更新重力系统
      if (newSettings.realGravity && !this.gravitySystem.isEnabled()) {
        this.gravitySystem.enable();
      } else if (!newSettings.realGravity && this.gravitySystem.isEnabled()) {
        this.gravitySystem.disable();
      }

      // 更新地形生成配置（影响后续加载的 Chunk）
      this.applyTerrainSettings(newSettings);

      // 注意：渲染距离变化需要重新生成地形，此处仅更新 ChunkManager
      // 实际应用中可能需要清空并重新加载 Chunk
      console.log('⚙️ 设置已更新');
    });

    this.setupEventListeners();

    console.log('✅ 游戏初始化完成（高级地形系统已启用）');
    console.log('🌍 地形特性：山峰、山谷、湖泊、树木、灌木、洞穴、生物群系、基岩底板');
    console.log('🎮 操作提示：');
    console.log('  - WASD: 移动 / 游泳');
    console.log('  - Space: 跳跃 / 飞行上升 / 游泳上升');
    console.log('  - Shift: 加速 / 飞行下降 / 游泳下降');
    console.log('  - F: 切换飞行模式');
    console.log('  - 左键: 破坏方块（基岩不可破坏）');
    console.log('  - 右键: 放置方块');
    console.log('  - 1-9: 切换方块类型（包含基岩和水）');
    console.log('  - F5: 保存游戏');
    console.log('  - F9: 加载游戏');
    console.log('  - O: 打开设置菜单 ⚙️（可调整地图生成参数并重新生成）');
    console.log(`📦 已加载 ${this.chunkManager.getLoadedChunkCount()} 个 Chunk`);

    // 检查是否有存档
    if (this.saveManager.hasSave()) {
      console.log('💾 检测到存档，按 F9 加载');
    }

    // 虚拟控制器和重力系统提示
    if (settings.virtualControls) {
      console.log('📱 虚拟按键已启用（移动端控制）');
    }
    if (settings.realGravity) {
      console.log('🌍 真实重力模式已启用');
    }
  }

  private applyTerrainSettings(settings: GameSettings): void {
    const baseHeight = Math.max(settings.waterLevel + 2, 16);
    this.chunkManager.updateTerrainConfig({
      scale: settings.terrainScale,
      heightMultiplier: settings.terrainHeight,
      baseHeight,
      waterLevel: settings.waterLevel,
      treeChance: Math.max(0, Math.min(settings.treeDensity, 0.3)),
      caveThreshold: settings.caveThreshold
    });
  }

  private regenerateWorld(): void {
    console.log('🌍 开始重新生成世界...');

    // 清除所有 Chunk
    this.chunkManager.clearAll();

    // 刷新随机种子（这样每次重新生成都会得到不同的地形）
    this.chunkManager.refreshTerrainSeed();

    // 应用当前地形设置
    const settings = this.settingsManager.getSettings();
    this.applyTerrainSettings(settings);

    // 重新生成初始地形
    this.chunkManager.generateTerrain(0, 0, settings.renderDistance);

    // 将玩家重置到安全位置
    const safeY = Math.max(settings.waterLevel + settings.terrainHeight + 12, 35);
    this.player.setPosition(0, safeY, 0);

    console.log('✅ 世界重新生成完成！');
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      updateCameraAspect(this.camera);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // O 键打开设置
    window.addEventListener('keydown', (e) => {
      if (e.key === 'o' || e.key === 'O') {
        this.settingsUI.toggle();
      }
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

    // 更新重力系统
    this.gravitySystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);

    this.hud.stats.end();
  };
}

const game = new Game();
game.start();
