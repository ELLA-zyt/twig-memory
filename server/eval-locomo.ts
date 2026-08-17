/**
 * 衔枝评测 · LoCoMo 事实底盘基线（设计文档 §6.4 · 设计债务⑨）
 *
 * 数据：snap-research/locomo 的 data/locomo10.json（10 个超长双人对话，1986 QA）
 * 下载：curl -sL https://raw.githubusercontent.com/snap-research/locomo/main/data/locomo10.json
 *       -o server/eval-data/locomo10.json
 *
 * 管线（事实底盘 = 碎片层 + 检索，不经过叙事层——LoCoMo 测的是「记不记得」，不是「理解了吗」）：
 *   1. 每个对话的全部轮次（含双方发言）→ 碎片（带 session 日期，零 LLM 成本直灌）
 *   2. 每题检索 top-k 碎片（字符重合度，无向量——当前事实底盘的真实形态）
 *   3. LLM 仅凭检索碎片作答，检索不到就明确说不知道（adversarial 的正确行为是拒答）
 *   4. 独立 LLM 判分（按类别分批，adversarial 用「正确拒答才算对」专用判据）
 *
 * 及格线（债务⑨）：达到 mem0 基线的 90%+。参照（arXiv:2604.04853 Table 11，LLM-judge，
 * adversarial 不计分）：Mem0 = single-hop .6713 / temporal .5551 / multi-hop .5115 /
 * open-domain .7293 / 总分 .6688 → 目标 ≥ .602（四类宏平均）。
 *
 * 运行：
 *   npx tsx server/eval-locomo.ts                          # 全量（10 会话 × 1986 题）
 *   npx tsx server/eval-locomo.ts --convos 1 --cats 4 --limit 8   # 微试点
 *   npx tsx server/eval-locomo.ts --convos 2                # 子集
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { moonshotChat, extractJson } from '../src/engine/llm'
import { registerNodeTransport } from './llm-node'

/* ---------------- 参照基线（mem0 × 0.9 = 及格线） ---------------- */

export const MEM0_REF = { 'single-hop': 0.6713, temporal: 0.5551, 'multi-hop': 0.5115, 'open-domain': 0.7293 }

/** LoCoMo category 编码 → 名称（对照数据分布：4=841 single-hop, 1=282 multi-hop, 2=321 temporal, 3=96 open-domain, 5=446 adversarial） */
export const CATEGORY_NAMES: Record<number, string> = { 4: 'single-hop', 1: 'multi-hop', 2: 'temporal', 3: 'open-domain', 5: 'adversarial' }

export interface CategoryStat { cat: string; correct: number; total: number; acc: number; bar: number | null; pass: boolean | null }

/** 汇总：adversarial 单列不计入总分；其余四类与 mem0×0.9 对照 */
export function aggregate(results: { category: number; correct: number }[]): { stats: CategoryStat[]; overall: number; overallBar: number; overallPass: boolean } {
  const byCat = new Map<number, { correct: number; total: number }>()
  for (const r of results) {
    const t = byCat.get(r.category) ?? { correct: 0, total: 0 }
    t.total++
    if (r.correct) t.correct++
    byCat.set(r.category, t)
  }
  const stats: CategoryStat[] = []
  let sum = 0, n = 0, barSum = 0
  for (const [code, { correct, total }] of [...byCat.entries()].sort((a, b) => a[0] - b[0])) {
    const cat = CATEGORY_NAMES[code] ?? `cat${code}`
    const acc = correct / total
    if (code === 5) {
      stats.push({ cat, correct, total, acc, bar: null, pass: null })
    } else {
      const bar = MEM0_REF[cat as keyof typeof MEM0_REF] * 0.9
      sum += acc; n++; barSum += bar
      stats.push({ cat, correct, total, acc, bar, pass: acc >= bar })
    }
  }
  const overall = n > 0 ? sum / n : 0
  const overallBar = barSum
  return { stats, overall, overallBar, overallPass: overall >= overallBar }
}

/* ---------------- 数据解析 ---------------- */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/** "1:56 pm on 8 May, 2023" → "2023-05-08"（日期粒度足够做碎片时间标注） */
export function parseLocoDate(s: string): string {
  const m = String(s).match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*(?:on\s+)?(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/i)
  if (!m) return '1970-01-01'
  const mi = MONTHS.findIndex((x) => x.startsWith(m[5].slice(0, 3).toLowerCase()))
  if (mi < 0) return '1970-01-01'
  return `${m[6]}-${String(mi + 1).padStart(2, '0')}-${String(Number(m[4])).padStart(2, '0')}`
}

