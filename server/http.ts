/**
 * HTTP 接入层（零依赖 node:http）——同时承载 REST API 与远程 MCP。
 *
 * REST API：
 *   POST /v1/ingest  { userId, text, title?, tags?[] } : 登记事件并做碰撞判定
 *   GET  /v1/context?userId=  : 叙事上下文包（含可注入 system prompt 的 promptText）
 *   GET  /v1/state?userId=    : 完整三层状态（调试 / 可视化用）
 *   GET  /v1/claims?userId=   : 认知层论断列表（用户可见）
 *   POST /v1/contest { userId, claimId, note } : 用户否决 → contested（非删除）
 *   POST /v1/counter { userId, claimId, text } : 矛盾响应判定（LLM）
 *
 * 远程 MCP（手机 App / 任意 MCP 客户端直接填 URL，无需装依赖）：
 *   /mcp            Streamable HTTP（新客户端优先，如 RikkaHub / Kelivo 新版）
 *   /sse            旧版 SSE 传输（仅支持 SSE 的客户端兜底）
 *
 * GET /health
 *
 * 环境变量：
 *   PORT               默认 7300（Zeabur 等平台会自动注入）
 *   KIMI_API_KEY       可选，无则规则判定兜底
 *   MUNINN_AUTH_TOKEN  强烈建议在公网配置；配置后所有 API/MCP 请求需带
 *                      Authorization: Bearer <token> 或 ?token=<token>
 *   MUNINN_DATA_DIR    持久化目录，默认 server/data（云部署时挂卷到此路径）
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { EngineManager } from './manager'
import { registerNodeTransport } from './llm-node'
import { createMcpServer } from './mcp-server'

const PORT = Number(process.env.PORT || 7300)
const AUTH_TOKEN = process.env.MUNINN_AUTH_TOKEN || ''
const manager = new EngineManager()
const llmReady = registerNodeTransport()

const sseTransports = new Map<string, SSEServerTransport>()

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function authorized(req: IncomingMessage, url: URL): boolean {
  if (!AUTH_TOKEN) return true
  const header = req.headers.authorization ?? ''
  if (header === `Bearer ${AUTH_TOKEN}`) return true
  return url.searchParams.get('token') === AUTH_TOKEN
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { ok: true, llm: llmReady ? 'live' : 'heuristic-only', auth: !!AUTH_TOKEN })
    }

    if (!authorized(req, url)) {
      return send(res, 401, { error: 'unauthorized：缺少或错误的 MUNINN_AUTH_TOKEN' })
    }

    /* ---------- 远程 MCP：Streamable HTTP（无状态模式，每请求独立实例） ---------- */
    if (url.pathname === '/mcp') {
      const mcpServer = createMcpServer(manager)
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on('close', () => { transport.close(); mcpServer.close() })
      await mcpServer.connect(transport)
      const body = req.method === 'POST' ? await readBody(req) : undefined
      await transport.handleRequest(req, res, body)
      return
    }

    /* ---------- 远程 MCP：旧版 SSE 传输 ---------- */
    if (url.pathname === '/sse' && req.method === 'GET') {
      const mcpServer = createMcpServer(manager)
      const transport = new SSEServerTransport('/sse/messages', res)
      sseTransports.set(transport.sessionId, transport)
      res.on('close', () => {
        sseTransports.delete(transport.sessionId)
        transport.close()
        mcpServer.close()
      })
      await mcpServer.connect(transport)
      return
    }
    if (url.pathname === '/sse/messages' && req.method === 'POST') {
      const transport = sseTransports.get(url.searchParams.get('sessionId') ?? '')
      if (!transport) return send(res, 404, { error: 'unknown session' })
      const body = await readBody(req)
      await transport.handlePostMessage(req, res, body)
      return
    }

    /* ---------- REST API ---------- */
    const userId = url.searchParams.get('userId') ?? ''

    if (req.method === 'POST' && url.pathname === '/v1/ingest') {
      const body = await readBody(req)
      const uid = String(body.userId ?? '')
      const text = String(body.text ?? '')
      if (!uid || !text) return send(res, 400, { error: 'userId 和 text 必填' })
      const result = await manager.get(uid).ingest(text, {
        title: body.title ? String(body.title) : undefined,
        tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      })
      manager.persist(uid)
      return send(res, 200, result)
    }

    if (req.method === 'POST' && url.pathname === '/v1/contest') {
      const body = await readBody(req)
      const uid = String(body.userId ?? '')
      const ok = manager.get(uid).contestClaim(String(body.claimId ?? ''), String(body.note ?? ''))
      manager.persist(uid)
      return send(res, ok ? 200 : 404, { ok })
    }

    if (req.method === 'POST' && url.pathname === '/v1/counter') {
      const body = await readBody(req)
      const uid = String(body.userId ?? '')
      const result = await manager.get(uid).counterCheck(String(body.claimId ?? ''), String(body.text ?? ''))
      manager.persist(uid)
      return send(res, result.ok ? 200 : 400, result)
    }

    if (req.method === 'GET' && url.pathname === '/v1/context') {
      if (!userId) return send(res, 400, { error: 'userId 必填' })
      const packet = manager.get(userId).getContextPacket(userId)
      manager.persist(userId)
      return send(res, 200, packet)
    }

    if (req.method === 'GET' && url.pathname === '/v1/state') {
      if (!userId) return send(res, 400, { error: 'userId 必填' })
      return send(res, 200, manager.get(userId).getState())
    }

    if (req.method === 'GET' && url.pathname === '/v1/claims') {
      if (!userId) return send(res, 400, { error: 'userId 必填' })
      return send(res, 200, manager.get(userId).listClaims())
    }

    return send(res, 404, { error: 'not found' })
  } catch (err) {
    if (!res.headersSent) send(res, 500, { error: err instanceof Error ? err.message : String(err) })
    else res.end()
  }
})

server.listen(PORT, () => {
  console.log(`[muninn] HTTP ready: http://localhost:${PORT} (llm: ${llmReady ? 'live' : 'heuristic-only'}, auth: ${AUTH_TOKEN ? 'on' : 'off'})`)
})
