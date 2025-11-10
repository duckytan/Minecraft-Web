import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isMobileDevice, isTablet, isPhone, getDeviceType, DeviceType } from '../utils/device';

describe('Device Detection', () => {
  let originalNavigator: typeof navigator;
  let originalWindow: any;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    // 恢复原始对象
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    });
  });

  describe('isMobileDevice', () => {
    it('应在检测到移动 User Agent 时返回 true', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          vendor: 'Apple Computer, Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 375,
          innerHeight: 667,
          ontouchstart: {},
          matchMedia: (query: string) => ({ matches: query === '(pointer: coarse)' })
        },
        writable: true,
        configurable: true
      });

      expect(isMobileDevice()).toBe(true);
    });

    it('应在检测到 Android 设备时返回 true', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F)',
          vendor: 'Google Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 360,
          innerHeight: 640,
          ontouchstart: {},
          matchMedia: (query: string) => ({ matches: query === '(pointer: coarse)' })
        },
        writable: true,
        configurable: true
      });

      expect(isMobileDevice()).toBe(true);
    });

    it('应在检测到桌面设备时返回 false', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          vendor: '',
          maxTouchPoints: 0
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 1920,
          innerHeight: 1080,
          matchMedia: (_query: string) => ({ matches: false })
        },
        writable: true,
        configurable: true
      });

      expect(isMobileDevice()).toBe(false);
    });

    it('应基于触摸和小屏幕正确检测移动设备', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Unknown Device)',
          vendor: '',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 400,
          innerHeight: 600,
          ontouchstart: {},
          matchMedia: (query: string) => ({ matches: query === '(pointer: coarse)' })
        },
        writable: true,
        configurable: true
      });

      expect(isMobileDevice()).toBe(true);
    });
  });

  describe('isTablet', () => {
    it('应在检测到 iPad 时返回 true', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
          vendor: 'Apple Computer, Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 768,
          innerHeight: 1024,
          ontouchstart: {},
          matchMedia: (_query: string) => ({ matches: false })
        },
        writable: true,
        configurable: true
      });

      expect(isTablet()).toBe(true);
    });

    it('应在检测到 iPadOS 13+ (伪装成 Mac) 时返回 true', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
          vendor: 'Apple Computer, Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 1024,
          innerHeight: 768,
          ontouchstart: {},
          matchMedia: (_query: string) => ({ matches: false })
        },
        writable: true,
        configurable: true
      });

      expect(isTablet()).toBe(true);
    });

    it('应在检测到 Android 平板时返回 true', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-T870)',
          vendor: 'Google Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 800,
          innerHeight: 1280,
          ontouchstart: {},
          matchMedia: (_query: string) => ({ matches: false })
        },
        writable: true,
        configurable: true
      });

      expect(isTablet()).toBe(true);
    });

    it('应在检测到手机时返回 false', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          vendor: 'Apple Computer, Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 375,
          innerHeight: 667,
          ontouchstart: {},
          matchMedia: (_query: string) => ({ matches: false })
        },
        writable: true,
        configurable: true
      });

      expect(isTablet()).toBe(false);
    });
  });

  describe('isPhone', () => {
    it('应在检测到 iPhone 时返回 true', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          vendor: 'Apple Computer, Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 375,
          innerHeight: 667,
          ontouchstart: {},
          matchMedia: (query: string) => ({ matches: query === '(pointer: coarse)' })
        },
        writable: true,
        configurable: true
      });

      expect(isPhone()).toBe(true);
    });

    it('应在检测到 Android 手机时返回 true', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F)',
          vendor: 'Google Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 360,
          innerHeight: 640,
          ontouchstart: {},
          matchMedia: (query: string) => ({ matches: query === '(pointer: coarse)' })
        },
        writable: true,
        configurable: true
      });

      expect(isPhone()).toBe(true);
    });

    it('应在检测到平板时返回 false', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
          vendor: 'Apple Computer, Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 768,
          innerHeight: 1024,
          ontouchstart: {},
          matchMedia: (_query: string) => ({ matches: false })
        },
        writable: true,
        configurable: true
      });

      expect(isPhone()).toBe(false);
    });

    it('应在检测到桌面设备时返回 false', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          vendor: '',
          maxTouchPoints: 0
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 1920,
          innerHeight: 1080,
          matchMedia: (_query: string) => ({ matches: false })
        },
        writable: true,
        configurable: true
      });

      expect(isPhone()).toBe(false);
    });
  });

  describe('getDeviceType', () => {
    it('应为手机返回 PHONE', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          vendor: 'Apple Computer, Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 375,
          innerHeight: 667,
          ontouchstart: {},
          matchMedia: (query: string) => ({ matches: query === '(pointer: coarse)' })
        },
        writable: true,
        configurable: true
      });

      expect(getDeviceType()).toBe(DeviceType.PHONE);
    });

    it('应为平板返回 TABLET', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
          vendor: 'Apple Computer, Inc.',
          maxTouchPoints: 5
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 768,
          innerHeight: 1024,
          ontouchstart: {},
          matchMedia: (_query: string) => ({ matches: false })
        },
        writable: true,
        configurable: true
      });

      expect(getDeviceType()).toBe(DeviceType.TABLET);
    });

    it('应为桌面设备返回 DESKTOP', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          vendor: '',
          maxTouchPoints: 0
        },
        writable: true,
        configurable: true
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 1920,
          innerHeight: 1080,
          matchMedia: (_query: string) => ({ matches: false })
        },
        writable: true,
        configurable: true
      });

      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
    });
  });
});
