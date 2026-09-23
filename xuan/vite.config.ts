import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// 临水轩 · 古风前端：独立 Vite 应用，与 visualizer「记忆书」（7100）互不干扰
export default defineConfig({
  root: __dirname,
  base: "./",
  plugins: [react()],
  server: {
    port: 7101,
    // 允许引用仓库根 art/ 下的美术母版
    fs: { allow: [path.resolve(__dirname, "..")] },
    proxy: {
      // 引擎 HTTP API（npm run server:http，默认 7300）
      "/v1": { target: "http://localhost:7300", changeOrigin: true },
    },
  },
  build: { outDir: path.resolve(__dirname, "dist") },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
})
