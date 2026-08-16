# 雾尼 Muninn 记忆后端（server/only，前端 demo 不参与部署）
# Zeabur 检测到 Dockerfile 后会自动构建；平台注入的 PORT 环境变量会被 http.ts 读取。
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --ignore-scripts

# 服务端只依赖 src/engine（类型 + LLM 判定函数），不拷贝整个前端
COPY src/engine ./src/engine
COPY server ./server

ENV NODE_ENV=production
ENV MUNINN_DATA_DIR=/data

EXPOSE 7300

CMD ["node", "--import", "tsx", "server/http.ts"]
