/**
 * AML LoCoMo 本地彩排回放
 *
 * 把 LoCoMo 对话按平台分段规则写入 AML 服务，再逐题检索并统计金标命中率。
 * 可选 --answer 调用 eval-locomo 的 answerBatch/judge 算完整代理分（需要 LLM key）。
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadEnvLocal, registerNodeTransport } from './llm-node.ts'
import {
  buildFragments,
  parseLocoDate,
  CATEGORY_NAMES,
  aggregate,
  answerBatch,
  judgeBatch,
  type Frag,
} from './eval-locomo.ts'

loadEnvLocal()
const llmReady = registerNodeTransport()

const here = dirname(fileURLToPath(import.meta.url))
const DATA = join(here, 'eval-data', 'locomo10.json')
const BASE = process.env.AML_BASE_URL || 'http://localhost:7301'
const TOKEN = process.env.AML_AUTH_TOKEN || ''

interface Turn { speaker: string; dia_id: string; text: string }
interface QA { question: string; answer?: string; adversarial_answer?: string; category: number; evidence?: string[] }
interface Conv { sample_id: string; conversation: Record<string, unknown>; qa: QA[] }

const K_LIST = [10, 20, 50, 100] as const
interface HitRecord { category: number; hits: Record<(typeof K_LIST)[number], number>; latency: number }
interface AnswerItem { question: string; frags: Frag[]; gold: string; pred: string }

function parseArgs(): { convos: number; answer: boolean; runLabel: string; offset: number } {
  const args = process.argv.slice(2)
  let convos = 1
  const ci = args.indexOf('--convos')
  if (ci >= 0) convos = Number(args[ci + 1]) || 1
  let offset = 0
  const oi = args.indexOf('--offset')
  if (oi >= 0) offset = Number(args[oi + 1]) || 0
  const li = args.indexOf('--run-label')
  const runLabel = li >= 0 ? String(args[li + 1] || '').replace(/[^a-zA-Z0-9_-]/g, '_') || `t${Date.now()}` : `t${Date.now()}`
  return { convos: Math.max(1, Math.min(10, convos)), answer: args.includes('--answer'), runLabel, offset: Math.max(0, Math.min(9, offset)) }
}

async function request(method: string, path: string, body?: unknown): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let resBody: unknown = null
  try { resBody = await resp.json() } catch { /* ignore */ }
  return { status: resp.status, body: resBody }
}

