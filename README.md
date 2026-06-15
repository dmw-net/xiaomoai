# 小茉 AI 学习助手 - 前端

基于 Vue 3 + TypeScript + Vite 构建的 AI 聊天应用前端。支持 SSE 流式对话、多主题切换、个人资料管理、会话管理等功能。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | 3.5.x | 渐进式 UI 框架（Composition API + `<script setup>`） |
| TypeScript | 5.6.x | 类型安全 |
| Vite | 5.4.x | 构建工具 + 开发服务器 |
| Axios | 1.7.x | HTTP 客户端（认证、REST 接口） |
| Marked | 18.x | Markdown 渲染（AI 回复） |

## 项目结构

```
ai-study-buddy-frontend/
├── index.html                  # HTML 入口（Google Fonts: Outfit + JetBrains Mono）
├── package.json                # 依赖与脚本
├── vite.config.ts              # Vite 配置（代理、双部署目标）
├── tsconfig.json               # TypeScript 配置
├── wrangler.toml               # Cloudflare Pages 部署配置
├── .env                        # 开发环境变量
├── .env.production             # 生产环境变量
├── .env.production.example     # 生产环境变量模板
└── src/
    ├── main.ts                 # 应用入口，创建 Vue 实例
    ├── App.vue                 # 根组件：登录态判断 + 主题加载
    ├── env.d.ts                # TypeScript 类型声明
    ├── styles.css              # 全局样式（含 3 套主题变量）
    ├── config/
    │   ├── api.ts              # API 配置与工具函数（base URL、token、endpoint）
    │   └── theme.ts            # 主题系统（3 种主题 + localStorage 持久化）
    └── components/
        ├── Chat.vue            # 聊天主界面（核心组件，~70KB）
        ├── Login.vue           # 登录/注册页（分屏布局 + 浮动代码动画）
        └── Icon.vue            # SVG 图标组件（12 种图标）
```

## 核心功能

### 聊天界面（Chat.vue）

- **SSE 流式对话** — 通过 `fetch` + `ReadableStream` 消费后端 SSE 流，实时逐字显示 AI 回复
- **停止生成** — `AbortController` 中断请求，保留已生成内容并追加停止提示
- **对话管理** — 侧边栏会话列表，支持新建、切换、删除（带确认弹窗）
- **消息渲染** — `marked` 解析 Markdown，支持代码块高亮 + 一键复制
- **个人资料** — 底部头像卡片，点击弹出设置面板（昵称、QQ 头像、AI 头像、主题）
- **防抖保护** — 发送按钮 800ms 防抖 + loading 锁定，删除操作 Set 去重
- **智能时间格式** — 今天显示 HH:mm、昨天显示"昨天 HH:mm"、更早显示 M/D HH:mm
- **响应式布局** — 移动端自适应，侧边栏可折叠

### 登录页（Login.vue）

- 分屏布局：表单区 + 视觉装饰区（浮动代码片段动画）
- 登录 / 注册切换，注册时可选填昵称和 QQ
- 表单验证 + 防重复提交（loading 锁定）

### 主题系统（theme.ts）

三套 UI 主题，通过 `data-theme` 属性切换，偏好保存到 localStorage：

| 主题 | 风格 |
|------|------|
| `clean` | 极简白，ChatGPT 风格，浅色背景 |
| `maximalism` | 高饱和，活力配色 |
| `cyberpunk` | 赛博朋克，霓虹色调 |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动，API 请求自动代理到后端 `http://localhost:8081`。

### 3. 确保后端运行

后端需要运行在 `http://localhost:8081`，详见后端 README。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:8081`（开发） |
| `VITE_DEPLOY_TARGET` | 部署目标 | `cloudflare`（可选 `github`） |

生产环境需配置 `VITE_API_BASE_URL` 为实际后端地址（如 `https://api.2025521.online`）。

## 构建与部署

```bash
npm run build
```

输出目录为 `dist/`。

### Cloudflare Pages 部署

项目通过 `deploy-frontend.sh` 脚本自动推送至 GitHub，Cloudflare Pages 自动触发构建部署。

在 Cloudflare Dashboard 中需要配置：

- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Environment variables**:
  - `VITE_API_BASE_URL` = 你的后端地址
  - `VITE_DEPLOY_TARGET` = `cloudflare`

### Vite 双部署目标

`vite.config.ts` 通过 `VITE_DEPLOY_TARGET` 环境变量支持两种部署方式：

- `cloudflare`（默认）— `base: /`，适用于 Cloudflare Pages 自定义域名
- `github` — `base: /ai-study-buddy-frontend/`，适用于 GitHub Pages

## 许可证

本项目仅供学习使用。
