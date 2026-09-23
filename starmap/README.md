# 星图独立服务

使用 Node.js 22 或更新版本，无需 npm 依赖或前端构建。

## 路由

- `GET /`、`GET /index.html`：星图页面（也支持 HEAD）。
- `/v1/*`：代理到 `BACKEND_URL`，保留路径、查询参数、方法、请求体及 Authorization。
- 其他地址：返回 JSON 404，不回退到 HTML。

后端的状态码、内容类型和正文直接传回，包括 401。代理连接失败返回 JSON 502，超时返回 JSON 504；响应已经开始后发生中断则关闭连接。不会自动跟随后端重定向，也不会记录请求令牌。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `BACKEND_URL` | 必填，后端基础地址，如 `https://backend.example.com`。不含账号密码、子路径、查询参数或片段。不要填星图自身地址。 |
| `PORT` | 监听端口，默认 8080；读取平台注入值，监听 0.0.0.0。 |
| `PROXY_TIMEOUT_MS` | 单次代理请求总时限，默认 120000 毫秒；需要较长反刍请求时可按需调整。 |

后端地址只在服务端使用，不注入页面。访问令牌由用户在页面输入，沿用原有浏览器 localStorage 保存方式；浏览器及其使用者仍能访问这个令牌。不要将真实令牌写入源码、镜像或此文档。

## Zeabur 配置

仅修改星图服务：

1. 将 Root Directory（构建根目录）设为 `starmap`，使用此目录的 Dockerfile；不要使用仓库根 Dockerfile 或静态站点部署模式。
2. 配置 `BACKEND_URL` 为现有后端基础地址，公网地址使用 HTTPS。
3. 使用平台 PORT 配置并绑定星图域名。
4. 打开首页，输入对应用户 ID 和后端访问令牌，加载数据。

无需调整现有后端、记忆书服务或跨域配置。此目录的容器只提供星图与代理，不保存记忆数据。

## 本地验证（PowerShell，在仓库根目录运行）

先启动现有后端，再运行：

```powershell
$env:BACKEND_URL = 'http://127.0.0.1:7300'
$env:PORT = '8080'
node starmap/server.mjs
```

访问 `http://localhost:8080/`，不要直接以 file:// 打开 HTML。后端启用鉴权时，空令牌应返回 401，正确令牌应加载成功。默认用户 ID 为 muqiu，需要与后端数据对应。

Docker 构建上下文必须为此目录，例如在仓库根运行 `docker build -t twig-starmap ./starmap`。无需修改根目录 package.json 或锁文件。
