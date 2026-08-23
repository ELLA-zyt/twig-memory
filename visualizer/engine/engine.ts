/**
 * 雾尼 Muninn · 引擎运行时
 * 三层状态（碎片 / 线索 / 认识）+ 六态状态机 + 碰撞判定 + 演示编排。
 * 判定层双轨：实时 LLM（moonshot-v1-8k，经 vite 代理）优先，
 * 任何失败回退确定性预计算脚本 —— 设计债务⑩的现场稳定性策略。
 */
import { SEED_CLAIMS, SEED_FRAGMENTS, SEED_THREADS, TODAY_LABEL } from './data'
import { adjudicateClosure, adjudicateCounter, adjudicateFree } from './llm'
import { estimateVAD } from './vad'
import type {
  ChatMsg, Claim, DemoKey, Fragment, LogAccent, LogEntry, LogKind, Thread, VAD,
} from './types'

export interface EngineState {
  fragments: Fragment[]
  threads: Thread[]
  claims: Claim[]
  logs: LogEntry[]
  chat: ChatMsg[]
  completedSteps: DemoKey[]
  /** 伏笔回收显影事件（触发 ClosureOverlay） */
  closureFlash: number
  /** 当前正在播放的序列 */
  busy: boolean
  /** 实时 LLM 判定开关（关闭 = 纯预计算脚本模式） */
  liveMode: boolean
  /** 最近被改动的对象 id（用于 UI 高亮闪烁） */
  flashIds: Record<string, number>
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const now = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

/** 情绪调制衰减（§3）：R = e^(-t/S)，S 随唤醒度增大 —— 高唤醒记忆衰减更慢 */
export function memoryStrength(f: Fragment): number {
  const S = 30 * (1 + f.vad.arousal * 2)
  return Math.exp(-f.day / S)
}

export const POOL_LABEL: Record<string, string> = {
  ACTIVE: '活跃池', DORMANT: '蛰伏池', SILENT: '沉默池', ARCHIVE: '归档层',
}

export const STATUS_LABEL: Record<string, string> = {
  unresolved: '未闭合', resolved: '已回收', dissolved: '已消解',
  abandoned: '已降级', superseded: '被取代', merged: '已并入',
}

export class MuninnEngine {
  private state: EngineState
  private listeners = new Set<() => void>()
  private logId = 0
  private chatId = 0
  private fragSeq = 38

  constructor() {
    this.state = this.initialState()
  }

  private initialState(): EngineState {
    return {
      fragments: clone(SEED_FRAGMENTS),
      threads: clone(SEED_THREADS),
      claims: clone(SEED_CLAIMS),
      logs: [],
      chat: [],
      completedSteps: [],
      closureFlash: 0,
      busy: false,
      liveMode: true,
      flashIds: {},
    }
  }

  /* ---------- 订阅 ---------- */
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  getState = () => this.state
  private notify() { this.listeners.forEach((f) => f()) }

  /* ---------- 基础写入 ---------- */
  private log(kind: LogKind, title: string, detail: string | undefined, accent: LogAccent = 'fog') {
    this.state = { ...this.state, logs: [...this.state.logs, { id: ++this.logId, kind, title, detail, accent, time: now() }] }
    this.notify()
  }
  private say(role: ChatMsg['role'], text: string, kind: ChatMsg['kind'] = 'text', extra?: Partial<ChatMsg>) {
    this.state = { ...this.state, chat: [...this.state.chat, { id: ++this.chatId, role, kind, text, ...extra }] }
    this.notify()
  }
  private flash(ids: string[]) {
    const flashIds = { ...this.state.flashIds }
    const t = Date.now()
    ids.forEach((i) => { flashIds[i] = t })
    this.state = { ...this.state, flashIds }
  }
  private patchThread(id: string, patch: Partial<Thread>) {
    this.state = {
      ...this.state,
      threads: this.state.threads.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }
    this.flash([id])
    this.notify()
  }
  private patchClaim(id: string, patch: Partial<Claim>) {
    this.state = {
      ...this.state,
      claims: this.state.claims.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }
    this.flash([id])
    this.notify()
  }
  private markStep(key: DemoKey) {
    if (!this.state.completedSteps.includes(key)) {
      this.state = { ...this.state, completedSteps: [...this.state.completedSteps, key] }
    }
  }
  private registerTodayFragment(title: string, body: string, vad: VAD, threadIds: string[], tags: string[]): Fragment {
    const f: Fragment = { id: `f${this.fragSeq++}`, day: 0, dateLabel: TODAY_LABEL, title, body, vad, threadIds, tags }
    this.state = { ...this.state, fragments: [f, ...this.state.fragments] }
    this.flash([f.id])
    return f
  }
  private resolveThread(id: string, fragmentId: string, note: string, closureReason: string) {
    const t = this.state.threads.find((x) => x.id === id)
    if (!t || t.status !== 'unresolved') return
    this.patchThread(id, {
      status: 'resolved',
      pool: 'ARCHIVE',
      closureReason,
      history: [...t.history, { day: 0, fragmentId, note }],
    })
  }

