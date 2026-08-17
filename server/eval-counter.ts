/**
 * 衔枝评测 · Contradiction Responsiveness 冲突测试集（设计文档 §6.2 · 设计债务⑧）
 *
 * 构造规范（本文件即规范的可执行形式）：
 *   - 场景类型学：事实冲突 / 偏好反转 / 能力变化 / 关系变化，各 5 例；另设无冲突负例 2 例
 *     （测不虚警），共 22 例。每例 = 既有论断（带证据与置信度）+ 用户新陈述 + 期望行为。
 *   - 盲评流程：评分只看结构化状态迁移——发现冲突（counterEvidence 增加或置信下降）/
 *     降低置信 / 修改认识（文本改写或反证留痕），由代码机械判定（scoreCounterRun），
 *     期望值不出现在任何被测模型可见的上下文中——杜绝「你出题你答题」。
 *     --judge 追加独立 LLM 评审：只见 论断前后 + 新陈述，不见期望类型与判分规则。
 *   - 过程评测不是结果评测：不判「改得对不对」，只判行为类型学三件套是否发生。
 *
 * 运行：
 *   npx tsx server/eval-counter.ts             # 真实 LLM（读 .env.local 的 KIMI_API_KEY）
 *   npx tsx server/eval-counter.ts --limit 4   # 只跑前 4 例（调试）
 *   npx tsx server/eval-counter.ts --judge     # 追加独立 LLM 盲评（评审只见输入输出）
 */
import type { Claim } from '../src/engine/types'
import { moonshotChat, extractJson } from '../src/engine/llm'
import { registerNodeTransport } from './llm-node'
import { HeadlessMuninn, type MuninnState } from './core'

/* ---------------- 场景数据集（债务⑧：类型学 × 数量） ---------------- */

export interface CounterScenario {
  id: string
  type: '事实冲突' | '偏好反转' | '能力变化' | '关系变化' | '无冲突'
  claim: { docTitle: string; text: string; conviction: number }
  evidence: string[]      // 支撑碎片标题（2-3 条，构造种子状态）
  statement: string       // 用户新陈述（冲突场景与论断相抵触；负例与论断一致）
  expectConflict: boolean
}

