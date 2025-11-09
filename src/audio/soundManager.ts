export enum SoundType {
  PLACE_BLOCK = 'placeBlock',
  BREAK_BLOCK = 'breakBlock',
  FOOTSTEP = 'footstep',
  JUMP = 'jump',
  WATER = 'water',
  BACKGROUND_MUSIC = 'backgroundMusic'
}

export interface SoundConfig {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
}

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  
  private masterVolume = 1.0;
  private musicVolume = 0.5;
  private sfxVolume = 0.8;
  
  private musicEnabled = true;
  private sfxEnabled = true;

  constructor() {
    this.initAudioContext();
    this.generateProceduralSounds();
  }

  private initAudioContext(): void {
    try {
      const win = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextConstructor = window.AudioContext ?? win.webkitAudioContext;
      if (!AudioContextConstructor) {
        throw new Error('Web Audio API not supported');
      }
      this.audioContext = new AudioContextConstructor();
      console.log('✅ 音频系统初始化成功');
    } catch (error) {
      console.error('❌ 音频系统初始化失败:', error);
    }
  }

  /**
   * 生成程序化音效
   */
  private generateProceduralSounds(): void {
    if (!this.audioContext) return;

    // 方块放置音效（低沉的咚声）
    this.sounds.set(SoundType.PLACE_BLOCK, this.generatePlaceSound());

    // 方块破坏音效（高频敲击声）
    this.sounds.set(SoundType.BREAK_BLOCK, this.generateBreakSound());

    // 脚步声（短促的咔声）
    this.sounds.set(SoundType.FOOTSTEP, this.generateFootstepSound());

    // 跳跃音效（向上的音调）
    this.sounds.set(SoundType.JUMP, this.generateJumpSound());

    // 水中音效（柔和的泡泡声）
    this.sounds.set(SoundType.WATER, this.generateWaterSound());

    console.log('✅ 程序化音效生成完成');
  }

  /**
   * 生成方块放置音效
   */
  private generatePlaceSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const duration = 0.15;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const frequency = 150 - t * 50; // 从 150Hz 下降到 100Hz
      const envelope = Math.exp(-t * 10);
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }

    return buffer;
  }

  /**
   * 生成方块破坏音效
   */
  private generateBreakSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const duration = 0.2;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 8);
      const tone = Math.sin(2 * Math.PI * 300 * t) * Math.exp(-t * 6);
      data[i] = (noise * 0.3 + tone * 0.2) * 0.4;
    }

    return buffer;
  }

  /**
   * 生成脚步声
   */
  private generateFootstepSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const duration = 0.1;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 25);
      data[i] = noise * 0.15;
    }

    return buffer;
  }

  /**
   * 生成跳跃音效
   */
  private generateJumpSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const duration = 0.25;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const frequency = 200 + t * 400; // 从 200Hz 上升到 600Hz
      const envelope = Math.exp(-t * 8);
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.25;
    }

    return buffer;
  }

  /**
   * 生成水中音效
   */
  private generateWaterSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const duration = 0.3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const bubble1 = Math.sin(2 * Math.PI * 400 * t);
      const bubble2 = Math.sin(2 * Math.PI * 600 * t);
      const envelope = Math.exp(-t * 5);
      data[i] = (bubble1 + bubble2) * envelope * 0.15;
    }

    return buffer;
  }

  /**
   * 播放音效
   */
  play(soundType: SoundType, config?: SoundConfig): void {
    if (!this.audioContext || !this.sounds.has(soundType)) return;

    // 检查音效开关
    const isMusic = soundType === SoundType.BACKGROUND_MUSIC;
    if (isMusic && !this.musicEnabled) return;
    if (!isMusic && !this.sfxEnabled) return;

    const buffer = this.sounds.get(soundType)!;
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    
    // 设置音量
    const baseVolume = config?.volume ?? 1.0;
    const categoryVolume = isMusic ? this.musicVolume : this.sfxVolume;
    gainNode.gain.value = baseVolume * categoryVolume * this.masterVolume;

    // 设置播放速率
    if (config?.playbackRate) {
      source.playbackRate.value = config.playbackRate;
    }

    // 设置循环
    if (config?.loop) {
      source.loop = true;
    }

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    const sourceId = `${soundType}_${Date.now()}`;
    this.activeSources.set(sourceId, source);
    this.gainNodes.set(sourceId, gainNode);

    source.onended = () => {
      this.activeSources.delete(sourceId);
      this.gainNodes.delete(sourceId);
    };

    source.start(0);
  }

  /**
   * 停止所有音效
   */
  stopAll(): void {
    for (const source of this.activeSources.values()) {
      try {
        source.stop();
      } catch (error) {
        // 忽略已停止的音效
      }
    }
    this.activeSources.clear();
    this.gainNodes.clear();
  }

  /**
   * 停止特定类型的音效
   */
  stopType(soundType: SoundType): void {
    const keysToDelete: string[] = [];
    for (const [key, source] of this.activeSources.entries()) {
      if (key.startsWith(soundType)) {
        try {
          source.stop();
        } catch (error) {
          // 忽略
        }
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.activeSources.delete(key);
      this.gainNodes.delete(key);
    }
  }

  /**
   * 设置主音量
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * 设置音乐音量
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * 设置音效音量
   */
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * 更新所有活跃音源的音量
   */
  private updateAllVolumes(): void {
    for (const [key, gainNode] of this.gainNodes.entries()) {
      const isMusic = key.startsWith(SoundType.BACKGROUND_MUSIC);
      const categoryVolume = isMusic ? this.musicVolume : this.sfxVolume;
      gainNode.gain.value = categoryVolume * this.masterVolume;
    }
  }

  /**
   * 启用/禁用音乐
   */
  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopType(SoundType.BACKGROUND_MUSIC);
    }
  }

  /**
   * 启用/禁用音效
   */
  setSFXEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (!enabled) {
      for (const soundType of Object.values(SoundType)) {
        if (soundType !== SoundType.BACKGROUND_MUSIC) {
          this.stopType(soundType as SoundType);
        }
      }
    }
  }

  /**
   * 获取音量设置
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  getSFXVolume(): number {
    return this.sfxVolume;
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  isSFXEnabled(): boolean {
    return this.sfxEnabled;
  }

  /**
   * 恢复 AudioContext（用户交互后）
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.stopAll();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
