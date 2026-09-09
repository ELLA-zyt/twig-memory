/**
 * Node 端 LLM 传输层：直连 Moonshot API，密钥从环境变量读取。
 * 通过 setChatTransport 注入后，visualizer/engine/llm.ts 里的全部判定函数
 * （adjudicateFree / adjudicateClosure / adjudicateCounter）即自动走直连，
 * 前端浏览器路径（vite 代理）不受影响。
 * 自适应：思考型模型空内容（reasoning 耗尽 max_tokens，含 GLM-5.3 不报 finish_reason=length 的形态）自动 2x 重试至 16000 封顶；
 * 末次尝试附加 reasoning_effort=low 刹车——计数类题 GLM-5.3 思考链会无限枚举验算、吃光任意预算（实测 16000 仍空，低强度 13 token 即答对）
 */
import { setChatTransport } from '../visualizer/engine/llm'
import { readFileSync } from 'node:fs'

/** 零依赖读取项目根目录 .env.local（与前端 vite 共用同一份密钥文件） */
export function loadEnvLocal(): void {
  try {
    const path = new URL('../.env.local', import.meta.url)
    const text = readFileSync(path, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!m) continue
      let val = m[2].trim()
      // 引号外的 # 截断为注释
      if (!val.startsWith('"') && !val.startsWith("'")) {
        const hashIdx = val.indexOf('#')
        if (hashIdx >= 0) val = val.slice(0, hashIdx).trim()
      }
      // strip 首尾匹配的引号
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[m[1]]) process.env[m[1]] = val
    }
  } catch {
    // 文件不存在则忽略
  }
}

/** 批量作答 prompt 较长（k×碎片 × 5 题），且异源模型可能是慢思考型，超时给足 */
const TIMEOUT_MS = 180000
/** 429 指数退避：5s / 10s / 20s / 40s（免费档 RPM 低，评测或反刍连发时会被限流） */
const RETRY_BASE_MS = 5000
const MAX_RETRIES = 4

/** 注入直连传输层。无可用 key 时返回 false，调用方应回退到规则判定。
 *  key 读取顺序：MUNINN_API_KEY（任意 OpenAI 兼容方）→ KIMI_API_KEY（历史命名） */
export function registerNodeTransport(): boolean {
  loadEnvLocal()
  const apiKey = process.env.MUNINN_API_KEY || process.env.KIMI_API_KEY
  if (!apiKey) return false
  // moonshot-v1-8k 已于 2026-09 被 Moonshot 退役（resource_not_found_error），缺省改用现役模型
  const model = process.env.MUNINN_MODEL || 'kimi-k2.6'
  // 归一化：容忍用户把 base 写成 .../v1（代码会自行拼接 /v1/chat/completions）
  const baseUrl = (process.env.MUNINN_BASE_URL || 'https://api.moonshot.cn').replace(/\/+$/, '').replace(/\/v1$/, '')
  // 火山方舟网关（/api/v3、Agent Plan /api/plan/v3）自带版本段，OpenAI 路径不再挂 /v1
  const chatPath = /\/api\/(plan\/)?v\d+$/.test(baseUrl) ? '/chat/completions' : '/v1/chat/completions'

  setChatTransport(async (messages, opts) => {
    let lastErr: unknown = null
    let adaptiveMax = opts?.maxTokens
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** (attempt - 1)))
      const adaptiveTimeout = Math.max(TIMEOUT_MS, adaptiveMax ? adaptiveMax * 30 : 0)
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), adaptiveTimeout)
      try {
        const resp = await fetch(`${baseUrl}${chatPath}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            // 按调用覆盖（异源反证生成的第二模型），缺省回落默认模型
            model: opts?.model || model,
            // 思考型模型只接受 temperature=1（kimi-k2.6 实测 400：invalid temperature）；其余按调用传入
            temperature: /^(kimi-k2|kimi-k3|MiniMax-M)/.test(opts?.model || model) ? 1 : (opts?.temperature ?? 0.3),
            max_tokens: adaptiveMax ?? 3000,
            // 末次尝试的思考链刹车：前面放大仍空 = 思考链空转（计数类枚举验算循环），
            // 低推理强度强制收尾；前 MAX_RETRIES 次保持全强度不影响正常题质量
            ...(attempt === MAX_RETRIES ? { reasoning_effort: 'low' } : {}),
            messages,
          }),
          signal: ctrl.signal,
        })
        if (resp.status === 429 && attempt < MAX_RETRIES) {
          lastErr = new Error('HTTP 429（限流）')
          continue
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data: any = await resp.json()
        const raw = data?.choices?.[0]?.message?.content
        const finishReason = data?.choices?.[0]?.finish_reason
        const reasoningTokens = data?.usage?.completion_tokens_details?.reasoning_tokens ?? 0
        // 思考型模型（如 MiniMax-M3）会在 content 内联 <think>…</think>，先剥离再判空
        const text = typeof raw === 'string' ? raw.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim() : ''
        if (!text) {
          // 空内容一律按预算耗尽放大重试：GLM-5.3 思考吃光 max_tokens 时网关未必回
          // finish_reason=length 或 reasoning_tokens，窄守卫会在原预算上空转重试（实测 answer 批连续撞墙）
          adaptiveMax = Math.min((adaptiveMax ?? 3000) * 2, 16000)
          if (attempt < MAX_RETRIES) {
            lastErr = new Error(`empty response（finish=${finishReason} reasoning=${reasoningTokens}），重试 max_tokens=${adaptiveMax}`)
            continue
          }
          throw new Error(`empty response（finish=${finishReason} reasoning=${reasoningTokens}，max_tokens 已升至 ${adaptiveMax} 仍空）`)
        }
        return text
      } catch (err) {
        lastErr = err
        // 4xx（非 429）是请求本身有问题，重试无意义，立即抛；网络/超时/思考截断按瞬态退避重试
        if (err instanceof Error && /^HTTP 4\d\d/.test(err.message)) throw err
        if (attempt >= MAX_RETRIES) throw err
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastErr ?? new Error('LLM 调用失败')
  })
  return true
}
