/**
 * 衔枝评测 · LongMemEval 长程记忆基线
 *
 * 数据：xiaowu0162/longmemeval-cleaned（HuggingFace，ICLR 2025）
 *   下载（一次性，放到 server/eval-data/）：
 *     curl.exe -sL https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_oracle.json \
 *       -o server/eval-data/longmemeval_oracle.json
 *     curl.exe -sL https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_s_cleaned.json \
 *       -o server/eval-data/longmemeval_s_cleaned.json
 *     curl.exe -sL https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_m_cleaned.json \
 *       -o server/eval-data/longmemeval_m_cleaned.json
 *   （HuggingFace 连不上时用镜像：把 huggingface.co 换成 hf-mirror.com）
 *
 * 三个数据文件：
 *   oracle — 仅证据会话（检索零难度，测作答质量）
 *   s      — 标准 ~40 会话 / ~115k tokens（主基准，同 LoCoMo 定位：碎片层 + 检索）
 *   m      — ~500 会话（超长，需更强检索）
 *
 * 管线（同 LoCoMo：事实底盘 = 碎片层 + 检索，不经过叙事层）：
 *   1. 每个实例的全部会话轮次 → 碎片（带会话日期，零 LLM 直灌）
 *   2. 每题检索 top-k 碎片（BM25 + 向量 RRF + HyDE）
 *   3. LLM 仅凭检索碎片作答（abstention 题正确拒答才得分）
 *   4. 独立 LLM 判分（rubric 来自 LongMemEval 官方 evaluate_qa.py，按题型区分）
 *
 * 题型（6 类 + abstention）：
 *   single-session-user / single-session-assistant / single-session-preference
 *   temporal-reasoning / knowledge-update / multi-session
 *   question_id 以 _abs 结尾 = abstention（正确识别不可答才得分）
 *
 * 指标（对照官方 print_qa_metrics.py）：
 *   - 各题型准确率
 *   - Task-averaged（6 类宏平均）
 *   - Overall（全部微平均，含 abstention）
 *   - Abstention（单独报告）
 *   - 检索召回（turn-level has_answer 命中率 / session-level answer_session_ids 命中率，诊断用）
 *
 * 运行：
 *   npx tsx server/eval-longmemeval.ts --data oracle --limit 10              # 微试点
 *   npx tsx server/eval-longmemeval.ts --data s --embed --k 15               # 标准 + 混合检索
 *   npx tsx server/eval-longmemeval.ts --data s --limit 50 --types single-session-user,temporal-reasoning
 *   npx tsx server/eval-longmemeval.ts --data s --no-hyde                    # 消融：关闭 HyDE
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { moonshotChat, extractJson } from '../src/engine/llm'
import { registerNodeTransport } from './llm-node'
import { loadEnvLocal } from './llm-node'
import { embedTexts, embeddingsAvailable } from './embed-node'
import { buildRetriever, topByVector, fuseRrf, tokenize, type Frag } from './eval-locomo'

/* ---------------- 数据文件映射 ---------------- */

const DATA_FILES: Record<string, string> = {
  oracle: 'longmemeval_oracle.json',
  s: 'longmemeval_s_cleaned.json',
  m: 'longmemeval_m_cleaned.json',
}

const QUESTION_TYPES = [
  'single-session-user',
  'single-session-preference',
  'single-session-assistant',
  'multi-session',
  'temporal-reasoning',
  'knowledge-update',
] as const

/* ---------------- 数据解析 ---------------- */

interface Turn { role: string; content: string; has_answer?: boolean }

export interface LMEEntry {
  question_id: string
  question_type: string
  question: string
  answer: string
  question_date: string
  haystack_session_ids: string[]
  haystack_dates: string[]
  haystack_sessions: Turn[][]
  answer_session_ids: string[]
}

/**
 * 每个实例的会话 → 碎片库（chronological，零 LLM；tf 供 BM25 检索）。
 * 与 LoCoMo 的 buildFragments 对齐：每轮 → 一个碎片，文本 = "{role}: {content}"，日期取会话级。
 */
export function buildFragmentsFromSessions(entry: LMEEntry): Frag[] {
  const frags: Frag[] = []
  for (let s = 0; s < entry.haystack_sessions.length; s++) {
    const date = entry.haystack_dates[s] ?? '1970-01-01'
    const sid = entry.haystack_session_ids[s] ?? `s${s}`
    for (let t = 0; t < entry.haystack_sessions[s].length; t++) {
      const turn = entry.haystack_sessions[s][t]
      if (!turn || typeof turn.content !== 'string') continue
      const text = `${turn.role}: ${turn.content}`
      const tokens = tokenize(`${text} ${date}`)
      const tf = new Map<string, number>()
      for (const tok of tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1)
      frags.push({ id: `${sid}_${t}`, date, text, tf, len: tokens.length })
    }
  }
  return frags
}

