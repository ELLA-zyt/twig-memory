# 雾尼 Muninn · 服务端接入层

把叙事记忆引擎从浏览器 demo 变成可长期运行的服务。前端 demo 完全不动，
这里复用 `src/engine` 的三层类型与 LLM 判定函数（单一事实来源），
外加一个无演示逻辑、真实持久化的无头引擎。

```
server/
  core.ts       HeadlessMuninn：碎片/线索/认知三层状态机 + 碰撞判定 + 叙事上下文包
  store.ts      JSON 文件持久化（每用户一文件，tmp+rename 原子写；可换 SQLite/Postgres）
  manager.ts    多用户引擎管理：按需加载、变更落盘
  llm-node.ts   Node 端直连 Moonshot（注入到 src/engine/llm 的传输层）
  http.ts       HTTP API（零依赖 node:http）
  mcp.ts        MCP server（stdio，Codex / Claude Code 等可直接挂载）
```

## 快速开始

```bash
npm install
npm run server:http          # http://localhost:7300
```

可选：启用实时 LLM 判定（无 key 时自动回退规则判定，全部功能仍可用）：

```bash
# .env.local 或环境变量
KIMI_API_KEY=sk-你的-Moonshot-API-Key
```

## HTTP API

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/v1/ingest` | `{ userId, text, title?, tags?[] }` 登记事件并做碰撞判定 |
| GET | `/v1/context?userId=` | 叙事上下文包，`promptText` 可直接注入宿主 agent 的 system prompt |
| GET | `/v1/state?userId=` | 完整三层状态（调试/可视化用） |
| GET | `/v1/claims?userId=` | 认知层论断列表（用户默认全透明可见） |
| POST | `/v1/contest` | `{ userId, claimId, note }` 用户否决 → contested（不删除、不假改） |
| POST | `/v1/counter` | `{ userId, claimId, text }` 矛盾响应判定（LLM，需 key） |
| GET | `/health` | 服务与判定模式（live / heuristic-only） |

## 远程 MCP（手机 App / 任意 MCP 客户端，无需装依赖）

`server:http` 启动后同时暴露两个远程 MCP 端点：

| 端点 | 传输 | 适用 |
|---|---|---|
| `/mcp` | Streamable HTTP | 新客户端优先（RikkaHub / Kelivo 新版等） |
| `/sse` | 旧版 SSE | 只支持 SSE 的客户端兜底 |

手机 App（RikkaHub、Kelivo、Operit 等）里添加「远程 MCP 服务器」，填：

```
URL:  https://你的域名/mcp        # 连不上就换 https://你的域名/sse
请求头: Authorization: Bearer 你的MUNINN_AUTH_TOKEN
```

手机上不需要安装任何东西——Node、tsx、依赖全部在服务器上。

## MCP 接入（本机桌面 agent，stdio）

```bash
npm run server:mcp
```

Codex `config.toml` 示例：

```toml
[mcp_servers.muninn]
command = "npx"
args = ["tsx", "D:/kimi/workspace/muninn/server/mcp.ts"]
# env = { KIMI_API_KEY = "sk-..." }
```

工具：`memory_ingest` / `memory_context` / `memory_list_claims` / `memory_contest_claim`。

## 部署到 Zeabur（作为记忆后端）

仓库根目录已带 `Dockerfile`，Zeabur 会自动识别：

1. 把仓库推到 GitHub，Zeabur 控制台 → Create Service → Git → 选仓库，自动构建。
2. 配置环境变量：
   - `MUNINN_AUTH_TOKEN`（强烈建议）：所有 API / MCP 请求的 Bearer 令牌
   - `KIMI_API_KEY`（可选）：启用实时 LLM 判定，不配则规则判定兜底
   - `MUNINN_DATA_DIR`：默认镜像内已设为 `/data`
3. **挂卷**：Zeabur 服务 → Volumes → 挂载一个卷到 `/data`，
   否则容器重启后记忆数据会丢（当前持久化是 JSON 文件）。
4. 绑定域名（Networking → Generate Domain），得到 `https://xxx.zeabur.app`。
5. 验证：`GET https://xxx.zeabur.app/health` 应返回 `{"ok":true,...}`。

其他平台（Railway / Render / 自有 VPS）同样适用：只要支持 Dockerfile + 注入 `PORT` 即可。

## 宿主 agent 的典型接法

1. 每轮对话结束后，把用户新表达的事实/状态变化 `memory_ingest` 给引擎。
2. 每轮对话开始前（或定期）取 `memory_context`，把 `promptText` 注入 system prompt——
   拿到的是「叙事上下文包」：进行中的线索 + 当前理解（带置信度）+ 近期事件，不是 top-k 卡片。
3. 用户要求查看/更正记忆时，用 `memory_list_claims` / `memory_contest_claim`。

## MVP 简化声明（后续迭代方向）

- 合成句暂用规则生成，碰撞预筛用字符重合度近似；embedding 到位后替换 `core.ts` 里的 `charOverlap`。
- 龙脉值按自然日衰减（0.03/天），线索被命中时回升；反刍节律（merge/split）尚未在服务端实现。
- 认知层论断的自动抽取未做——当前通过 `/v1/counter` 支持矛盾响应改写，论断创建接口待加。
- 存储为单文件 JSON，多实例部署需换共享存储。
