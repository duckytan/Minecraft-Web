# 🔍 GitHub Pages 白屏问题 - 反复出现的根本原因与彻底解决

## 📌 问题概述

**症状：** 打开 `https://duckytan.github.io/Minecraft-Web/` 显示白屏，浏览器控制台报错：

```
GET https://duckytan.github.io/src/styles/main.css net::ERR_ABORTED 404
GET https://duckytan.github.io/src/main.ts net::ERR_ABORTED 404
```

**影响：** 问题已出现 **5-6 次**，说明之前的修复都是临时性的，没有解决根本问题。

---

## 🚨 核心问题

### 根本原因：混淆了"源代码"与"构建产物"

```plaintext
❌ 错误做法（导致白屏）：
GitHub Pages 部署了 项目根目录（源代码）
↓
浏览器请求：https://duckytan.github.io/src/main.ts
↓
文件不存在 → 404 错误 → 白屏

✅ 正确做法：
GitHub Pages 部署 dist/ 目录（构建产物）
↓
浏览器请求：https://duckytan.github.io/Minecraft-Web/assets/index-xxx.js
↓
文件存在 → 正常加载 → 游戏运行
```

---

## 📂 文件结构对比

### 源代码结构（开发环境）

```
项目根目录/
├── index.html             ← 引用 /src/main.ts (开发环境路径)
├── src/
│   ├── main.ts           ← TypeScript 源文件
│   ├── styles/
│   │   └── main.css      ← CSS 源文件
│   ├── core/
│   ├── world/
│   └── ...
├── vite.config.ts
└── package.json
```

**为什么开发环境正常？**
- Vite 开发服务器（`npm run dev`）会实时编译 TypeScript → JavaScript
- 支持模块热替换（HMR）
- 自动处理导入路径

### 构建产物结构（生产环境）

```
dist/                      ← 这才是应该部署的目录
├── index.html            ← 引用 ./assets/index-xxx.js (生产环境路径)
├── assets/
│   ├── index-Hr1niCm1.js        ← 编译+打包的 JS
│   ├── index-D6Iq1H6F.css       ← 处理后的 CSS
│   ├── three-CvaMhN3E.js        ← Three.js 库
│   └── terrain.worker-xxx.js    ← Web Worker
└── vite.svg
```

**Vite 构建做了什么？**
1. ✅ TypeScript → JavaScript 编译
2. ✅ 代码打包与优化
3. ✅ 模块依赖解析
4. ✅ 自动修改 index.html 中的引用路径
5. ✅ 文件名添加哈希（缓存优化）
6. ✅ 代码压缩（gzip）

---

## ❓ 为什么问题反复出现（5-6次）？

### 问题 1：缺少自动化部署流程

| 每次修复的问题 | 为什么又出现 |
|---------------|------------|
| 手动运行 `npm run build && npx gh-pages -d dist` | 下次推送代码忘记运行 |
| 修改 `vite.config.ts` 配置 | 配置正确，但没有自动部署机制 |
| 修改 `vercel.json` | Vercel 配置不影响 GitHub Pages |
| 手动推送到 gh-pages 分支 | 可能推送了错误的内容（源代码而非 dist/） |

**根本原因：** 没有建立**自动化的构建和部署流程**，每次都依赖手动操作，容易出错或遗忘。

### 问题 2：部署了错误的内容

**常见错误操作：**

```bash
# ❌ 错误：将整个项目推送到 gh-pages
git push origin main:gh-pages

# ✅ 正确：只推送 dist/ 目录到 gh-pages
npm run build
npx gh-pages -d dist
```

### 问题 3：GitHub Pages 配置错误

**错误配置：**
- Source: Deploy from a branch
- Branch: **main** / (root)  ← 这会部署源代码！

**正确配置：**
- Source: Deploy from a branch
- Branch: **gh-pages** / (root)  ← 这才是构建产物

或者使用：
- Source: **GitHub Actions**  ← 最佳方案

---

## 🔧 三种解决方案对比

### 方案 A：Vercel（推荐，最简单）

**优势：**
- ✅ 零配置，自动检测 Vite 项目
- ✅ 每次 `git push` 自动构建并部署
- ✅ 全球 CDN 加速
- ✅ 提供预览环境（PR 自动部署预览）
- ✅ 部署速度快（30-60 秒）
- ✅ **永久解决问题，不会再出现白屏**

**操作步骤：**
1. 访问 https://vercel.com/new
2. 导入 GitHub 仓库 `duckytan/Minecraft-Web`
3. 点击 Deploy
4. 完成！

**适用场景：** 所有情况（个人项目、团队项目、生产环境）

---

### 方案 B：GitHub Actions 自动部署

**优势：**
- ✅ 完全自动化，`git push` 触发构建
- ✅ 免费（GitHub 公开仓库）
- ✅ 可自定义构建流程
- ✅ 仍使用 GitHub Pages 托管

**劣势：**
- ⚠️ 需要配置工作流文件（一次性工作）
- ⚠️ 构建速度略慢于 Vercel

**操作步骤：** 见 [GITHUB_PAGES_FIX_GUIDE.md](GITHUB_PAGES_FIX_GUIDE.md)

**适用场景：** 希望使用 GitHub Pages 且愿意配置自动化

---

### 方案 C：手动 gh-pages 部署

**优势：**
- ✅ 简单快速（3 分钟修复）

**劣势：**
- ❌ 每次推送都要手动运行
- ❌ 容易忘记或出错
- ❌ **这就是为什么问题反复出现**

