# 🚨 部署白屏问题根本原因分析与彻底解决方案

## 📋 问题现象

打开 `https://duckytan.github.io/Minecraft-Web/` 时：
- ✗ 页面显示白屏
- ✗ 浏览器控制台报错：
  ```
  GET https://duckytan.github.io/src/styles/main.css net::ERR_ABORTED 404
  GET https://duckytan.github.io/src/main.ts net::ERR_ABORTED 404
  ```

## 🔍 根本原因分析

### 问题核心

**GitHub Pages 当前部署的是源代码目录，而不是构建产物目录！**

### 详细说明

1. **源代码结构（开发环境）**
   ```
   项目根目录/
   ├── index.html          ← 引用 /src/main.ts 和 /src/styles/main.css
   ├── src/
   │   ├── main.ts        ← TypeScript 源文件
   │   └── styles/
   │       └── main.css   ← CSS 源文件
   ├── vite.config.ts
   └── package.json
   ```

   在开发环境中，Vite 开发服务器会：
   - 实时编译 TypeScript → JavaScript
   - 实时编译 CSS
   - 处理模块导入
   - ✅ **所以 `npm run dev` 运行正常**

2. **构建产物结构（生产环境）**
   ```
   dist/
   ├── index.html          ← 引用 ./assets/index-xxx.js 和 ./assets/index-xxx.css
   ├── assets/
   │   ├── index-Hr1niCm1.js       ← 编译并打包后的 JS
   │   ├── index-D6Iq1H6F.css      ← 处理后的 CSS
   │   ├── three-CvaMhN3E.js       ← Three.js 库
   │   └── terrain.worker-xxx.js   ← Web Worker
   └── vite.svg
   ```

   Vite 构建后（`npm run build`）：
   - ✅ TypeScript 编译为 JavaScript
   - ✅ CSS 处理和优化
   - ✅ 代码打包和压缩
   - ✅ index.html 中的引用自动转换为构建产物路径
   - ✅ **dist/ 目录才是应该部署的内容**

3. **当前 GitHub Pages 的问题**
   
   GitHub Pages 部署了**项目根目录**，导致：
   ```
   浏览器请求：https://duckytan.github.io/src/main.ts
                                           ↑ 源代码路径，不存在于 gh-pages 分支
   
   应该请求：https://duckytan.github.io/Minecraft-Web/assets/index-xxx.js
                                           ↑ 构建产物路径
   ```

## 🚫 为什么问题会反复出现（5-6次）？

### 反复出现的根本原因

| 错误类型 | 描述 | 后果 |
|---------|------|------|
| **缺少自动化部署流程** | 没有 GitHub Actions 自动构建和部署 | 每次推送代码，GitHub Pages 不会自动更新构建产物 |
| **手动部署操作错误** | 手动推送时可能将源代码推送到 gh-pages 分支 | 部署了错误的内容 |
| **配置不一致** | Vite 配置和部署配置不匹配 | 即使构建成功，路径也可能错误 |
| **缺少部署检查清单** | 没有部署前的验证步骤 | 不知道哪里出错了 |

### 历史修复尝试的问题

之前的修复可能只是临时性的，比如：
- 修改了 `vite.config.ts` 的 `base` 配置
- 修改了 `vercel.json`（但 GitHub Pages 不使用这个文件）
- 手动构建并推送，但没有建立自动化流程

## ✅ 彻底解决方案

### 方案 A：使用 GitHub Actions 自动部署（强烈推荐）

#### 1. 创建 GitHub Actions 工作流

创建文件 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 2. 配置 GitHub Pages

1. 进入仓库 Settings → Pages
2. Source 选择：**GitHub Actions**
3. 保存

#### 3. 推送工作流文件

```bash
git add .github/workflows/deploy.yml
git commit -m "chore: add GitHub Actions deployment workflow"
git push origin main
```

#### 4. 自动部署

- ✅ 每次推送到 main 分支，自动触发构建和部署
- ✅ 确保部署的永远是最新的构建产物
- ✅ 可在 Actions 标签页查看部署状态

---

### 方案 B：使用 gh-pages 分支手动部署（不推荐，但可用）

#### 1. 安装 gh-pages 工具

```bash
npm install --save-dev gh-pages
```

#### 2. 在 package.json 中添加部署脚本

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

#### 3. 每次部署时运行

