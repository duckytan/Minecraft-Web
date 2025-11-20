import { SoundManager } from '../audio/soundManager';
import { isMobileDevice } from '../utils/device';
import { DEFAULT_RENDER_DISTANCE_MOBILE, DEFAULT_RENDER_DISTANCE_PC } from '../core/constants';

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  renderDistance: number;
  fov: number;
  mouseSensitivity: number;
  showFPS: boolean;
  virtualControls: boolean;
  realGravity: boolean;
  terrainScale: number;
  terrainHeight: number;
  waterLevel: number;
  treeDensity: number;
  caveThreshold: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 1.0,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  musicEnabled: true,
  sfxEnabled: true,
  renderDistance: DEFAULT_RENDER_DISTANCE_PC,
  fov: 75,
  mouseSensitivity: 0.002,
  showFPS: true,
  virtualControls: false,
  realGravity: false,
  terrainScale: 0.03,
  terrainHeight: 20,
  waterLevel: 18,
  treeDensity: 0.02,
  caveThreshold: 0.6
};

export class SettingsManager {
  private settings: GameSettings;
  private soundManager: SoundManager | null = null;
  private onSettingsChange: ((settings: GameSettings) => void) | null = null;

  constructor() {
    this.settings = this.loadSettings();
  }

  setSoundManager(soundManager: SoundManager): void {
    this.soundManager = soundManager;
    this.applySoundSettings();
  }

  onSettingsChanged(callback: (settings: GameSettings) => void): void {
    this.onSettingsChange = callback;
  }

  /**
   * 获取默认设置
   * 移动设备会自动启用虚拟控制器
   */
  private getDefaultSettings(): GameSettings {
    const settings = { ...DEFAULT_SETTINGS };
    
    // 检测移动设备，自动启用虚拟按键
    if (isMobileDevice()) {
      settings.virtualControls = true;
      settings.renderDistance = DEFAULT_RENDER_DISTANCE_MOBILE;
      console.log('📱 检测到移动设备，自动启用虚拟按键并降低渲染距离');
    }
    
    return settings;
  }