export const SCENARIOS: CounterScenario[] = [
  /* ---- 事实冲突 × 5 ---- */
  { id: 'CR-F01', type: '事实冲突', claim: { docTitle: '宠物', text: '她目前养着一只猫，日常话题常围绕宠物。', conviction: 0.82 }, evidence: ['领养了一只猫', '买了猫粮和猫爬架'], statement: '我的猫上周送人了，现在家里没有宠物。', expectConflict: true },
  { id: 'CR-F02', type: '事实冲突', claim: { docTitle: '居住地', text: '她居住在深圳，通勤单程约一小时。', conviction: 0.78 }, evidence: ['在深圳租房定居', '抱怨深圳通勤时间久'], statement: '我上个月搬来上海工作了，房租都还没安顿好。', expectConflict: true },
  { id: 'CR-F03', type: '事实冲突', claim: { docTitle: '职业', text: '她在一家外企做会计，负责月度对账。', conviction: 0.8 }, evidence: ['外企会计日常吐槽', '月底加班对账'], statement: '我辞职快半年了，现在是自由插画师。', expectConflict: true },
  { id: 'CR-F04', type: '事实冲突', claim: { docTitle: '学业', text: '她正在读大三，专业是法学。', conviction: 0.76 }, evidence: ['法学课业繁重', '在准备司法考试'], statement: '我去年就转专业去学护理了，明年毕业。', expectConflict: true },
  { id: 'CR-F05', type: '事实冲突', claim: { docTitle: '设备', text: '她的主力手机是安卓，用了两年。', conviction: 0.74 }, evidence: ['吐槽安卓系统卡顿', '给安卓换过电池'], statement: '我年初就换 iPhone 了，用到现在。', expectConflict: true },
  /* ---- 偏好反转 × 5 ---- */
  { id: 'CR-P01', type: '偏好反转', claim: { docTitle: '咖啡习惯', text: '她每天喝两到三杯咖啡提神。', conviction: 0.79 }, evidence: ['每天咖啡续命', '下午必买一杯'], statement: '我三个月前把咖啡戒了，现在只喝茶。', expectConflict: true },
  { id: 'CR-P02', type: '偏好反转', claim: { docTitle: '沟通方式', text: '她偏好文字聊天，多次回避语音通话。', conviction: 0.72 }, evidence: ['多次拒绝语音邀请', '说文字表达更清楚'], statement: '我现在更喜欢直接打电话，打字嫌麻烦。', expectConflict: true },
  { id: 'CR-P03', type: '偏好反转', claim: { docTitle: '游戏偏好', text: '她很喜欢玩开放世界类游戏。', conviction: 0.7 }, evidence: ['通宵玩开放世界游戏', '首发买了新出的开放世界'], statement: '最近完全玩不进去游戏了，兴趣好像没了。', expectConflict: true },
  { id: 'CR-P04', type: '偏好反转', claim: { docTitle: '饮食', text: '她坚持素食已有两年。', conviction: 0.77 }, evidence: ['坚持素食的日常', '常分享素食菜谱'], statement: '我上个季度开始吃肉了，医生建议的。', expectConflict: true },
  { id: 'CR-P05', type: '偏好反转', claim: { docTitle: '作息', text: '她习惯早睡早起，通常十一点前入睡。', conviction: 0.73 }, evidence: ['早上六点晨跑', '自称早睡型选手'], statement: '我最近半年都是凌晨两三点才睡。', expectConflict: true },
  /* ---- 能力变化 × 5（注意去定性化表述） ---- */
  { id: 'CR-A01', type: '能力变化', claim: { docTitle: 'Deadline 行为', text: 'Q2 期间她在多任务并行时的三次 deadline 均延后 1-2 天。', conviction: 0.74 }, evidence: ['deadline 延后赶工', '并行任务补交付'], statement: '这个月三个并行项目全部提前两天交付了。', expectConflict: true },
  { id: 'CR-A02', type: '能力变化', claim: { docTitle: '公开表达', text: '她在小组会上能顺畅发言，超过二十人的场合会推脱。', conviction: 0.68 }, evidence: ['小组发言积极', '大场合多次推脱'], statement: '上周我主持了两百人的发布会，全程没紧张。', expectConflict: true },
  { id: 'CR-A03', type: '能力变化', claim: { docTitle: '写作节奏', text: '她的写作节奏稳定在每天约五百字。', conviction: 0.71 }, evidence: ['日更五百字左右', '写作速度长期稳定'], statement: '最近一个月日更三千字还很轻松。', expectConflict: true },
  { id: 'CR-A04', type: '能力变化', claim: { docTitle: '英语口语', text: '她的英语口语需要提前准备讲稿才能开口。', conviction: 0.7 }, evidence: ['口语前先写逐字稿', '回避即兴英文对话'], statement: '现在能直接即兴开一小时英文会了。', expectConflict: true },
  { id: 'CR-A05', type: '能力变化', claim: { docTitle: '驾驶', text: '她拿到驾照后两年没有上路驾驶过。', conviction: 0.75 }, evidence: ['驾照后从未开车', '出门一律打车'], statement: '我最近每个周末都自驾跑长途。', expectConflict: true },
  /* ---- 关系变化 × 5 ---- */
  { id: 'CR-R01', type: '关系变化', claim: { docTitle: '伴侣关系', text: '她与男友关系稳定，常提及共同未来计划。', conviction: 0.81 }, evidence: ['和男友的旅行计划', '聊到同居安排'], statement: '我们上个月和平分手了，现在单身。', expectConflict: true },
  { id: 'CR-R02', type: '关系变化', claim: { docTitle: '密友联系', text: '她与大学室友小周几乎每天联系。', conviction: 0.76 }, evidence: ['和小周每日聊天', '周末常约小周'], statement: '我跟小周大半年没说过话了，渐行渐远。', expectConflict: true },
  { id: 'CR-R03', type: '关系变化', claim: { docTitle: '职场关系', text: '她与直属领导相处融洽，多次正面提及。', conviction: 0.72 }, evidence: ['夸领导支持自己', '和领导一对一顺畅'], statement: '部门换了个新领导，现在关系很僵。', expectConflict: true },
  { id: 'CR-R04', type: '关系变化', claim: { docTitle: '家庭联系', text: '她每周日与家人通话，雷打不动。', conviction: 0.78 }, evidence: ['每周日家庭通话', '和家人追同一部剧'], statement: '最近和家里几乎不联系了，也不知道说什么。', expectConflict: true },
  { id: 'CR-R05', type: '关系变化', claim: { docTitle: '合作状态', text: '她与番茄的责编保持长期稳定的合作关系。', conviction: 0.73 }, evidence: ['和编辑定卷规划', '编辑常给修改建议'], statement: '之前的编辑离职了，现在对接的是新人。', expectConflict: true },
  /* ---- 无冲突负例 × 2（测不虚警） ---- */
  { id: 'CR-N01', type: '无冲突', claim: { docTitle: '深夜写作', text: '她喜欢在深夜写作，效率最高。', conviction: 0.8 }, evidence: ['常深夜写作', '深夜产出质量高'], statement: '昨晚又写到两点，灵感特别好。', expectConflict: false },
  { id: 'CR-N02', type: '无冲突', claim: { docTitle: '宠物', text: '她养了一只猫，日常话题常围绕宠物。', conviction: 0.82 }, evidence: ['领养了一只猫', '买了猫粮和猫爬架'], statement: '我家猫今天又把水杯碰倒了。', expectConflict: false },
]