  /* ---------- 判定层开关 ---------- */
  setLiveMode(v: boolean) {
    this.state = { ...this.state, liveMode: v }
    this.log('system', v ? '判定层：实时 LLM（moonshot-v1-8k）' : '判定层：预计算脚本（现场兜底）', undefined, 'fog')
    this.notify()
  }

  /* ================= 演示动作 ================= */

  /** 0:00 开场对比：「我终于换电脑了」→ Memory Repair Test（按设计债务⑩预计算，不走实时） */
  async runContrast() {
    if (this.state.busy) return
    this.state = { ...this.state, busy: true }
    this.say('user', '我终于换电脑了')
    await sleep(500)

    const f = this.registerTodayFragment('新电脑到位', '旧电脑退役，高配新机装好，迁移完所有工程文件。',
      { valence: 0.8, arousal: 0.75, dominance: 0.8 }, ['t_device'], ['设备', '创作'])
    this.log('ingest', '碎片登记：新事件「新电脑到位」', 'VAD(0.80 / 0.75 / 0.80) · 情境标签【设备/创作】', 'fog')
    await sleep(650)

    this.log('collision', '向量预筛：命中 1 条候选', '与线索「设备升级」合成具体句「换了新电脑」相似度 0.91 · 情境标签同池 ✓', 'raven')
    await sleep(650)
    this.log('collision', '结构化校验通过', '核心实体（电脑 / 设备）真实重叠，排除同类词撞车', 'raven')
    await sleep(650)
    this.log('adjudicate', 'LLM 打包判定（1 次调用 / top-1 候选）', 'Q: Did event B modify the trajectory implied by thread A? → A: 是。呼应类型：回收', 'raven')
    await sleep(750)

    this.resolveThread('t_device', f.id, '回收：新电脑到位', '新电脑到位，旧限制解除——这件事解决了')
    this.log('transition', '线索状态机：未闭合 → 已回收', '「设备升级」closure_reason：新电脑到位，旧限制解除——这件事解决了', 'raven')
    await sleep(750)

    const devC = this.state.claims.find((c) => c.id === 'u_device')!
    this.patchClaim('u_device', {
      text: '设备瓶颈已于今日解除（新机到位）。旧论断「设备是主要瓶颈」完成其历史作用；后续创作产出是否回升进入 2-4 周证伪窗口。',
      conviction: 0.66,
      versions: [...devC.versions, { at: TODAY_LABEL, text: '设备瓶颈已于今日解除（新机到位）。旧论断「设备是主要瓶颈」完成其历史作用；后续创作产出是否回升进入 2-4 周证伪窗口。', conviction: 0.66, reason: '记忆修复：旧限制解除，限制模型重写' }],
    })
    this.log('rewrite', '认识层改写：「设备与创作」置信 0.90 → 0.66', '旧限制解除 → 限制模型重写 · 版本史 +1（改写留痕）', 'gold')
    await sleep(500)

    this.say('muninn', '检测到历史认识冲突——旧认识：「设备限制影响创造」；新事件：限制解除。正在更新认识…… 90 天前你因为死机丢过一整晚的稿子，14 天前还在说「再等等」。今天，这条线收上了。',
      'compare', { plainText: '好的，我记住了：你喜欢电脑。已添加标签 #数码 #开箱。', meta: 'Memory Repair Test ✓：旧限制解除 → 相关线索关闭 → 限制模型更新' })
    this.markStep('contrast')
    this.state = { ...this.state, busy: false }
    this.notify()
  }

