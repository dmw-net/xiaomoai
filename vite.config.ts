/**
 * vite.config.ts - Vite 构建工具配置文件
 *
 * 支持两种部署模式：
 * 1. GitHub Pages：base='/ai-study-buddy-frontend/', outDir='docs'
 * 2. Cloudflare Pages：base='/', outDir='dist'（推荐）
 *
 * 通过环境变量 VITE_DEPLOY_TARGET 切换：
 *   - "cloudflare" → Cloudflare Pages 模式
 *   - 其他 / 未设置 → GitHub Pages 模式（默认）
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 从 .env 文件读取后端地址，默认 localhost:8081
const API_TARGET = process.env.VITE_API_BASE_URL || 'http://localhost:8081';

// 部署目标：cloudflare（默认）或 github-pages
const DEPLOY_TARGET = process.env.VITE_DEPLOY_TARGET || 'cloudflare';

// 根据部署目标配置 base 和 outDir
const isCloudflare = DEPLOY_TARGET === 'cloudflare';

export default defineConfig({
  build: {
    // Cloudflare Pages 使用 dist/，GitHub Pages 使用 docs/
    outDir: 'dist'
  },
  plugins: [vue()],
  // Cloudflare Pages 使用根路径部署，GitHub Pages 使用项目路径
  base: isCloudflare ? '/' : '/ai-study-buddy-frontend/',
  server: {
    port: 5173,
    /**
     * 代理配置：解决开发环境跨域
     * 前端请求 /api/xxx -> Vite 转发到后端
     * 修改 .env 中的 VITE_API_BASE_URL 即可切换后端地址
     */
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      }
    }
  }
});