  private loadSettings(): GameSettings {
    const defaultSettings = this.getDefaultSettings();

    try {
      const saved = localStorage.getItem('gameSettings');
      const mobileDisabledFlag = localStorage.getItem('mobileVirtualControlsDisabled') === 'true';

      if (saved) {
        const loadedSettings = { ...defaultSettings, ...JSON.parse(saved) };

        if (isMobileDevice() && !mobileDisabledFlag) {
          loadedSettings.virtualControls = true;
        }

        return loadedSettings;
      }

      if (isMobileDevice() && mobileDisabledFlag) {
        defaultSettings.virtualControls = false;
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
    return defaultSettings;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('gameSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  private applySoundSettings(): void {
    if (!this.soundManager) return;

    this.soundManager.setMasterVolume(this.settings.masterVolume);
    this.soundManager.setMusicVolume(this.settings.musicVolume);
    this.soundManager.setSFXVolume(this.settings.sfxVolume);
    this.soundManager.setMusicEnabled(this.settings.musicEnabled);
    this.soundManager.setSFXEnabled(this.settings.sfxEnabled);
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  updateSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    this.settings[key] = value;
    this.saveSettings();

    // 在移动设备上，如果用户手动关闭虚拟控制器，设置标记
    if (key === 'virtualControls' && isMobileDevice()) {
      try {
        if (value === false) {
          localStorage.setItem('mobileVirtualControlsDisabled', 'true');
        } else {
          localStorage.removeItem('mobileVirtualControlsDisabled');
        }
      } catch (storageError) {
        console.error('更新虚拟按键状态失败:', storageError);
      }
    }

    // 应用音频设置
    if (this.soundManager) {
      switch (key) {
        case 'masterVolume':
          this.soundManager.setMasterVolume(value as number);
          break;
        case 'musicVolume':
          this.soundManager.setMusicVolume(value as number);
          break;
        case 'sfxVolume':
          this.soundManager.setSFXVolume(value as number);
          break;
        case 'musicEnabled':
          this.soundManager.setMusicEnabled(value as boolean);
          break;
        case 'sfxEnabled':
          this.soundManager.setSFXEnabled(value as boolean);
          break;
      }
    }

    // 通知外部设置变化
    if (this.onSettingsChange) {
      this.onSettingsChange(this.settings);
    }
  }

  reset(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
    this.applySoundSettings();
    
    // 清除移动设备虚拟控制器禁用标记
    try {
      localStorage.removeItem('mobileVirtualControlsDisabled');
    } catch (storageError) {
      console.error('清除虚拟按键标记失败:', storageError);
    }
    
    if (this.onSettingsChange) {
      this.onSettingsChange(this.settings);
    }
  }
}

export function initSettings(
  settingsManager: SettingsManager,
  onRegenerateWorld?: () => void
): {
  open: () => void;
  close: () => void;
  toggle: () => void;
} {
  const overlay = document.createElement('div');
  overlay.id = 'settings-overlay';
  overlay.className = 'settings-overlay hidden';

  const panel = document.createElement('div');
  panel.className = 'settings-panel';

  const title = document.createElement('h2');
  title.textContent = '⚙️ 游戏设置';
  title.className = 'settings-title';
  panel.appendChild(title);

  const content = document.createElement('div');
  content.className = 'settings-content';

  // 渲染所有设置控件
  function renderAllSettings(): void {
    content.innerHTML = '';
    const settings = settingsManager.getSettings();

    // 音频设置
    content.appendChild(createSection('🔊 音频设置'));
    content.appendChild(
      createSlider('主音量', settings.masterVolume, 0, 1, 0.01, (value) => {
        settingsManager.updateSetting('masterVolume', value);
      })
    );
    content.appendChild(
      createSlider('音乐音量', settings.musicVolume, 0, 1, 0.01, (value) => {
        settingsManager.updateSetting('musicVolume', value);
      })
    );
    content.appendChild(
      createSlider('音效音量', settings.sfxVolume, 0, 1, 0.01, (value) => {
        settingsManager.updateSetting('sfxVolume', value);
      })
    );
    content.appendChild(
      createToggle('背景音乐', settings.musicEnabled, (value) => {
        settingsManager.updateSetting('musicEnabled', value);
      })
    );
    content.appendChild(
      createToggle('音效', settings.sfxEnabled, (value) => {
        settingsManager.updateSetting('sfxEnabled', value);
      })
    );

    // 图形设置
    content.appendChild(createSection('🎨 图形设置'));
    content.appendChild(
      createSlider('渲染距离', settings.renderDistance, 2, 8, 1, (value) => {
        settingsManager.updateSetting('renderDistance', value);
      }, ' Chunk')
    );
    content.appendChild(
      createSlider('视野 (FOV)', settings.fov, 60, 110, 5, (value) => {
        settingsManager.updateSetting('fov', value);
      }, '°')
    );
    content.appendChild(
      createToggle('显示 FPS', settings.showFPS, (value) => {
        settingsManager.updateSetting('showFPS', value);
      })
    );

    // 控制设置
    content.appendChild(createSection('🎮 控制设置'));
    content.appendChild(
      createSlider('鼠标灵敏度', settings.mouseSensitivity * 1000, 0.5, 5, 0.1, (value) => {
        settingsManager.updateSetting('mouseSensitivity', value / 1000);
      })
    );
    content.appendChild(
      createToggle('虚拟按键（移动端）', settings.virtualControls, (value) => {
        settingsManager.updateSetting('virtualControls', value);
      })
    );

    // 游戏玩法设置
    content.appendChild(createSection('🌍 游戏玩法'));
    content.appendChild(
      createToggle('真实重力模式', settings.realGravity, (value) => {
        settingsManager.updateSetting('realGravity', value);
      })
    );

    // 地图生成设置
    content.appendChild(createSection('🗺️ 地图生成'));
    content.appendChild(
      createSlider('地形缩放', settings.terrainScale, 0.01, 0.08, 0.005, (value) => {
        settingsManager.updateSetting('terrainScale', Number(value.toFixed(3)));
      })
    );
    content.appendChild(
      createSlider('地形高度系数', settings.terrainHeight, 8, 40, 1, (value) => {
        settingsManager.updateSetting('terrainHeight', Math.round(value));
      })
    );
    content.appendChild(
      createSlider('水位线', settings.waterLevel, 5, 32, 1, (value) => {
        settingsManager.updateSetting('waterLevel', Math.round(value));
      })
    );
    content.appendChild(
      createSlider('树木密度', settings.treeDensity * 100, 0, 15, 0.5, (value) => {
        settingsManager.updateSetting('treeDensity', Number((value / 100).toFixed(3)));
      }, '%')
    );
    content.appendChild(
      createSlider('洞穴阈值 (越大越少)', settings.caveThreshold, 0.45, 0.85, 0.01, (value) => {
        settingsManager.updateSetting('caveThreshold', Number(value.toFixed(2)));
      })
    );

    // 重新生成地图按钮
    if (onRegenerateWorld) {
      const regenerateButton = document.createElement('button');
      regenerateButton.textContent = '🌍 重新生成地图';
      regenerateButton.className = 'settings-button regenerate';
      regenerateButton.style.width = '100%';
      regenerateButton.style.marginTop = '10px';
      regenerateButton.onclick = () => {
        const shouldRegenerate =
          typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm('确定要重新生成地图吗？这将清除当前世界的所有方块！')
            : true;
        if (shouldRegenerate) {
          onRegenerateWorld();
          close();
        }
      };
      content.appendChild(regenerateButton);
    }
  }

  renderAllSettings();
  panel.appendChild(content);

  // 按钮组
  const buttons = document.createElement('div');
  buttons.className = 'settings-buttons';

  const resetButton = document.createElement('button');
  resetButton.textContent = '🔄 重置默认';
  resetButton.className = 'settings-button reset';
  resetButton.onclick = () => {
    settingsManager.reset();
    renderAllSettings();
  };

  const closeButton = document.createElement('button');
  closeButton.textContent = '✅ 关闭';
  closeButton.className = 'settings-button close';
  closeButton.onclick = () => {
    close();
  };

  buttons.appendChild(resetButton);
  buttons.appendChild(closeButton);
  panel.appendChild(buttons);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function open(): void {
    overlay.classList.remove('hidden');
    // 退出指针锁定
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  function close(): void {
    overlay.classList.add('hidden');
  }

  function toggle(): void {
    if (overlay.classList.contains('hidden')) {
      open();
    } else {
      close();
    }
  }

  // ESC 键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      close();
    }
  });

  return { open, close, toggle };
}

function createSection(title: string): HTMLElement {
  const section = document.createElement('div');
  section.className = 'settings-section';
  section.textContent = title;
  return section;
}

function createSlider(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (value: number) => void,
  suffix: string = ''
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'settings-item';

  const labelSpan = document.createElement('span');
  labelSpan.className = 'settings-label';
  labelSpan.textContent = label;

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'settings-value';
  valueDisplay.textContent = `${value.toFixed(step < 1 ? 2 : 0)}${suffix}`;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'settings-slider';
  slider.min = min.toString();
  slider.max = max.toString();
  slider.step = step.toString();
  slider.value = value.toString();

  slider.oninput = () => {
    const newValue = parseFloat(slider.value);
    valueDisplay.textContent = `${newValue.toFixed(step < 1 ? 2 : 0)}${suffix}`;
    onChange(newValue);
  };

  container.appendChild(labelSpan);
  container.appendChild(valueDisplay);
  container.appendChild(slider);

  return container;
}

function createToggle(label: string, checked: boolean, onChange: (value: boolean) => void): HTMLElement {
  const container = document.createElement('div');
  container.className = 'settings-item';

  const labelSpan = document.createElement('span');
  labelSpan.className = 'settings-label';
  labelSpan.textContent = label;

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.className = 'settings-toggle';
  toggle.checked = checked;

  toggle.onchange = () => {
    onChange(toggle.checked);
  };

  container.appendChild(labelSpan);
  container.appendChild(toggle);

  return container;
}
