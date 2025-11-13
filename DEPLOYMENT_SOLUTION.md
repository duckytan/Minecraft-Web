# 🔧 404 白屏问题 - 根本解决方案

## 问题描述

访问部署后的网站时出现 404 错误，无法加载以下资源：
- `main.css`
- `main.ts`
- `vite.svg`

导致页面显示空白。

## 问题根源

这是因为 **部署了源代码而不是构建产物**。

- ❌ **错误**：直接部署项目根目录（包含 `src/`、`package.json` 等源代码）
- ✅ **正确**：部署 `dist/` 目录（`npm run build` 生成的构建产物）

## 已修复的问题

### 1. 缺失的 vite.svg 文件

**问题**：`index.html` 引用了 `/vite.svg`，但项目中没有这个文件。

**修复**：
- 创建了 `public/vite.svg` 文件（Vite 默认图标）
- 修改了 `index.html` 中的路径为相对路径 `./vite.svg`
- Vite 构建时会自动将 `public/` 目录的文件复制到 `dist/`

### 2. 开发环境与生产环境的差异

**开发环境** (`npm run dev`):
- Vite 开发服务器实时编译 TypeScript
- 直接访问 `/src/main.ts` 等源文件
- 支持模块热替换（HMR）

**生产环境** (部署后):
- 需要先构建：`npm run build`
- 生成的 `dist/` 目录包含编译和打包后的文件
- `index.html` 中的路径被自动转换为 `./assets/index-xxx.js` 等

## 正确的部署流程

### 选项 A：本地构建 + 手动部署（临时方案）

```bash
# 1. 构建项目
npm install
npm run build

# 2. 确认 dist 目录已生成
ls dist/
# 应该看到：index.html  assets/  vite.svg

# 3. 部署 dist/ 目录到服务器
# 例如使用 GitHub Pages:
npx gh-pages -d dist
```

### 选项 B：Vercel 自动部署（推荐）

1. 访问 https://vercel.com/new
2. 导入你的 GitHub 仓库
3. Vercel 会自动检测到 Vite 项目并正确配置：
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 点击 Deploy
5. 以后每次 `git push` 自动重新部署

### 选项 C：GitHub Actions 自动部署

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

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

然后在 GitHub 仓库设置中：
- Settings → Pages
- Source: Deploy from a branch
- Branch: gh-pages / (root)

## 验证部署是否成功

### 1. 检查浏览器 Network 面板

打开浏览器开发者工具（F12），切换到 Network 标签，刷新页面。

✅ **正确**（部署成功）：
```
Status  URL
200     https://your-site.com/assets/index-xxx.js
200     https://your-site.com/assets/index-xxx.css
200     https://your-site.com/vite.svg
```

❌ **错误**（部署失败）：
```
Status  URL
404     https://your-site.com/src/main.ts
404     https://your-site.com/src/styles/main.css
404     https://your-site.com/vite.svg
```

### 2. 检查部署的文件结构

部署目录应该包含：
```
部署目录/
├── index.html          (包含对 ./assets/ 的引用)
├── vite.svg           (网站图标)
└── assets/
    ├── index-xxx.js   (打包后的 JavaScript)
    ├── index-xxx.css  (处理后的 CSS)
    ├── three-xxx.js   (Three.js 库)
    └── terrain.worker-xxx.js  (Web Worker)
```

## 为什么不应该手动部署

手动部署（每次 `git push` 后手动运行 `npm run build && npx gh-pages -d dist`）的问题：

1. ❌ 容易忘记运行构建命令
2. ❌ 可能推送错误的内容
3. ❌ 多人协作时容易出错
4. ❌ 这就是为什么这个问题反复出现了 5-6 次

**强烈建议使用自动化部署方案（Vercel 或 GitHub Actions）。**

## 本地开发指南

### 开发模式

```bash
npm install
npm run dev
```

- 访问 `http://localhost:5173`
- Vite 会自动处理所有源文件
- 支持热更新

### 预览生产构建

```bash
npm run build
npm run preview
```

- 访问 `http://localhost:4173`
- 模拟生产环境
- 用于测试构建产物是否正常

## 关键配置文件

### vite.config.ts

```typescript
export default defineConfig({
  base: './',  // 使用相对路径，适配任何部署路径
  // ...其他配置
});
```

### package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

## 故障排查

### 问题：部署后仍然 404

1. 确认部署的是 `dist/` 目录，不是项目根目录
2. 检查部署服务器的文件结构
3. 清除浏览器缓存并刷新
4. 等待 1-2 分钟（部署需要时间生效）

### 问题：本地开发正常，部署后白屏

- 这是典型的"部署了源代码"问题
- 按照上述正确部署流程重新部署

### 问题：构建失败

```bash
# 清理依赖并重新安装
rm -rf node_modules package-lock.json
npm install

# 类型检查
npm run type-check

# 重新构建
npm run build
```

## 总结

✅ **已修复**：
1. 添加了缺失的 `vite.svg` 文件
2. 修正了 `index.html` 中的图标路径
3. 确认构建流程正常工作

🚀 **下一步**：
- 选择一个自动化部署方案（推荐 Vercel）
- 或配置 GitHub Actions 自动部署
- 避免手动部署以防止问题再次出现

---

**记住：永远部署 `dist/` 目录，不是项目根目录！**
