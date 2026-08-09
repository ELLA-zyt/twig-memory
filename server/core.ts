/**
 * 雾尼 Muninn · 无头叙事记忆引擎（服务端核心）
 *
 * 与 src/engine/engine.ts 的关系：
 *   - 前端 demo 的 MuninnEngine 是「带旁白和演出节奏的演示引擎」，保持原样不动。
 *   - 这里的 HeadlessMuninn 是长期会话用的「无头引擎」：无种子数据、无演示时序、
 *     状态真实持久化、时间用真实日期。三层数据结构（碎片/线索/认知）与判定函数
 *     （adjudicateFree / adjudicateCounter）直接复用 src/engine，单一事实来源。
 *
 * MVP 简化（已在 README 声明）：
 *   - 合成句暂用规则生成，未接 embedding；碰撞预筛用字符重合度近似。
 *   - 龙脉值按自然日衰减，在线索被命中时回升。
 */
import { adjudicateCounter, adjudicateFree } from '../src/engine/llm'
import type { Claim, Fragment, Thread, VAD } from '../src/engine/types'

export interface MuninnState {
  fragments: Fragment[]
  threads: Thread[]
  claims: Claim[]
  fragSeq: number
  threadSeq: number
  claimSeq: number
  createdAt: string
  lastTickDate: string
}

export interface IngestResult {
  fragmentId: string
  vad: VAD
  adjudication: 'llm' | 'heuristic'
  action: 'resolved' | 'progressed' | 'softlink' | 'registered' | 'noted'
  threadId?: string
  reply: string
}

export interface ContextPacket {
  userId: string
  generatedAt: string
  threads: { id: string; label: string; openQuestion: string; pool: string; daysOpen: number; dragonVein: number }[]
  claims: { id: string; text: string; conviction: number; boundary: string; status: string }[]
  recentFragments: { id: string; date: string; title: string }[]
  /** 可直接注入宿主 agent system prompt 的叙事上下文文本块 */
  promptText: string
}

const todayStr = () => new Date().toISOString().slice(0, 10)

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(0, Math.round((b - a) / 86400000))
}

/** 粗粒度 VAD 估计（与 demo 同源的规则法；后续可换 LLM 打分） */
function estimateVAD(text: string): VAD {
  const neg = /(累|烦|卡住|坏了|失眠|焦虑|崩溃|担心|害怕|吵架|分手|辞职|丢)/.test(text)
  const pos = /(终于|开心|成了|到手|解决|突破|签|喜欢|顺利|搞定|完成)/.test(text)
  const arousal = Math.min(0.9, 0.35 + (/[！!？?]/.test(text) ? 0.25 : 0) + (neg || pos ? 0.2 : 0))
  return { valence: pos ? 0.6 : neg ? -0.5 : 0, arousal, dominance: 0.5 }
}

/** 字符级重合度（embedding 就位前的预筛近似） */
function charOverlap(a: string, b: string): number {
  const setA = new Set(a.replace(/[\s\p{P}]/gu, ''))
  const setB = new Set(b.replace(/[\s\p{P}]/gu, ''))
  if (setA.size === 0 || setB.size === 0) return 0
  let hit = 0
  for (const ch of setA) if (setB.has(ch)) hit++
  return hit / Math.min(setA.size, setB.size)
}

function emptyState(): MuninnState {
  return {
    fragments: [],
    threads: [],
    claims: [],
    fragSeq: 1,
    threadSeq: 1,
    claimSeq: 1,
    createdAt: new Date().toISOString(),
    lastTickDate: todayStr(),
  }
}

export class HeadlessMuninn {
  private state: MuninnState
  private dirty = false

  constructor(saved?: MuninnState | null) {
    this.state = saved ?? emptyState()
  }

  getState = (): MuninnState => this.state
  isDirty = (): boolean => this.dirty
  markClean(): void { this.dirty = false }

  /* ---------- 会话生命周期：自然日推进 ---------- */

  /** 每次调用前推进一次：更新碎片年龄、龙脉值衰减、线索降池 */
  private tick(): void {
    const today = todayStr()
    const elapsed = daysBetween(this.state.lastTickDate, today)
    if (elapsed <= 0) return

    for (const f of this.state.fragments) {
      f.day = daysBetween(f.dateLabel, today)
    }
    for (const t of this.state.threads) {
      if (t.status !== 'unresolved') continue
      t.dragonVein = Math.max(0, t.dragonVein - 0.03 * elapsed)
      if (t.pool === 'ACTIVE' && t.dragonVein < 0.15) t.pool = 'DORMANT'
      else if (t.pool === 'DORMANT' && t.dragonVein <= 0) {
        t.status = 'abandoned'
        t.pool = 'ARCHIVE'
        t.closureReason = '久无推进，龙脉值衰减归零，降级至二级召回层（廉价可重激活）'
      }
    }
    this.state.lastTickDate = today
    this.dirty = true
  }

  /* ---------- 写入 ---------- */

