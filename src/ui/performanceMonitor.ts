/**
 * 性能监控面板
 * 显示详细的性能指标，帮助诊断性能问题
 */
export class PerformanceMonitor {
  private container: HTMLDivElement;
  private visible = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'performance-monitor';
    this.container.style.cssText = `
      position: fixed;
      top: 60px;
      left: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 4px;
      z-index: 9999;
      min-width: 250px;
      line-height: 1.6;
      display: none;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    `;
    document.body.appendChild(this.container);
  }

  /**
   * 更新性能数据
   */
  update(data: {
    chunkCount: number;
    visibleChunks?: number;
    materialCount: number;
    triangles: number;
    fps: number;
    memory?: number;
  }): void {
    if (!this.visible) return;

    const memoryInfo = (performance as any).memory;
    const usedMemory = memoryInfo
      ? (memoryInfo.usedJSHeapSize / 1048576).toFixed(1)
      : 'N/A';
    const totalMemory = memoryInfo
      ? (memoryInfo.totalJSHeapSize / 1048576).toFixed(1)
      : 'N/A';

    const visibleText = data.visibleChunks !== undefined 
      ? `\n📺 可见 Chunks: ${data.visibleChunks}`
      : '';

    this.container.innerHTML = `
      <div style="color: #0ff; font-weight: bold; margin-bottom: 5px;">⚡ 性能监控</div>
      <div>📊 FPS: ${data.fps.toFixed(1)}</div>
      <div>📦 总 Chunks: ${data.chunkCount}${visibleText}</div>
      <div>🎨 材质数: ${data.materialCount}</div>
      <div>🔺 三角形: ${this.formatNumber(data.triangles)}</div>
      <div>💾 内存: ${usedMemory} MB / ${totalMemory} MB</div>
      <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #0f0; color: #ff0; font-size: 10px;">
        按 P 键切换显示
      </div>
    `;
  }

  /**
   * 切换显示
   */
  toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'block' : 'none';
  }

  /**
   * 显示
   */
  show(): void {
    this.visible = true;
    this.container.style.display = 'block';
  }

  /**
   * 隐藏
   */
  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
  }

  /**
   * 格式化数字（添加千位分隔符）
   */
  private formatNumber(num: number): string {
    return num.toLocaleString();
  }
}
