import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 仅从服务器端读取 .env.local；密钥不注入客户端 bundle，
  // 由 dev 代理在转发时附加 Authorization 头。
  const env = loadEnv(mode, __dirname, '')
  const apiKey = env.KIMI_API_KEY || ''

  return {
    base: './',
    plugins: [inspectAttr(), react()],
    server: {
      port: 7100,
      proxy: apiKey
        ? {
            '/moonshot': {
              target: 'https://api.moonshot.cn',
              changeOrigin: true,
              secure: true,
              rewrite: (p) => p.replace(/^\/moonshot/, ''),
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
                })
              },
            },
          }
        : undefined,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
});