  private registerFragment(title: string, body: string, vad: VAD, threadIds: string[], tags: string[]): Fragment {
    const f: Fragment = {
      id: `f${this.state.fragSeq++}`,
      day: 0,
      dateLabel: todayStr(),
      title,
      body,
      vad,
      threadIds,
      tags,
    }
    this.state.fragments.unshift(f)
    this.dirty = true
    return f
  }

  private resolveThread(id: string, fragmentId: string, note: string, closureReason: string): boolean {
    const t = this.state.threads.find((x) => x.id === id)
    if (!t || t.status !== 'unresolved') return false
    t.status = 'resolved'
    t.pool = 'ARCHIVE'
    t.closureReason = closureReason
    t.history.push({ day: 0, fragmentId, note })
    this.dirty = true
    return true
  }

  private touchThread(id: string, fragmentId: string, note: string): void {
    const t = this.state.threads.find((x) => x.id === id)
    if (!t) return
    t.history.push({ day: 0, fragmentId, note })
    t.dragonVein = Math.min(1, t.dragonVein + 0.3)
    if (t.pool === 'DORMANT') t.pool = 'ACTIVE'
    this.dirty = true
  }

  private registerThread(label: string, openQuestion: string, fragmentId: string, weight: number): Thread {
    const t: Thread = {
      id: `t${this.state.threadSeq++}`,
      label,
      openQuestion,
      synthetic: {
        abstractFloor: [`一个悬置的状态迎来结局：${openQuestion}`],
        concreteGuesses: [label],
      },
      dragonVein: 0.3,
      emotionalWeight: weight,
      history: [{ day: 0, fragmentId, note: '登记：线索创建' }],
      status: 'unresolved',
      lineage: { parentIds: [], childIds: [] },
      pool: 'ACTIVE',
      softLinks: [],
    }
    this.state.threads.unshift(t)
    this.dirty = true
    return t
  }

  /* ---------- 主入口：登记一条新事件 ---------- */

  async ingest(text: string, opts?: { title?: string; tags?: string[] }): Promise<IngestResult> {
    this.tick()
    const vad = estimateVAD(text)
    const f = this.registerFragment(opts?.title ?? text.slice(0, 16), text, vad, [], opts?.tags ?? [])

    const candidates = this.state.threads
      .filter((t) => t.status === 'unresolved' && (t.pool === 'ACTIVE' || t.pool === 'DORMANT'))
      .map((t) => ({ id: t.id, label: t.label, openQuestion: t.openQuestion }))

    // 优先走实时 LLM 判定（问法：Did event B modify the trajectory implied by thread A?）
    try {
      const verdict = await adjudicateFree(text, candidates)
      if (verdict) return this.applyVerdict(verdict, f, text, vad)
    } catch {
      // 无 key / 网络失败 / 解析失败 → 回退规则判定
    }
    return this.heuristicAdjudicate(f, text, vad)
  }

  private applyVerdict(
    verdict: NonNullable<Awaited<ReturnType<typeof adjudicateFree>>>,
    f: Fragment,
    text: string,
    vad: VAD,
  ): IngestResult {
    const base = { fragmentId: f.id, vad, adjudication: 'llm' as const, reply: verdict.reply }

    if (verdict.registerThread) {
      const t = this.registerThread(
        text.slice(0, 12),
        verdict.openQuestion ?? `「${text.slice(0, 24)}」——这个状态何时闭合？`,
        f.id,
        vad.arousal,
      )
      return { ...base, action: 'registered', threadId: t.id }
    }
    if (verdict.threadId) {
      const tid = verdict.threadId
      if (verdict.verdict === '回收') {
        this.resolveThread(tid, f.id, `回收：${text.slice(0, 16)}`, verdict.reply)
        return { ...base, action: 'resolved', threadId: tid }
      }
      if (verdict.verdict === '推进' || verdict.verdict === '反转') {
        this.touchThread(tid, f.id, `${verdict.verdict}：${text.slice(0, 16)}`)
        return { ...base, action: 'progressed', threadId: tid }
      }
      if (verdict.verdict === '弱信号') {
        const t = this.state.threads.find((x) => x.id === tid)
        if (t) {
          t.softLinks.push({ fragmentId: f.id, note: `弱信号：「${text.slice(0, 18)}」→ 待印证` })
          this.dirty = true
        }
        return { ...base, action: 'softlink', threadId: tid }
      }
    }
    return { ...base, action: 'noted' }
  }

  /** 规则兜底：字符重合近似碰撞 + 高唤醒非终态登记新线索（宽进严升） */
  private heuristicAdjudicate(f: Fragment, text: string, vad: VAD): IngestResult {
    const base = { fragmentId: f.id, vad, adjudication: 'heuristic' as const }

    let best: { t: Thread; score: number } | null = null
    for (const t of this.state.threads) {
      if (t.status !== 'unresolved') continue
      const hay = [t.label, t.openQuestion, ...t.synthetic.abstractFloor, ...t.synthetic.concreteGuesses].join(' ')
      const score = charOverlap(text, hay)
      if (!best || score > best.score) best = { t, score }
    }
    if (best && best.score >= 0.35) {
      best.t.softLinks.push({ fragmentId: f.id, note: `弱信号（规则预筛 ${best.score.toFixed(2)}）：待印证` })
      this.dirty = true
      return { ...base, action: 'softlink', threadId: best.t.id, reply: '记下一条弱信号关联，等待后续印证。' }
    }

    const intendsState = /(想|打算|纠结|还没|一直|准备|计划)/.test(text)
    if (vad.arousal > 0.6 && intendsState) {
      const t = this.registerThread(text.slice(0, 12), `「${text.slice(0, 24)}」——这个状态何时闭合？`, f.id, vad.arousal)
      return { ...base, action: 'registered', threadId: t.id, reply: '登记为一条新线索，等待闭合。' }
    }
    return { ...base, action: 'noted', reply: '已记入碎片层。' }
  }