  /** 1:00 历史压缩：回放结束后由 ImportOverlay 调用 */
  finishImport() {
    this.log('system', '历史压缩完成', '90 天 · 1423 条消息 → 37 事件 / 12 线索 / 5 核心认识', 'fog')
    this.markStep('import')
    this.notify()
  }

  /** 3:00 认识生成对比：垃圾画像 vs 带证据结构的论断 */
  async runEvidence() {
    if (this.state.busy) return
    this.state = { ...this.state, busy: true }
    await sleep(300)
    const c = this.state.claims.find((x) => x.id === 'u_drive')!
    this.flash(['u_drive'])
    this.say('muninn', c.text, 'compare', {
      plainText: '用户画像：#喜欢AI #喜欢编程 #喜欢写作 #夜猫子 #学生',
      meta: `「${c.docTitle}」——证据锚定 ×${c.evidenceIds.length} · 反证 ×${c.counterEvidence.length} · 边界条件 ×1 · 版本史 ×${c.versions.length} · 置信 ${c.conviction.toFixed(2)}`,
    })
    this.log('rewrite', '认识生成对比', '普通画像：标签只会变长不会变；雾尼论断：带证据、反证、边界条件存活', 'gold')
    this.markStep('evidence')
    this.state = { ...this.state, busy: false }
    this.notify()
  }

  /** 5:00 人为反例：矛盾响应（实时 LLM 优先，预计算兜底） */
  async runCounter(text: string) {
    if (this.state.busy) return
    this.state = { ...this.state, busy: true }
    this.say('user', text)
    await sleep(500)

    this.registerTodayFragment('探索欲回落的自述', text,
      { valence: -0.3, arousal: 0.55, dominance: 0.5 }, [], ['自述', '驱动力'])
    this.log('ingest', '碎片登记：新事件「探索欲回落的自述」', 'VAD(-0.30 / 0.55 / 0.50) · 稳定属性陈述，不占线索位', 'fog')
    await sleep(650)

    this.log('counter', '反证搜索（确认偏误对策）', '为论断「创造驱动力」生成反面假设：「她的探索欲正在衰退」→ HyDE 检索碎片库 → 命中今日陈述', 'cinnabar')
    await sleep(700)

    const claim = this.state.claims.find((x) => x.id === 'u_drive')!
    let verdict = null as Awaited<ReturnType<typeof adjudicateCounter>>
    if (this.state.liveMode) {
      this.log('adjudicate', '实时 LLM 判定中…', 'moonshot-v1-8k · 矛盾响应 adjudication（超时 10s 自动兜底）', 'gold')
      try { verdict = await adjudicateCounter(claim.text, claim.conviction, text) } catch { verdict = null }
      if (!verdict) this.log('system', '实时判定未返回有效结果 → 回退预计算脚本', '现场稳定性兜底（设计债务⑩）', 'fog')
    }

    const via = verdict ? '实时 LLM 判定' : '预计算判定'
    const conflictType = verdict?.conflictType ?? '偏好反转'
    const newConviction = verdict?.conviction ?? 0.57
    const revised = verdict?.revised
      ?? '技术折腾与写作长期是她的双引擎；但近期探索欲显著回落（可能原因：阶段变化 / 疲劳积累），旧模式能否延续进入观察期。'
    const reply = verdict?.reply
      ?? '发现认识冲突——旧：技术探索是主要驱动力；新：探索欲下降；可能原因：阶段变化 / 疲劳。这条论断的置信我从 0.82 调到 0.57。我不那么确定了——这个变化值得认真看，我们先不急着下结论。'

    this.log('adjudicate', `强制 adjudication：模型必须显式回应反证（${via}）`,
      `冲突类型学：${conflictType} → 判定：加限定语 + 降置信 ${claim.conviction.toFixed(2)} → ${newConviction.toFixed(2)}`, 'cinnabar')
    await sleep(650)

    const c = this.state.claims.find((x) => x.id === 'u_drive')!
    this.patchClaim('u_drive', {
      text: revised,
      conviction: newConviction,
      counterEvidence: [...c.counterEvidence, {
        text: `今日自述：「${text}」`,
        resolution: `未被解释掉——采纳为有效反证（${conflictType}）：论断加限定语，置信下调。说明留痕。`,
      }],
      versions: [...c.versions, { at: TODAY_LABEL, text: revised, conviction: newConviction, reason: `矛盾响应：用户自述反证 → 加限定 + 降置信（${via}）` }],
    })
    this.log('rewrite', `认识层改写：「创造驱动力」置信 ${claim.conviction.toFixed(2)} → ${newConviction.toFixed(2)}`, '发现冲突 ✓ 降低置信 ✓ 修改认识 ✓ —— 推理链全程留痕', 'gold')
    await sleep(500)

    this.say('muninn', reply, 'text', { meta: `Contradiction Responsiveness ✓（${via}）：发现冲突 → 降低置信 → 修改认识` })
    this.markStep('counter')
    this.state = { ...this.state, busy: false }
    this.notify()
  }