/* ---------------- 结构化评分（盲评：代码机械判定，被测模型不可见） ---------------- */

export interface CounterScore {
  /** 发现冲突：反证留痕或置信下降 */
  conflictDetected: boolean
  /** 降低置信 */
  convictionDropped: boolean
  /** 修改认识：论断文本被改写（加限定）或反证留痕 */
  acknowledged: boolean
  revisionMade: boolean
  convictionDelta: number
}

export function scoreCounterRun(before: Claim, after: Claim): CounterScore {
  return {
    conflictDetected: after.counterEvidence.length > before.counterEvidence.length || after.conviction < before.conviction - 1e-9,
    convictionDropped: after.conviction < before.conviction - 1e-9,
    acknowledged: after.text !== before.text || after.counterEvidence.length > before.counterEvidence.length,
    revisionMade: after.text !== before.text,
    convictionDelta: Math.round((after.conviction - before.conviction) * 100) / 100,
  }
}

/** 场景通过判据：冲突场景须三件套齐备；负例须零虚警（不误报冲突、不改写） */
export function scenarioPass(sc: CounterScenario, s: CounterScore): boolean {
  return sc.expectConflict
    ? s.conflictDetected && s.convictionDropped && s.acknowledged
    : !s.conflictDetected && !s.revisionMade
}

/* ---------------- 运行器 ---------------- */

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

function buildScenarioState(sc: CounterScenario): MuninnState {
  const s: MuninnState = {
    fragments: [], threads: [], claims: [],
    fragSeq: 1, threadSeq: 1, claimSeq: 1,
    createdAt: new Date().toISOString(), lastTickDate: daysAgo(0), audits: [],
  }
  const evidenceIds: string[] = []
  sc.evidence.forEach((title, i) => {
    const id = `f${i + 1}`
    s.fragments.push({
      id, day: 5 + i * 3, dateLabel: daysAgo(5 + i * 3), title, body: `${title}。`,
      vad: { valence: 0, arousal: 0.5, dominance: 0.5 }, threadIds: [], tags: [],
    })
    evidenceIds.push(id)
  })
  s.fragSeq = sc.evidence.length + 1
  s.claims.push({
    id: 'c1', docTitle: sc.claim.docTitle, text: sc.claim.text,
    conviction: sc.claim.conviction, evidenceIds, counterEvidence: [],
    boundary: '评测种子：近 90 天窗口', versions: [{ at: daysAgo(7), text: sc.claim.text, conviction: sc.claim.conviction, reason: '种子' }],
    status: 'active',
  })
  s.claimSeq = 2
  return s
}

