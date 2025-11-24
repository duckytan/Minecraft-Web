import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoundManager, SoundType } from '../audio/soundManager';

describe('SoundManager', () => {
  let soundManager: SoundManager;

  beforeEach(() => {
    // Mock AudioContext
    const mockAudioContext = {
      state: 'running',
      sampleRate: 44100,
      destination: {},
      createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => {
        return {
          length,
          numberOfChannels: channels,
          sampleRate,
          getChannelData: vi.fn(() => new Float32Array(length))
        };
      }),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        loop: false,
        playbackRate: { value: 1 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null
      })),
      createGain: vi.fn(() => ({
        gain: { value: 1 },
        connect: vi.fn()
      })),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined)
    };

    const globalAny = globalThis as typeof globalThis & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
      window?: Window & typeof globalThis;
    };

    globalAny.AudioContext = vi.fn(() => mockAudioContext) as any;
    globalAny.webkitAudioContext = globalAny.AudioContext;
    globalAny.window = globalAny.window || ({} as Window & typeof globalThis);
    globalAny.window.AudioContext = globalAny.AudioContext;
    (globalAny.window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext = globalAny.AudioContext;

    soundManager = new SoundManager();
  });

  describe('初始化', () => {
    it('应该成功创建 SoundManager 实例', () => {
      expect(soundManager).toBeDefined();
      expect(soundManager).toBeInstanceOf(SoundManager);
    });

    it('应该初始化默认音量设置', () => {
      expect(soundManager.getMasterVolume()).toBe(1.0);
      expect(soundManager.getMusicVolume()).toBe(0.5);
      expect(soundManager.getSFXVolume()).toBe(0.8);
    });

    it('应该默认启用音乐和音效', () => {
      expect(soundManager.isMusicEnabled()).toBe(true);
      expect(soundManager.isSFXEnabled()).toBe(true);
    });
  });

  describe('音量控制', () => {
    it('应该正确设置主音量', () => {
      soundManager.setMasterVolume(0.5);
      expect(soundManager.getMasterVolume()).toBe(0.5);
    });

    it('应该将主音量限制在 0-1 范围内', () => {
      soundManager.setMasterVolume(1.5);
      expect(soundManager.getMasterVolume()).toBe(1.0);

      soundManager.setMasterVolume(-0.5);
      expect(soundManager.getMasterVolume()).toBe(0);
    });

    it('应该正确设置音乐音量', () => {
      soundManager.setMusicVolume(0.7);
      expect(soundManager.getMusicVolume()).toBe(0.7);
    });

    it('应该正确设置音效音量', () => {
      soundManager.setSFXVolume(0.6);
      expect(soundManager.getSFXVolume()).toBe(0.6);
    });
  });

  describe('音效开关', () => {
    it('应该能够禁用音乐', () => {
      soundManager.setMusicEnabled(false);
      expect(soundManager.isMusicEnabled()).toBe(false);
    });

    it('应该能够禁用音效', () => {
      soundManager.setSFXEnabled(false);
      expect(soundManager.isSFXEnabled()).toBe(false);
    });

    it('应该能够重新启用音乐', () => {
      soundManager.setMusicEnabled(false);
      soundManager.setMusicEnabled(true);
      expect(soundManager.isMusicEnabled()).toBe(true);
    });
  });

  describe('播放音效', () => {
    it('应该能够播放方块放置音效', () => {
      expect(() => {
        soundManager.play(SoundType.PLACE_BLOCK);
      }).not.toThrow();
    });

    it('应该能够播放方块破坏音效', () => {
      expect(() => {
        soundManager.play(SoundType.BREAK_BLOCK);
      }).not.toThrow();
    });

    it('应该能够播放脚步声', () => {
      expect(() => {
        soundManager.play(SoundType.FOOTSTEP);
      }).not.toThrow();
    });

    it('应该能够播放跳跃音效', () => {
      expect(() => {
        soundManager.play(SoundType.JUMP);
      }).not.toThrow();
    });

    it('应该能够播放水中音效', () => {
      expect(() => {
        soundManager.play(SoundType.WATER);
      }).not.toThrow();
    });

    it('应该支持自定义音量配置', () => {
      expect(() => {
        soundManager.play(SoundType.FOOTSTEP, { volume: 0.5 });
      }).not.toThrow();
    });

    it('应该支持循环播放', () => {
      expect(() => {
        soundManager.play(SoundType.BACKGROUND_MUSIC, { loop: true });
      }).not.toThrow();
    });

    it('应该支持自定义播放速率', () => {
      expect(() => {
        soundManager.play(SoundType.FOOTSTEP, { playbackRate: 1.2 });
      }).not.toThrow();
    });
  });

  describe('停止音效', () => {
    it('应该能够停止所有音效', () => {
      soundManager.play(SoundType.FOOTSTEP);
      soundManager.play(SoundType.JUMP);
      expect(() => {
        soundManager.stopAll();
      }).not.toThrow();
    });

    it('应该能够停止特定类型的音效', () => {
      soundManager.play(SoundType.FOOTSTEP);
      expect(() => {
        soundManager.stopType(SoundType.FOOTSTEP);
      }).not.toThrow();
    });
  });

  describe('资源管理', () => {
    it('应该能够恢复 AudioContext', async () => {
      await expect(soundManager.resume()).resolves.not.toThrow();
    });

    it('应该能够释放资源', () => {
      expect(() => {
        soundManager.dispose();
      }).not.toThrow();
    });
  });
});
