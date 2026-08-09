/**
 * 实时 LLM 判定层（Moonshot / Kimi API）
 * 请求经 vite dev 代理 /moonshot → api.moonshot.cn，密钥由代理附加，浏览器不可见。
 * 任何失败（超时 / 网络 / 解析）由调用方回退到预计算脚本 —— 设计债务⑩的现场稳定性策略。
 */

const TIMEOUT_MS = 10000
const MODEL = 'moonshot-v1-8k'

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

/** 可注入的聊天传输层：服务端（Node 直连）注入自定义实现；前端不注入时走 vite 代理，行为完全不变 */
export type ChatTransport = (messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }) => Promise<string>

let customTransport: ChatTransport | null = null

export function setChatTransport(t: ChatTransport | null): void {
  customTransport = t
}

export async function moonshotChat(messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
  if (customTransport) return customTransport(messages, opts)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const resp = await fetch('/moonshot/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 700,
        messages,
      }),
      signal: ctrl.signal,
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    const text = data?.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) throw new Error('空响应')
    return text
  } finally {
    clearTimeout(timer)
  }
}

/** 从模型输出中提取第一个 JSON 对象 */
export function extractJson<T>(raw: string): T | null {
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) as T } catch { return null }
}

const clamp01 = (v: unknown): number | null =>
  typeof v === 'number' && isFinite(v) ? Math.min(0.95, Math.max(0.05, v)) : null

/* ---------- 判定一：矛盾响应（人为反例） ---------- */

export interface CounterVerdict {
  conflictType: string   // 事实冲突 / 偏好反转 / 能力变化 / 关系变化 / 无冲突
  hasConflict: boolean
  conviction: number     // 新置信度
  revised: string        // 加限定语后的论断
  reply: string          // 对用户说的话：诚实承认不确定，温暖，不评判
}

export async function adjudicateCounter(claimText: string, conviction: number, userStatement: string): Promise<CounterVerdict | null> {
  const raw = await moonshotChat([
    {
      role: 'system',
      content: `你是「雾尼」叙事记忆引擎的矛盾响应判定模块。系统对用户的既有理解会以论断形式保存，并挂置信度。当用户说出与既有论断冲突的话时，你必须：1) 判断冲突类型学（事实冲突/偏好反转/能力变化/关系变化/无冲突）；2) 给出修正后的新置信度——冲突越直接，下调越多；3) 给论断加限定语重写，保留长期观察但承认新变化；4) 写一段以系统口吻对用户说的话：明确承认「我不那么确定了」，给出可能原因猜测，温暖、不评判、不说教、不超过 80 字。只输出 JSON：{"conflictType":"...","hasConflict":true,"conviction":0.57,"revised":"...","reply":"..."}`,
    },
    {
      role: 'user',
      content: `既有论断：「${claimText}」（当前置信度 ${conviction.toFixed(2)}）\n用户新陈述：「${userStatement}」`,
    },
  ], { temperature: 0.4 })
  const j = extractJson<CounterVerdict>(raw)
  if (!j || typeof j.revised !== 'string' || typeof j.reply !== 'string') return null
  const c = clamp01(j.conviction)
  if (c === null) return null
  if (j.revised.length < 8 || j.reply.length < 8) return null
  return { ...j, conviction: c }
}

/* ---------- 判定二：伏笔回收（碰撞 adjudication） ---------- */

export interface ClosureVerdict {
  matched: boolean
  threadId?: string
  echoType?: string      // 推进 / 回收 / 反转 / 无关
  reason?: string
  reply?: string
}

export async function adjudicateClosure(
  eventText: string,
  candidates: { id: string; label: string; openQuestion: string; synthetic: string[] }[],
): Promise<ClosureVerdict | null> {
  const list = candidates.map((c) => `- id=${c.id} 「${c.label}」悬置问题：${c.openQuestion}；合成句：${c.synthetic.join(' / ')}`).join('\n')
  const raw = await moonshotChat([
    {
      role: 'system',
      content: `你是「雾尼」叙事记忆引擎的碰撞判定模块。核心问法：Did event B modify the trajectory implied by thread A?——不寻找相似，寻找状态变化。回收的判定问法：「这件事回答了悬置问题吗」。注意：字面零重合不等于无关（「一直卡我的东西」可以回收「卡住她的是设备还是能力」）。逐条判定后只输出 JSON：{"matched":true,"threadId":"...","echoType":"回收","reason":"...","reply":"..."}；全部无关则 {"matched":false,"echoType":"无关","reason":"..."}。reply 为系统对用户说的话，指出闭环两端（多久以前的什么悬置问题 ↔ 今天），不超过 70 字。`,
    },
    { role: 'user', content: `新事件：「${eventText}」\n候选线索：\n${list}` },
  ], { temperature: 0.2 })
  const j = extractJson<ClosureVerdict>(raw)
  if (!j || typeof j.matched !== 'boolean') return null
  if (j.matched && (!j.threadId || !candidates.some((c) => c.id === j.threadId))) return null
  return j
}

/* ---------- 判定三：自由输入碰撞 ---------- */

export interface FreeVerdict {
  verdict: '回收' | '推进' | '反转' | '弱信号' | '无关'
  threadId?: string
  registerThread: boolean
  openQuestion?: string
  reply: string
}

export async function adjudicateFree(
  eventText: string,
  candidates: { id: string; label: string; openQuestion: string }[],
): Promise<FreeVerdict | null> {
  const list = candidates.map((c) => `- id=${c.id} 「${c.label}」：${c.openQuestion}`).join('\n') || '（空）'
  const raw = await moonshotChat([
    {
      role: 'system',
      content: `你是「雾尼」叙事记忆引擎的碰撞判定模块。问法：Did event B modify the trajectory implied by thread A? 单次弱信号不下死判，留软链接。若事件隐含一个尚未闭合的状态且情感强度高，应登记新线索（宽进严升）。只输出 JSON：{"verdict":"推进|回收|反转|弱信号|无关","threadId":"...或null","registerThread":false,"openQuestion":"若登记新线索，提取其悬置的问题","reply":"..."}。reply 以记忆系统口吻，简短温暖，不超过 60 字。`,
    },
    { role: 'user', content: `新事件：「${eventText}」\n活跃/蛰伏线索：\n${list}` },
  ], { temperature: 0.3 })
  const j = extractJson<FreeVerdict>(raw)
  if (!j || typeof j.reply !== 'string' || j.reply.length < 4) return null
  return { ...j, registerThread: !!j.registerThread }
}
