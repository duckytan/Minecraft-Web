# 🎯 GitHub Pages 白屏问题 - 完整解决方案

## ⚠️ 你遇到的问题

访问 `https://duckytan.github.io/Minecraft-Web/` 时：
- 页面显示白屏
- 浏览器控制台报 404 错误：
  ```
  GET https://duckytan.github.io/src/styles/main.css net::ERR_ABORTED 404
  GET https://duckytan.github.io/src/main.ts net::ERR_ABORTED 404
  ```
- **问题已出现 5-6 次，说明之前的修复都是临时的**

---

## 🔥 问题的根本原因（必读）

### 一句话总结

**GitHub Pages 部署了源代码目录，而不是构建产物目录（dist/）**

### 为什么开发环境正常？

```bash
# 开发环境（正常）
npm run dev
→ Vite 开发服务器实时编译 TypeScript
→ 浏览器访问 http://localhost:5173
→ ✅ 一切正常
```

### 为什么 GitHub Pages 白屏？

```bash
# GitHub Pages（白屏）
浏览器请求：https://duckytan.github.io/src/main.ts
→ 文件不存在（GitHub Pages 无法编译 TypeScript）
→ ❌ 404 错误 → 白屏
```

### 正确的做法

```bash
# 本地构建
npm run build
→ TypeScript 编译为 JavaScript
→ 代码打包到 dist/ 目录
→ dist/index.html 引用 ./assets/index-xxx.js

# 部署 dist/ 目录到 GitHub Pages
→ 浏览器请求：https://duckytan.github.io/Minecraft-Web/assets/index-xxx.js
→ ✅ 文件存在 → 正常加载
```

---

## 🚀 三种解决方案（选择一种）

### 方案 A：Vercel（最简单，强烈推荐）⭐⭐⭐⭐⭐

**为什么选择 Vercel？**
- ✅ 5 分钟完成设置
- ✅ 完全自动化（每次 git push 自动部署）
- ✅ 全球 CDN 加速（比 GitHub Pages 更快）
- ✅ 自动 HTTPS
- ✅ 永久解决白屏问题

**操作步骤：**

1. 访问 https://vercel.com/new
2. 使用 GitHub 账号登录
3. 点击 "Import Git Repository"
4. 搜索并选择 `duckytan/Minecraft-Web`
5. 点击 "Deploy"（Vercel 会自动检测 Vite 配置）
6. 等待 30-60 秒
7. 获得永久网址：`https://minecraft-web-xxx.vercel.app`

**以后：** 每次 `git push` 自动重新部署，无需任何操作。

---

### 方案 B：GitHub Actions（仍用 GitHub Pages）⭐⭐⭐⭐

**适用场景：** 你想继续使用 GitHub Pages

**操作步骤：**

#### 1. 创建工作流文件

创建 `.github/workflows/deploy-gh-pages.yml`：

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

#### 2. 推送工作流文件

```bash
git add .github/workflows/deploy-gh-pages.yml
git commit -m "chore: add GitHub Pages auto-deployment workflow"
git push origin main
```

#### 3. 配置 GitHub Pages

1. 打开 https://github.com/duckytan/Minecraft-Web/settings/pages
2. Source 选择：**Deploy from a branch**
3. Branch 选择：**gh-pages** / **(root)**
4. 点击 Save

#### 4. 完成

- 工作流会自动运行（查看 Actions 标签）
- 以后每次 `git push` 自动部署

---

### 方案 C：手动部署（临时快速修复）⭐⭐

**适用场景：** 需要立即修复，但稍后会选择方案 A 或 B

**操作步骤：**

```bash
# 1. 安装 gh-pages（仅需一次）
npm install --save-dev gh-pages

# 2. 在 package.json 添加脚本
# "scripts": {
#   "deploy:gh": "npm run build && gh-pages -d dist"
# }

# 3. 运行部署
npm run deploy:gh

# 4. 等待 1-2 分钟，刷新网页
```

**注意：** 这种方法每次推送代码都要手动运行，**这就是为什么问题反复出现 5-6 次**。

---

## ✅ 如何验证修复成功

### 1. 检查浏览器 Network 请求

1. 打开 https://duckytan.github.io/Minecraft-Web/
2. 按 F12 打开开发者工具
3. 切换到 Network 标签
4. 刷新页面（Ctrl+Shift+R）

**✅ 修复成功：**
```
200  https://duckytan.github.io/Minecraft-Web/assets/index-xxx.js
200  https://duckytan.github.io/Minecraft-Web/assets/index-xxx.css
200  https://duckytan.github.io/Minecraft-Web/assets/three-xxx.js
```

**❌ 仍未修复：**
```
404  https://duckytan.github.io/src/main.ts
404  https://duckytan.github.io/src/styles/main.css
```

### 2. 检查页面功能

