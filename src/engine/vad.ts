/**
 * 共享 VAD 估计（P2-8 修复：demo 与 server 不再各写一份词表）
 * 被 src/engine/engine.ts（demo）与 server/core.ts（无头引擎）共同引用。
 * 后续可替换为 LLM 打分，接口不变。
 */
import type { VAD } from './types'

const NEG_WORDS = /(累|烦|卡住|坏了|失眠|焦虑|崩溃|担心|害怕|吵架|分手|辞职|丢|卡文|烦躁|疲惫|低落|撑不住)/
const POS_WORDS = /(终于|开心|成了|到手|解决|突破|签|喜欢|顺利|搞定|完成|签约|推荐|长评|灵感|存稿)/

export function estimateVAD(text: string): VAD {
  const neg = NEG_WORDS.test(text)
  const pos = POS_WORDS.test(text)
  const arousal = Math.min(0.9, 0.35 + (/[！!？?]/.test(text) ? 0.25 : 0) + (neg || pos ? 0.2 : 0))
  // P3-5：正负同时命中时给微正值而非 pos 优先
  const valence = pos && neg ? 0.1 : pos ? 0.6 : neg ? -0.5 : 0
  return { valence, arousal, dominance: 0.5 }
}
