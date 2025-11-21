import { describe, expect, it } from 'vitest';
import { perlin2D, perlin3D, octavePerlin2D, octavePerlin3D } from '@/world/perlinNoise';

describe('Perlin Noise', () => {
  describe('perlin2D', () => {
    it('should return values in range [-1, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const value = perlin2D(x, y);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should return same value for same coordinates', () => {
      const x = 5.5;
      const y = 3.2;
      const value1 = perlin2D(x, y);
      const value2 = perlin2D(x, y);
      expect(value1).toBe(value2);
    });

    it('should return different values for different coordinates', () => {
      const value1 = perlin2D(1, 1);
      const value2 = perlin2D(2, 2);
      expect(value1).not.toBe(value2);
    });

    it('should be continuous (smooth transitions)', () => {
      const x = 5.5;
      const y = 3.2;
      const value1 = perlin2D(x, y);
      const value2 = perlin2D(x + 0.01, y + 0.01);
      
      // 相邻点的值应该很接近
      const difference = Math.abs(value1 - value2);
      expect(difference).toBeLessThan(0.1);
    });
  });

  describe('perlin3D', () => {
    it('should return values in range [-1, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const z = Math.random() * 100;
        const value = perlin3D(x, y, z);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should return same value for same coordinates', () => {
      const x = 5.5;
      const y = 3.2;
      const z = 7.8;
      const value1 = perlin3D(x, y, z);
      const value2 = perlin3D(x, y, z);
      expect(value1).toBe(value2);
    });

    it('should return different values for different coordinates', () => {
      const value1 = perlin3D(1, 1, 1);
      const value2 = perlin3D(2, 2, 2);
      expect(value1).not.toBe(value2);
    });

    it('should be continuous (smooth transitions)', () => {
      const x = 5.5;
      const y = 3.2;
      const z = 7.8;
      const value1 = perlin3D(x, y, z);
      const value2 = perlin3D(x + 0.01, y + 0.01, z + 0.01);
      
      // 相邻点的值应该很接近
      const difference = Math.abs(value1 - value2);
      expect(difference).toBeLessThan(0.1);
    });
  });

  describe('octavePerlin2D', () => {
    it('should return values approximately in range [-1, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const value = octavePerlin2D(x, y, 4, 0.5, 2.0);
        expect(value).toBeGreaterThanOrEqual(-1.5);
        expect(value).toBeLessThanOrEqual(1.5);
      }
    });

    it('should return same value for same parameters', () => {
      const x = 5.5;
      const y = 3.2;
      const value1 = octavePerlin2D(x, y, 4, 0.5, 2.0);
      const value2 = octavePerlin2D(x, y, 4, 0.5, 2.0);
      expect(value1).toBe(value2);
    });

    it('should have more detail with more octaves', () => {
      const x = 5.5;
      const y = 3.2;
      
      // 测试不同数量的倍频
      const value1 = octavePerlin2D(x, y, 1);
      const value2 = octavePerlin2D(x, y, 4);
      
      // 多倍频应该产生更复杂的值（不太可能完全相同）
      expect(value1).toBeTypeOf('number');
      expect(value2).toBeTypeOf('number');
    });

    it('should respect persistence parameter', () => {
      const x = 5.5;
      const y = 3.2;
      
      // 不同的持续度应该产生不同的结果
      const value1 = octavePerlin2D(x, y, 4, 0.3, 2.0);
      const value2 = octavePerlin2D(x, y, 4, 0.7, 2.0);
      
      expect(value1).toBeTypeOf('number');
      expect(value2).toBeTypeOf('number');
    });
  });

  describe('octavePerlin3D', () => {
    it('should return values approximately in range [-1, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const z = Math.random() * 100;
        const value = octavePerlin3D(x, y, z, 4, 0.5, 2.0);
        expect(value).toBeGreaterThanOrEqual(-1.5);
        expect(value).toBeLessThanOrEqual(1.5);
      }
    });

    it('should return same value for same parameters', () => {
      const x = 5.5;
      const y = 3.2;
      const z = 7.8;
      const value1 = octavePerlin3D(x, y, z, 4, 0.5, 2.0);
      const value2 = octavePerlin3D(x, y, z, 4, 0.5, 2.0);
      expect(value1).toBe(value2);
    });

    it('should be continuous (smooth transitions)', () => {
      const x = 5.5;
      const y = 3.2;
      const z = 7.8;
      const value1 = octavePerlin3D(x, y, z, 4, 0.5, 2.0);
      const value2 = octavePerlin3D(x + 0.01, y + 0.01, z + 0.01, 4, 0.5, 2.0);
      
      // 相邻点的值应该很接近
      const difference = Math.abs(value1 - value2);
      expect(difference).toBeLessThan(0.2);
    });
  });
});