/* ---------------- 作答与判分（批处理：限流友好，10/5/5 题一批） ---------------- */

/** HyDE 批量扩查询（适配 LongMemEval：chat assistant 的长期交互记忆） */
export async function expandQueryBatchLME(questions: string[]): Promise<string[]> {
  const list = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
  const raw = await moonshotChat([
    {
      role: 'system',
      content: `You generate hypothetical memory fragments for retrieval (HyDE). For each question about a chat assistant's long-term memory of conversations with a user, write 1-2 sentences that a real memory fragment containing the answer would plausibly look like — use the concrete vocabulary the answer would carry (names, places, activities, dates, preferences). Do NOT answer the questions; sketch the fragments. Output JSON only: {"snippets":["...","..."]} with exactly ${questions.length} entries in input order.`,
    },
    { role: 'user', content: list },
  ], { temperature: 0.7, maxTokens: 500 * questions.length })
  const j = extractJson<{ snippets: string[] }>(raw)
  const out = Array.isArray(j?.snippets) ? j!.snippets.map((s) => (typeof s === 'string' ? s : '')) : []
  while (out.length < questions.length) out.push('')
  return out.slice(0, questions.length)
}

/* ---------------- 答题模型独立通道（--answer-model 时启用，绕过共享 transport） ---------------- */

let answerModelCfg: { model: string; apiKey: string; baseUrl: string } | null = null

export function setAnswerModel(model: string, apiKey: string, baseUrl: string): void {
  answerModelCfg = { model, apiKey, baseUrl: baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '') }
}

const ANSWER_TIMEOUT_MS = 120000
const ANSWER_RETRY_BASE_MS = 5000
const ANSWER_MAX_RETRIES = 4

async function answerChatDirect(messages: { role: string; content: string }[], opts: { temperature?: number; maxTokens?: number }): Promise<string> {
  if (!answerModelCfg) throw new Error('answer model not configured')
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= ANSWER_MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, ANSWER_RETRY_BASE_MS * 2 ** (attempt - 1)))
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ANSWER_TIMEOUT_MS)
    try {
      const resp = await fetch(`${answerModelCfg.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${answerModelCfg.apiKey}` },
        body: JSON.stringify({ model: answerModelCfg.model, temperature: opts.temperature ?? 0.1, max_tokens: opts.maxTokens ?? 700, messages }),
        signal: ctrl.signal,
      })
      if (resp.status === 429 && attempt < ANSWER_MAX_RETRIES) { lastErr = new Error('HTTP 429'); continue }
      if (!resp.ok) { const body = await resp.text().catch(() => ''); throw new Error(`HTTP ${resp.status}: ${body.slice(0, 200)}`) }
      const data = await resp.json()
      const raw = data?.choices?.[0]?.message?.content
      if (typeof raw !== 'string' || !raw.trim()) throw new Error('empty response')
      const text = raw.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim()
      if (!text) throw new Error('empty response after think strip')
      return text
    } catch (err) {
      lastErr = err
      if (err instanceof Error && /^HTTP 4\d\d/.test(err.message) && !err.message.includes('429')) throw err
      if (attempt >= ANSWER_MAX_RETRIES) throw err
    } finally { clearTimeout(timer) }
  }
  throw lastErr ?? new Error('answer model call failed')
}

