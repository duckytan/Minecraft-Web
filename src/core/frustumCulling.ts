import * as THREE from 'three';
import { Chunk, CHUNK_HEIGHT, CHUNK_SIZE } from '../world/chunk';

/**
 * 视锥剔除系统
 * 只渲染摄像机视野内的 chunk，大幅提升性能
 */
export class FrustumCulling {
  private readonly frustum = new THREE.Frustum();
  private readonly projectionScreenMatrix = new THREE.Matrix4();
  private readonly tempBox = new THREE.Box3();

  /**
   * 更新视锥体矩阵
   */
  updateFrustum(camera: THREE.PerspectiveCamera): void {
    camera.updateMatrixWorld();
    this.projectionScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projectionScreenMatrix);
  }

  /**
   * 检查 chunk 是否在视锥体内
   */
  isChunkVisible(chunk: Chunk): boolean {
    const mesh = chunk.getMesh();
    if (!mesh) return false;

    // 重用 Box3 对象避免频繁创建
    const chunkWorldX = chunk.chunkX * CHUNK_SIZE;
    const chunkWorldZ = chunk.chunkZ * CHUNK_SIZE;
    
    this.tempBox.min.set(chunkWorldX, 0, chunkWorldZ);
    this.tempBox.max.set(chunkWorldX + CHUNK_SIZE, CHUNK_HEIGHT, chunkWorldZ + CHUNK_SIZE);

    return this.frustum.intersectsBox(this.tempBox);
  }

  /**
   * 批量过滤可见的 chunk
   */
  filterVisibleChunks(chunks: Chunk[]): Chunk[] {
    return chunks.filter(chunk => this.isChunkVisible(chunk));
  }

  /**
   * 应用视锥剔除到 chunks（显示/隐藏 mesh）
   */
  applyCulling(chunks: Chunk[]): { visible: number; hidden: number } {
    let visibleCount = 0;
    let hiddenCount = 0;

    for (const chunk of chunks) {
      const mesh = chunk.getMesh();
      if (!mesh) continue;

      const isVisible = this.isChunkVisible(chunk);
      mesh.visible = isVisible;

      if (isVisible) {
        visibleCount++;
      } else {
        hiddenCount++;
      }
    }

    return { visible: visibleCount, hidden: hiddenCount };
  }
}
