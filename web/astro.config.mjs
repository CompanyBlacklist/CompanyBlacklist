import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://companyblacklist.github.io', // 生产环境 URL，指向 GitHub Pages
  base: '/CompanyBlacklist', // 子路径部署配置
  integrations: [
    tailwind(),
    sitemap({
      // 配置 sitemap
      filter: (page) => page !== 'https://companyblacklist.github.io/CompanyBlacklist/404/',
    }),
  ],
  // 性能优化配置
  build: {
    // 启用代码分割
    split: true,
    // 最小化 HTML
    minify: true,
    // 生成源映射（用于调试，生产环境可关闭）
    sourcemap: false,
  },
  // 完全禁用图像优化，避免sharp相关的Go语言日志
  image: {
    // 禁用图像服务，完全避免使用sharp
    enabled: false,
  },
  // Vite 配置
  vite: {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    // 构建优化
    build: {
      // 启用 CSS 代码分割
      cssCodeSplit: true,
      // 启用压缩（使用内置的 esbuild，更快且无需额外依赖）
      minify: 'esbuild',
      // 代码分割配置
      rollupOptions: {
        output: {
          manualChunks: {
            // 分离第三方库
            'vendor': ['minisearch'],
          },
        },
      },
    },
    // 开发环境优化
    optimizeDeps: {
      // 预构建依赖
      include: ['minisearch'],
    },
  },
});