interface Turn { speaker: string; dia_id: string; text: string }
interface QA { question: string; answer?: string; adversarial_answer?: string; category: number; evidence?: string[] }

export interface Frag { id: string; date: string; text: string; tf: Map<string, number>; len: number }

export interface Retriever { (question: string, k: number): Frag[] }

/** 全部轮次 → 碎片库（chronological，零 LLM；tf 供 BM25 检索） */
export function buildFragments(conversation: Record<string, unknown>): Frag[] {
  const frags: Frag[] = []
  const keys = Object.keys(conversation).filter((k) => /^session_\d+$/.test(k)).sort((a, b) => Number(a.slice(8)) - Number(b.slice(8)))
  let n = 0
  for (const k of keys) {
    const dateRaw = conversation[`${k}_date_time`]
    const date = parseLocoDate(typeof dateRaw === 'string' ? dateRaw : '')
    for (const turn of (conversation[k] as unknown as Turn[])) {
      if (!turn || typeof turn.text !== 'string') continue
      const text = `${turn.speaker}: ${turn.text}`
      const tokens = tokenize(`${text} ${date}`)
      const tf = new Map<string, number>()
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
      frags.push({ id: turn.dia_id ?? `f${++n}`, date, text, tf, len: tokens.length })
    }
  }
  return frags
}

/** 分词（小写、去标点；BM25 的 IDF 会自然压低常用词权重，无需停用词表） */
export function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9']+/g)?.filter((t) => t.length > 1) ?? []
}

/**
 * 碎片库 → BM25 检索器（词法检索，无向量——embedding 到位后替换此函数即可，作答/判分管线不变）。
 * 微试点教训：字符重合度对英文长句无区分度（常见字母淹没关键词），5/8 失败全是检索未命中。
 */
export function buildRetriever(frags: Frag[]): Retriever {
  const N = Math.max(1, frags.length)
  const df = new Map<string, number>()
  for (const f of frags) for (const t of f.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  const avgLen = frags.reduce((s, f) => s + f.len, 0) / N
  const k1 = 1.5, b = 0.75

  return (question: string, k: number): Frag[] => {
    const qTokens = tokenize(question)
    if (qTokens.length === 0) return frags.slice(0, k)
    const seen = new Set<string>()
    const qTerms = qTokens.filter((t) => { if (seen.has(t) || !df.has(t)) return false; seen.add(t); return true })
    return frags
      .map((f) => {
        let score = 0
        for (const t of qTerms) {
          const tf = f.tf.get(t) ?? 0
          if (tf === 0) continue
          const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5))
          score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * f.len) / (avgLen || 1)))
        }
        return { f, score }
      })
      .sort((x, y) => y.score - x.score)
      .slice(0, k)
      .map((x) => x.f)
  }
}

/* ---------------- 作答与判分（批处理：限流友好，10/5/5 题一批） ---------------- */

/** HyDE 批量扩查询：把问题改写成「假想中的证据碎片」——答案词汇进入查询，弥合转述鸿沟（§4.4 检索层迁移） */
export async function expandQueryBatch(questions: string[]): Promise<string[]> {
  const list = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
  const raw = await moonshotChat([
    {
      role: 'system',
      content: `You generate hypothetical memory fragments for retrieval (HyDE). For each question about one person's months-long conversation memory, write 1-2 sentences that a real memory fragment containing the answer would plausibly look like — use the concrete vocabulary the answer would carry (names, places, activities, dates). Do NOT answer the questions; sketch the fragments. Output JSON only: {"snippets":["...","..."]} with exactly ${questions.length} entries in input order.`,
    },
    { role: 'user', content: list },
  ], { temperature: 0.7, maxTokens: 120 * questions.length })
  const j = extractJson<{ snippets: string[] }>(raw)
  const out = Array.isArray(j?.snippets) ? j!.snippets.map((s) => (typeof s === 'string' ? s : '')) : []
  while (out.length < questions.length) out.push('')
  return out.slice(0, questions.length)
}