  /* ---------- 认知层：矛盾响应 ---------- */

  /** 用户陈述与既有论断冲突时：强制显式回应反证，加限定语 + 降置信 + 版本留痕 */
  async counterCheck(claimId: string, userStatement: string): Promise<{ ok: boolean; detail: string }> {
    this.tick()
    const claim = this.state.claims.find((c) => c.id === claimId)
    if (!claim) return { ok: false, detail: `claim ${claimId} 不存在` }

    try {
      const verdict = await adjudicateCounter(claim.text, claim.conviction, userStatement)
      if (verdict && verdict.hasConflict) {
        claim.counterEvidence.push({
          text: `用户自述：「${userStatement}」`,
          resolution: `未被解释掉——采纳为有效反证（${verdict.conflictType}）：论断加限定语，置信下调。`,
        })
        claim.versions.push({
          at: todayStr(),
          text: verdict.revised,
          conviction: verdict.conviction,
          reason: '矛盾响应：用户自述反证 → 加限定 + 降置信',
        })
        claim.text = verdict.revised
        claim.conviction = verdict.conviction
        this.dirty = true
        return { ok: true, detail: verdict.reply }
      }
      return { ok: true, detail: verdict?.reply ?? '未发现直接冲突。' }
    } catch {
      return { ok: false, detail: 'LLM 判定不可用（未配置 KIMI_API_KEY 或网络失败）' }
    }
  }

  /* ---------- 用户权利 ---------- */

  listClaims(): Claim[] {
    return this.state.claims
  }

  /** 删除降级为 contested：事实层不可改，诠释层用户有最终解释权 */
  contestClaim(claimId: string, note: string): boolean {
    const claim = this.state.claims.find((c) => c.id === claimId)
    if (!claim) return false
    claim.status = 'contested'
    claim.contestedNote = note
    this.dirty = true
    return true
  }

  /* ---------- 检索：叙事上下文包 ---------- */

  getContextPacket(userId: string): ContextPacket {
    this.tick()
    const today = todayStr()

    const threads = this.state.threads
      .filter((t) => t.status === 'unresolved')
      .sort((a, b) => b.dragonVein - a.dragonVein)
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        label: t.label,
        openQuestion: t.openQuestion,
        pool: t.pool,
        daysOpen: t.history.length > 0 ? daysBetween(this.fragmentDate(t.history[0].fragmentId) ?? today, today) : 0,
        dragonVein: Number(t.dragonVein.toFixed(2)),
      }))

    const claims = this.state.claims
      .filter((c) => c.status === 'active')
      .sort((a, b) => b.conviction - a.conviction)
      .slice(0, 8)
      .map((c) => ({ id: c.id, text: c.text, conviction: c.conviction, boundary: c.boundary, status: c.status }))

    const recentFragments = this.state.fragments
      .slice(0, 5)
      .map((f) => ({ id: f.id, date: f.dateLabel, title: f.title }))

    return {
      userId,
      generatedAt: new Date().toISOString(),
      threads,
      claims,
      recentFragments,
      promptText: renderPromptText(threads, claims, recentFragments),
    }
  }

  private fragmentDate(id: string): string | null {
    return this.state.fragments.find((f) => f.id === id)?.dateLabel ?? null
  }
}

function renderPromptText(
  threads: ContextPacket['threads'],
  claims: ContextPacket['claims'],
  fragments: ContextPacket['recentFragments'],
): string {
  const lines: string[] = ['【叙事上下文 · 雾尼 Muninn】']
  if (threads.length > 0) {
    lines.push('进行中的线索（悬置、等待闭合的问题）：')
    for (const t of threads) lines.push(`- 「${t.label}」${t.openQuestion}（已开放 ${t.daysOpen} 天，${t.pool}）`)
  }
  if (claims.length > 0) {
    lines.push('对用户的当前理解（随证据修正，括号为置信度）：')
    for (const c of claims) lines.push(`- ${c.text}（${c.conviction.toFixed(2)}）${c.boundary ? `｜边界：${c.boundary}` : ''}`)
  }
  if (fragments.length > 0) {
    lines.push('近期事件：')
    for (const f of fragments) lines.push(`- ${f.date} ${f.title}`)
  }
  lines.push('说明：以上是关于用户的长期记忆组织，不是逐字历史；认知层内容可能已被新证据修正，请当作背景理解而非事实清单引用。')
  return lines.join('\n')
}