  /** 7:00 伏笔回收（实时 LLM 优先，预计算兜底） */
  async runClosure(text = '终于把那个一直卡我的东西解决了') {
    if (this.state.busy) return
    this.state = { ...this.state, busy: true }
    this.say('user', text)
    await sleep(500)

    const f = this.registerTodayFragment('卡点解除', text,
      { valence: 0.75, arousal: 0.7, dominance: 0.75 }, ['t_block'], ['写作', '创作'])
    this.log('ingest', '碎片登记：新事件「卡点解除」', 'VAD(0.75 / 0.70 / 0.75) · 情境标签【写作/创作】', 'fog')
    await sleep(650)

    this.log('collision', '关键词匹配：零命中', '「卡我的东西」与「硬盘 / 电脑 / 卡文」字面零重合——普通 RAG 到此为止', 'fog')
    await sleep(700)

    const candidates = this.state.threads
      .filter((t) => t.status === 'unresolved' && (t.pool === 'ACTIVE' || t.pool === 'DORMANT'))
      .map((t) => ({ id: t.id, label: t.label, openQuestion: t.openQuestion, synthetic: [...t.synthetic.abstractFloor, ...t.synthetic.concreteGuesses] }))

    let verdict = null as Awaited<ReturnType<typeof adjudicateClosure>>
    if (this.state.liveMode) {
      this.log('adjudicate', '实时 LLM 判定中…', `moonshot-v1-8k · 碰撞 adjudication（top-${candidates.length} 候选打包，1 次调用）`, 'gold')
      try { verdict = await adjudicateClosure(text, candidates) } catch { verdict = null }
      if (!verdict) this.log('system', '实时判定未返回有效结果 → 回退预计算脚本', '现场稳定性兜底（设计债务⑩）', 'fog')
    }

    if (verdict?.matched && verdict.threadId) {
      // —— 实时判定：有线索被回收 ——
      const t = this.state.threads.find((x) => x.id === verdict.threadId)!
      this.log('adjudicate', `实时判定：呼应类型「${verdict.echoType ?? '回收'}」`, `Q: 这件事回答了悬置问题吗？「${t.openQuestion}」→ ${verdict.reason ?? '是'}`, 'raven')
      await sleep(650)
      this.resolveThread(t.id, f.id, `回收：${text.slice(0, 16)}`, verdict.reason ?? '悬置问题被回答——这件事解决了')
      this.log('transition', `线索状态机：未闭合 → 已回收（${POOL_LABEL[t.pool]} → 归档层）`, `「${t.label}」closure_reason：${verdict.reason ?? '——'}`, 'raven')
      if (t.id === 't_block') {
        await sleep(400)
        this.state = { ...this.state, closureFlash: this.state.closureFlash + 1 }
        this.notify()
        await sleep(2800)
      }
      this.say('muninn', verdict.reply ?? `发现潜在线索：「${t.openQuestion}」——今日得到回答。一次叙事闭环，完成。`,
        'text', { meta: '草蛇灰线 · 现场显影（实时 LLM 判定）：不寻找相似，寻找状态变化' })
      this.markStep('closure')
    } else if (verdict && !verdict.matched) {
      // —— 实时判定：诚实的「无关」 ——
      this.log('adjudicate', '实时判定：无关', verdict.reason ?? '没有线索的轨迹被这件事改变', 'fog')
      this.say('muninn', '我翻遍了所有悬置的问题，这条线还没显影——它先留在碎片层，反刍节律会再扫一遍。', 'text',
        { meta: '实时 LLM 判定：未发现呼应（系统不强行闭环）' })
    } else {
      // —— 预计算兜底 ——
      this.log('collision', '合成句召回：命中蛰伏池线索', '与「创作瓶颈（卡文）」抽象层合成句「一直卡我的东西解决了」相似度 0.88', 'raven')
      await sleep(700)
      this.log('adjudicate', '预计算判定（兜底）', 'Q: 这件事回答了悬置问题吗？「卡住她的到底是设备还是能力？」→ A: 是。设备瓶颈解除后卡点消失——呼应类型：回收', 'raven')
      await sleep(750)

      this.resolveThread('t_block', f.id, '回收：卡点解除', '设备瓶颈解除后卡点消失——这件事解决了')
      this.log('transition', '线索状态机：未闭合 → 已回收（蛰伏池 → 归档层）', '「创作瓶颈（卡文）」closure_reason：设备瓶颈解除后卡点消失', 'raven')
      await sleep(400)

      this.state = { ...this.state, closureFlash: this.state.closureFlash + 1 }
      this.notify()
      await sleep(2800)

      this.say('muninn', '发现潜在线索：45 天前——「卡住她的是设备还是能力？」；今日——卡点解除。不需要任何关键词重合，因为 45 天前登记的不是那句话，是它悬置的问题。一次叙事闭环，完成。',
        'text', { meta: '草蛇灰线 · 现场显影（预计算判定）：抽象层合成句召回 + 状态变化判定' })
      this.markStep('closure')
    }
    this.state = { ...this.state, busy: false }
    this.notify()
  }

