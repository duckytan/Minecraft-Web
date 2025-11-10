/**
 * Vitest 测试全局设置
 * 用于 mock Canvas API 等浏览器特性
 */

import { beforeAll } from 'vitest';

beforeAll(() => {
  // Mock HTMLCanvasElement.prototype.getContext
  if (typeof HTMLCanvasElement !== 'undefined') {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (contextType: string, options?: any): any {
      if (contextType === '2d') {
        // 返回一个 mock 的 2D context
        const mockContext: any = {
          canvas: this,
          fillStyle: '#000000',
          strokeStyle: '#000000',
          lineWidth: 1,
          lineCap: 'butt',
          lineJoin: 'miter',
          miterLimit: 10,
          fillRect: () => {},
          strokeRect: () => {},
          clearRect: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          arc: () => {},
          stroke: () => {},
          fill: () => {},
          getImageData: () => ({
            data: new Uint8ClampedArray(0),
            width: 0,
            height: 0
          }),
          putImageData: () => {},
          drawImage: () => {},
          createImageData: () => ({
            data: new Uint8ClampedArray(0),
            width: 0,
            height: 0
          }),
          measureText: (text: string) => ({ width: text.length * 10 }),
          fillText: () => {},
          strokeText: () => {},
          save: () => {},
          restore: () => {},
          scale: () => {},
          rotate: () => {},
          translate: () => {},
          transform: () => {},
          setTransform: () => {},
          resetTransform: () => {},
          createLinearGradient: () => ({
            addColorStop: () => {}
          }),
          createRadialGradient: () => ({
            addColorStop: () => {}
          }),
          createPattern: () => null
        };
        return mockContext;
      }
      // 对于其他 context 类型，调用原始方法
      return originalGetContext.call(this, contextType, options);
    };
  }
});