export async function answerBatch(items: { question: string; frags: Frag[] }[]): Promise<string[]> {
  const list = items.map((x, i) =>
    `=== Question ${i + 1} ===\n${x.question}\nIts memory fragments (use ONLY these for this question):\n${x.frags.map((f) => `- [${f.date}] ${f.text}`).join('\n') || '（none retrieved）'}`,
  ).join('\n\n')
  const raw = await moonshotChat([
    {
      role: 'system',
      content: `You are the long-term memory of one participant in a months-long conversation. Answer EACH question using ONLY the memory fragments attached to that question (they are independent). If a question's fragments do not contain its answer, reply for that question exactly: I don't have that information. Never guess. Each answer under 30 words. Output JSON only: {"answers":["...","..."]} with exactly ${items.length} entries in input order.`,
    },
    { role: 'user', content: list },
  ], { temperature: 0.1, maxTokens: 120 * items.length })
  const j = extractJson<{ answers: string[] }>(raw)
  const out = Array.isArray(j?.answers) ? j!.answers.map((s) => (typeof s === 'string' ? s : '__PARSE_FAIL__')) : []
  while (out.length < items.length) out.push('__LLM_FAILED__')
  return out.slice(0, items.length)
}

/** 按类别分批判分（同批同类别，判据一致）；adversarial：正确拒答才得分 */
async function judgeBatch(cat: number, items: { question: string; gold: string; pred: string }[]): Promise<number[]> {
  const adversarial = cat === 5
  const list = items.map((x, i) => `${i + 1}. Q: ${x.question}\n   Gold: ${x.gold}\n   System: ${x.pred}`).join('\n')
  const rubric = adversarial
    ? `These are ADVERSARIAL questions: the gold answer is an invented fact that is NOT present in the source conversation. The system answered correctly ONLY IF it declined to answer / indicated the information is not available (e.g. "I don't have that information"). If the system asserted any specific answer, score 0.`
    : `Score 1 if the system answer is semantically consistent with the gold answer (key entities/dates/numbers must match; extra detail is fine, contradiction or missing key fact is 0). If the system said it lacks information but a gold answer exists, score 0.`
  const raw = await moonshotChat([
    {
      role: 'system',
      content: `You are an impartial grader for a conversational memory benchmark. ${rubric} Output JSON only: {"scores":[1,0,...]} with exactly ${items.length} entries in input order.`,
    },
    { role: 'user', content: list },
  ], { temperature: 0.1, maxTokens: 200 })
  const j = extractJson<{ scores: number[] }>(raw)
  const scores = Array.isArray(j?.scores) ? j!.scores.map((s) => (Number(s) >= 1 ? 1 : 0)) : []
  while (scores.length < items.length) scores.push(0)
  return scores.slice(0, items.length)
}

/* ---------------- 主流程 ---------------- */

