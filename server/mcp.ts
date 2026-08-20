/**
 * MCP 接入层（stdio 入口）：本机桌面 agent（Codex / Claude Code）挂载用。
 * 手机等远程客户端请改用 http.ts 提供的 /mcp（Streamable HTTP）与 /sse 端点。
 *
 * 配置示例（Codex config.toml）：
 *   [mcp_servers.muninn]
 *   command = "npx"
 *   args = ["tsx", "D:/kimi/workspace/muninn/server/mcp.ts"]
 *   env = { KIMI_API_KEY = "sk-..." }   # 可选，无则规则判定兜底
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { EngineManager } from './manager'
import { registerNodeTransport } from './llm-node'
import { registerEmbedProvider } from './embed-node'
import { createMcpServer } from './mcp-server'

const manager = new EngineManager()
registerNodeTransport()
registerEmbedProvider()

const server = createMcpServer(manager)
await server.connect(new StdioServerTransport())