/** 批量作答（同 LoCoMo 管线，强调 abstention 行为：检索不到就拒答） */
export async function answerBatchLME(items: { question: string; frags: Frag[]; questionDate: string }[]): Promise<string[]> {
  const list = items.map((x, i) =>
    `=== Question ${i + 1} ===\nQuestion date: ${x.questionDate}\n${x.question}\nIts memory fragments (use ONLY these for this question):\n${x.frags.map((f) => `- [${f.date}] ${f.text}`).join('\n') || '(none retrieved)'}`,
  ).join('\n\n')
  const systemPrompt = `You are the long-term memory of a chat assistant that has been conversing with a user across many sessions over time. Answer EACH question using ONLY the memory fragments attached to that question (they are independent).

CRITICAL RULES:
1. If a question's fragments do not contain its answer, reply for that question exactly: I don't have that information. Never guess or fabricate.
2. For "how many days/weeks/months ago" or "how long between" questions: you MUST compute the answer from the [date] prefixes of the fragments and the Question date given for each question. The Question date is the reference date. Subtract the event date from the Question date to get the answer. Do NOT decline these questions if the event is mentioned in the fragments — compute and answer.
3. For "how many" counting questions (e.g. "how many restaurants"): count occurrences across ALL fragments for that question.
4. For preference questions, give a personalized response based on the user's information in the fragments.
5. Each answer should be concise and direct.

Output JSON only: {"answers":["...","..."]} with exactly ${items.length} entries in input order.`
  // 思考型模型会把推理链计入 max_tokens：预算按「思考+产出」双份给（eval-locomo.ts 同款）
  const budget = 1400 * items.length
  const raw = answerModelCfg
    ? await answerChatDirect([{ role: 'system', content: systemPrompt }, { role: 'user', content: list }], { temperature: 0.1, maxTokens: budget })
    : await moonshotChat([{ role: 'system', content: systemPrompt }, { role: 'user', content: list }], { temperature: 0.1, maxTokens: budget })
  const j = extractJson<{ answers: string[] }>(raw)
  const out = Array.isArray(j?.answers) ? j!.answers.map((s) => (typeof s === 'string' ? s : '__PARSE_FAIL__')) : []
  while (out.length < items.length) out.push('__LLM_FAILED__')
  return out.slice(0, items.length)
}

/**
 * 判分（rubric 逐字来自 LongMemEval 官方 evaluate_qa.py 的 get_anscheck_prompt）。
 * 按 question_type + abstention 分派不同判据；5 题/批，各题带各自的 rubric 文本。
 */
export async function judgeBatchLME(items: {
  questionType: string
  abstention: boolean
  question: string
  gold: string
  pred: string
}[]): Promise<number[]> {
  const prompts = items.map((x) => {
    const { questionType: qt, abstention, question, gold, pred } = x
    if (abstention) {
      return `I will give you an unanswerable question, an explanation, and a response from a model. Please answer yes if the model correctly identifies the question as unanswerable. The model could say that the information is incomplete, or some other information is given but the asked information is not.\n\nQuestion: ${question}\n\nExplanation: ${gold}\n\nModel Response: ${pred}\n\nDoes the model correctly identify the question as unanswerable? Answer yes or no only.`
    }
    if (qt === 'temporal-reasoning') {
      return `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. If the response only contains a subset of the information required by the answer, answer no. In addition, do not penalize off-by-one errors for the number of days. If the question asks for the number of days/weeks/months, etc., and the model makes off-by-one errors (e.g., predicting 19 days when the answer is 18), the model's response is still correct.\n\nQuestion: ${question}\n\nCorrect Answer: ${gold}\n\nModel Response: ${pred}\n\nIs the model response correct? Answer yes or no only.`
    }
    if (qt === 'knowledge-update') {
      return `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response contains some previous information along with an updated answer, the response should be considered as correct as long as the updated answer is the required answer.\n\nQuestion: ${question}\n\nCorrect Answer: ${gold}\n\nModel Response: ${pred}\n\nIs the model response correct? Answer yes or no only.`
    }
    if (qt === 'single-session-preference') {
      return `I will give you a question, a rubric for desired personalized response, and a response from a model. Please answer yes if the response satisfies the desired response. Otherwise, answer no. The model does not need to reflect all the points in the rubric. The response is correct as long as it recalls and utilizes the user's personal information correctly.\n\nQuestion: ${question}\n\nRubric: ${gold}\n\nModel Response: ${pred}\n\nIs the model response correct? Answer yes or no only.`
    }
    // single-session-user, single-session-assistant, multi-session
    return `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. If the response only contains a subset of the information required by the answer, answer no.\n\nQuestion: ${question}\n\nCorrect Answer: ${gold}\n\nModel Response: ${pred}\n\nIs the model response correct? Answer yes or no only.`
  })

  const list = prompts.map((p, i) => `=== Judgment ${i + 1} ===\n${p}`).join('\n\n')
  const raw = await moonshotChat([
    {
      role: 'system',
      content: `You are an impartial grader for a long-term memory benchmark. For each judgment, answer "yes" or "no" only. Output JSON only: {"labels":["yes","no",...]} with exactly ${items.length} entries in input order.`,
    },
    { role: 'user', content: list },
  ], { temperature: 0, maxTokens: 500 * items.length })
  const j = extractJson<{ labels: string[] }>(raw)
  const out = Array.isArray(j?.labels) ? j!.labels.map((s) => /^yes/i.test(String(s)) ? 1 : 0) : []
  while (out.length < items.length) out.push(0)
  return out.slice(0, items.length)
}