```bash
npm run deploy
```

#### 4. 配置 GitHub Pages

1. 进入仓库 Settings → Pages
2. Source 选择：**Deploy from a branch**
3. Branch 选择：**gh-pages** / **(root)**
4. 保存

**缺点：**
- ⚠️ 需要手动运行 `npm run deploy`
- ⚠️ 容易忘记部署
- ⚠️ 可能推送错误的内容

---

### 方案 C：使用 Vercel 部署（最简单，推荐用于生产）

Vercel 会自动处理构建和部署，无需任何配置文件修改：

1. 访问 [https://vercel.com](https://vercel.com)
2. 点击 "Import Project"
3. 选择 GitHub 仓库 `duckytan/Minecraft-Web`
4. 点击 "Deploy"

**优点：**
- ✅ 自动检测 Vite 项目
- ✅ 自动构建和部署
- ✅ 每次 git push 自动重新部署
- ✅ 提供预览环境
- ✅ 全球 CDN 加速
- ✅ 零配置

## 📝 部署检查清单（避免再次出错）

### 部署前检查

- [ ] 确保本地构建成功：`npm run build`
- [ ] 确保本地预览正常：`npm run preview`
- [ ] 检查 `dist/index.html` 文件中的资源路径是否为 `./assets/...`
- [ ] 确认 `vite.config.ts` 中 `base: './'`（相对路径）

### 部署后检查

- [ ] 打开网站，页面正常加载（无白屏）
- [ ] 浏览器控制台无 404 错误
- [ ] Three.js 场景正常渲染
- [ ] WASD 和鼠标控制正常
- [ ] 虚拟按键显示（移动端）
- [ ] 所有游戏功能正常

### 验证部署的是构建产物

打开浏览器开发者工具 → Network 标签，刷新页面，检查：
- ✅ **正确**：加载 `assets/index-xxx.js`、`assets/index-xxx.css`
- ✗ **错误**：尝试加载 `src/main.ts`、`src/styles/main.css`

## 🎯 推荐方案总结

| 方案 | 难度 | 自动化 | 推荐指数 |
|------|------|--------|----------|
| **GitHub Actions** | 中等（一次配置） | ✅ 完全自动 | ⭐⭐⭐⭐⭐ |
| **gh-pages 手动** | 简单 | ❌ 手动运行 | ⭐⭐ |
| **Vercel** | 非常简单 | ✅ 完全自动 | ⭐⭐⭐⭐⭐ |

## 🔧 立即修复当前问题

### 临时快速修复（使用方案 B）

```bash
# 1. 安装 gh-pages
npm install --save-dev gh-pages

# 2. 手动构建并部署
npm run build
npx gh-pages -d dist

# 3. 检查 GitHub Pages 设置
# Settings → Pages → Branch 选择 gh-pages
```

### 长期稳定方案（使用方案 A）

按照"方案 A"创建 GitHub Actions 工作流，实现全自动部署。

---

## 📊 问题对比表

| 错误做法 | 正确做法 |
|---------|---------|
| 部署项目根目录到 GitHub Pages | 部署 `dist/` 目录到 GitHub Pages |
| 手动复制粘贴文件 | 使用自动化部署工具 |
| 推送源代码到 gh-pages 分支 | 推送构建产物到 gh-pages 分支 |
| 没有验证部署结果 | 部署后检查 Network 请求 |
| 每次手动构建和部署 | 配置 GitHub Actions 自动化 |

## 🎓 关键知识点

1. **Vite 项目的两种模式**
   - 开发模式（`npm run dev`）：直接处理源代码，支持热重载
   - 生产模式（`npm run build`）：编译、打包、优化，生成 `dist/` 目录

2. **index.html 中的路径**
   - 开发环境：`/src/main.ts`（Vite 会处理）
   - 构建后：`./assets/index-xxx.js`（Vite 自动转换）

3. **GitHub Pages 部署**
   - 需要部署**静态文件**（HTML、CSS、JS）
   - 不能部署**源代码**（TypeScript、未编译的文件）

4. **相对路径 vs 绝对路径**
   - `base: './'`：相对路径，适合子路径部署
   - `base: '/Minecraft-Web/'`：绝对路径，只适合固定路径

---

**最后建议：立即使用方案 A（GitHub Actions）或方案 C（Vercel），彻底解决问题！**
