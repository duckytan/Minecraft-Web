# 📋 GitHub Pages 白屏问题 - 立即修复指南

> **问题：** 访问 `https://duckytan.github.io/Minecraft-Web/` 显示白屏，控制台报 404 错误  
> **原因：** GitHub Pages 部署了源代码而非构建产物  
> **解决：** 参考下方步骤，5-10 分钟内彻底解决

---

## 🚀 推荐方案一：Vercel 自动部署（最简单）

### 为什么推荐 Vercel？

- ✅ **零配置**：自动识别 Vite 项目并正确构建
- ✅ **全自动**：每次 `git push` 自动重新部署
- ✅ **更快速**：全球 CDN 加速
- ✅ **有预览**：PR 自动生成预览链接
- ✅ **永久解决**：不会再出现白屏问题

### 操作步骤

1. **导入项目到 Vercel**
   - 访问：https://vercel.com/new
   - 使用 GitHub 账号登录
   - 点击 "Import Git Repository"
   - 搜索并选择 `duckytan/Minecraft-Web`

2. **确认配置（Vercel 会自动检测）**
   - Framework Preset: `Vite` ✅
   - Build Command: `npm run build` ✅
   - Output Directory: `dist` ✅
   - Install Command: `npm install` ✅

3. **点击 Deploy**
   - 等待 30-60 秒
   - 获得网址：`https://minecraft-web-xxx.vercel.app`

4. **完成！**
   - 以后每次推送代码，自动重新部署
   - 可以自定义域名（可选）

---

## 📦 方案二：GitHub Actions 自动部署（仍使用 GitHub Pages）

如果你想继续使用 GitHub Pages，需要添加自动化构建流程。

### 第一步：添加部署脚本到 package.json

编辑 `package.json`，在 `scripts` 部分添加：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "deploy:gh": "npm run build && gh-pages -d dist"
  },
  "devDependencies": {
    // ... 其他依赖
    "gh-pages": "^6.1.1"
  }
}
```

### 第二步：安装 gh-pages

```bash
npm install --save-dev gh-pages
```

### 第三步：手动部署一次（临时修复）

```bash
npm run deploy:gh
```

这会：
1. 构建项目到 `dist/`
2. 将 `dist/` 内容推送到 `gh-pages` 分支
3. 自动修复白屏问题

### 第四步：配置 GitHub Pages 设置

1. 打开仓库：https://github.com/duckytan/Minecraft-Web
2. Settings → Pages
3. Source 选择：**Deploy from a branch**
4. Branch 选择：**gh-pages** / **(root)**
5. 点击 Save

### 第五步：验证修复

1. 等待 1-2 分钟
2. 访问：https://duckytan.github.io/Minecraft-Web/
3. 应该看到游戏正常加载 ✅

### 第六步：自动化（避免以后忘记）

创建 GitHub Actions 工作流（见方案三）

---

## 🤖 方案三：GitHub Actions 完全自动化（推荐用于 GitHub Pages）

### 为什么需要 GitHub Actions？

之前的问题反复出现是因为：
- ⚠️ 每次 `git push` 后忘记运行 `npm run deploy:gh`
- ⚠️ 或者手动部署时操作错误

GitHub Actions 可以：
- ✅ 每次 `git push` 自动构建并部署
- ✅ 确保永远部署正确的构建产物
- ✅ 一次配置，永久有效

### 立即实施步骤

#### 1. 创建工作流文件

在项目根目录创建 `.github/workflows/deploy-gh-pages.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: write

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

      - name: Deploy to gh-pages branch
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

#### 2. 提交并推送

```bash
git add .github/workflows/deploy-gh-pages.yml
git commit -m "chore: add GitHub Pages auto-deployment workflow"
git push origin main
```

#### 3. 查看部署状态

1. 打开仓库 → Actions 标签
2. 看到 "Deploy to GitHub Pages" 工作流运行
3. 等待完成（约 1-2 分钟）

#### 4. 配置 GitHub Pages

1. Settings → Pages
2. Source 选择：**Deploy from a branch**
3. Branch 选择：**gh-pages** / **(root)**
4. Save

#### 5. 完成！

- 以后每次 `git push` 自动部署
- 不会再出现白屏问题

