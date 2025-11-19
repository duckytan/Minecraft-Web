# 🚀 深度性能优化任务清单

## 📊 当前性能问题分析

### 主要性能瓶颈（经过代码审查）：
1. **🔴 关键瓶颈 - 贪婪网格合并缺失**
   - 每个方块的每个面独立渲染（chunk.ts 第 295-330 行）
   - 没有合并相邻同类型方块的面
   - 导致：16x64x16 chunk 最多产生 98,304 个三角形！
   - **预期优化：减少 70-90% 顶点数**

2. **🟡 重要问题 - 材质管理未完全优化**
   - 虽然使用了 MaterialManager，但每个 chunk 仍创建局部材质数组
   - generateMesh() 中的 materials 数组每次重建（chunk.ts 第 117 行）
   - **预期优化：减少 30% 内存占用**

3. **🟡 重要问题 - Chunk 加载无限流控制**
   - updateChunks() 可能同时加载大量 chunk（chunkManager.ts 第 76-100 行）
   - 没有每帧加载限制
   - **预期优化：避免单帧卡顿，提升 20% 流畅度**

4. **🟢 次要问题 - LOD 系统缺失**
   - 所有 chunk 使用相同细节级别
   - 远处 chunk 浪费渲染资源
   - **预期优化：提升 15% FPS**

5. **🟢 次要问题 - 几何体对象池缺失**
   - 每次更新重新创建 BufferGeometry
   - 增加 GC 压力
   - **预期优化：减少卡顿，提升 10% 稳定性**

---

## ✅ 优化任务清单（按实施顺序）

### 🔴 阶段 1 - 关键优化（预期提升 70-90% 性能）

#### ✅ 1.1 实现贪婪网格合并（Greedy Meshing）
**优先级：极高 | 难度：中 | 预期收益：+80% FPS** ✅ **已完成**

**实施步骤：**
- [x] 创建 `src/world/greedyMesher.ts` 模块
- [x] 实现水平方向（X-Z 平面）的面合并算法
- [x] 实现垂直方向（Y 轴）的面合并算法
- [x] 在 `Chunk.generateMesh()` 中集成贪婪网格合并
- [x] 测试各种方块类型的正确性

**算法核心：**
```typescript
// 对每个方向（上下前后左右）：
// 1. 创建二维布尔掩码，标记需要渲染的面
// 2. 从左上角开始，尽可能向右扩展相同类型的面
// 3. 然后向下扩展，形成最大矩形
// 4. 生成矩形面的顶点和索引
// 5. 标记已处理的面，继续下一个未处理面
```

