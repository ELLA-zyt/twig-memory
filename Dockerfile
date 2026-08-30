# 衔枝 Twig · 记忆引擎 —— 服务端 + 前端一体化部署
# 阶段一：构建前端
FROM node:22-alpine AS frontend-builder
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY visualizer ./visualizer
COPY shared ./shared
COPY vite.config.ts tsconfig.json tsconfig.app.json ./
# 如果项目在根目录构建（npm run build），需要全部源码
COPY . .

ENV VITE_API_BASE=
RUN npm run build

# 阶段二：服务端运行镜像
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY visualizer/engine ./visualizer/engine
COPY shared ./shared
COPY server ./server
# 把前端构建产物复制到 public/ 目录，服务端 http.ts 会静态托管
COPY --from=frontend-builder /build/dist ./public

ENV NODE_ENV=production
ENV MUNINN_DATA_DIR=/data

USER node

EXPOSE 7300

CMD ["node", "--import", "tsx", "server/http.ts"]
