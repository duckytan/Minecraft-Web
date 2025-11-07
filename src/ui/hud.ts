import Stats from 'stats.js';

export interface HUD {
  overlay: HTMLDivElement;
  crosshair: HTMLDivElement;
  stats: Stats;
  update: () => void;
  setPointerLockState: (locked: boolean) => void;
}

export function initHUD(): HUD {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div>点击屏幕以开始</div>
    <div class="controls-info">
      <p>WASD: 移动</p>
      <p>Space: 跳跃</p>
      <p>Shift: 加速</p>
      <p>鼠标移动: 视角</p>
      <p>Esc: 释放锁定</p>
    </div>
  `;

  const crosshair = document.createElement('div');
  crosshair.className = 'crosshair';

  const stats = new Stats();
  stats.showPanel(0);

  document.body.appendChild(overlay);
  document.body.appendChild(crosshair);
  document.body.appendChild(stats.dom);

  const update = () => {
    stats.begin();
    stats.end();
  };

  const setPointerLockState = (locked: boolean) => {
    overlay.classList.toggle('hidden', locked);
  };

  return {
    overlay,
    crosshair,
    stats,
    update,
    setPointerLockState
  };
}