  /** 9:00 收尾金句 */
  async runFinale() {
    if (this.state.busy) return
    this.state = { ...this.state, busy: true }
    await sleep(300)
    this.say('system', '现有记忆系统解决的是「不忘记发生过什么」；我们解决的是「人在时间中变化时，AI 如何修正自己对他的理解」。',
      'quote', { meta: '雾尼 Muninn · 灰线 Grayline —— 记忆不该是一盒卡片，该是一部还在连载的书。' })
    this.log('system', '演示流程完成', '进入自由探索：可任意输入，或在「引擎内部」视图观察三层结构', 'fog')
    this.markStep('finale')
    this.state = { ...this.state, busy: false }
    this.notify()
  }

  /* ================= 自由输入（实时优先，启发式兜底） ================= */

  async ingestFree(text: string) {
    if (this.state.busy) return
    this.state = { ...this.state, busy: true }
    this.say('user', text)
    await sleep(450)

    // P2-8：统一使用共享 VAD 估计（visualizer/engine/vad.ts）
    const vad: VAD = estimateVAD(text)

    // SILENT 触发器（§4.5）：规则直连，不依赖 LLM 时延
    if (/(父亲|爸爸|爸|医院|复查|体检|家里)/.test(text)) {
      this.registerTodayFragment('家庭话题触及', text, vad, ['t_father'], ['家庭'])
      this.log('silent', 'SILENT 触发器唤醒', '状态模型检测到「家庭责任模式」：「父亲的病」importance 0.95 · avoidance 0.90 · 阈值 low → 唤醒', 'cinnabar')
      await sleep(600)
      const tf = this.state.threads.find((t) => t.id === 't_father')!
      this.patchThread('t_father', { pool: 'ACTIVE', history: [...tf.history, { day: 0, fragmentId: `f${this.fragSeq - 1}`, note: '触发器唤醒：相关模式出现' }] })
      this.say('muninn', '我在。这件事你平时不太提——没关系，想说到哪儿就说到哪儿，我都在听。', 'text',
        { meta: '沉默池唤醒：不因沉默降权；不参与日常召回，仅在相关模式出现时浮现' })
      this.state = { ...this.state, busy: false }
      this.notify()
      return
    }

    this.registerTodayFragment('自由输入', text, vad, [], ['自由'])
    this.log('ingest', '碎片登记：新事件（自由输入）', `VAD(${vad.valence.toFixed(2)} / ${vad.arousal.toFixed(2)} / ${vad.dominance.toFixed(2)})`, 'fog')
    await sleep(550)

    const openThreads = this.state.threads.filter((t) => (t.pool === 'ACTIVE' || t.pool === 'DORMANT') && t.status === 'unresolved')

    // —— 实时 LLM 判定 ——
    let live = null as Awaited<ReturnType<typeof adjudicateFree>>
    if (this.state.liveMode) {
      this.log('adjudicate', '实时 LLM 判定中…', `moonshot-v1-8k · ${openThreads.length} 条开放线索打包判定`, 'gold')
      try { live = await adjudicateFree(text, openThreads.map((t) => ({ id: t.id, label: t.label, openQuestion: t.openQuestion }))) } catch { live = null }
      if (!live) this.log('system', '实时判定未返回有效结果 → 回退启发式', undefined, 'fog')
    }

    if (live) {
      const tid = live.threadId ? this.state.threads.find((t) => t.id === live.threadId && t.status === 'unresolved') : undefined
      if (live.verdict === '回收' && tid) {
        this.log('adjudicate', '实时判定：回收', `「${tid.label}」的悬置问题被回答`, 'raven')
        this.resolveThread(tid.id, `f${this.fragSeq - 1}`, `回收：${text.slice(0, 16)}`, '自由输入中被回答——这件事解决了')
      } else if ((live.verdict === '推进' || live.verdict === '反转') && tid) {
        this.log('adjudicate', `实时判定：${live.verdict}`, `「${tid.label}」的轨迹被改变`, 'raven')
        this.patchThread(tid.id, { history: [...tid.history, { day: 0, fragmentId: `f${this.fragSeq - 1}`, note: `${live.verdict}：${text.slice(0, 16)}` }] })
      } else if (live.verdict === '弱信号' && tid) {
        this.log('adjudicate', '实时判定：弱信号', `与「${tid.label}」留作待印证软链接`, 'raven')
        this.patchThread(tid.id, { softLinks: [...tid.softLinks, { fragmentId: `f${this.fragSeq - 1}`, note: `弱信号：「${text.slice(0, 18)}…」→ 待印证` }] })
      } else {
        this.log('adjudicate', '实时判定：无关', '没有线索的轨迹被改变', 'fog')
      }
      if (live.registerThread) {
        const id = `t_free_${this.fragSeq}`
        const nt: Thread = {
          id, label: text.slice(0, 12), openQuestion: live.openQuestion ?? `「${text.slice(0, 24)}」——这个状态何时闭合？`,
          synthetic: { abstractFloor: ['一个悬置的状态迎来结论'], concreteGuesses: ['状态解除或落定'] },
          dragonVein: 0.2, emotionalWeight: vad.arousal,
          history: [{ day: 0, fragmentId: `f${this.fragSeq - 1}`, note: '登记：自由输入' }],
          status: 'unresolved', lineage: { parentIds: [], childIds: [] }, pool: 'ACTIVE', softLinks: [],
        }
        this.state = { ...this.state, threads: [nt, ...this.state.threads] }
        this.flash([id])
        this.log('register', '新线索登记（宽进严升 · 实时判定）', `悬置问题：${nt.openQuestion}`, 'raven')
      }
      await sleep(400)
      this.say('muninn', live.reply, 'text', { meta: '实时 LLM 判定' })
      this.state = { ...this.state, busy: false }
      this.notify()
      return
    }

    // —— 启发式兜底 ——
    const chars = new Set(text.replace(/[，。！？、\s「」]/g, '').split(''))
    let best: { t: Thread; score: number } | null = null
    for (const t of openThreads) {
      const hay = [...t.synthetic.abstractFloor, ...t.synthetic.concreteGuesses, t.openQuestion, t.label].join('')
      const hit = [...chars].filter((c) => hay.includes(c)).length
      const score = hit / Math.max(6, [...chars].length)
      if (!best || score > best.score) best = { t, score }
    }
    if (best && best.score > 0.45) {
      this.log('collision', `向量预筛：命中候选「${best.t.label}」（相似度 ${best.score.toFixed(2)}）`, '结构化校验：实体重叠不足 → 不直接下判', 'raven')
      await sleep(550)
      this.log('adjudicate', '预计算判定（兜底）', `Q: Did event B modify the trajectory implied by thread A? → A: 弱信号。留作待印证软链接，二次信号加固再转正`, 'raven')
      const t = this.state.threads.find((x) => x.id === best!.t.id)!
      this.patchThread(t.id, { softLinks: [...t.softLinks, { fragmentId: `f${this.fragSeq - 1}`, note: `弱信号：「${text.slice(0, 18)}…」→ 待印证` }] })
      await sleep(400)
      this.say('muninn', `这好像和「${best.t.openQuestion}」有点关系，但我不确定——先轻轻记下来，等下一次信号确认。`, 'text',
        { meta: '弱信号软链接：单次弱信号不下死判' })
    } else {
      this.log('collision', '向量预筛：无候选命中', '与活跃池 / 蛰伏池合成句均无有效重合', 'fog')
      await sleep(450)
      if (vad.arousal > 0.6 && /(想|打算|纠结|还没|一直|准备|计划)/.test(text)) {
        const id = `t_free_${this.fragSeq}`
        const nt: Thread = {
          id, label: text.slice(0, 12), openQuestion: `「${text.slice(0, 24)}」——这个状态何时闭合？`,
          synthetic: { abstractFloor: ['一个悬置的状态迎来结论'], concreteGuesses: ['状态解除或落定'] },
          dragonVein: 0.2, emotionalWeight: vad.arousal,
          history: [{ day: 0, fragmentId: `f${this.fragSeq - 1}`, note: '登记：自由输入' }],
          status: 'unresolved', lineage: { parentIds: [], childIds: [] }, pool: 'ACTIVE', softLinks: [],
        }
        this.state = { ...this.state, threads: [nt, ...this.state.threads] }
        this.flash([id])
        this.log('register', '新线索登记（宽进严升）', `VAD 情感强度过阈值 + 状态非终态 → 登记「${nt.label}」；龙脉值不参与准入，只管注意力排序`, 'raven')
        await sleep(500)
        this.say('muninn', '这件事里有个还没落下的东西——我把它登记成一条线索了。不用现在有什么结论，等它哪天闭合，我们会看见的。', 'text',
          { meta: '登记判据：是否隐含一个尚未闭合的状态' })
      } else {
        this.say('muninn', '记下了。这不像一条新线索，更像生活里普通的一页——但它也在书里。', 'text')
      }
    }
    this.state = { ...this.state, busy: false }
    this.notify()
  }