/* ---------------- 指标汇总（对照官方 print_qa_metrics.py） ---------------- */

export interface LMEStat {
  type: string
  correct: number
  total: number
  acc: number
}

export interface LMEResult {
  stats: LMEStat[]
  taskAveraged: number
  overall: number
  abstentionAcc: number
  abstentionTotal: number
  /** 检索诊断：turn-level has_answer 命中率 */
  turnRecall: number
  /** 检索诊断：session-level answer_session_ids 命中率 */
  sessionRecall: number
}

export function aggregateLME(detailed: {
  questionType: string
  abstention: boolean
  correct: number
  turnHit: boolean
  sessionHit: boolean
}[]): LMEResult {
  const type2acc: Record<string, number[]> = {}
  for (const t of QUESTION_TYPES) type2acc[t] = []
  const abstentionAcc: number[] = []
  let allCorrect = 0, allTotal = 0
  let turnHits = 0, sessionHits = 0, recallTotal = 0

  for (const d of detailed) {
    const arr = type2acc[d.questionType] ?? (type2acc[d.questionType] = [])
    arr.push(d.correct)
    allCorrect += d.correct
    allTotal++
    if (d.abstention) abstentionAcc.push(d.correct)
    if (!d.abstention) {
      recallTotal++
      if (d.turnHit) turnHits++
      if (d.sessionHit) sessionHits++
    }
  }

  const stats: LMEStat[] = QUESTION_TYPES.map((t) => {
    const v = type2acc[t] ?? []
    return { type: t, correct: v.reduce((a, b) => a + b, 0), total: v.length, acc: v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0 }
  })

  const taskAccs = stats.filter((s) => s.total > 0).map((s) => s.acc)
  return {
    stats,
    taskAveraged: taskAccs.length ? taskAccs.reduce((a, b) => a + b, 0) / taskAccs.length : 0,
    overall: allTotal ? allCorrect / allTotal : 0,
    abstentionAcc: abstentionAcc.length ? abstentionAcc.reduce((a, b) => a + b, 0) / abstentionAcc.length : 0,
    abstentionTotal: abstentionAcc.length,
    turnRecall: recallTotal ? turnHits / recallTotal : 0,
    sessionRecall: recallTotal ? sessionHits / recallTotal : 0,
  }
}

/* ---------------- 主流程 ---------------- */