---

## ⚡ 临时快速修复（立即见效）

如果需要马上修复白屏，不想等待配置：

### 选项 A：使用 npx（无需安装）

```bash
npm run build
npx gh-pages -d dist
```

### 选项 B：手动操作

```bash
# 1. 构建
npm run build

# 2. 进入 dist 目录
cd dist

# 3. 初始化 git（如果需要）
git init

# 4. 添加所有文件
git add -A

# 5. 提交
git commit -m 'deploy'

# 6. 推送到 gh-pages 分支
git push -f git@github.com:duckytan/Minecraft-Web.git HEAD:gh-pages

# 7. 返回项目根目录
cd ..
```

---

## 🧪 验证部署成功

### 1. 检查浏览器 Network

1. 打开：https://duckytan.github.io/Minecraft-Web/
2. 按 F12 打开开发者工具
3. 切换到 Network 标签
4. 刷新页面（Ctrl+Shift+R）

**正确的请求：**
```
✅ https://duckytan.github.io/Minecraft-Web/assets/index-xxx.js
✅ https://duckytan.github.io/Minecraft-Web/assets/index-xxx.css
✅ https://duckytan.github.io/Minecraft-Web/assets/three-xxx.js
```

**错误的请求（说明还没修复）：**
```
❌ https://duckytan.github.io/src/main.ts (404)
❌ https://duckytan.github.io/src/styles/main.css (404)
```

### 2. 检查页面功能

- [ ] 页面正常显示（无白屏）
- [ ] 可以看到 Three.js 场景
- [ ] 点击屏幕可以锁定鼠标
- [ ] WASD 移动正常
- [ ] 方块破坏/放置正常

---

## 📊 三种方案对比

| 方案 | 难度 | 部署时间 | 自动化 | 速度 | 推荐指数 |
|------|------|----------|--------|------|----------|
| **Vercel** | ⭐ 简单 | 5 分钟 | ✅ 完全自动 | 🚀 极快（CDN） | ⭐⭐⭐⭐⭐ |
| **GitHub Actions** | ⭐⭐ 中等 | 10 分钟 | ✅ 完全自动 | ⚡ 较快 | ⭐⭐⭐⭐ |
| **手动 gh-pages** | ⭐ 简单 | 3 分钟 | ❌ 每次手动 | ⚡ 较快 | ⭐⭐ |

---

## 🎯 强烈建议

1. **立即临时修复**：运行 `npm run build && npx gh-pages -d dist`
2. **长期稳定方案**：
   - 方案 1（最佳）：迁移到 Vercel
   - 方案 2（次选）：配置 GitHub Actions

**为什么必须使用自动化？**

手动部署的问题：
- ⚠️ 容易忘记运行 `npm run deploy:gh`
- ⚠️ 可能推送错误的内容
- ⚠️ 多人协作时容易出错
- ⚠️ 这就是为什么问题会反复出现 5-6 次！

自动化的优势：
- ✅ 永远部署最新代码
- ✅ 永远部署正确的构建产物
- ✅ 不需要记住部署步骤
- ✅ 团队协作友好

---

## 📞 需要帮助？

### 常见问题

**Q: 我运行 `npx gh-pages -d dist` 后还是 404？**

A: 等待 1-2 分钟，GitHub Pages 需要时间更新。清除浏览器缓存并刷新。

**Q: GitHub Actions 工作流失败？**

A: 检查：
1. 是否有权限问题（Settings → Actions → Workflow permissions → 选择 "Read and write permissions"）
2. 是否 `npm run build` 本地成功

**Q: Vercel 部署后还是空白？**

A: 这种情况极少。检查 Vercel 构建日志是否有错误。

---

## 📝 相关文档

- [详细问题分析](DEPLOYMENT_ISSUE_ANALYSIS.md) - 了解问题根本原因
- [部署指南](DEPLOYMENT.md) - 各种平台部署方法
- [快速开始](DEPLOY_QUICK_START.md) - 非技术用户快速部署

---

**⏰ 立即行动，5 分钟内解决问题！**

```bash
# 推荐：立即临时修复 + 配置自动化
npm run build
npx gh-pages -d dist

# 然后添加 GitHub Actions 工作流（见方案三）
```
