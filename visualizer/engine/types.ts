/**
 * 雾尼 Muninn · 三层叙事记忆引擎 — 核心类型
 * 依据《叙事记忆引擎-技术设计文档 v1.1》§3-§5 实现
 */

/** VAD 情感坐标（§3）：三维连续值，非离散标签 */
export interface VAD {
  valence: number   // 效价 -1..1
  arousal: number   // 唤醒 0..1
  dominance: number // 支配 0..1
}

/* ---------------- 碎片层（specific episodes） ---------------- */

export type FragmentId = string

/** 事实层本人修正标注（§5.4 设计债务⑥）：不改原文，只追加——改了就是改写历史 */
export interface FragmentCorrection {
  at: string
  note: string
}

export interface ContextAnchor {
  type: string
  shadowFragmentId: string
  notePreview: string
}

export interface Fragment {
  id: FragmentId
  day: number          // 距今天数，0 = 今天
  dateLabel: string    // 「5月9日」
  title: string
  body: string
  vad: VAD
  threadIds: string[]  // 关联线索
  tags: string[]       // 情境标签（碰撞时分池物理隔离）
  correction?: FragmentCorrection
  /** 影子碎片：来自情感层（便签/印章），不污染编织层 */
  shadow?: boolean
  source?: 'note' | 'stamp' | string
  noteId?: string
  contextAnchor?: ContextAnchor
}

/* ---------------- 线索层（general events / 草蛇灰线系统） ---------------- */

export type ThreadStatus =
  | 'unresolved'  // 默认开放态
  | 'resolved'    // 事件回答了悬置问题
  | 'dissolved'   // 事件使问题前提不再成立
  | 'abandoned'   // 久无推进 + 龙脉值衰减 → 二级召回层（廉价可重激活）
  | 'superseded'  // 框架被替换而非并入
  | 'merged'      // 并入他线的专属终态

export type Pool = 'ACTIVE' | 'DORMANT' | 'SILENT' | 'ARCHIVE'

export interface ThreadEvent {
  day: number
  fragmentId: string
  note: string
}

/** 合成句双层结构（§4.4 HyDE 迁移） */
export interface SyntheticSentences {
  abstractFloor: string[]   // 抽象层：召回兜底，t=0 起存在
  concreteGuesses: string[] // 具体层：「回收会长什么样」的猜测
}

/** SILENT 池信号（§4.5） */
export interface SilentSignals {
  importance: number
  mentionFrequency: number
  avoidanceSignal: number
  triggerThreshold: 'low' | 'medium' | 'high'
}

export interface SoftLink {
  fragmentId: string
  note: string
}

export interface Thread {
  id: string
  label: string             // 短名「攒钱买硬盘」
  openQuestion: string      // 悬置的问题
  synthetic: SyntheticSentences
  dragonVein: number        // 龙脉值 0..1（只管「看哪里」，不管「记不记」）
  emotionalWeight: number   // 缓存值，由 event_history 派生
  history: ThreadEvent[]
  status: ThreadStatus
  closureReason?: string    // dissolved 必须交代「为什么不再成立」
  lineage: { parentIds: string[]; childIds: string[] }
  pool: Pool
  silentSignals?: SilentSignals
  softLinks: SoftLink[]
}

/* ---------------- 认识层（lifetime periods / 长程理解层） ---------------- */

export interface ClaimVersion {
  at: string
  text: string
  conviction: number
  reason: string
}

/** 反证（§5.2 确认偏误对策）：必须显式回应，说明留痕 */
export interface CounterEvidence {
  text: string
  fragmentId?: string
  resolution: string        // 「为什么这条反证不足以推翻」——不许悄悄吞掉
}

/** 风险分级（§5.3 设计债务⑤）：高风险事项永不参与对照窗口——「明知可能受伤也不提醒」的伦理代价不可接受 */
export type RiskLevel = 'low' | 'medium' | 'high'

/** 对照窗口（§5.3 断路器三）：系统主动不干预期，为信念收集干净的反事实证据 */
export interface ControlWindow {
  startedAt: string
  endsAt: string
  status: 'open' | 'confirmed' | 'failed' | 'inconclusive' | 'aborted'
  closedAt?: string
  /** 窗口结论说明（干净样本数 / 内生排除数 / 中止原因） */
  note?: string
}

export interface Claim {
  id: string
  docTitle: string
  text: string
  conviction: number        // 0..1 置信分，非布尔
  evidenceIds: FragmentId[] // 证据锚定：每条论断必须引用支撑碎片 ID
  counterEvidence: CounterEvidence[]
  boundary: string          // 边界条件
  versions: ClaimVersion[]  // 版本史：改写留痕
  status: 'active' | 'contested'
  contestedNote?: string
  riskLevel?: RiskLevel     // 风险分级（§5.3）：仅 low 可进对照窗口；缺省时惰性分级
  window?: ControlWindow    // 对照窗口记录（终态保留，可追溯）
  /** 被否决次数（§5.4 设计债务⑦ 防纠缠）：≥2 次永久封存，不再进入再提通道 */
  vetoCount?: number
  lastVetoedAt?: string
  /** 否决时的证据快照（累积）：同一批旧证据不得单独支撑再提或重新生成（防打地鼠） */
  vetoedEvidenceIds?: FragmentId[]
  /** 再提邀请（达门槛后生成；宿主以邀请式措辞在对话中提出，再被否决即永久封存）
   *  status（v0.3.1）：undefined = pending（旧数据兼容）；redeemed = 宿主已兑现（intervene 上报 user_engaged 后由消费机制标记，
   *  getContextPacket 过滤不再注入）；expired 不落状态——由注入处的 age <= 30 天判断 */
  rementionInvitation?: { at: string; text: string; newEvidenceIds: FragmentId[]; status?: 'pending' | 'redeemed' | 'expired' }
}

/* ---------------- 引擎日志 ---------------- */

export type LogKind =
  | 'ingest'     // 导入/登记碎片
  | 'register'   // 登记线索
  | 'collision'  // 碰撞预筛
  | 'adjudicate' // LLM 打包判定
  | 'transition' // 状态机迁移
  | 'merge'
  | 'split'
  | 'rewrite'    // 认识层改写
  | 'counter'    // 反证搜索
  | 'silent'     // SILENT 池
  | 'reject'     // 登记拒绝（稳定属性 → 画像）
  | 'system'

export type LogAccent = 'raven' | 'cinnabar' | 'gold' | 'fog'

export interface LogEntry {
  id: number
  kind: LogKind
  title: string
  detail?: string
  accent: LogAccent
  time: string
}

/* ---------------- 聊天 ---------------- */

export type ChatKind = 'text' | 'compare' | 'quote' | 'banner'

export interface ChatMsg {
  id: number
  role: 'user' | 'muninn' | 'plain' | 'system'
  kind: ChatKind
  text: string
  /** compare 专用：普通 AI 的对照回复 */
  plainText?: string
  meta?: string
}

/* ---------------- 演示步骤 ---------------- */

export type DemoKey =
  | 'contrast'  // 0:00 开场对比
  | 'import'    // 1:00 历史压缩
  | 'evidence'  // 3:00 认识生成对比
  | 'counter'   // 5:00 人为反例
  | 'closure'   // 7:00 伏笔回收
  | 'finale'    // 9:00 收尾

export interface DemoStep {
  key: DemoKey
  t: string
  title: string
  subtitle: string
}
