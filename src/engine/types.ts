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

export interface Fragment {
  id: FragmentId
  day: number          // 距今天数，0 = 今天
  dateLabel: string    // 「5月9日」
  title: string
  body: string
  vad: VAD
  threadIds: string[]  // 关联线索
  tags: string[]       // 情境标签（碰撞时分池物理隔离）
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