**操作步骤：**
```bash
npm run build
npx gh-pages -d dist
```

**适用场景：** 仅作为临时快速修复，不推荐长期使用

---

## 📊 问题诊断流程图

```
访问 https://duckytan.github.io/Minecraft-Web/
          ↓
    页面是否白屏？
          ↓
    YES → 打开 Network 面板
          ↓
    看到 404 错误：/src/main.ts
          ↓
    【诊断】GitHub Pages 部署了源代码
          ↓
    【原因】缺少自动化构建流程
          ↓
    【解决】实施方案 A 或 B
```

---

## ✅ 如何验证已彻底修复

### 1. 检查 Network 请求

打开浏览器开发者工具（F12），切换到 Network 标签，刷新页面：

**✅ 正确（修复成功）：**
```
Status  URL
200     https://duckytan.github.io/Minecraft-Web/assets/index-xxx.js
200     https://duckytan.github.io/Minecraft-Web/assets/index-xxx.css
200     https://duckytan.github.io/Minecraft-Web/assets/three-xxx.js
```

**❌ 错误（仍未修复）：**
```
Status  URL
404     https://duckytan.github.io/src/main.ts
404     https://duckytan.github.io/src/styles/main.css
```

### 2. 检查 gh-pages 分支内容

```bash
git checkout gh-pages
ls
```

**✅ 正确：** 看到 `index.html`、`assets/` 目录（构建产物）  
**❌ 错误：** 看到 `src/`、`package.json`、`vite.config.ts`（源代码）

### 3. 检查 GitHub Pages 设置

进入仓库 Settings → Pages：

**✅ 正确方式 1：**
- Source: **GitHub Actions**

**✅ 正确方式 2：**
- Source: Deploy from a branch
- Branch: **gh-pages** / (root)

**❌ 错误：**
- Source: Deploy from a branch
- Branch: **main** / (root)  ← 这会部署源代码

---

## 🎯 立即行动指南

### 临时修复（1 分钟）

```bash
npm run build
npx gh-pages -d dist
```

等待 1-2 分钟，刷新页面，白屏应该消失。

### 长期解决（5-10 分钟）

**选择一种方案：**

1. **方案 A（推荐）：迁移到 Vercel**
   - 访问 https://vercel.com/new
   - 导入仓库并点击 Deploy
   - 以后每次 `git push` 自动部署

2. **方案 B：配置 GitHub Actions**
   - 创建 `.github/workflows/deploy-gh-pages.yml`
   - 推送工作流文件
   - 配置 GitHub Pages Source 为 "Deploy from a branch" → "gh-pages"
   - 以后每次 `git push` 自动部署

---

## 📚 关键知识点总结

### 1. Vite 项目的两种环境

| 环境 | 命令 | 文件位置 | 浏览器访问 |
|------|------|---------|-----------|
| **开发环境** | `npm run dev` | 源代码（`src/`） | `http://localhost:5173` |
| **生产环境** | `npm run build` | 构建产物（`dist/`） | 部署到服务器后访问 |

### 2. index.html 路径转换

**开发环境 index.html：**
```html
<link rel="stylesheet" href="/src/styles/main.css" />
<script type="module" src="/src/main.ts"></script>
```

**构建后 dist/index.html（Vite 自动转换）：**
```html
<script type="module" crossorigin src="./assets/index-Hr1niCm1.js"></script>
<link rel="stylesheet" crossorigin href="./assets/index-D6Iq1H6F.css">
```

### 3. GitHub Pages 部署规则

- **只能部署静态文件**（HTML、CSS、JS、图片等）
- **不能运行 Node.js**（无法执行 Vite 开发服务器）
- **不能编译 TypeScript**（必须预先构建）

### 4. base 配置的作用

`vite.config.ts` 中：
```typescript
base: './'  // 相对路径，适用于任何路径部署
```

生成的资源路径：
```html
<script src="./assets/index.js">  <!-- 相对路径 -->
```

如果配置：
```typescript
base: '/Minecraft-Web/'  // 绝对路径，只适合固定路径
```

生成的资源路径：
```html
<script src="/Minecraft-Web/assets/index.js">  <!-- 绝对路径 -->
```

---

## 🔗 相关文档

- **[立即修复指南](GITHUB_PAGES_FIX_GUIDE.md)** - 5 分钟快速解决
- **[详细问题分析](DEPLOYMENT_ISSUE_ANALYSIS.md)** - 深入技术细节
- **[部署指南](DEPLOYMENT.md)** - 各平台部署方法
- **[快速开始](DEPLOY_QUICK_START.md)** - 非技术用户指南

---

## 💡 最后建议

**为什么必须使用自动化部署？**

手动部署的风险：
- ⚠️ 人为错误（忘记构建、推送错误内容）
- ⚠️ 重复劳动（每次都要记住命令）
- ⚠️ 团队协作困难（其他人不知道部署步骤）
- ⚠️ **这就是问题反复出现 5-6 次的根本原因**

自动化的价值：
- ✅ 一次配置，永久有效
- ✅ 每次推送自动部署，无需人工干预
- ✅ 部署过程透明（可查看日志）
- ✅ 多人协作友好
- ✅ **永久解决白屏问题**

**立即行动：**
1. 临时修复：`npm run build && npx gh-pages -d dist`
2. 长期方案：选择 Vercel 或 GitHub Actions
3. 验证修复：检查 Network 请求无 404 错误

---

**🎯 记住：问题的根源不是代码，而是缺少自动化部署流程！**
