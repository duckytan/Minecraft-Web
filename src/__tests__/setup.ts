import { beforeAll } from 'vitest';

beforeAll(() => {
  // Mock HTMLCanvasElement.getContext for jsdom environment
  HTMLCanvasElement.prototype.getContext = function (contextType: string): any {
    if (contextType === '2d') {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        fillRect: () => {},
        strokeRect: () => {},
        clearRect: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        createLinearGradient: () => ({
          addColorStop: () => {}
        }),
        createRadialGradient: () => ({
          addColorStop: () => {}
        }),
        drawImage: () => {},
        getImageData: () => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1
        }),
        putImageData: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        transform: () => {},
        setTransform: () => {},
        resetTransform: () => {},
        measureText: () => ({ width: 0 }),
        canvas: this
      } as any;
    }
    return null;
  };
});
