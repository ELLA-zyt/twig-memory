/**
 * Node 端向量嵌入传输层：直连硅基流动（SiliconFlow）embeddings API，OpenAI 兼容。
 * 密钥从环境变量读取（SF_API_KEY / SILICONFLOW_API_KEY）。
 *
 * 磁盘缓存（eval-data/embed-cache.json，key = model:sha1(text)）：
 * LoCoMo 反复重跑时碎片文本不变，嵌入只付一次钱、只等一次网络。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnvLocal } from './llm-node'
import { setEmbedFn } from './core'

const TIMEOUT_MS = 60000
const RETRY_BASE_MS = 5000
const MAX_RETRIES = 4
const BATCH_SIZE = 64

const here = dirname(fileURLToPath(import.meta.url))
/** 缓存路径惰性解析（MUNINN_EMBED_CACHE 可覆盖；须在 loadEnvLocal 之后读取，故不作为模块级常量） */
const cacheFile = (): string => process.env.MUNINN_EMBED_CACHE || join(here, 'eval-data', 'embed-cache.json')

let cache: Record<string, number[]> | null = null
let cacheDirty = false

function cacheLoad(): Record<string, number[]> {
  if (cache) return cache
  try {
    cache = existsSync(cacheFile()) ? (JSON.parse(readFileSync(cacheFile(), 'utf8')) as Record<string, number[]>) : {}
  } catch {
    cache = {}
  }
  return cache
}

function cacheSave(): void {
  if (!cacheDirty || !cache) return
  mkdirSync(dirname(cacheFile()), { recursive: true })
  writeFileSync(cacheFile(), JSON.stringify(cache), 'utf8')
  cacheDirty = false
}

const cacheKey = (model: string, text: string): string =>
  `${model}:${createHash('sha1').update(text).digest('hex')}`

/** 配置就绪（有 key）才算可用；调用方无 key 时应回退到纯 BM25 */
export function embeddingsAvailable(): boolean {
  loadEnvLocal()
  return !!(process.env.SF_API_KEY || process.env.SILICONFLOW_API_KEY)
}

/** 把向量召回注入引擎核心（core.ts 的碰撞候选排序）。无 SF key 返回 false，引擎保持龙脉排序 */
export function registerEmbedProvider(): boolean {
  if (!embeddingsAvailable()) return false
  setEmbedFn(embedTexts)
  return true
}

const normalize = (v: number[]): number[] => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => x / n)
}

async function embedBatch(texts: string[], model: string, baseUrl: string, apiKey: string): Promise<number[][]> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** (attempt - 1)))
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const resp = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, input: texts }),
        signal: ctrl.signal,
      })
      if ((resp.status === 429 || resp.status >= 500) && attempt < MAX_RETRIES) {
        lastErr = new Error(`HTTP ${resp.status}（嵌入限流/服务端错误，退避重试）`)
        continue
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const rows = data?.data
      if (!Array.isArray(rows) || rows.length !== texts.length) throw new Error('嵌入响应条数不符')
      // OpenAI 兼容返回按 index 排序对齐输入
      const sorted = [...rows].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      return sorted.map((r) => {
        if (!Array.isArray(r?.embedding)) throw new Error('嵌入响应缺 embedding 字段')
        return normalize(r.embedding as number[])
      })
    } catch (err) {
      lastErr = err
      if (attempt >= MAX_RETRIES) break
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastErr ?? new Error('嵌入调用失败')
}

/** 批量嵌入（自动分块 + 磁盘缓存 + 单位化，cosine 直接点积）。无 key 时抛错，调用方先 embeddingsAvailable() 探活 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  loadEnvLocal()
  const apiKey = process.env.SF_API_KEY || process.env.SILICONFLOW_API_KEY
  if (!apiKey) throw new Error('缺 SF_API_KEY / SILICONFLOW_API_KEY')
  const model = process.env.MUNINN_EMBED_MODEL || 'BAAI/bge-m3'
  const baseUrl = (process.env.SF_BASE_URL || 'https://api.siliconflow.cn').replace(/\/+$/, '').replace(/\/v1$/, '')

  const store = cacheLoad()
  const out: (number[] | null)[] = texts.map((t) => store[cacheKey(model, t)] ?? null)
  const pending: { i: number; text: string }[] = []
  out.forEach((v, i) => { if (!v) pending.push({ i, text: texts[i] }) })
  if (pending.length > 0) {
    console.log(`[embed] ${texts.length} 条文本，缓存命中 ${texts.length - pending.length}，待嵌入 ${pending.length}（model=${model}）`)
    for (let b = 0; b < pending.length; b += BATCH_SIZE) {
      const chunk = pending.slice(b, b + BATCH_SIZE)
      const vecs = await embedBatch(chunk.map((c) => c.text), model, baseUrl, apiKey)
      chunk.forEach((c, j) => {
        store[cacheKey(model, c.text)] = vecs[j]
        out[c.i] = vecs[j]
      })
      cacheDirty = true
      cacheSave() // 每批落盘：中途崩溃不丢已付过费的向量
    }
  }
  return out as number[][]
}