const here = dirname(fileURLToPath(import.meta.url))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const args = process.argv.slice(2)
  const flag = (name: string, def: number) => (args.includes(`--${name}`) ? Number(args[args.indexOf(`--${name}`) + 1]) || def : def)
  const strFlag = (name: string, def: string) => (args.includes(`--${name}`) ? String(args[args.indexOf(`--${name}`) + 1]) || def : def)

  const dataKey = strFlag('data', 's')
  const dataFile = DATA_FILES[dataKey]
  if (!dataFile) {
    console.error(`[eval-longmemeval] --data 只支持 oracle / s / m，收到 "${dataKey}"`)
    process.exit(2)
  }
  const DATA = join(here, 'eval-data', dataFile)

  const limit = flag('limit', 0)
  const k = flag('k', 15)
  const useHyde = !args.includes('--no-hyde')
  const pace = flag('pace', 12)
  const useEmbed = args.includes('--embed')
  const typesFilter = args.includes('--types')
    ? new Set(String(args[args.indexOf('--types') + 1]).split(','))
    : null

  const llmReady = registerNodeTransport()

  // 答题模型独立通道：--answer-model 指定时绕过共享 transport，直连指定 API
  const answerModel = strFlag('answer-model', '')
  if (answerModel) {
    loadEnvLocal()
    const answerApiKey = strFlag('answer-api-key', process.env.KIMI_API_KEY || process.env.MUNINN_API_KEY || '')
    const answerBaseUrl = strFlag('answer-base-url', process.env.KIMI_BASE_URL || 'https://api.moonshot.cn')
    if (!answerApiKey) { console.error('[eval-longmemeval] --answer-model 需要 --answer-api-key 或环境变量 KIMI_API_KEY'); process.exit(2) }
    setAnswerModel(answerModel, answerApiKey, answerBaseUrl)
    console.log(`[eval-longmemeval] 答题模型: ${answerModel} @ ${answerBaseUrl}`)
  }

  if (useEmbed && !embeddingsAvailable()) {
    console.error('[eval-longmemeval] --embed 需要硅基流动 key：.env.local 加 SF_API_KEY=sk-...（可选 MUNINN_EMBED_MODEL，默认 BAAI/bge-m3）')
    process.exit(2)
  }

  if (!existsSync(DATA)) {
    console.error(`[eval-longmemeval] 缺数据：${DATA}\n  curl -sL https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/${dataFile} -o "${DATA}"`)
    process.exit(2)
  }

  const data = JSON.parse(readFileSync(DATA, 'utf8')) as LMEEntry[]
  let entries = data
  if (typesFilter) entries = entries.filter((e) => typesFilter.has(e.question_type))
  const offset = flag('offset', 0)
  if (offset > 0) entries = entries.slice(offset)
  if (limit > 0) entries = entries.slice(0, limit)

  console.log(`[eval-longmemeval] 数据 ${dataKey} (${dataFile}) · ${entries.length}/${data.length} 题 · top-k=${k} · 检索 ${useEmbed ? 'BM25+向量 RRF' : 'BM25'} · HyDE ${useHyde ? 'on' : 'off'} · llm ${llmReady ? 'live' : 'OFFLINE'}\n`)

  const detailed: {
    questionId: string
    questionType: string
    abstention: boolean
    question: string
    pred: string
    gold: string
    correct: number
    turnHit: boolean
    sessionHit: boolean
    topIds: string[]
  }[] = []
  let done = 0
  const fails = { expand: 0, answer: 0, judge: 0 }

  // ---- 1) HyDE 批量扩查询（10 题/批，跨实例）----
  const snippets: string[] = Array(entries.length).fill('')
  if (useHyde) {
    for (let i = 0; i < entries.length; i += 10) {
      const chunk = entries.slice(i, i + 10)
      let res: string[] = []
      try {
        res = await expandQueryBatchLME(chunk.map((e) => e.question))
      } catch {
        await sleep(30_000)
        try {
          res = await expandQueryBatchLME(chunk.map((e) => e.question))
        } catch {
          fails.expand++
        }
      }
      res.forEach((s, j) => { snippets[i + j] = s })
      await sleep(pace * 1000)
    }
  }

  // ---- 2) 逐题检索（每题独立碎片库）----
  console.log('[eval-longmemeval] 检索阶段...')
  const retrieved: Frag[][] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const frags = buildFragmentsFromSessions(entry)
    const retrieve = buildRetriever(frags)
    const query = `${entry.question} ${snippets[i] ?? ''}`.trim()

    let bm25 = retrieve(query, k * 2)
    if (useEmbed) {
      const fragVecs = await embedTexts(frags.map((f) => `${f.text} ${f.date}`), entry.question_id)
      const qVecs = await embedTexts([query], entry.question_id)
      bm25 = fuseRrf(bm25, topByVector(frags, fragVecs, qVecs[0], k * 2), k)
    } else {
      bm25 = bm25.slice(0, k)
    }
    retrieved.push(bm25)

    if ((i + 1) % 50 === 0) console.log(`  检索 ${i + 1}/${entries.length}`)
  }

  // ---- 3) 批量作答（5 题/批）----
  console.log('[eval-longmemeval] 作答阶段...')
  const preds: string[] = Array(entries.length).fill('__LLM_FAILED__')
  for (let i = 0; i < entries.length; i += 5) {
    const chunkIdx = Array.from({ length: Math.min(5, entries.length - i) }, (_, j) => i + j)
    let answers: string[] = []
    try {
      answers = await answerBatchLME(chunkIdx.map((j) => ({ question: entries[j].question, frags: retrieved[j], questionDate: entries[j].question_date })))
    } catch {
      await sleep(30_000)
      try {
        answers = await answerBatchLME(chunkIdx.map((j) => ({ question: entries[j].question, frags: retrieved[j], questionDate: entries[j].question_date })))
      } catch {
        fails.answer++
        answers = chunkIdx.map(() => '__LLM_FAILED__')
      }
    }
    answers.forEach((a, j) => { preds[i + j] = a })
    await sleep(pace * 1000)
    if ((i + 5) % 50 === 0) console.log(`  作答 ${Math.min(i + 5, entries.length)}/${entries.length}`)
  }

  // ---- 4) 判分（5 题/批，各题带各自 rubric）----
  console.log('[eval-longmemeval] 判分阶段...')
  for (let i = 0; i < entries.length; i += 5) {
    const chunkIdx = Array.from({ length: Math.min(5, entries.length - i) }, (_, j) => i + j)
    let scores: number[]
    try {
      scores = await judgeBatchLME(chunkIdx.map((j) => ({
        questionType: entries[j].question_type,
        abstention: entries[j].question_id.endsWith('_abs'),
        question: entries[j].question,
        gold: entries[j].answer,
        pred: preds[j],
      })))
    } catch {
      await sleep(30_000)
      try {
        scores = await judgeBatchLME(chunkIdx.map((j) => ({
          questionType: entries[j].question_type,
          abstention: entries[j].question_id.endsWith('_abs'),
          question: entries[j].question,
          gold: entries[j].answer,
          pred: preds[j],
        })))
      } catch {
        fails.judge++
        scores = chunkIdx.map(() => 0)
      }
    }

    chunkIdx.forEach((j, c) => {
      const entry = entries[j]
      const abstention = entry.question_id.endsWith('_abs')
      // 检索召回诊断（仅非 abstention 题）
      const answerSids = new Set(entry.answer_session_ids)
      const topFragIds = retrieved[j].map((f) => f.id)
      // turn-level：retrieved 碎片是否含 has_answer turn
      let turnHit = false
      if (!abstention) {
        for (let s = 0; s < entry.haystack_sessions.length && !turnHit; s++) {
          for (let t = 0; t < entry.haystack_sessions[s].length; t++) {
            if (entry.haystack_sessions[s][t]?.has_answer) {
              const fid = `${entry.haystack_session_ids[s] ?? `s${s}`}_${t}`
              if (topFragIds.includes(fid)) { turnHit = true; break }
            }
          }
        }
      }
      // session-level：fragment id = "{sessionId}_{turnIndex}"，去掉末尾 turnIndex 还原 sessionId
      const sessionHit = !abstention && topFragIds.some((fid) => answerSids.has(fid.substring(0, fid.lastIndexOf('_'))))

      detailed.push({
        questionId: entry.question_id,
        questionType: entry.question_type,
        abstention,
        question: entry.question,
        pred: preds[j],
        gold: entry.answer,
        correct: scores[c],
        turnHit,
        sessionHit,
        topIds: topFragIds,
      })
    })
    await sleep(pace * 1000)
    if ((i + 5) % 50 === 0) console.log(`  判分 ${Math.min(i + 5, entries.length)}/${entries.length}`)
  }

  // ---- 5) 汇总 ----
  const result = aggregateLME(detailed)
  console.log('\n===== LongMemEval 结果 =====')
  for (const s of result.stats) {
    console.log(`  ${s.type.padEnd(28)} ${s.correct}/${s.total} = ${s.acc.toFixed(4)}`)
  }
  console.log(`\n  Task-averaged: ${result.taskAveraged.toFixed(4)}`)
  console.log(`  Overall:       ${result.overall.toFixed(4)}`)
  console.log(`  Abstention:    ${result.abstentionAcc.toFixed(4)} (${result.abstentionTotal} 题)`)
  console.log(`  检索召回 turn-level:   ${result.turnRecall.toFixed(4)}`)
  console.log(`  检索召回 session-level: ${result.sessionRecall.toFixed(4)}`)

  const outDir = join(here, 'eval-data')
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, `longmemeval-${dataKey}-result-${Date.now()}.json`)
  writeFileSync(outFile, JSON.stringify({
    ranAt: new Date().toISOString(),
    dataKey,
    dataFile,
    k,
    useEmbed,
    useHyde,
    typesFilter: typesFilter ? [...typesFilter] : null,
    result,
    detailed,
  }, null, 2), 'utf8')

  const individualFails = detailed.filter((d) => d.pred === '__LLM_FAILED__').length
  console.log(`\n[eval-longmemeval] 批调用失败：expand ${fails.expand} / answer ${fails.answer} / judge ${fails.judge}`)
  if (individualFails > 0) console.log(`[eval-longmemeval] 单题级 __LLM_FAILED__：${individualFails} 题（整批失败 ${fails.answer} 批 × 5 + 批内零散 ${Math.max(0, individualFails - fails.answer * 5)}）`)
  console.log(`[eval-longmemeval] 明细已写入 ${outFile}`)
  process.exit(0)
}

/** 仅在直接运行时执行跑批（dev-smoke 会 import 本模块取纯函数——模块顶层不得有副作用） */
const invokedDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('/eval-longmemeval.ts')
if (invokedDirectly) {
  main().catch((err) => { console.error('[eval-longmemeval] 运行失败：', err); process.exit(1) })
}
