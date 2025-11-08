# 🚀 快速部署指南（给非技术用户）

这份指南会教您如何**在 5 分钟内**把这个网页版 Minecraft 游戏部署到网上，获得一个可以直接访问和分享的网址。

---

## 📋 前置条件

您只需要：
1. ✅ 一个 GitHub 账号（免费注册：https://github.com/signup）
2. ✅ 项目代码已上传到 GitHub 仓库

---

## 🎯 方式一：一键部署（最简单）

### 步骤 1：点击部署按钮

在项目的 GitHub 页面或 README.md 中，找到这个按钮并点击：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/web-minecraft)

> **注意**：请把上面链接中的 `your-username/web-minecraft` 替换成您的实际 GitHub 仓库地址。

### 步骤 2：登录 Vercel

- 选择 "Continue with GitHub"（使用 GitHub 账号登录）
- 授权 Vercel 访问您的 GitHub 仓库

### 步骤 3：选择仓库

- 在弹出的页面中选择您的游戏项目仓库
- 点击 "Import"

### 步骤 4：等待部署

- Vercel 会自动识别这是一个 Vite 项目
- 自动开始构建和部署
- 大约 30-60 秒后完成

### 步骤 5：获得网址

- 部署成功后，您会看到一个庆祝页面 🎉
- 复制显示的网址（格式：`https://xxx.vercel.app`）
- 这个网址可以直接访问和分享！

---

## 🎯 方式二：手动导入（推荐新手）

### 步骤 1：访问 Vercel

打开浏览器，访问：**https://vercel.com**

### 步骤 2：注册/登录

- 点击右上角 "Sign Up"（注册）或 "Log In"（登录）
- 选择 "Continue with GitHub"（推荐）
- 允许 Vercel 访问您的 GitHub 账号

### 步骤 3：创建新项目

- 登录后，点击右上角 "Add New..."
- 选择 "Project"
- 点击 "Import Git Repository"

### 步骤 4：选择仓库

- 在列表中找到您的游戏项目仓库
- 点击旁边的 "Import" 按钮

### 步骤 5：配置项目（通常自动识别）

Vercel 会自动填写以下内容：
- **Framework Preset**: Vite
- **Root Directory**: ./
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

**不需要修改任何设置！** 直接进入下一步。

### 步骤 6：点击 Deploy

- 点击页面底部的蓝色 "Deploy" 按钮
- 等待 30-60 秒（可以看到实时构建日志）

### 步骤 7：完成！

- 部署成功后，页面会显示 🎉 庆祝动画
- 复制显示的网址（例如：`https://web-minecraft-abc123.vercel.app`）
- **点击访问链接，开始玩游戏！**

---

## 🎮 部署后的操作

### 分享您的游戏

- 直接把 Vercel 提供的网址发给朋友
- 任何人都可以通过这个网址访问和玩游戏
- 不需要安装任何软件

### 自动更新

- 每次您在 GitHub 上更新代码（git push）
- Vercel 会自动重新构建和部署
- 网址保持不变，内容自动更新

### 自定义域名（可选）

如果您有自己的域名（如 `mygame.com`）：
1. 在 Vercel 项目设置中点击 "Domains"
2. 输入您的域名并按照指引操作
3. 添加 DNS 记录（Vercel 会提供具体步骤）

---

## ❓ 常见问题

### Q1: 部署需要付费吗？

**不需要！** Vercel 的免费套餐完全够用：
- ✅ 无限制的个人项目
- ✅ 100GB 带宽/月
- ✅ 自动 HTTPS
- ✅ 全球 CDN 加速

### Q2: 部署需要多长时间？

通常只需要 **30-60 秒**。第一次可能稍慢（1-2 分钟）。

### Q3: 如果部署失败怎么办？

1. 查看 Vercel 的构建日志（会显示错误信息）
2. 确认您的代码可以在本地正常构建（`npm run build`）
3. 检查 `package.json` 中的脚本是否正确
4. 查看详细的 [DEPLOYMENT.md](DEPLOYMENT.md) 文档

### Q4: 网址太长/太难记怎么办？

您可以：
- 在 Vercel 项目设置中修改项目名称（会改变网址）
- 使用自定义域名（需要购买域名）
- 使用短链接服务（如 bit.ly）

### Q5: 游戏可以离线玩吗？

不可以。这是一个网页应用，需要联网访问。但加载后会缓存部分资源。

### Q6: 多个人可以同时玩吗？

可以同时访问，但目前每个玩家的游戏世界是独立的（不支持多人联机）。

---

## 🆘 需要帮助？

如果您在部署过程中遇到问题：

1. **查看详细文档**: [DEPLOYMENT.md](DEPLOYMENT.md)
2. **查看 Vercel 官方文档**: https://vercel.com/docs
3. **提交 Issue**: 在 GitHub 仓库中提交问题
4. **联系开发者**: 查看项目 README 中的联系方式

---

## 🎉 恭喜！

如果您已经成功部署，现在您有了：
- ✅ 一个可以随时访问的在线游戏
- ✅ 一个可以分享给朋友的网址
- ✅ 自动部署的完整工作流

**现在就去玩吧！** 🎮

---

**提示**: 如果您是开发者，想了解更多技术细节，请查看 [DEPLOYMENT.md](DEPLOYMENT.md) 和项目的 `docs/` 目录。