const here = dirname(fileURLToPath(import.meta.url))
const DATA = join(here, 'eval-data', 'locomo10.json')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const args = process.argv.slice(2)
  const flag = (name: string, def: number) => (args.includes(`--${name}`) ? Number(args[args.indexOf(`--${name}`) + 1]) || def : def)
  const nConvos = Math.min(10, flag('convos', 10))
  const cats = args.includes('--cats') ? String(args[args.indexOf('--cats') + 1]).split(',').map(Number) : [4, 1, 2, 3, 5]
  const limit = flag('limit', 0)
  const k = flag('k', 10)
  const useHyde = !args.includes('--no-hyde')
  const pace = flag('pace', 12)
  const llmReady = registerNodeTransport()

  if (!existsSync(DATA)) {
    console.error(`[eval-locomo] 缺数据：${DATA}\n  curl -sL https://raw.githubusercontent.com/snap-research/locomo/main/data/locomo10.json -o "${DATA}"`)
    process.exit(2)
  }
  const data = JSON.parse(readFileSync(DATA, 'utf8')) as { sample_id: string; conversation: Record<string, unknown>; qa: QA[] }[]
  console.log(`[eval-locomo] 会话 ${nConvos}/10 · 类别 ${cats.map((c) => CATEGORY_NAMES[c]).join('/')} · top-k=${k} · llm ${llmReady ? 'live' : 'OFFLINE'}\n`)

  const detailed: { sample: string; category: number; question: string; pred: string; gold: string; correct: number; topIds: string[] }[] = []
  let done = 0
  const fails = { expand: 0, answer: 0, judge: 0 }

  for (const conv of data.slice(0, nConvos)) {
    const frags = buildFragments(conv.conversation)
    const retrieve = buildRetriever(frags)
    let qas = conv.qa.filter((q) => cats.includes(q.category))
    if (limit > 0) qas = qas.slice(0, Math.max(0, limit - done))
    console.log(`--- 会话 ${conv.sample_id}：${frags.length} 碎片，${qas.length} 题 ---`)
    done += qas.length

    // 1) HyDE 批量扩查询（10 题/批）
    const snippets: string[] = []
    if (useHyde) {
      for (let i = 0; i < qas.length; i += 10) {
        const chunk = qas.slice(i, i + 10)
        let res: string[] = []
        try {
          res = await expandQueryBatch(chunk.map((q) => q.question))
        } catch {
          await sleep(30_000)
          try {
            res = await expandQueryBatch(chunk.map((q) => q.question))
          } catch {
            fails.expand++ // 失败退回原问题（仅损失 HyDE 增量，不污染数据）
          }
        }
        snippets.push(...res)
        await sleep(pace * 1000)
      }
    }

    // 2) 检索（问题 + 假想碎片）
    const retrieved = qas.map((q, i) => retrieve(`${q.question} ${snippets[i] ?? ''}`.trim(), k))

    // 3) 批量作答（5 题/批，各自只看自己的碎片）
    const preds: string[] = []
    for (let i = 0; i < qas.length; i += 5) {
      const chunkIdx = Array.from({ length: Math.min(5, qas.length - i) }, (_, j) => i + j)
      let answers: string[] = []
      try {
        answers = await answerBatch(chunkIdx.map((j) => ({ question: qas[j].question, frags: retrieved[j] })))
      } catch {
        // 批级二次重试：整批清零会污染指标，多等 30 秒值得
        await sleep(30_000)
        try {
          answers = await answerBatch(chunkIdx.map((j) => ({ question: qas[j].question, frags: retrieved[j] })))
        } catch {
          fails.answer++
          answers = chunkIdx.map(() => '__LLM_FAILED__')
        }
      }
      preds.push(...answers)
      await sleep(pace * 1000)
    }

    // 4) 判分（同类别分批，每批 5 题）
    for (const cat of cats) {
      const idx = qas.map((q, j) => ({ q, j })).filter((x) => x.q.category === cat).map((x) => x.j)
      for (let i = 0; i < idx.length; i += 5) {
        const chunk = idx.slice(i, i + 5)
        let scores: number[]
        try {
          scores = await judgeBatch(cat, chunk.map((j) => ({
            question: qas[j].question,
            gold: qas[j].answer ?? `(adversarial trap: ${qas[j].adversarial_answer ?? '—'})`,
            pred: preds[j],
          })))
        } catch {
          // 批级二次重试
          await sleep(30_000)
          try {
            scores = await judgeBatch(cat, chunk.map((j) => ({
              question: qas[j].question,
              gold: qas[j].answer ?? `(adversarial trap: ${qas[j].adversarial_answer ?? '—'})`,
              pred: preds[j],
            })))
          } catch {
            fails.judge++
            scores = chunk.map(() => 0)
          }
        }
        chunk.forEach((j, c) => detailed.push({
          sample: conv.sample_id, category: qas[j].category, question: qas[j].question,
          pred: preds[j], gold: qas[j].answer ?? qas[j].adversarial_answer ?? '', correct: scores[c],
          topIds: retrieved[j].map((f) => f.id),
        }))
        await sleep(pace * 1000)
      }
    }
    if (limit > 0 && done >= limit) break
  }

  const { stats, overall, overallBar, overallPass } = aggregate(detailed)
  console.log('\n===== 结果（对照 mem0×0.9 及格线）=====')
  for (const s of stats) {
    const bar = s.bar !== null ? `  及格线 ${s.bar.toFixed(3)} → ${s.pass ? 'PASS' : 'FAIL'}` : '  （adversarial 单列，不计入总分）'
    console.log(`  ${s.cat.padEnd(12)} ${s.correct}/${s.total} = ${s.acc.toFixed(4)}${bar}`)
  }
  console.log(`  总分（四类宏平均）${overall.toFixed(4)} / 及格线 ${overallBar.toFixed(4)} → ${overallPass ? 'PASS ✓' : 'FAIL'}`)

  const outDir = join(here, 'eval-data')
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, `locomo-result-${Date.now()}.json`)
  writeFileSync(outFile, JSON.stringify({ ranAt: new Date().toISOString(), nConvos, cats, k, stats, overall, overallBar, overallPass, detailed }, null, 2), 'utf8')
  console.log(`\n[eval-locomo] 批调用失败：expand ${fails.expand} / answer ${fails.answer} / judge ${fails.judge}`)
  console.log(`[eval-locomo] 明细已写入 ${outFile}`)
  process.exit(0)
}

/** 仅在直接运行时执行跑批（dev-smoke 会 import 本模块取纯函数——模块顶层不得有副作用） */
const invokedDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('/eval-locomo.ts')
if (invokedDirectly) {
  main().catch((err) => { console.error('[eval-locomo] 运行失败：', err); process.exit(1) })
}