function splitChunks(turns: Turn[]): Turn[][] {
  const chunks: Turn[][] = []
  let current: Turn[] = []
  let count = 0
  let words = 0
  for (const t of turns) {
    const w = t.text.split(/\s+/).length
    if (current.length > 0 && (count + 1 > 20 || words + w > 2000)) {
      chunks.push(current)
      current = [t]
      count = 1
      words = w
    } else {
      current.push(t)
      count++
      words += w
    }
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`
}

async function main(): Promise<void> {
  const { convos, answer, runLabel, offset } = parseArgs()

  if (!existsSync(DATA)) {
    console.error(`[aml-replay] 缺数据：${DATA}`)
    console.error(`  curl -sL https://raw.githubusercontent.com/snap-research/locomo/main/data/locomo10.json -o "${DATA}"`)
    process.exit(2)
  }

  const data = JSON.parse(readFileSync(DATA, 'utf8')) as Conv[]
  console.log(`[aml-replay] run=${runLabel} · 回话 ${convos}/10 · LLM ${llmReady ? 'live' : 'OFFLINE'} · --answer ${answer ? 'on' : 'off'}\n`)

  const allHits: HitRecord[] = []
  const answerRecords: { category: number; question: string; gold: string; pred: string }[] = []

  for (let i = offset; i < Math.min(offset + convos, data.length); i++) {
    const conv = data[i]
    const userId = `replay:${runLabel}:conv-${i}`
    const conversation = conv.conversation
    const speakerA = conversation.speaker_a as string

    const localFrags = buildFragments(conversation)
    const fragByDiaId = new Map(localFrags.map((f) => [f.id, f]))
    const idMap = new Map<string, string>() // aml id -> dia_id

    const sessionKeys = Object.keys(conversation)
      .filter((k) => /^session_\d+$/.test(k))
      .sort((a, b) => Number(a.slice(8)) - Number(b.slice(8)))

    let seq = 0
    let totalTurns = 0
    let chunkCount = 0

    for (const sessionKey of sessionKeys) {
      const dateRaw = conversation[`${sessionKey}_date_time`]
      const date = parseLocoDate(typeof dateRaw === 'string' ? dateRaw : '')
      const ts = new Date(`${date}T12:00:00Z`).getTime()
      const turns = conversation[sessionKey] as Turn[]
      totalTurns += turns.length
      const chunks = splitChunks(turns)

      for (const chunk of chunks) {
        const sessionId = `replay:${runLabel}:conv-${i}:session_${chunkCount}`
        const messages = chunk.map((t) => ({
          role: t.speaker === speakerA ? 'user' : 'assistant',
          content: t.text,
          timestamp: ts,
        }))
        for (let off = 0; off < chunk.length; off++) {
          idMap.set(`${sessionId}#${seq + off}`, chunk[off].dia_id)
        }

        const requestId = `replay:${runLabel}:conv-${i}:chunk-${chunkCount}`
        const { status, body } = await request('POST', '/aml/add', {
          request_id: requestId,
          messages,
          user_id: userId,
          session_id: sessionId,
        })
        if (status !== 200 || (body as Record<string, unknown>).success !== true) {
          console.error(`[aml-replay] add 失败：conv=${i} chunk=${chunkCount} status=${status} body=${JSON.stringify(body)}`)
          process.exit(1)
        }

        seq += chunk.length
        chunkCount++
      }
    }

    const qas = conv.qa
    console.log(`--- 会话 conv-${i}（${conv.sample_id}）：${totalTurns} 碎片，${chunkCount} 分段，${qas.length} 题 ---`)

    const convLatencies: number[] = []
    for (let qi = 0; qi < qas.length; qi++) {
      const qa = qas[qi]
      const start = Date.now()
      const { status, body } = await request('POST', '/aml/search', {
        query: qa.question,
        user_id: userId,
        top_k: 100,
      })
      const latency = Date.now() - start
      convLatencies.push(latency)

      if (status !== 200) {
        console.error(`[aml-replay] search 失败：conv=${i} qi=${qi} status=${status}`)
        process.exit(1)
      }

      const dataArr = Array.isArray((body as Record<string, unknown>).data)
        ? (body as Record<string, unknown>).data as { id: string }[]
        : []
      const diaIds = dataArr
        .map((r) => idMap.get(r.id))
        .filter((id): id is string => typeof id === 'string')
      const evidence = qa.evidence ?? []
      const hits: Record<(typeof K_LIST)[number], number> = { 10: 0, 20: 0, 50: 0, 100: 0 }
      if (evidence.length > 0) {
        for (const topK of K_LIST) {
          const topIds = diaIds.slice(0, topK)
          if (evidence.some((e) => topIds.includes(e))) hits[topK] = 1
        }
      }
      allHits.push({ category: qa.category, hits, latency })

      if (answer) {
        const frags = diaIds.map((id) => fragByDiaId.get(id)).filter((f): f is Frag => !!f)
        const pred = '' // 稍后批量填充
        answerRecords.push({
          category: qa.category,
          question: qa.question,
          gold: qa.answer ?? `(adversarial trap: ${qa.adversarial_answer ?? '—'})`,
          pred,
        })
        // 临时把 frags 挂到记录上以便批量作答
        ;(answerRecords[answerRecords.length - 1] as unknown as { frags: Frag[] }).frags = frags
      }

      if ((qi + 1) % 50 === 0) console.log(`  已检索 ${qi + 1}/${qas.length}`)
    }

    const avgLatency = convLatencies.reduce((a, b) => a + b, 0) / convLatencies.length
    const maxLatency = Math.max(...convLatencies)
    console.log(`  search 平均 ${formatLatency(avgLatency)} · 最大 ${formatLatency(maxLatency)}`)
  }

  // 按 category 统计命中率（hit@10/20/50/100）
  function buildStats(topK: (typeof K_LIST)[number]) {
    const byCat = new Map<number, { hit: number; total: number }>()
    for (const h of allHits) {
      const t = byCat.get(h.category) ?? { hit: 0, total: 0 }
      t.total++
      t.hit += h.hits[topK]
      byCat.set(h.category, t)
    }
    return byCat
  }

  for (const topK of K_LIST) {
    const byCat = buildStats(topK)
    console.log(`\n===== 金标命中率 hit@${topK}（按 category）=====`)
    let totalHit = 0
    for (const [code, { hit, total }] of [...byCat.entries()].sort((a, b) => a[0] - b[0])) {
      const acc = total > 0 ? hit / total : 0
      totalHit += hit
      console.log(`  ${(CATEGORY_NAMES[code] ?? `cat${code}`).padEnd(12)} ${hit}/${total} = ${acc.toFixed(4)}`)
    }
    console.log(`  总体 ${totalHit}/${allHits.length} = ${(allHits.length > 0 ? totalHit / allHits.length : 0).toFixed(4)}`)
  }

  // --answer：批量作答/判分
  if (answer) {
    if (!llmReady) {
      console.log('\n[aml-replay] --answer 已指定但无 LLM key（MUNINN_API_KEY / KIMI_API_KEY），跳过作答判分')
    } else {
      console.log('\n[aml-replay] 作答阶段...')
      const records = answerRecords as unknown as (AnswerItem & { category: number; question: string; gold: string; pred: string })[]
      const preds: string[] = []
      for (let i = 0; i < records.length; i += 5) {
        const chunk = records.slice(i, i + 5)
        try {
          const answers = await answerBatch(chunk.map((r) => ({ question: r.question, frags: r.frags })))
          preds.push(...answers)
        } catch (err) {
          console.error(`[aml-replay] answer 批失败(${i}..${i + chunk.length})：`, err instanceof Error ? err.message : err)
          preds.push(...chunk.map(() => '__LLM_FAILED__'))
        }
      }
      records.forEach((r, i) => { r.pred = preds[i] })

      console.log('[aml-replay] 判分阶段...')
      const judged: { category: number; correct: number }[] = []
      const cats = [...new Set(records.map((r) => r.category))].sort((a, b) => a - b)
      for (const cat of cats) {
        const idx = records.map((r, i) => ({ r, i })).filter((x) => x.r.category === cat).map((x) => x.i)
        for (let i = 0; i < idx.length; i += 5) {
          const chunk = idx.slice(i, i + 5)
          try {
            const scores = await judgeBatch(cat, chunk.map((j) => ({
              question: records[j].question,
              gold: records[j].gold,
              pred: records[j].pred,
            })))
            chunk.forEach((j, c) => judged.push({ category: records[j].category, correct: scores[c] }))
          } catch (err) {
            console.error(`[aml-replay] judge 批失败(cat=${cat}, ${i}..${i + chunk.length})：`, err instanceof Error ? err.message : err)
            chunk.forEach((j) => judged.push({ category: records[j].category, correct: 0 }))
          }
        }
      }

      const { stats, overall, overallBar, overallPass } = aggregate(judged)
      console.log('\n===== 代理分（LLM judge）=====')
      for (const s of stats) {
        const bar = s.bar !== null ? `  及格线 ${s.bar.toFixed(3)} → ${s.pass ? 'PASS' : 'FAIL'}` : '  （adversarial 单列）'
        console.log(`  ${s.cat.padEnd(12)} ${s.correct}/${s.total} = ${s.acc.toFixed(4)}${bar}`)
      }
      console.log(`  总分 ${overall.toFixed(4)} / 及格线 ${overallBar.toFixed(4)} → ${overallPass ? 'PASS' : 'FAIL'}`)
    }
  }

  const avgAll = allHits.reduce((s, h) => s + h.latency, 0) / allHits.length
  const maxAll = Math.max(...allHits.map((h) => h.latency))
  console.log(`\n[aml-replay] 平均 search 耗时 ${formatLatency(avgAll)} · 最大 ${formatLatency(maxAll)}`)
}

main().catch((err) => {
  console.error('[aml-replay] 未处理异常：', err)
  process.exit(1)
})
