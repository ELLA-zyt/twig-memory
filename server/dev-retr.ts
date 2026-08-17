/** HyDE 增量验证（conv-26 single-hop 70 题，真实 LLM 扩查询） */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFragments, buildRetriever, expandQuery } from './eval-locomo'
import { registerNodeTransport } from './llm-node'

registerNodeTransport()
const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(here, 'eval-data', 'locomo10.json'), 'utf8'))
const conv = data[0]
const frags = buildFragments(conv.conversation)
const retrieve = buildRetriever(frags)
const byId = new Map(frags.map((f) => [f.id, f]))
const qas = conv.qa.filter((q) => q.category === 4 && (q.evidence ?? []).some((e) => byId.has(e)))

let plain = 0, hyde = 0, n = 0
for (const q of qas) {
  const snippet = await expandQuery(q.question).catch(() => '')
  const idsPlain = new Set(retrieve(q.question, 10).map((f) => f.id))
  const idsHyde = new Set(retrieve(`${q.question} ${snippet}`, 10).map((f) => f.id))
  if ((q.evidence ?? []).some((e) => idsPlain.has(e))) plain++
  if ((q.evidence ?? []).some((e) => idsHyde.has(e))) hyde++
  n++
  await new Promise((r) => setTimeout(r, 800))
}
console.log(`conv-26 single-hop ${n} 题，证据命中 top-10：原问题 ${plain}/${n}，HyDE ${hyde}/${n}`)
