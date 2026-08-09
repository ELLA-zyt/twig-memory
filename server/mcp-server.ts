/**
 * MCP server 工厂：工具注册的唯一事实来源。
 * stdio 入口（mcp.ts）与 HTTP 远程端点（http.ts 的 /mcp、/sse）共用。
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { EngineManager } from './manager'

export function createMcpServer(manager: EngineManager): McpServer {
  const server = new McpServer({ name: 'muninn-memory', version: '0.1.0' })

  server.registerTool(
    'memory_ingest',
    {
      description: '登记一条用户事件到叙事记忆引擎：建立碎片、与既有线索做碰撞判定（回收/推进/弱信号/新线索），状态持久化。',
      inputSchema: {
        userId: z.string().describe('用户标识，按用户隔离记忆'),
        text: z.string().describe('事件内容（用户原话或摘要）'),
        title: z.string().optional().describe('短标题，缺省取正文前 16 字'),
        tags: z.array(z.string()).optional().describe('情境标签'),
      },
    },
    async ({ userId, text, title, tags }) => {
      const result = await manager.get(userId).ingest(text, { title, tags })
      manager.persist(userId)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  server.registerTool(
    'memory_context',
    {
      description: '取该用户的叙事上下文包：进行中的线索、对用户的当前理解（带置信度）、近期事件。promptText 字段可直接注入 system prompt。',
      inputSchema: { userId: z.string().describe('用户标识') },
    },
    async ({ userId }) => {
      const packet = manager.get(userId).getContextPacket(userId)
      manager.persist(userId)
      return { content: [{ type: 'text', text: JSON.stringify(packet, null, 2) }] }
    },
  )

  server.registerTool(
    'memory_list_claims',
    {
      description: '列出认知层全部论断（含版本史与反证），记忆对用户默认全透明可见。',
      inputSchema: { userId: z.string().describe('用户标识') },
    },
    async ({ userId }) => {
      return { content: [{ type: 'text', text: JSON.stringify(manager.get(userId).listClaims(), null, 2) }] }
    },
  )

  server.registerTool(
    'memory_contest_claim',
    {
      description: '用户否决某条论断：不删除、不假改，降级为 contested 并记录用户的注记。诠释层用户有最终解释权。',
      inputSchema: {
        userId: z.string().describe('用户标识'),
        claimId: z.string().describe('论断 ID'),
        note: z.string().describe('用户的否决理由'),
      },
    },
    async ({ userId, claimId, note }) => {
      const ok = manager.get(userId).contestClaim(claimId, note)
      manager.persist(userId)
      return { content: [{ type: 'text', text: ok ? `claim ${claimId} 已标记为 contested` : `claim ${claimId} 不存在` }] }
    },
  )

  return server
}
