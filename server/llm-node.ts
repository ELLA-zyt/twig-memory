/**
 * Node 端 LLM 传输层：直连 Moonshot API，密钥从环境变量读取。
 * 通过 setChatTransport 注入后，src/engine/llm.ts 里的全部判定函数
 * （adjudicateFree / adjudicateClosure / adjudicateCounter）即自动走直连，
 * 前端浏览器路径（vite 代理）不受影响。
 */
import { setChatTransport } from '../src/engine/llm'
import { readFileSync } from 'node:fs'

/** 零依赖读取项目根目录 .env.local（与前端 vite 共用同一份密钥文件） */
function loadEnvLocal(): void {
  try {
    const path = new URL('../.env.local', import.meta.url)
    const text = readFileSync(path, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  } catch {
    // 文件不存在则忽略
  }
}

const TIMEOUT_MS = 15000

/** 注入直连传输层。无 KIMI_API_KEY 时返回 false，调用方应回退到规则判定。 */
export function registerNodeTransport(): boolean {
  loadEnvLocal()
  const apiKey = process.env.KIMI_API_KEY
  if (!apiKey) return false
  const model = process.env.MUNINN_MODEL || 'moonshot-v1-8k'
  const baseUrl = process.env.MUNINN_BASE_URL || 'https://api.moonshot.cn'

  setChatTransport(async (messages, opts) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: opts?.temperature ?? 0.3,
          max_tokens: opts?.maxTokens ?? 700,
          messages,
        }),
        signal: ctrl.signal,
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const text = data?.choices?.[0]?.message?.content
      if (typeof text !== 'string' || !text.trim()) throw new Error('empty response')
      return text
    } finally {
      clearTimeout(timer)
    }
  })
  return true
}
