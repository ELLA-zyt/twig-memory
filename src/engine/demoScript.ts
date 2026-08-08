/**
 * 十分钟演示脚本（§7）+ 现场稳定性对策（设计债务⑩：候选输入备五组）
 */
import type { DemoStep } from './types'

export const DEMO_STEPS: DemoStep[] = [
  { key: 'contrast', t: '0:00', title: '开场对比', subtitle: '「我终于换电脑了」→ 普通 AI vs 雾尼' },
  { key: 'import', t: '1:00', title: '历史压缩', subtitle: '90 天 · 1423 条消息 → 37 事件 / 12 线索 / 5 认识' },
  { key: 'evidence', t: '3:00', title: '认识生成', subtitle: '带证据、反证、边界条件的论断，不是标签画像' },
  { key: 'counter', t: '5:00', title: '人为反例', subtitle: '评委现场输入 → 置信 0.82 → 0.57' },
  { key: 'closure', t: '7:00', title: '伏笔回收', subtitle: '「一直卡我的东西」→ 草蛇灰线显影' },
  { key: 'finale', t: '9:00', title: '收尾', subtitle: '不忘记发生过什么 → 修正自己对他的理解' },
]

/** 设计债务⑩：反例输入候选备五组（评委可任选，或自行输入等价表述） */
export const COUNTER_CANDIDATES = [
  '最近我其实没有那么想折腾技术了',
  '这个月写稿子越来越像完成任务了',
  '我把 IDE 卸载了，看到就烦',
  '最近下班只想躺着，什么都不想搞',
  '技术好像没那么有意思了，可能我变了',
]

export const STEP_HINTS: Record<string, string> = {
  contrast: '点下方预设输入，看同一句「换电脑」在两个系统里的命运',
  import: '三个月聊天记录，如何在 20 秒内变成三层记忆',
  evidence: '点开右侧「认识」页签：每条论断都带着完整的证据结构存活',
  counter: '现在轮到你拆台：挑一句反例说给她听，看系统敢不敢认怂',
  closure: '不说「电脑」两个字，看系统能不能听懂「那个一直卡我的东西」',
  finale: '演示完成。可以自由输入——包括那些她平时不太提的事',
}
