# 🚀 部署指南

本项目是一个基于 Vite + Three.js 的网页版 Minecraft 游戏，可以轻松部署到 Vercel 等平台。

---

## 📦 方式一：一键部署到 Vercel（推荐）

如果您的项目代码已经在 GitHub 上，可以使用以下方式一键部署：

### 步骤：

1. **确保代码在 GitHub 上**
   - 将项目推送到您的 GitHub 仓库

2. **点击部署按钮**
   - 在 README.md 中找到 "Deploy with Vercel" 按钮并点击
   - 或者直接访问：https://vercel.com/new
   
3. **选择仓库**
   - 登录 Vercel（可以使用 GitHub 账号）
   - 选择您的项目仓库
   
4. **确认配置**
   - Framework Preset: `Vite`（Vercel 会自动识别）
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **点击 Deploy**
   - 等待 30-60 秒
   - 获得一个 `https://xxx.vercel.app` 格式的访问地址

---

## 🌐 方式二：手动部署到 Vercel

### 1. 注册/登录 Vercel
访问 [https://vercel.com](https://vercel.com)，使用以下方式之一登录：
- GitHub 账号（推荐）
- GitLab 账号
- Bitbucket 账号
- 邮箱

### 2. 导入项目
1. 点击右上角 "Add New..." → "Project"
2. 选择 "Import Git Repository"
3. 授权 Vercel 访问您的 Git 平台
4. 选择本项目的仓库

### 3. 配置项目（通常自动识别）
- **Framework Preset**: Vite
- **Root Directory**: `./`（根目录）
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x（推荐）

### 4. 环境变量（本项目无需配置）
本项目是纯前端应用，不需要配置环境变量。

### 5. 部署
点击 "Deploy" 按钮，等待构建完成（通常 30-60 秒）。

### 6. 访问项目
部署成功后，Vercel 会提供：
- 生产环境 URL：`https://your-project.vercel.app`
- 预览 URL（每次 git push 都会生成）

---

## 🏗️ 方式三：部署到其他平台

### Netlify

1. 登录 [https://netlify.com](https://netlify.com)
2. 点击 "Add new site" → "Import an existing project"
3. 选择您的 Git 仓库
4. 配置构建设置：
   - Build command: `npm run build`
   - Publish directory: `dist`
5. 点击 "Deploy site"

### GitHub Pages

1. 在 `vite.config.ts` 中添加 base 路径：
   ```typescript
   export default defineConfig({
     base: '/your-repo-name/',
     // ... 其他配置
   })
   ```

2. 安装 gh-pages：
   ```bash
   npm install --save-dev gh-pages
   ```

3. 在 `package.json` 中添加脚本：
   ```json
   {
     "scripts": {
       "deploy": "vite build && gh-pages -d dist"
     }
   }
   ```

4. 运行部署命令：
   ```bash
   npm run deploy
   ```

5. 在 GitHub 仓库设置中启用 GitHub Pages（选择 gh-pages 分支）

### Cloudflare Pages

1. 登录 [https://pages.cloudflare.com](https://pages.cloudflare.com)
2. 点击 "Create a project"
3. 连接您的 Git 仓库
4. 配置构建设置：
   - Build command: `npm run build`
   - Build output directory: `dist`
5. 点击 "Save and Deploy"

---

## 🖥️ 本地预览

在部署前，您可以在本地预览构建结果：

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

---

## 📋 部署检查清单

在部署前，请确认：

- ✅ 代码已推送到 Git 仓库（GitHub/GitLab/Bitbucket）
- ✅ `package.json` 中包含正确的构建脚本
- ✅ `.gitignore` 已配置（排除 `node_modules`、`dist`、`coverage` 等）
- ✅ 本地构建成功（`npm run build` 无错误）
- ✅ 本地预览正常（`npm run preview` 可以访问）

---

## 🔧 常见问题

### 1. 部署后页面空白
- 检查浏览器控制台是否有错误
- 确认 `base` 路径配置正确（Vercel 通常不需要配置）
- 检查 `dist` 目录是否正确生成

### 2. Worker 文件无法加载
- 确认 `vite.config.ts` 中已配置 worker 插件
- 检查 `dist` 目录中是否包含 `*.worker.js` 文件

### 3. 构建失败
- 检查 Node.js 版本（推荐 18.x 或更高）
- 确认所有依赖已正确安装
- 查看构建日志中的错误信息

### 4. 首次加载较慢
- Three.js 库较大（约 450KB），首次加载需要一些时间
- 建议启用 CDN 加速（Vercel 默认启用）

---

## 📊 部署性能

部署后的预期性能：
- 首次加载时间：2-5 秒（取决于网络）
- 运行帧率：30-60 FPS（取决于设备）
- 总文件大小：约 490KB（gzip 压缩后约 126KB）

---

## 🆘 需要帮助？

如果在部署过程中遇到问题：

1. 查看平台的构建日志
2. 检查浏览器控制台的错误信息
3. 参考本项目的 `README.md` 和 `docs/` 目录中的文档
4. 提交 Issue 到项目仓库

---

**部署成功后，您将获得一个可以直接分享的游戏链接！🎮**