/** 独立 LLM 盲评（--judge）：只见论断前后与新陈述，不见期望类型与判分规则 */
async function judgeAcknowledgment(before: Claim, after: Claim, statement: string): Promise<number | null> {
  const raw = await moonshotChat([
    {
      role: 'system',
      content: `你是独立评审。给定一条关于用户的论断在听到用户新陈述前后的两个版本，判断修订后的论断是否实质回应了新证据（承认变化、收窄适用范围或改写结论），而不是敷衍或忽略。只输出 JSON：{"acknowledged":1}`,
    },
    {
      role: 'user',
      content: `新陈述：「${statement}」\n论断（前）：「${before.text}」（置信 ${before.conviction.toFixed(2)}）\n论断（后）：「${after.text}」（置信 ${after.conviction.toFixed(2)}）`,
    },
  ], { temperature: 0.1 })
  const j = extractJson<{ acknowledged: number }>(raw)
  return j && typeof j.acknowledged === 'number' ? (j.acknowledged >= 1 ? 1 : 0) : null
}

async function main() {
  const args = process.argv.slice(2)
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) || 4 : 0
  const useJudge = args.includes('--judge')
  const llmReady = registerNodeTransport()
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const list = limit > 0 ? SCENARIOS.slice(0, limit) : SCENARIOS
  console.log(`[eval-counter] 衔枝评测 · Contradiction Responsiveness（${list.length} 例，llm: ${llmReady ? 'live' : 'heuristic-only'}）\n`)

  const byType = new Map<string, { pass: number; total: number }>()
  let passAll = 0

  for (const sc of list) {
    const engine = new HeadlessMuninn(buildScenarioState(sc))
    const before = clone(engine.getState().claims[0])
    let res = await engine.counterCheck('c1', sc.statement)
    let retried = false
    if (!res.ok && llmReady) {
      // 限流退避：fresh 引擎重试一次（失败路径不改状态，重建以保干净）
      await sleep(4000)
      res = await engine.counterCheck('c1', sc.statement)
      retried = true
    }
    const after = engine.getState().claims[0]
    const score = scoreCounterRun(before, after)
    const pass = res.ok && scenarioPass(sc, score)

    let judgeStr = ''
    if (useJudge && sc.expectConflict && score.revisionMade) {
      const j = await judgeAcknowledgment(before, after, sc.statement)
      judgeStr = j === null ? ' judge:n/a' : ` judge:${j}`
    }

    const mark = pass ? 'PASS' : 'FAIL'
    console.log(`${mark}  ${sc.id} [${sc.type}] Δconv=${score.convictionDelta >= 0 ? '+' : ''}${score.convictionDelta}`
      + ` 冲突:${score.conflictDetected ? '✓' : '×'} 降信:${score.convictionDropped ? '✓' : '×'} 改写:${score.revisionMade ? '✓' : '×'} 留痕:${after.counterEvidence.length > before.counterEvidence.length ? '✓' : '×'}${judgeStr}`
      + (pass || res.ok ? '' : `  (${res.detail})`) + (retried ? '  [retried]' : ''))

    const t = byType.get(sc.type) ?? { pass: 0, total: 0 }
    t.total++
    if (pass) t.pass++
    byType.set(sc.type, t)
    if (pass) passAll++
    await sleep(2500)   // 场景间节流 + 传输层 429 指数退避，避免连发触发限流
  }

  console.log('\n----- 分类型通过率 -----')
  for (const [type, { pass, total }] of byType) {
    console.log(`  ${type}：${pass}/${total}（${Math.round((pass / total) * 100)}%）`)
  }
  const rate = Math.round((passAll / list.length) * 100)
  console.log(`\n[eval-counter] 总通过率：${passAll}/${list.length}（${rate}%）`)
  if (!llmReady) {
    console.log('[eval-counter] 注意：无 KIMI_API_KEY，全部按 LLM 失败处理——结果不具评测意义，仅验证跑批机制。')
    process.exit(2)
  }
  process.exit(rate >= 80 ? 0 : 1)
}

/** 仅在直接运行时执行跑批（dev-smoke 会 import 本模块取纯函数——模块顶层不得有副作用） */
const invokedDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('/eval-counter.ts')
if (invokedDirectly) {
  main().catch((err) => { console.error('[eval-counter] 运行失败：', err); process.exit(1) })
}