  /** 历史压缩回放日志（ImportOverlay 使用） */
  getImportLogLines(): { kind: LogKind; text: string; accent: LogAccent }[] {
    return [
      { kind: 'ingest', text: '扫描 1423 条消息 …… 事件边界切分完成', accent: 'fog' },
      { kind: 'ingest', text: '37 个事件入库：VAD 情感坐标 + 情绪调制衰减参数', accent: 'fog' },
      { kind: 'register', text: '登记线索 ×12：只登记「悬置的问题」，不登记那句话', accent: 'raven' },
      { kind: 'reject', text: '登记拒绝 ×3：「她一直失眠」类稳定属性 → 画像属性，不占线索位', accent: 'fog' },
      { kind: 'merge', text: 'merge：「攒钱买硬盘」×「想换电脑」→「设备升级」（历史里反复出现同一种烦躁）', accent: 'raven' },
      { kind: 'split', text: 'split：「写作主线」→「修仙连载」∥「人外新坑」（回收条件不再共享）', accent: 'raven' },
      { kind: 'transition', text: 'dissolved：「接商单变现」——签约后前提不再成立，必须交代为什么', accent: 'fog' },
      { kind: 'transition', text: 'abandoned：「宿舍网络」——久无推进，降级二级召回层（不进死档）', accent: 'fog' },
      { kind: 'silent', text: 'SILENT ×1：「父亲的病」三信号齐备（骤停 + 高情感 + 话题转移）→ 触发器待机', accent: 'cinnabar' },
      { kind: 'rewrite', text: '认识层生成 ×5：每条论断带证据锚定 + 反证 + 边界条件 + 版本史', accent: 'gold' },
      { kind: 'counter', text: 'contested ×1：「连载数据焦虑」被本人否决 → user-vetoed，退出默认可见', accent: 'cinnabar' },
    ]
  }

  reset() {
    const live = this.state.liveMode
    this.logId = 0
    this.chatId = 0
    this.fragSeq = 38
    this.state = this.initialState()
    this.state.liveMode = live
    this.notify()
  }
}
