/**
 * 参考宿主闭环（reference host loop）：把「自动记忆 + 召回自动注入」落成代码，不靠模型自觉。
 *
 * 每轮 = 取叙事上下文包注入 system prompt → LLM 作答 → 代码自动 ingest 用户原话。
 * 薄层参考实现；引擎核心不动；会话历史由宿主自管（此处为进程内缓冲，重启即新会话，
 * 生产环境的会话存储是宿主自己的职责，不属于记忆引擎）。
 *
 * 缓存友好约定：稳定人设指令在前，变动的叙事上下文包固定在 system prompt 末尾——
 * 前缀缓存（如 MiniMax 的 cached_tokens）在注入点之前的部分保持命中。
 *
 * P0-2 修复：危机词表预扫在 LLM 回复生成之前——命中危机信号时先注入安全阀指令，
 * 再生成回复，而非事后 ingest 才发现危机（原顺序：reply → ingest → 危机检测，太晚）。
 */
import { moonshotChat } from '../visualizer/engine/llm'
import type { EngineManager } from './manager'
import type { ContextPacket, IngestResult } from './core'
import { CRISIS_LEXICON } from './core'

/** 稳定段：人设与行为边界。任何每轮变动的内容都不得插到这段之前 */
const HOST_SYSTEM_PROMPT = `你是一个带长期记忆的陪伴式对话伙伴（衔枝记忆引擎的参考宿主）。
system prompt 末尾的「叙事上下文」是引擎为你维护的记忆：进行中的线索、对用户的当前理解（带置信度）、近期事件。
使用纪律：
- 像使用自己的记忆一样自然使用它，不要逐字背诵、不要罗列；
- 上下文里没有的事不要声称记得，被问到时诚实说没有相关记忆；
- 若上下文包含邀请式再提或漂移警示，只在对话容得下反驳的时机自然浮出，不强行插入；
- 基于某条「当前理解」主动提醒/催促/建议前，注意该理解带置信度——它不是事实。`

/** P0-2：危机模式专用指令——检测到危机信号时注入，替代常规叙事上下文 */
const CRISIS_PROMPT = `【危机模式 · 安全阀激活】
用户刚刚表达了与自伤/自杀相关的信号。请立即：
- 温暖、在场、不评判、永不推开——检测到风险后冷冰冰拒绝或切断是二次伤害；
- 不说教、不分析原因、不做诊断；
- 如果你知道当地的求助渠道（心理援助热线等），温和地递出来；
- 持续确认用户的安全状态。
这是最高优先级指令，覆盖叙事上下文中的其他指示。`

const MAX_HISTORY = 20

export interface ChatTurnResult {
  reply: string
  /** 本轮实际注入的叙事上下文（透明化：前端可展示「召回了什么」） */
  contextInjected: ContextPacket
  /** 自动 ingest 的引擎侧结果（碎片 id、碰撞判定动作等） */
  ingest: IngestResult
  /** P0-2：本轮是否触发了危机预扫 */
  crisisDetected: boolean
}

/** 进程内会话历史（参考实现，不落盘） */
const histories = new Map<string, { role: 'user' | 'assistant'; content: string }[]>()

export async function chatTurn(manager: EngineManager, userId: string, text: string): Promise<ChatTurnResult> {
  const engine = manager.get(userId)
  // 召回注入：每轮现取现算（引擎侧无陈旧缓存问题），固定在 system 末尾
  const packet = engine.getContextPacket(userId)
  const history = histories.get(userId) ?? []

  // P0-2 修复：危机词表预扫在回复生成之前——命中则注入危机指令，而非事后 ingest 才检测
  const crisisDetected = CRISIS_LEXICON.test(text)
  const systemContent = crisisDetected
    ? `${HOST_SYSTEM_PROMPT}\n\n${CRISIS_PROMPT}`
    : `${HOST_SYSTEM_PROMPT}\n\n${packet.promptText}`

  const reply = await moonshotChat([
    { role: 'system', content: systemContent },
    ...history,
    { role: 'user', content: text },
  ], { temperature: crisisDetected ? 0.3 : 0.6, maxTokens: 800 })

  // 自动记忆：用户原话直灌碎片层（零提取失真；高质量提取发生在反刍的认识层，带证据锚定）
  // ingest 内部也会做 CRISIS_LEXICON 检测 → 中止对照窗口，这里不重复
  const ingest = await engine.ingest(text)
  manager.persist(userId)
  histories.set(userId, [...history, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-MAX_HISTORY))
  return { reply, contextInjected: packet, ingest, crisisDetected }
}
