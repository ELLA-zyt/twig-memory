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
/** 429 指数退避：5s / 10s / 20s / 40s（免费档 RPM 低，评测或反刍连发时会被限流） */
const RETRY_BASE_MS = 5000
const MAX_RETRIES = 4

/** 注入直连传输层。无 KIMI_API_KEY 时返回 false，调用方应回退到规则判定。 */
export function registerNodeTransport(): boolean {
  loadEnvLocal()
  const apiKey = process.env.KIMI_API_KEY
  if (!apiKey) return false
  const model = process.env.MUNINN_MODEL || 'moonshot-v1-8k'
  const baseUrl = process.env.MUNINN_BASE_URL || 'https://api.moonshot.cn'

  setChatTransport(async (messages, opts) => {
    let lastErr: unknown = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** (attempt - 1)))
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
            // 按调用覆盖（异源反证生成的第二模型），缺省回落默认模型
            model: opts?.model || model,
            temperature: opts?.temperature ?? 0.3,
            max_tokens: opts?.maxTokens ?? 700,
            messages,
          }),
          signal: ctrl.signal,
        })
        if (resp.status === 429 && attempt < MAX_RETRIES) {
          lastErr = new Error('HTTP 429（限流）')
          continue
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        const text = data?.choices?.[0]?.message?.content
        if (typeof text !== 'string' || !text.trim()) throw new Error('empty response')
        return text
      } catch (err) {
        lastErr = err
        throw err
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastErr ?? new Error('LLM 调用失败')
  })
  return true
}
