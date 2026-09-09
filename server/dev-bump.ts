/**
 * 开发验证：思考型模型空内容自适应放大（llm-node.ts）
 * 用 tiny maxTokens 逼 GLM-5.3 思考耗尽 → 观察 max_tokens 逐级放大直至返回内容。
 * 用法：npx tsx server/dev-bump.ts
 */
import { registerNodeTransport } from './llm-node'
import { moonshotChat } from '../visualizer/engine/llm'

// 嗅探每次请求实际携带的 max_tokens，直证放大序列
const origFetch = globalThis.fetch
globalThis.fetch = (async (url: any, init: any) => {
  try {
    const b = JSON.parse(init.body)
    console.log(`[spy] max_tokens=${b.max_tokens} temp=${b.temperature} model=${b.model}`)
  } catch { /* 非 chat 请求 */ }
  return origFetch(url, init)
}) as typeof fetch

if (!registerNodeTransport()) {
  console.error('无 key，传输层未注入')
  process.exit(2)
}

const t0 = Date.now()
const text = await moonshotChat(
  [{ role: 'user', content: '逐步推理：一个三位数，个位数字是十位数字的 2 倍，百位数字比个位数字小 3，三个数字之和为 13。这个三位数是多少？最后只需给出数字。' }],
  { maxTokens: 1000, temperature: 0.1 },
)
console.log(`OK  len=${text.length}  time=${((Date.now() - t0) / 1000).toFixed(1)}s`)
console.log('内容:', text.slice(0, 150))