- [ ] 页面正常显示（无白屏）
- [ ] 可以看到 Three.js 3D 场景
- [ ] 点击屏幕可以锁定鼠标
- [ ] WASD 移动正常
- [ ] 鼠标控制视角正常
- [ ] 方块破坏/放置正常

---

## 📚 详细文档索引

| 文档 | 内容 | 推荐阅读 |
|------|------|----------|
| **[立即修复指南](GITHUB_PAGES_FIX_GUIDE.md)** | 三种方案的详细步骤 | 🔥 必读 |
| **[根本原因分析](DEPLOYMENT_WHITE_SCREEN_ROOT_CAUSE_ANALYSIS.md)** | 为什么问题反复出现 5-6 次 | 🔥 必读 |
| **[技术细节分析](DEPLOYMENT_ISSUE_ANALYSIS.md)** | 深入的技术原理 | 可选 |
| **[部署指南](DEPLOYMENT.md)** | Vercel、Netlify、Cloudflare Pages | 可选 |
| **[快速开始](DEPLOY_QUICK_START.md)** | 非技术用户友好指南 | 可选 |

---

## 🎯 立即行动指南

### 如果你想要最简单的方案（推荐）

1. 访问 https://vercel.com/new
2. 导入 `duckytan/Minecraft-Web` 仓库
3. 点击 Deploy
4. 完成！以后每次 git push 自动部署

### 如果你想继续使用 GitHub Pages

1. 创建 `.github/workflows/deploy-gh-pages.yml`（见方案 B）
2. 推送工作流文件
3. 配置 GitHub Pages 使用 gh-pages 分支
4. 完成！以后每次 git push 自动部署

### 如果你需要立即临时修复

```bash
npm run build
npx gh-pages -d dist
```

**但记住：** 这只是临时方案，稍后应该实施自动化部署（方案 A 或 B）。

---

## ❓ 常见问题

### Q1: 为什么 `npm run dev` 正常，但部署后白屏？

A: 开发环境使用 Vite 开发服务器，可以实时编译 TypeScript。但 GitHub Pages 是静态托管，不能编译 TypeScript，必须先构建。

### Q2: 我已经运行了 `npm run build`，为什么还是白屏？

A: 构建后需要部署 `dist/` 目录的内容到 GitHub Pages，而不是项目根目录。

### Q3: 我之前修复过，为什么又白屏了？

A: 因为之前是手动部署，推送新代码后忘记重新部署。解决方案是使用自动化部署（方案 A 或 B）。

### Q4: Vercel 和 GitHub Pages 有什么区别？

| 特性 | Vercel | GitHub Pages |
|------|--------|--------------|
| 部署速度 | 🚀 极快（30秒） | ⚡ 较快（1-2分钟） |
| 自动部署 | ✅ 内置 | ⚠️ 需要配置 GitHub Actions |
| CDN 加速 | ✅ 全球边缘节点 | ⚡ GitHub CDN |
| HTTPS | ✅ 自动 | ✅ 自动 |
| 自定义域名 | ✅ 免费 | ✅ 免费 |
| 配置难度 | ⭐ 极简（零配置） | ⭐⭐ 需配置工作流 |

### Q5: 我应该选择哪种方案？

- **个人项目、快速部署**：选择 Vercel（方案 A）
- **必须使用 GitHub Pages**：选择 GitHub Actions（方案 B）
- **临时快速修复**：选择手动部署（方案 C），但稍后实施 A 或 B

---

## 💡 关键要点（必读）

### 🔴 问题的根源

**不是代码有问题，而是缺少自动化部署流程**

手动部署的风险：
- ⚠️ 容易忘记运行构建命令
- ⚠️ 可能推送错误的内容
- ⚠️ 团队协作时容易出错
- ⚠️ **这就是问题反复出现 5-6 次的根本原因**

### 🟢 解决方案

**必须使用自动化部署**

- ✅ 一次配置，永久有效
- ✅ 每次推送自动部署
- ✅ 永远部署正确的构建产物
- ✅ 永久解决白屏问题

---

## 📞 需要帮助？

- **查看详细文档：** [GITHUB_PAGES_FIX_GUIDE.md](GITHUB_PAGES_FIX_GUIDE.md)
- **了解技术原理：** [DEPLOYMENT_WHITE_SCREEN_ROOT_CAUSE_ANALYSIS.md](DEPLOYMENT_WHITE_SCREEN_ROOT_CAUSE_ANALYSIS.md)
- **其他部署选项：** [DEPLOYMENT.md](DEPLOYMENT.md)

---

**🎯 记住：问题不是代码，而是部署方式。选择自动化部署方案，永久解决问题！**

---

## ⏰ 立即开始

```bash
# 选择一种方案：

# 方案 A（最简单）：访问 https://vercel.com/new

# 方案 B（GitHub Actions）：创建工作流文件

# 方案 C（临时）：
npm run build
npx gh-pages -d dist
```

**祝部署顺利！🚀**
