# 网页版 Minecraft 游戏项目

## 📋 项目说明

本项目旨在开发一款简化版的网页Minecraft游戏，采用完全serverless架构，可部署到GitHub Pages或Vercel。

## 📄 技术方案报告

详细的技术方案研究报告请查看：[docs/RESEARCH_REPORT.md](./docs/RESEARCH_REPORT.md)

## 🎯 核心特性

- ✅ **完全Serverless**：纯前端实现，无需后端服务器
- ✅ **易于部署**：支持GitHub Pages和Vercel
- ✅ **零成本运行**：使用免费托管服务
- ✅ **渐进式开发**：从MVP开始，逐步添加功能
- ✅ **性能优化**：Chunk系统、面剔除等优化技术

## 🛠️ 技术栈

- **核心框架**：Three.js (WebGL 3D渲染)
- **开发语言**：JavaScript/TypeScript
- **构建工具**：Vite (可选)
- **部署平台**：GitHub Pages / Vercel
- **地形生成**：Simplex/Perlin噪声算法

## 📦 MVP功能清单

### 第一阶段（必需）
- [x] Three.js 3D场景搭建
- [x] 第一人称视角控制（WASD + 鼠标）
- [x] 简单地形生成
- [x] 方块放置/破坏交互
- [x] 基础UI（十字准星）

### 第二阶段（优化）
- [ ] Chunk系统（性能优化）
- [ ] 面剔除算法
- [ ] Perlin噪声地形
- [ ] 多种方块类型和纹理
- [ ] 物理和碰撞检测

### 第三阶段（增强）
- [ ] 背包系统
- [ ] 本地存档（LocalStorage/IndexedDB）
- [ ] 改进UI
- [ ] 音效系统

## 🚀 快速开始

### 方案1：零构建（最简单）

直接使用CDN，无需安装任何依赖：

```bash
# 克隆仓库
git clone <repository-url>
cd web-minecraft

# 使用简单HTTP服务器
python3 -m http.server 8000
# 或
npx serve
```

访问 `http://localhost:8000`

### 方案2：使用构建工具（推荐）

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📂 项目结构

```
web-minecraft/
├── index.html           # 入口文件
├── src/
│   ├── main.js         # 主程序入口
│   ├── world.js        # 世界生成与管理
│   ├── block.js        # 方块系统
│   ├── player.js       # 玩家控制
│   ├── terrain.js      # 地形生成
│   └── utils.js        # 工具函数
├── assets/
│   ├── textures/       # 方块纹理
│   └── sounds/         # 音效（可选）
├── styles/
│   └── main.css        # 样式
├── docs/
│   └── RESEARCH_REPORT.md  # 技术方案报告
└── README.md
```

## 🎮 游戏控制

- **W/A/S/D**：移动
- **鼠标**：视角控制
- **空格**：跳跃
- **Shift**：加速/下蹲
- **左键**：破坏方块
- **右键**：放置方块
- **1-9**：选择方块类型
- **ESC**：释放鼠标锁定

## 🌐 部署指南

### GitHub Pages

1. 将代码推送到GitHub仓库
2. 进入仓库设置 → Pages
3. 选择部署分支（main或gh-pages）
4. 等待自动部署完成

### Vercel

1. 导入GitHub仓库到Vercel
2. 配置构建设置（如使用Vite）
3. 自动部署

详细部署说明请参考技术报告第四章。

## 🎨 性能优化

- **Chunk系统**：世界分块加载，只渲染可见区域
- **面剔除**：不渲染被遮挡的方块面
- **几何合并**：批量渲染相同类型方块
- **视距限制**：限制渲染距离
- **LOD系统**：远处使用低细节模型

## 📈 开发路线图

- **Phase 1**：MVP基础功能（1-2周）
- **Phase 2**：性能优化（1周）
- **Phase 3**：功能增强（2周）
- **Phase 4**：高级功能（按需）

详见 [技术报告第七章](./docs/RESEARCH_REPORT.md#七、实现路线图)

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📝 许可证

MIT License

## 📚 参考资源

- [Three.js 官方文档](https://threejs.org/docs/)
- [Three.js 示例](https://threejs.org/examples/)
- [WebGL 教程](https://webglfundamentals.org/)
- [Perlin噪声算法](https://en.wikipedia.org/wiki/Perlin_noise)

## 💡 下一步

1. ✅ 阅读完整技术报告
2. ⬜ 开始MVP开发
3. ⬜ 测试和优化
4. ⬜ 部署到生产环境
5. ⬜ 收集用户反馈
6. ⬜ 迭代开发新功能

---

**项目状态**：研究阶段 → 准备开发

如有任何问题，请查看技术报告或提交Issue。