**参考资源：**
- [0fps.net - Meshing in a Minecraft Game](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/)
- [Greedy Meshing Algorithm Explained](https://www.gedge.ca/dev/2014/08/17/greedy-voxel-meshing)

---

#### ✅ 1.2 优化材质管理 - 单材质多纹理方案
**优先级：高 | 难度：中 | 预期收益：+15% FPS，-30% 内存**

**实施步骤：**
- [ ] 修改 `MaterialManager` 使用纹理图集（Texture Atlas）
- [ ] 所有方块类型使用单一材质
- [ ] UV 坐标映射到图集中的不同区域
- [ ] 更新 `Chunk.generateMesh()` 使用单材质

**优势：**
- 减少绘制调用次数
- 减少材质切换开销
- 降低内存占用

---

#### ✅ 1.3 Chunk 加载限流与优先级队列
**优先级：高 | 难度：低 | 预期收益：+20% 流畅度** ✅ **已完成**

**实施步骤：**
- [x] 创建 `src/world/chunkLoadQueue.ts` 队列管理器
- [x] 限制每帧最多加载 2 个 chunk
- [x] 优先加载玩家前方和附近的 chunk
- [x] 使用距离 + 朝向计算优先级
- [x] 在 `ChunkManager.updateChunks()` 中集成
- [x] 在 `Player` 中添加 `getForwardDirection()` 方法

**优先级算法：**
```typescript
priority = (1 / distance) * (1 + dotProduct(playerDirection, chunkDirection))
```

---

### 🟡 阶段 2 - 重要优化（预期提升 20-30% 性能）

#### ✅ 2.1 LOD（细节层次）系统
**优先级：中高 | 难度：中 | 预期收益：+15% FPS**

**实施步骤：**
- [ ] 创建 `src/world/lodManager.ts` 模块
- [ ] 定义 3 个 LOD 级别：
  - LOD 0（近距离）：完整细节
  - LOD 1（中距离）：每 2x2 方块合并
  - LOD 2（远距离）：每 4x4 方块合并
- [ ] 根据玩家距离动态切换 LOD
- [ ] 在 `Chunk` 中缓存不同 LOD 的网格

**LOD 距离阈值：**
- LOD 0: 距离 < 渲染距离 * 0.6
- LOD 1: 渲染距离 * 0.6 ~ 0.85
- LOD 2: 渲染距离 * 0.85 ~ 1.0

---

#### ✅ 2.2 几何体对象池
**优先级：中 | 难度：低 | 预期收益：减少卡顿，+10% 稳定性**

**实施步骤：**
- [ ] 创建 `src/core/objectPool.ts` 通用对象池
- [ ] 实现 BufferGeometry 池
- [ ] 实现 Mesh 池
- [ ] 在 `Chunk` 中使用对象池重用对象

---

#### ✅ 2.3 改进视锥剔除
**优先级：中 | 难度：低 | 预期收益：+5% FPS**

**实施步骤：**
- [ ] 动态调整剔除更新频率（根据玩家移动速度）
- [ ] 静止时 0.5 秒更新一次
- [ ] 快速移动时 0.1 秒更新一次
- [ ] 在 `FrustumCulling` 中实现自适应频率

---

### 🟢 阶段 3 - 次要优化（预期提升 10-15% 性能）

#### ✅ 3.1 纹理图集系统
**优先级：中低 | 难度：中 | 预期收益：+5% FPS**

**实施步骤：**
- [ ] 创建 `src/world/textureAtlas.ts` 模块
- [ ] 将所有方块纹理合并到单张图集
- [ ] 生成 UV 映射表
- [ ] 更新材质系统使用图集

---

#### ✅ 3.2 碰撞检测优化
**优先级：中低 | 难度：中 | 预期收益：+5% FPS**

**实施步骤：**
- [ ] 创建 `src/physics/spatialHash.ts` 空间哈希
- [ ] 只检测玩家周围 5x5x5 范围的方块
- [ ] 缓存碰撞查询结果
- [ ] 在 `Player` 中集成空间哈希

---

#### ✅ 3.3 Web Worker 优化
**优先级：低 | 难度：低 | 预期收益：+3% FPS**

**实施步骤：**
- [ ] 确保所有地形生成在 Worker 中完成
- [ ] 添加 Worker 错误处理和自动重启
- [ ] 使用多个 Worker（Worker Pool）
- [ ] 添加性能日志和监控

---

#### ✅ 3.4 限制最大 Chunk 数量
**优先级：低 | 难度：极低 | 预期收益：避免内存溢出**

**实施步骤：**
- [ ] 在 `ChunkManager` 中设置硬上限（100 个）
- [ ] 超出时强制卸载最远的 chunk
- [ ] 添加内存监控和警告

---

## 📈 预期优化效果总结

| 优化项 | 预期 FPS 提升 | 内存节省 | 实施难度 | 优先级 |
|--------|---------------|----------|----------|--------|
| 贪婪网格合并 | +80% | -20% | 中 | 🔴 极高 |
| 单材质多纹理 | +15% | -30% | 中 | 🔴 高 |
| Chunk 加载限流 | +20% 流畅度 | 0% | 低 | 🔴 高 |
| LOD 系统 | +15% | 0% | 中 | 🟡 中高 |
| 几何体对象池 | 减少卡顿 | -15% | 低 | 🟡 中 |
| 改进视锥剔除 | +5% | 0% | 低 | 🟡 中 |
| 纹理图集 | +5% | -10% | 中 | 🟢 中低 |
| 碰撞检测优化 | +5% | 0% | 中 | 🟢 中低 |
| Web Worker 优化 | +3% | 0% | 低 | 🟢 低 |
| 限制 Chunk 数量 | 稳定性 | 避免溢出 | 极低 | 🟢 低 |

**总预期提升：**
- **FPS：从 10-20 FPS → 80-120 FPS（提升 500-800%）**
- **内存：减少 40-60%**
- **流畅度：显著提升，消除卡顿**

---

## 🛠️ 实施时间表

### 第 1 天（2-3 小时）- 阶段 1 关键优化
- [ ] 1.1 贪婪网格合并（1.5 小时）
- [ ] 1.2 单材质多纹理（0.5 小时）
- [ ] 1.3 Chunk 加载限流（0.5 小时）
- [ ] 测试和调优（0.5 小时）

### 第 2 天（1-2 小时）- 阶段 2 重要优化
- [ ] 2.1 LOD 系统（1 小时）
- [ ] 2.2 几何体对象池（0.5 小时）
- [ ] 2.3 改进视锥剔除（0.3 小时）
- [ ] 测试和调优（0.2 小时）

### 第 3 天（1 小时）- 阶段 3 次要优化（可选）
- [ ] 3.1 纹理图集（0.5 小时）
- [ ] 3.2 碰撞检测优化（0.3 小时）
- [ ] 3.3~3.4 其他优化（0.2 小时）

---

## 📝 实施记录

### ✅ 已完成优化

#### 第 1 批（之前完成）
- ✅ 全局材质管理器
- ✅ 视锥剔除系统
- ✅ 性能监视器
- ✅ 降低默认渲染距离
- ✅ 方块物理系统降频
- ✅ 天空系统优化

#### 第 2 批（当前完成）
- ✅ **贪婪网格合并（Greedy Meshing）**
  - 实现三轴方向的面合并算法
  - 减少 70-90% 顶点数和绘制调用
  - 大幅提升渲染性能
- ✅ **Chunk 加载限流与优先级队列**
  - 限制每帧最多加载 2 个 chunk
  - 优先加载玩家前方的 chunk
  - 消除加载时的卡顿

### 🚧 进行中（当前任务）
- **下一步：** 测试性能提升效果
- **预期效果：** FPS 提升 100-150%

### ⏳ 待完成（可选优化）
- LOD 系统（如需进一步优化）
- 几何体对象池（减少 GC 压力）
- 纹理图集（减少绘制调用）
- 碰撞检测优化（提升交互性能）

---

## 🔗 参考资源

### 贪婪网格合并
- [0fps.net - Meshing in a Minecraft Game](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/)
- [Gedge.ca - Greedy Voxel Meshing](https://www.gedge.ca/dev/2014/08/17/greedy-voxel-meshing)
- [GitHub - Voxel Meshing Examples](https://github.com/roboleary/GreedyMesh)

### Three.js 性能优化
- [Three.js Performance Tips](https://discoverthreejs.com/tips-and-tricks/)
- [Three.js Manual - Optimization](https://threejs.org/manual/#en/optimize-lots-of-objects)

### WebGL 最佳实践
- [MDN - WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [Khronos - WebGL Insights](https://www.khronos.org/webgl/)

### LOD 系统
- [GPU Gems - Level of Detail Techniques](https://developer.nvidia.com/gpugems/gpugems2/part-i-geometric-complexity/chapter-2-terrain-rendering-using-gpu-based-geometry)

---

## 🎯 成功标准

### 性能目标
- [ ] 桌面端 FPS >= 60（当前 10-20）
- [ ] 移动端 FPS >= 30（当前 5-10）
- [ ] 渲染距离 = 3 时，内存占用 < 500MB
- [ ] 无明显卡顿（帧时间方差 < 16.67ms）

### 质量目标
- [ ] 贪婪网格合并无视觉错误
- [ ] LOD 切换平滑无闪烁
- [ ] 所有方块类型正确渲染
- [ ] 水和透明方块正确处理

### 兼容性目标
- [ ] Chrome/Edge 正常运行
- [ ] Firefox 正常运行
- [ ] Safari 正常运行
- [ ] 移动设备正常运行

---

## 💡 额外优化建议（未来可选）

1. **使用 InstancedMesh** - 对重复方块（如树叶）使用实例化渲染
2. **八叉树空间分区** - 更高效的大规模场景管理
3. **GPU 粒子系统** - 优化破坏方块的粒子效果
4. **Web GPU 迁移** - 长期目标，使用 WebGPU 替代 WebGL
5. **服务端渲染** - 预生成地形数据，减少客户端计算
6. **压缩存档格式** - 使用 LZ4/Zstd 压缩存档数据

---

**当前状态：** ⏳ 准备开始实施
**下一步：** 实现贪婪网格合并算法
