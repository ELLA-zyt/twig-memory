/**
 * 开发用 smoke 测试：注入 mock ChatTransport，离线验证服务端核心逻辑。
 * 覆盖：adjudicateFree 幻觉 threadId 剥离 / SILENT 入池-隔离-唤醒（LLM 与规则两条路）/
 *       reflect 全链路（认识层抽取校验、合成句重生成、merge、split）/
 *       反证搜索（设计债务③：红队命中→强制裁决留痕、全部解释掉→强制衰减、无命中→零改动）/
 *       盲推导审计（设计债务④：null model 基线、漂移检测、用户可见标记、定期排程门控）/
 *       对照窗口（设计债务⑤：高风险拒绝、不干预指令注入、confirmed/failed 校验、内生剔除、危机中止）/
 *       修正标注与再提门槛（债务⑥⑦：原文不动标注追加、否决快照、邀请式再提、冷却、两否封存、打地鼠守卫）/
 *       债务①新线索保底进候选 + 债务⑧冲突测试集规范（数据集完整性 + 结构化评分单测）/
 *       LLM 全挂时的降级。
 * 运行：npx tsx server/dev-smoke.ts   —— 不调真实 API，可随意重跑；确认完毕后可删除。
 */
import { setChatTransport } from '../src/engine/llm'
import { HeadlessMuninn, fragView, setEmbedFn, type MuninnState } from './core'
import { SCENARIOS, scenarioPass, scoreCounterRun } from './eval-counter'
import { aggregate, buildRetriever, CATEGORY_NAMES, fuseRrf, parseLocoDate, tokenize, topByVector, type Frag } from './eval-locomo'
import type { Claim } from '../src/engine/types'

/* ---------------- mock 传输层：按消息全文内容路由预制响应（函数体可状态化） ---------------- */

const responses: { match: RegExp; body: (messages: { role: string; content: string }[]) => string }[] = []
const throwers: RegExp[] = []
let optsSeen: { temperature?: number; model?: string }[] = []

setChatTransport(async (messages, opts) => {
  const full = messages.map((m) => m.content).join('\n')
  if (opts) optsSeen.push(opts)
  if (throwers.some((r) => r.test(full))) throw new Error('mock unavailable')
  const hit = responses.find((r) => r.match.test(full))
  return hit ? hit.body(messages) : '{"reply":"mock 通用回复"}'
})

const on = (match: RegExp, body: string | ((messages: { role: string; content: string }[]) => string)) =>
  responses.push({ match, body: typeof body === 'function' ? body : () => body })
const failWith = (match: RegExp) => throwers.push(match)
const resetMocks = () => { responses.length = 0; throwers.length = 0; optsSeen = [] }

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra?: unknown) => {
  if (cond) { pass++; console.log(`  ok ${name}`) }
  else { fail++; console.error(`  FAIL ${name}`, extra !== undefined ? JSON.stringify(extra) : '') }
}

const daysAgoISO = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

function baseState(lastTickDaysAgo = 0): MuninnState {
  return {
    fragments: [], threads: [], claims: [],
    fragSeq: 1, threadSeq: 1, claimSeq: 1,
    createdAt: daysAgoISO(60), lastTickDate: daysAgoISO(lastTickDaysAgo),
  }
}

const frag = (id: string, day: number, title: string, arousal = 0.5) => ({
  id, day, dateLabel: daysAgoISO(day), title, body: `${title}（正文）`, vad: { valence: 0, arousal, dominance: 0.5 }, threadIds: [], tags: [],
})

const thread = (id: string, label: string, openQuestion: string, fragIds: string[], day: number, pool: 'ACTIVE' | 'DORMANT' = 'ACTIVE') => ({
  id, label, openQuestion,
  synthetic: { abstractFloor: [`一个悬置的状态迎来结局：${openQuestion}`], concreteGuesses: [label] },
  dragonVein: 0.5, emotionalWeight: 0.5,
  history: fragIds.map((fid, i) => ({ day: day + i * 5, fragmentId: fid, note: `事件${i + 1}` })),
  status: 'unresolved' as const, lineage: { parentIds: [] as string[], childIds: [] as string[] },
  pool, softLinks: [] as { fragmentId: string; note: string }[],
})

/* ================= 场景一：幻觉 threadId 剥离（LLM 路径） ================= */
{
  console.log('\n[1] adjudicateFree 幻觉 threadId 剥离')
  resetMocks()
  const e = new HeadlessMuninn(baseState())
  on(/碰撞判定模块/, JSON.stringify({ verdict: '回收', threadId: 't999', registerThread: false, reply: 'mock 回复，长度足够。' }))
  const r = await e.ingest('测试事件一条')
  check('幻觉 threadId 被剥离 → action=noted', r.action === 'noted' && r.threadId === undefined, r)
  check('没有线索被误回收', e.getState().threads.every((t) => t.status === 'unresolved'))
}

/* ================= 场景二：SILENT 三件套 ================= */
function silentFixture(): MuninnState {
  const s = baseState(30)
  s.fragments.push(
    { ...frag('f1', 60, '父亲复查'), threadIds: ['t1'] },
    { ...frag('f2', 40, '话题转开'), threadIds: ['t1'] },
    { ...frag('f3', 5, '项目推进'), threadIds: ['t2'] },
  )
  // P1-2 修复后 getContextPacket 不再 tick，需预设 SILENT 状态（promoteSilent 由场景 11 测试）
  s.threads.push(
    { ...thread('t1', '父亲的病', '父亲的健康状况是否稳定？', ['f1', 'f2'], 60), emotionalWeight: 0.9, dragonVein: 0.35, pool: 'SILENT', silentSignals: { importance: 0.95, mentionFrequency: 0.05, avoidanceSignal: 0.9, triggerThreshold: 'low' } },
    thread('t2', '项目交付', '项目能否按时交付？', ['f3'], 5),
  )
  s.fragSeq = 4
  return s
}

{
  console.log('\n[2a] SILENT 入池（tick）+ 规则碰撞隔离 + 规则触发器唤醒')
  resetMocks()
  failWith(/碰撞判定模块/)
  failWith(/沉默池唤醒判定模块/)
  const e = new HeadlessMuninn(silentFixture())
  const r = await e.ingest('说起父亲的病')

  const st = e.getState()
  const t1 = st.threads.find((t) => t.id === 't1')!
  check('SILENT 不参与规则碰撞（未记软链接）', r.action !== 'softlink', r)
  check('规则兜底触发器唤醒（charOverlap≥0.5）', r.silentWake?.threadId === 't1', r)
  check('唤醒后回到 ACTIVE 且记入历史', t1.pool === 'ACTIVE' && t1.history.some((h) => h.note.includes('触发器唤醒')), t1.history.at(-1))
  check('唤醒后 silentSignals 已清空（P0-3 修复）', !t1.silentSignals, t1.silentSignals)
}

{
  console.log('\n[2b] SILENT 隔离：不出现在叙事上下文包')
  resetMocks()
  const e = new HeadlessMuninn(silentFixture())
  const pk = e.getContextPacket('u1')
  check('promptText 不含 SILENT 线索', !pk.promptText.includes('父亲的病'), pk.promptText)
  check('threads 数组不含 SILENT 线索', pk.threads.every((t) => t.id !== 't1'))
  check('普通线索仍在（衰减降 DORMANT 也保留）', pk.threads.some((t) => t.id === 't2'))
}

{
  console.log('\n[2c] LLM 触发器唤醒路径')
  resetMocks()
  failWith(/碰撞判定模块/)
  on(/沉默池唤醒判定模块/, JSON.stringify({ threadId: 't1', reply: '我在，想说到哪儿就说到哪儿。' }))
  const e = new HeadlessMuninn(silentFixture())
  const r = await e.ingest('家里的事有新消息')
  check('LLM 判定唤醒 t1', r.silentWake?.threadId === 't1', r)
  check('t1 回到 ACTIVE', e.getState().threads.find((t) => t.id === 't1')!.pool === 'ACTIVE')
}

/* ================= 场景三：reflect 全链路 ================= */
function reflectFixture(): MuninnState {
  const s = baseState()
  s.fragments.push(
    frag('f1', 1, '深夜写作', 0.7), frag('f2', 2, '签约通过', 0.75), frag('f3', 3, '读者长评', 0.6),
    frag('f4', 4, '卡文烦躁', 0.65), frag('f5', 5, '新坑灵感', 0.8), frag('f6', 6, '存稿三章', 0.5),
  )
  s.fragSeq = 7
  // merge 对：tA/tB 共享 f2、f3（≥2 → 候选信号）
  s.threads.push(thread('tA', '攒钱买硬盘', '存储焦虑是否解除？', ['f2', 'f3'], 6))
  s.threads.push(thread('tB', '想换电脑', '旧电脑限制是否解除？', ['f2', 'f3'], 5))
  // split 对：tC 有 4 条历史，回收条件分化
  s.threads.push(thread('tC', '写作主线', '写作这件事往哪里走？', ['f3', 'f4', 'f5', 'f6'], 4))
  s.claims.push({
    id: 'c1', docTitle: '创造驱动力', text: '旧论断：技术折腾与写作是双引擎。',
    conviction: 0.7, evidenceIds: ['f1'], counterEvidence: [], boundary: '仅晚间场景',
    versions: [{ at: daysAgoISO(10), text: '旧论断：技术折腾与写作是双引擎。', conviction: 0.7, reason: '初稿' }],
    status: 'active',
  })
  s.claimSeq = 2
  return s
}

{
  console.log('\n[3] reflect：认识层抽取 + 合成句重生成 + merge + split')
  resetMocks()
  on(/认识层反刍模块/, JSON.stringify({
    ops: [
      { op: 'create', text: '近 90 天内，写作相关事件的高唤醒表达集中于深夜场景，产出与情绪状态相关。', conviction: 0.66, evidenceIds: ['f1', 'f2', 'fx-invalid'], boundary: '样本为晚间对话；未覆盖白天场景。', reason: '三条证据收敛' },
      { op: 'rewrite', claimId: 'c1', text: '技术折腾与写作长期是双引擎；近期写作事件占主导。', conviction: 0.6, evidenceIds: ['f4'], boundary: '近 90 天窗口', reason: '新证据重新解释' },
      { op: 'create', text: '证据不足的短论断', conviction: 0.5, evidenceIds: ['f1'], boundary: '——' }, // 只有 1 条证据 → 应被拒绝
    ],
  }))
  on(/合成句模块/, JSON.stringify({ concreteGuesses: ['新的回收猜测句'], reason: '推进改变预期' }))
  on(/merge 判定模块/, JSON.stringify({ merge: true, label: '设备升级', openQuestion: '设备层面的创作限制是否解除？', reason: '历史里同一种烦躁反复出现' }))
  on(/split 判定模块/, JSON.stringify({
    split: true,
    children: [
      { label: '修仙连载', openQuestion: '长篇连载能否稳定更新？', fragmentIds: ['f3', 'f4'] },
      { label: '人外新坑', openQuestion: '新坑是否正式开坑？', fragmentIds: ['f5', 'f6'] },
    ],
    reason: '回收条件不再共享',
  }))
  // 盲推导审计（fixture createdAt 60 天前 → 本轮 reflect 必触发）
  on(/第一次见到这位用户/, JSON.stringify({ claims: [{ text: '独立推导的论断，长度足够。', conviction: 0.55, evidenceIds: ['f1'], boundary: 'b' }] }))
  on(/分歧评估模块/, JSON.stringify({ divergence: 0.2, notes: ['覆盖面不同'] }))

  const e = new HeadlessMuninn(reflectFixture())
  const out = await e.reflect()
  const st = e.getState()

  check('claimsCreated=1（证据不足的 create 被拒）', out.claimsCreated === 1, out)
  const created = st.claims.find((c) => c.docTitle.startsWith('近 90 天'))
  check('新论断证据锚定过滤幻觉 id', !!created && JSON.stringify(created.evidenceIds) === JSON.stringify(['f1', 'f2']), created?.evidenceIds)
  check('新论断带版本史与边界', !!created && created.versions.length === 1 && created.boundary.length > 3)
  const c1 = st.claims.find((c) => c.id === 'c1')!
  check('c1 被改写：文本更新 + 版本 +1 + 证据并集', c1.text.includes('近期写作') && c1.versions.length === 2 && c1.evidenceIds.includes('f4'), c1)

  check('syntheticRegenerated ≥ 1', out.syntheticRegenerated >= 1, out)
  check('threadsMerged=1', out.threadsMerged === 1, out)
  const tA = st.threads.find((t) => t.id === 'tA')!
  const tB = st.threads.find((t) => t.id === 'tB')!
  const merged = st.threads.find((t) => t.label === '设备升级')
  check('双方进入 merged 终态 + lineage 指向新线索', tA.status === 'merged' && tB.status === 'merged'
    && !!merged && tA.lineage.childIds.includes(merged.id) && merged.lineage.parentIds.includes('tA'))
  check('龙脉饱和式合并 0.5,0.5 → 0.8', !!merged && Math.abs(merged.dragonVein - (1 - 0.5 * 0.5 + 0.05)) < 1e-9, merged?.dragonVein)

  check('threadsSplit=1', out.threadsSplit === 1, out)
  const tC = st.threads.find((t) => t.id === 'tC')!
  const kids = st.threads.filter((t) => t.lineage.parentIds.includes('tC'))
  check('父线索 superseded + 两个子线索', tC.status === 'superseded' && kids.length === 2 && tC.lineage.childIds.length === 2)
  check('子线索复制而非对半分龙脉', kids.every((k) => k.dragonVein === tC.dragonVein))
  check('子线索历史按 fragmentIds 划分',
    kids.find((k) => k.label === '修仙连载')!.history.every((h) => ['f3', 'f4'].includes(h.fragmentId) || h.note.includes('split')))

  check('skipped 为空', out.skipped.length === 0, out)
  check('lastReflectAt 已记录', !!st.lastReflectAt)
  check('附带盲推导审计（无漂移信号）', out.driftAudit?.driftSignal === false && out.driftAudit.baseline === 0.2, out.driftAudit)
}

/* ================= 场景四：反证搜索（设计债务③ 异源红队） ================= */
function counterFixture(): MuninnState {
  const s = baseState()
  s.fragments.push(frag('f1', 1, '深夜写作', 0.7), frag('f2', 2, '深夜连发说累', 0.5), frag('f3', 3, '读者长评', 0.6))
  s.fragSeq = 4
  s.claims.push({
    id: 'c1', docTitle: '创造驱动力', text: '技术折腾与写作是她的双引擎。',
    conviction: 0.7, evidenceIds: ['f1'], counterEvidence: [], boundary: '仅晚间场景',
    versions: [{ at: daysAgoISO(10), text: '技术折腾与写作是她的双引擎。', conviction: 0.7, reason: '初稿' }],
    status: 'active',
  })
  s.claimSeq = 2
  return s
}

{
  console.log('\n[4a] 反证搜索：红队命中 → 强制裁决 → 加限定重写 + 留痕')
  resetMocks()
  on(/认识层反刍模块/, '{"ops":[]}')
  on(/红队检察官/, JSON.stringify({
    hypotheses: ['她的驱动力正在衰退'],
    hits: [
      { fragmentId: 'f2', why: '深夜连发三条，最后说「有点累」，没有启动任何新动作' },
      { fragmentId: 'fx', why: '幻觉碎片，应被过滤' },
    ],
  }))
  on(/反证裁决模块/, JSON.stringify({
    resolutions: [{ fragmentId: 'f2', verdict: '限定', why: '属情境性疲劳，不足以推翻双引擎结构，但需收窄适用范围' }],
    revised: '技术折腾与写作长期是她的双引擎；近 90 天内出现过情境性疲劳的夜晚。',
    conviction: 0.6,
  }))
  on(/合成句模块/, '{"concreteGuesses":[]}')

  const e = new HeadlessMuninn(counterFixture())
  const out = await e.reflect()
  const c1 = e.getState().claims.find((c) => c.id === 'c1')!
  check('counterSearched=1 / counterHits=1（幻觉碎片被滤掉）', out.counterSearched === 1 && out.counterHits === 1, out)
  check('反证留痕：counterEvidence +1 且带裁决说明', c1.counterEvidence.length === 1 && c1.counterEvidence[0].resolution.includes('限定'), c1.counterEvidence)
  check('论断加限定重写 + 版本 +1', c1.text.includes('情境性疲劳') && c1.versions.length === 2)
  check('置信按裁决下调 0.7 → 0.6', Math.abs(c1.conviction - 0.6) < 1e-9, c1.conviction)
  check('红队调用异源参数：高温 0.8', optsSeen.some((o) => o.temperature === 0.8), optsSeen)
}

{
  console.log('\n[4b] 反证全部被解释掉：代码强制小幅衰减')
  resetMocks()
  on(/认识层反刍模块/, '{"ops":[]}')
  on(/红队检察官/, JSON.stringify({ hypotheses: ['h1'], hits: [{ fragmentId: 'f3', why: '某种弱反证' }] }))
  on(/反证裁决模块/, JSON.stringify({
    resolutions: [{ fragmentId: 'f3', verdict: '不足以推翻', why: '证据强度不足' }],
    revised: '技术折腾与写作是她的双引擎。',   // 与原文相同
    conviction: 0.7,                            // LLM 想维持原置信
  }))
  on(/合成句模块/, '{"concreteGuesses":[]}')
  const e = new HeadlessMuninn(counterFixture())
  const out = await e.reflect()
  const c1 = e.getState().claims.find((c) => c.id === 'c1')!
  check('全部解释掉 → 强制衰减 0.7 → 0.67', Math.abs(c1.conviction - 0.67) < 1e-9, c1.conviction)
  check('文本未变但版本留痕（衰减可审计）', c1.text === '技术折腾与写作是她的双引擎。' && c1.versions.length === 2 && Math.abs(c1.versions[1].conviction - 0.67) < 1e-9)
  check('counterRevised=1', out.counterRevised === 1, out)
}

{
  console.log('\n[4c] 红队找不到反证：诚实空手而归，零改动')
  resetMocks()
  on(/认识层反刍模块/, '{"ops":[]}')
  on(/红队检察官/, JSON.stringify({ hypotheses: ['h1'], hits: [] }))
  on(/合成句模块/, '{"concreteGuesses":[]}')
  const e = new HeadlessMuninn(counterFixture())
  const out = await e.reflect()
  const c1 = e.getState().claims.find((c) => c.id === 'c1')!
  check('无命中 → 零改动零留痕', out.counterSearched === 0 && c1.counterEvidence.length === 0 && c1.versions.length === 1, out)
}

/* ================= 场景六：盲推导审计（设计债务④ null model） ================= */
{
  console.log('\n[6a] 漂移检测：审计分歧超基线 → driftSignal + flaggedForUser + 上下文警示')
  resetMocks()
  let n = 0
  on(/第一次见到这位用户/, () => JSON.stringify({
    claims: [{ text: `盲推导论断${['其一', '其二', '其三'][n++ % 3]}，从零独立得到的理解。`, conviction: 0.6, evidenceIds: ['f1'], boundary: 'b' }],
  }))
  // 盲推导两两之间（「盲推导论断」出现两次）：自然方差小
  on(/分歧评估模块[\s\S]*盲推导论断[\s\S]*盲推导论断/, JSON.stringify({ divergence: 0.2, notes: ['自然方差'] }))
  // 当前论断（含「双引擎」）vs 盲推导：漂移大
  on(/分歧评估模块[\s\S]*双引擎/, JSON.stringify({ divergence: 0.72, notes: ['现行版本断言双引擎，盲推导未见此模式'] }))

  const e = new HeadlessMuninn(counterFixture())
  const rec = await e.auditDrift()
  check('审计分歧 0.72 / 基线 0.2 / 样本 3', rec.divergence === 0.72 && rec.baseline === 0.2 && rec.sampleSize === 3, rec)
  check('超基线+余量 → driftSignal；超绝对阈值 → flaggedForUser', rec.driftSignal && rec.flaggedForUser)
  const st = e.getState()
  check('审计记录入 state（对用户全透明）', st.audits?.length === 1 && !!st.lastAuditAt)
  check('上下文包注入漂移警示（§5.4 可见性出口）', e.getContextPacket('u1').promptText.includes('漂移警示'))
}

{
  console.log('\n[6b] 分歧在自然方差内：零漂移零标记')
  resetMocks()
  let n = 0
  on(/第一次见到这位用户/, () => JSON.stringify({
    claims: [{ text: `盲推导论断${['其一', '其二', '其三'][n++ % 3]}，从零独立得到的理解。`, conviction: 0.6, evidenceIds: ['f1'], boundary: 'b' }],
  }))
  on(/分歧评估模块/, JSON.stringify({ divergence: 0.25, notes: [] }))
  const e = new HeadlessMuninn(counterFixture())
  const rec = await e.auditDrift()
  check('0.25 ≤ 0.2+0.15 → 无漂移信号、无用户标记', !rec.driftSignal && !rec.flaggedForUser, rec)
  check('上下文包无警示', !e.getContextPacket('u1').promptText.includes('漂移警示'))
}

{
  console.log('\n[6c] reflect 定期排程：7 天内不重复审计，过期自动跑')
  resetMocks()
  on(/认识层反刍模块/, '{"ops":[]}')
  on(/红队检察官/, JSON.stringify({ hypotheses: [], hits: [] }))
  on(/合成句模块/, '{"concreteGuesses":[]}')
  on(/第一次见到这位用户/, JSON.stringify({ claims: [{ text: '盲推导论断其一，从零独立得到的理解。', conviction: 0.6, evidenceIds: ['f1'], boundary: 'b' }] }))
  on(/分歧评估模块/, JSON.stringify({ divergence: 0.2, notes: [] }))

  const e = new HeadlessMuninn(counterFixture())
  e.getState().lastAuditAt = new Date().toISOString()   // 今天刚审过
  const out1 = await e.reflect()
  check('7 天内不重复审计', out1.driftAudit === undefined, out1.driftAudit)

  const e2 = new HeadlessMuninn(counterFixture())
  e2.getState().lastAuditAt = new Date(Date.now() - 10 * 86400000).toISOString()
  const out2 = await e2.reflect()
  check('过期自动审计（附在 reflect 结果里）', !!out2.driftAudit && out2.driftAudit.sampleSize === 3, out2.driftAudit)
}

/* ================= 场景七：对照窗口（设计债务⑤ 风险分级） ================= */
function windowFixture(): MuninnState {
  const s = baseState()
  s.fragments.push(frag('f1', 5, '深夜写作', 0.7), frag('f2', 4, '存稿推进', 0.5), frag('f3', 2, '自主交付', 0.6))
  s.fragSeq = 4
  s.claims.push(
    { id: 'c1', docTitle: '创造驱动力', text: '技术折腾与写作是她的双引擎。', conviction: 0.7, evidenceIds: ['f1'], counterEvidence: [], boundary: '仅晚间场景',
      versions: [{ at: daysAgoISO(10), text: '技术折腾与写作是她的双引擎。', conviction: 0.7, reason: '初稿' }], status: 'active' },
    { id: 'c2', docTitle: '睡眠观察', text: '她最近失眠严重，情绪低落。', conviction: 0.6, evidenceIds: ['f1'], counterEvidence: [], boundary: '—',
      versions: [{ at: daysAgoISO(10), text: '她最近失眠严重，情绪低落。', conviction: 0.6, reason: '初稿' }], status: 'active' },
  )
  s.claimSeq = 3
  return s
}

{
  console.log('\n[7a] 风险分级：高风险词表命中 → 拒绝开窗（伦理红线）')
  resetMocks()
  const e = new HeadlessMuninn(windowFixture())
  const r = await e.startWindow('c2')
  check('高风险论断被拒', !r.ok && r.detail.includes('高风险'), r)
  check('riskLevel 标记 high（不经 LLM，fail-safe）', e.getState().claims.find((c) => c.id === 'c2')!.riskLevel === 'high')
}

{
  console.log('\n[7b] low 风险开窗 + 上下文注入不干预指令；medium 拒绝')
  resetMocks()
  on(/风险分级模块/, JSON.stringify({ risk: 'low', reason: '日常偏好类' }))
  const e = new HeadlessMuninn(windowFixture())
  const r = await e.startWindow('c1', 7)
  check('low 风险开窗成功', r.ok && !!r.endsAt, r)
  const pk = e.getContextPacket('u1')
  check('上下文含对照窗口指令（勿干预 + 安全阀）', pk.promptText.includes('对照窗口进行中') && pk.promptText.includes('请勿基于它们主动提醒') && pk.promptText.includes('安全阀'), pk.promptText)

  resetMocks()
  on(/风险分级模块/, JSON.stringify({ risk: 'medium', reason: '有一定影响' }))
  const e2 = new HeadlessMuninn(windowFixture())
  const r2 = await e2.startWindow('c1')
  check('medium 风险拒绝（保守面）', !r2.ok && r2.detail.includes('medium'), r2)
}

{
  console.log('\n[7c] 窗口到期 confirmed：干净证据成立 → 置信微升留版本')
  resetMocks()
  const e = new HeadlessMuninn(windowFixture())
  e.getState().claims.find((c) => c.id === 'c1')!.window = { startedAt: daysAgoISO(10), endsAt: daysAgoISO(3), status: 'open' }
  on(/认识层反刍模块/, '{"ops":[]}')
  on(/红队检察官/, '{"hypotheses":[],"hits":[]}')
  on(/合成句模块/, '{"concreteGuesses":[]}')
  on(/对照窗口校验模块/, JSON.stringify({ verdict: 'confirmed', hits: [], revised: '', conviction: 0.7, reason: '窗口内证据一致' }))
  on(/第一次见到这位用户/, JSON.stringify({ claims: [{ text: '盲推导论断其一，从零独立得到的理解。', conviction: 0.6, evidenceIds: ['f1'], boundary: 'b' }] }))
  on(/分歧评估模块/, JSON.stringify({ divergence: 0.2, notes: [] }))
  const out = await e.reflect()
  check('windowsConfirmed=1', out.windowsConfirmed === 1, out)
  const after = e.getState().claims.find((c) => c.id === 'c1')!
  check('窗口 confirmed + 说明含干净碎片统计', after.window?.status === 'confirmed' && !!after.window.note?.includes('干净碎片 ×2'), after.window)
  check('置信 0.7 → 0.73，版本 +1', Math.abs(after.conviction - 0.73) < 1e-9 && after.versions.length === 2)
  check('自动开窗默认关闭', e.getState().claims.every((c) => !c.window || c.id === 'c1'))
}

{
  console.log('\n[7d] 窗口 failed + 内生剔除：被催生样本不进干净证据')
  resetMocks()
  const e = new HeadlessMuninn(windowFixture())
  const st = e.getState()
  st.claims.find((c) => c.id === 'c1')!.window = { startedAt: daysAgoISO(8), endsAt: daysAgoISO(1), status: 'open' }
  st.interventions = [{ at: `${daysAgoISO(5)}T12:00:00.000Z`, claimId: 'c1', text: '基于该论断提醒了 deadline' }]
  on(/认识层反刍模块/, '{"ops":[]}')
  on(/红队检察官/, '{"hypotheses":[],"hits":[]}')
  on(/合成句模块/, '{"concreteGuesses":[]}')
  on(/对照窗口校验模块/, JSON.stringify({
    verdict: 'failed',
    hits: [{ fragmentId: 'f3', why: '无干预期内自主交付，与依赖提醒的叙事冲突' }],
    revised: '技术折腾与写作长期是双引擎；近 90 天内多次自主推进。', conviction: 0.5, reason: '反证成立',
  }))
  on(/第一次见到这位用户/, JSON.stringify({ claims: [{ text: '盲推导论断其一，从零独立得到的理解。', conviction: 0.6, evidenceIds: ['f1'], boundary: 'b' }] }))
  on(/分歧评估模块/, JSON.stringify({ divergence: 0.2, notes: [] }))
  const out = await e.reflect()
  const c1 = e.getState().claims.find((c) => c.id === 'c1')!
  check('windowsFailed=1', out.windowsFailed === 1, out)
  check('窗口 failed + 排除内生 ×2（f1/f2 均在干预后 48h）', c1.window?.status === 'failed' && !!c1.window.note?.includes('排除内生 ×2'), c1.window)
  check('反证留痕（对照窗口反证）', c1.counterEvidence.some((ce) => ce.text.includes('对照窗口反证')))
  check('论断加限定重写 + 置信 0.5', c1.text.includes('自主推进') && Math.abs(c1.conviction - 0.5) < 1e-9 && c1.versions.length === 2)
}

{
  console.log('\n[7e] 危机中止阀：窗口期内出现危机信号 → 立即中止')
  resetMocks()
  const e = new HeadlessMuninn(windowFixture())
  e.getState().claims.find((c) => c.id === 'c1')!.window = { startedAt: daysAgoISO(2), endsAt: daysAgoISO(-5), status: 'open' }
  on(/碰撞判定模块/, JSON.stringify({ verdict: '无关', threadId: null, registerThread: false, reply: '收到。' }))
  await e.ingest('最近总有不想活的念头')
  check('危机信号中止对照窗口', e.getState().claims.find((c) => c.id === 'c1')!.window?.status === 'aborted')
}

/* ================= 场景八：修正标注与再提门槛（设计债务⑥⑦） ================= */
function rementionFixture(): MuninnState {
  const s = baseState()
  s.fragments.push(
    frag('f1', 30, '旧证据甲', 0.6), frag('f2', 25, '旧证据乙', 0.6),
    frag('f3', 10, '新证据一', 0.7), frag('f4', 8, '新证据二', 0.7), frag('f5', 5, '新证据三', 0.7),
  )
  s.fragSeq = 6
  s.claims.push({
    id: 'c1', docTitle: '连载数据焦虑', text: '她对连载数据有超出正常范围的焦虑。',
    conviction: 0.58, evidenceIds: ['f1', 'f2'], counterEvidence: [], boundary: '—',
    versions: [{ at: daysAgoISO(30), text: '她对连载数据有超出正常范围的焦虑。', conviction: 0.58, reason: '初稿' }],
    status: 'contested', contestedNote: '本人否决：「我没有过度焦虑，我只是在经营。」',
    vetoCount: 1, lastVetoedAt: `${daysAgoISO(20)}T00:00:00.000Z`, vetoedEvidenceIds: ['f1', 'f2'],
  })
  s.claimSeq = 2
  return s
}

{
  console.log('\n[8a] 修正标注（债务⑥）：原文不动，判定层看到修正后事实')
  resetMocks()
  const e = new HeadlessMuninn(rementionFixture())
  const ok = e.correctFragment('f1', '那天其实是周三，不是周二')
  const f1 = e.getState().fragments.find((f) => f.id === 'f1')!
  check('标注追加成功且原文未动', ok && f1.body === '旧证据甲（正文）' && f1.correction?.note === '那天其实是周三，不是周二', f1.correction)
  check('fragView 拼接修正（判定层可见）', fragView(f1).body.includes('〔本人修正：那天其实是周三，不是周二〕'))
}

{
  console.log('\n[8b] 否决强化（债务⑦）：计数、旧证据快照累积、邀请作废')
  resetMocks()
  const e = new HeadlessMuninn(rementionFixture())
  e.getState().claims.find((c) => c.id === 'c1')!.rementionInvitation = { at: new Date().toISOString(), text: '旧邀请', newEvidenceIds: ['f3'] }
  e.contestClaim('c1', '再次否决：别再提这个了')
  const after = e.getState().claims.find((c) => c.id === 'c1')!
  check('vetoCount 累积到 2（两否封存线）', after.vetoCount === 2)
  check('既有邀请作废', after.rementionInvitation === undefined)
  check('旧证据快照含原 evidenceIds（防打地鼠）', (after.vetoedEvidenceIds ?? []).includes('f1') && (after.vetoedEvidenceIds ?? []).includes('f2'))
}

{
  console.log('\n[8c] 再提达门槛：≥3 独立新证据 + 冷却过 → 邀请式再提议草')
  resetMocks()
  on(/认识层反刍模块/, '{"ops":[]}')
  on(/独立证据判定模块/, JSON.stringify({ supportingIds: ['f3', 'f4', 'f5', 'fx'], reason: '三条新证据' }))
  on(/再提议草模块/, JSON.stringify({ invitation: '我最近又注意到几次类似的情况，想起你之前纠正过我——是我理解错了吗？想找机会对一对。' }))
  on(/第一次见到这位用户/, JSON.stringify({ claims: [{ text: '盲推导论断其一，从零独立得到的理解。', conviction: 0.6, evidenceIds: ['f1'], boundary: 'b' }] }))
  on(/分歧评估模块/, JSON.stringify({ divergence: 0.2, notes: [] }))
  const e = new HeadlessMuninn(rementionFixture())
  const out = await e.reflect()
  check('rementionsPrepared=1', out.rementionsPrepared === 1, out)
  const c1 = e.getState().claims.find((c) => c.id === 'c1')!
  check('邀请已生成（幻觉 id 过滤，新证据 = f3/f4/f5）',
    !!c1.rementionInvitation && JSON.stringify(c1.rementionInvitation.newEvidenceIds) === JSON.stringify(['f3', 'f4', 'f5']), c1.rementionInvitation)
  const pk = e.getContextPacket('u1')
  check('上下文包含邀请与防纠缠提示', pk.promptText.includes('邀请式措辞') && pk.promptText.includes('永久封存'), pk.promptText.slice(-300))
}

{
  console.log('\n[8d] 冷却未到 / 新证据不足：不生成邀请')
  resetMocks()
  on(/认识层反刍模块/, '{"ops":[]}')
  on(/独立证据判定模块/, JSON.stringify({ supportingIds: ['f3'] }))
  on(/第一次见到这位用户/, JSON.stringify({ claims: [{ text: '盲推导论断其一，从零独立得到的理解。', conviction: 0.6, evidenceIds: ['f1'], boundary: 'b' }] }))
  on(/分歧评估模块/, JSON.stringify({ divergence: 0.2, notes: [] }))
  const e = new HeadlessMuninn(rementionFixture())
  const out = await e.reflect()
  check('新证据不足（1 < 3）→ 无邀请', out.rementionsPrepared === 0)
  const e2 = new HeadlessMuninn(rementionFixture())
  e2.getState().claims.find((c) => c.id === 'c1')!.lastVetoedAt = `${daysAgoISO(5)}T00:00:00.000Z`
  const out2 = await e2.reflect()
  check('冷却 14 天未到 → 无邀请', out2.rementionsPrepared === 0)
}

{
  console.log('\n[8e] 两否永久封存（防纠缠）')
  resetMocks()
  on(/认识层反刍模块/, '{"ops":[]}')
  on(/独立证据判定模块/, JSON.stringify({ supportingIds: ['f3', 'f4', 'f5'] }))
  on(/再提议草模块/, '{"invitation":"不应被调用"}')
  on(/第一次见到这位用户/, JSON.stringify({ claims: [{ text: '盲推导论断其一，从零独立得到的理解。', conviction: 0.6, evidenceIds: ['f1'], boundary: 'b' }] }))
  on(/分歧评估模块/, JSON.stringify({ divergence: 0.2, notes: [] }))
  const e = new HeadlessMuninn(rementionFixture())
  e.getState().claims.find((c) => c.id === 'c1')!.vetoCount = 2
  const out = await e.reflect()
  check('两否论断不再进入再提通道', out.rementionsPrepared === 0)
}

{
  console.log('\n[8f] 打地鼠硬守卫：同一批旧证据不能重新创建被否决观察')
  resetMocks()
  on(/认识层反刍模块/, JSON.stringify({
    ops: [
      { op: 'create', text: '她对连载数据表现出明显焦虑，反复查看后台。', conviction: 0.6, evidenceIds: ['f1', 'f2'], boundary: '—' },
      { op: 'create', text: '一条与被否决观察无关的新论断，证据来自新碎片。', conviction: 0.6, evidenceIds: ['f3', 'f4'], boundary: '—' },
    ],
  }))
  on(/第一次见到这位用户/, JSON.stringify({ claims: [{ text: '盲推导论断其一，从零独立得到的理解。', conviction: 0.6, evidenceIds: ['f1'], boundary: 'b' }] }))
  on(/分歧评估模块/, JSON.stringify({ divergence: 0.2, notes: [] }))
  const e = new HeadlessMuninn(rementionFixture())
  const out = await e.reflect()
  check('旧证据 create 被拒，新证据 create 通过', out.claimsCreated === 1, out)
  check('总论断数 = 被否决 1 + 新建 1', e.getState().claims.length === 2)
}

/* ================= 场景九：债务①（新线索保底）与债务⑧（测试集规范） ================= */
{
  console.log('\n[9a] 冲突测试集规范完整性（债务⑧）')
  const counts = new Map<string, number>()
  for (const sc of SCENARIOS) counts.set(sc.type, (counts.get(sc.type) ?? 0) + 1)
  check('22 例 = 4 类型 × 5 + 无冲突负例 × 2', SCENARIOS.length === 22
    && ['事实冲突', '偏好反转', '能力变化', '关系变化'].every((t) => counts.get(t) === 5)
    && counts.get('无冲突') === 2, Object.fromEntries(counts))
  check('字段完整且陈述互异', SCENARIOS.every((sc) => sc.claim.text.length >= 8 && sc.statement.length >= 6 && sc.evidence.length >= 2)
    && new Set(SCENARIOS.map((s) => s.statement)).size === SCENARIOS.length)
}

{
  console.log('\n[9b] 债务①：新登记线索保底进碰撞候选（冷启动防线）')
  resetMocks()
  const s = baseState()
  s.fragments.push(frag('f0', 30, '共用历史事件', 0.5))
  for (let i = 1; i <= 15; i++) {
    s.threads.push({ ...thread(`t${i}`, `老线索${i}`, `老问题${i}何时收束？`, ['f0', 'f0'], 30), dragonVein: 0.9 - i * 0.01 })
  }
  s.threads.push(
    thread('t_n1', '新登记的线索甲', '新问题甲何时闭合？', ['f0'], 0),
    thread('t_n2', '新登记的线索乙', '新问题乙何时闭合？', ['f0'], 0),
  )
  s.fragSeq = 2
  s.threadSeq = 18
  let captured = ''
  on(/碰撞判定模块/, (msgs) => {
    captured = msgs.map((m) => m.content).join('\n')
    return JSON.stringify({ verdict: '无关', threadId: null, registerThread: false, reply: '好。' })
  })
  const e = new HeadlessMuninn(s)
  await e.ingest('一件普通的事')
  check('龙脉 top-12 截断生效（13 名外不进候选）', captured.includes('老线索12') && !captured.includes('老线索13'), captured.slice(0, 120))
  check('新线索（历史=1）保底进候选，不被排序锁死', captured.includes('新登记的线索甲') && captured.includes('新登记的线索乙'))
}

{
  console.log('\n[9c] 结构化三件套评分（盲评：代码机械判定）')
  const mk = (over: Partial<Claim>): Claim => ({
    id: 'c1', docTitle: 't', text: '旧文本足够长。', conviction: 0.8, evidenceIds: ['f1'],
    counterEvidence: [], boundary: '—', versions: [], status: 'active', ...over,
  })
  const before = mk({})
  const full = scoreCounterRun(before, mk({ conviction: 0.55, text: '加限定后的新文本。', counterEvidence: [{ text: 'x', resolution: 'y' }] }))
  check('三件套全过', full.conflictDetected && full.convictionDropped && full.revisionMade && full.acknowledged)
  const none = scoreCounterRun(before, mk({}))
  check('零改动 → 全否（负例判据）', !none.conflictDetected && !none.convictionDropped && !none.acknowledged)
  const onlyDrop = scoreCounterRun(before, mk({ conviction: 0.6 }))
  check('只降置信无留痕 → acknowledged=false（严格面）', onlyDrop.conflictDetected && onlyDrop.convictionDropped && !onlyDrop.acknowledged)
  check('scenarioPass 判据（冲突三件套 / 负例零虚警）',
    scenarioPass(SCENARIOS[0], full)
    && !scenarioPass(SCENARIOS[0], onlyDrop)
    && scenarioPass(SCENARIOS[20], none)      // 负例零改动 → 通过
    && !scenarioPass(SCENARIOS[20], full))    // 负例被虚警改写 → 不通过
}

/* ================= 场景十：LoCoMo 评测管线纯函数（债务⑨） ================= */
{
  console.log('\n[10] LoCoMo 评测：日期解析 / 类别映射 / 汇总及格线 / 检索')
  check('日期解析 "1:56 pm on 8 May, 2023" → 2023-05-08', parseLocoDate('1:56 pm on 8 May, 2023') === '2023-05-08')
  check('日期解析容错（无法解析 → 纪元）', parseLocoDate('garbage') === '1970-01-01')
  check('类别编码映射（4=single-hop 等）', CATEGORY_NAMES[4] === 'single-hop' && CATEGORY_NAMES[1] === 'multi-hop'
    && CATEGORY_NAMES[2] === 'temporal' && CATEGORY_NAMES[3] === 'open-domain' && CATEGORY_NAMES[5] === 'adversarial')

  const fake = [
    // single-hop：0.9 ≥ .6713×.9=.604 → PASS；multi-hop：0.4 < .460 → FAIL；
    // temporal：0.6 ≥ .4996 → PASS；open-domain：0.75 ≥ .656 → PASS；adversarial 单列
    ...Array.from({ length: 10 }, (_, i) => ({ category: 4, correct: i < 9 ? 1 : 0 })),
    ...Array.from({ length: 10 }, (_, i) => ({ category: 1, correct: i < 4 ? 1 : 0 })),
    ...Array.from({ length: 10 }, (_, i) => ({ category: 2, correct: i < 6 ? 1 : 0 })),
    ...Array.from({ length: 4 }, (_, i) => ({ category: 3, correct: i < 3 ? 1 : 0 })),
    ...Array.from({ length: 6 }, (_, i) => ({ category: 5, correct: i < 4 ? 1 : 0 })),
  ]
  const agg = aggregate(fake)
  const byName = new Map(agg.stats.map((s) => [s.cat, s]))
  check('及格线 = mem0×0.9（single-hop .604）', Math.abs((byName.get('single-hop')?.bar ?? 0) - 0.6713 * 0.9) < 1e-9)
  check('分类判定正确（P/F/P/P，adversarial 不判）', byName.get('single-hop')?.pass === true
    && byName.get('multi-hop')?.pass === false && byName.get('temporal')?.pass === true
    && byName.get('open-domain')?.pass === true && byName.get('adversarial')?.pass === null)
  check('总分 = 四类宏平均且不含 adversarial', Math.abs(agg.overall - (0.9 + 0.4 + 0.6 + 0.75) / 4) < 1e-9)
  check('总分及格线 = 文档口径（mem0 总分 .6688×0.9 ≈ .6019）', Math.abs(agg.overallBar - 0.6688 * 0.9) < 1e-9)
  check('总分判定同口径（宏平均 vs 宏平均线）', agg.overallPass === (agg.overall >= agg.overallBar))

  const mkFrag = (id: string, text: string) => {
    const tokens = tokenize(text)
    const tf = new Map<string, number>()
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
    return { id, date: '2023-05-08', text, tf, len: tokens.length }
  }
  const retrieve = buildRetriever([
    mkFrag('D1:1', 'Alice: I adopted a cat named Whiskers last week.'),
    mkFrag('D1:2', 'Bob: The weather was rainy in Portland today, quite cold.'),
    mkFrag('D1:3', 'Alice: Whiskers the cat likes sleeping on my keyboard.'),
  ])
  check('BM25 词法检索命中相关碎片', retrieve('What is the name of the cat Alice adopted?', 1)[0]?.id === 'D1:1')
  check('IDF 压低常用词：常见词查询不崩坏', retrieve('weather rainy portland', 1)[0]?.id === 'D1:2')

  // 混合检索纯函数：向量路（预单位化 2 维向量）+ RRF 融合
  const vFrags: Frag[] = [mkFrag('V1', 'alpha'), mkFrag('V2', 'beta'), mkFrag('V3', 'gamma')]
  const vMat = [[1, 0], [0, 1], [0.9, 0.1]]
  check('向量路取最近邻', topByVector(vFrags, vMat, [1, 0], 1)[0]?.id === 'V1')
  const fused = fuseRrf([vFrags[0], vFrags[1]], [vFrags[1], vFrags[2]], 2)
  check('RRF 双路命中者优先', fused[0]?.id === 'V2' && fused.length === 2)
}

/* ================= 场景十 b：碰撞候选的向量召回排序（注入 / 保底 / 失败回退） ================= */
{
  console.log('\n[10b] 碰撞候选：向量召回排序 / 新线索保底 / 失败回龙脉')
  resetMocks()
  const st = baseState()
  // 14 条线索（超候选上限 12）：t01–t12 龙脉靠前但与事件无关；
  // t13 龙脉垫底但语义相关（含「钢琴」）；t14 新登记（历史 1 条，保底放行）
  st.threads = [
    ...Array.from({ length: 12 }, (_, i) => thread(`t${String(i + 1).padStart(2, '0')}`, `无关话题${i + 1}`, `无关问题${i + 1}何时闭合？`, ['x1', 'x2', 'x3'], 30)),
    thread('t13', '钢琴练习瓶颈', '练琴何时突破瓶颈？', ['x4', 'x5', 'x6'], 30),
    thread('t14', '新登记的话题', '新话题何时闭合？', ['x7'], 1),
  ]
  const e = new HeadlessMuninn(st)

  let seen = ''
  on(/碰撞判定模块/, (msgs) => {
    seen = msgs.map((m) => m.content).join('\n')
    return JSON.stringify({ verdict: '无关', registerThread: false, reply: 'mock 回复，长度足够。' })
  })

  // 假 embedder：含「钢琴」→ [1,1]，其余 → [0,1]（cosine 与语义亲疏一致）
  setEmbedFn(async (texts) => texts.map((t) => (t.includes('钢琴') ? [1, 1] : [0, 1])))
  await e.ingest('今天练了三小时钢琴，手指都酸了')
  check('向量召回：语义相关但龙脉垫底的 t13 进入候选', seen.includes('id=t13'), seen)
  check('新线索保底放行与排序方式无关：t14 在候选内', seen.includes('id=t14'), seen)
  check('候选数 = 截断 12 + 保底 1', (seen.match(/id=t\d+/g) ?? []).length === 13, seen)

  seen = ''
  setEmbedFn(async () => { throw new Error('embed down') })
  await e.ingest('又练了一小时钢琴')
  check('向量调用失败 → 回退龙脉排序：t13 不在候选', !seen.includes('id=t13'), seen)
  check('回退路径新线索仍保底', seen.includes('id=t14'), seen)

  setEmbedFn(null)
}

/* ================= 场景十一：P0-1 ThreadEvent.day 老化 + SILENT 入池真实触发 ================= */
{
  console.log('\n[11] P0-1 ThreadEvent.day 老化 → SILENT 入池在真实 tick 路径触发')
  resetMocks()
  // 构造一个符合 SILENT 入池条件的线索：曾活跃 ≥2 次、情感权重 ≥0.7、≥21 天无推进、存在 ≥45 天
  // 关键：history 的 day 必须由 tick() 从 Fragment.day 派生，而非 fixture 硬编码
  const s = baseState(30) // lastTickDate = 30 天前
  s.fragments.push(
    { ...frag('f1', 60, '父亲复查'), threadIds: ['t1'] },
    { ...frag('f2', 40, '话题转开'), threadIds: ['t1'] },
  )
  s.threads.push(
    { ...thread('t1', '父亲的病', '父亲的健康状况是否稳定？', ['f1', 'f2'], 60), emotionalWeight: 0.9, dragonVein: 0.7 },
  )
  s.fragSeq = 3

  // tick 前：ThreadEvent.day 是 fixture 设的值（60+i*5）
  const beforeLast = s.threads[0].history[s.threads[0].history.length - 1].day
  const beforeFirst = s.threads[0].history[0].day

  const e = new HeadlessMuninn(s)
  // ingest 触发 tick()：lastTickDate=30天前 → elapsed=30 → ThreadEvent.day 应从 Fragment.day 重新派生
  on(/碰撞判定模块/, JSON.stringify({ verdict: '无关', threadId: null, registerThread: false, reply: 'mock 回复，长度足够。' }))
  await e.ingest('一件普通的事')

  const t1 = e.getState().threads.find((t) => t.id === 't1')!
  const fragDay = (id: string) => e.getState().fragments.find((f) => f.id === id)?.day ?? -1
  // ThreadEvent.day 应等于关联 Fragment 的 day（P0-1 修复后）
  check('ThreadEvent.day 从 Fragment.day 派生（非硬编码 0）',
    t1.history[0].day === fragDay('f1') && t1.history[1].day === fragDay('f2'),
    { histDay: [t1.history[0].day, t1.history[1].day], fragDay: [fragDay('f1'), fragDay('f2')] })

  // SILENT 入池判定：f1=60天前，f2=40天前 → lastDay=40 ≥ 21 ✓，firstDay=60 ≥ 45 ✓ → 入池
  check('SILENT 入池在真实 tick 路径触发（lastDay≥21 + firstDay≥45）',
    t1.pool === 'SILENT' && !!t1.silentSignals, { pool: t1.pool, signals: t1.silentSignals })
}

/* ================= 场景十二：P0-3 SILENT 唤醒后清空 silentSignals → 可重新入池 ================= */
{
  console.log('\n[12] P0-3 SILENT 唤醒后 silentSignals 清空 → 再次沉默可重新入池')
  resetMocks()
  const s = baseState(30)
  s.fragments.push(
    { ...frag('f1', 60, '父亲复查'), threadIds: ['t1'] },
    { ...frag('f2', 40, '话题转开'), threadIds: ['t1'] },
  )
  s.threads.push(
    { ...thread('t1', '父亲的病', '父亲的健康状况是否稳定？', ['f1', 'f2'], 60), emotionalWeight: 0.9, dragonVein: 0.7 },
  )
  s.fragSeq = 3
  const e = new HeadlessMuninn(s)

  // 第一次 ingest → tick → 入 SILENT
  // dragonVein 0.7 - 0.015*30 = 0.25 > 0.15 → 不降级，promoteSilent 可触发
  on(/碰撞判定模块/, JSON.stringify({ verdict: '无关', threadId: null, registerThread: false, reply: 'mock 回复，长度足够。' }))
  await e.ingest('普通事件一')
  const t1 = e.getState().threads.find((t) => t.id === 't1')!
  check('第一次入 SILENT', t1.pool === 'SILENT' && !!t1.silentSignals)

  // 唤醒：触发 silentWakeCheck
  resetMocks()
  on(/沉默池唤醒判定模块/, JSON.stringify({ threadId: 't1', reply: '我在，想说到哪儿就说到哪儿。' }))
  on(/碰撞判定模块/, JSON.stringify({ verdict: '无关', threadId: null, registerThread: false, reply: 'mock 回复。' }))
  await e.ingest('说起父亲的健康')
  const t1b = e.getState().threads.find((t) => t.id === 't1')!
  check('唤醒后回到 ACTIVE', t1b.pool === 'ACTIVE')
  check('唤醒后 silentSignals 已清空（P0-3 修复）', !t1b.silentSignals, t1b.silentSignals)

  // 再次构造长期沉默 → 应能重新入池
  // P0-1 修复后 ThreadEvent.day 由 Fragment.day 派生，需老化碎片 dateLabel 而非直接设 history.day
  const state = e.getState()
  const tzDate = (n: number) => new Date(Date.now() - n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
  state.lastTickDate = tzDate(30)
  // 唤醒时 ingest 创建了新碎片（fragments[0]，day=0）；手动老化到 25 天前
  const wakeFrag = state.fragments[0]
  wakeFrag.day = 25
  wakeFrag.dateLabel = tzDate(25)
  // 老化原始碎片（模拟时间流逝）
  state.fragments.find((f) => f.id === 'f1')!.dateLabel = tzDate(85)
  state.fragments.find((f) => f.id === 'f2')!.dateLabel = tzDate(65)
  resetMocks()
  on(/碰撞判定模块/, JSON.stringify({ verdict: '无关', threadId: null, registerThread: false, reply: 'mock 回复。' }))
  await e.ingest('又一件事')
  const t1c = e.getState().threads.find((t) => t.id === 't1')!
  check('再次沉默后重新入 SILENT（P0-3 修复后 silentSignals 不阻止）', t1c.pool === 'SILENT', { pool: t1c.pool, signals: !!t1c.silentSignals })
}

/* ================= 场景十三：P0-4 abandoned 线索热路径扑空后被重激活 ================= */
{
  console.log('\n[13] P0-4 abandoned 线索：热路径扑空 → 归档层扫描 → 重激活')
  resetMocks()
  const s = baseState()
  s.fragments.push(frag('f1', 30, '宿舍报修', 0.4))
  s.threads.push({
    ...thread('t_net', '宿舍网络', '晚间掉线问题能否解决？', ['f1'], 30),
    status: 'abandoned' as const,
    pool: 'ARCHIVE' as const,
    closureReason: '久无推进，龙脉值衰减归零',
  })
  s.fragSeq = 2
  const e = new HeadlessMuninn(s)

  // LLM 碰撞无命中 + silentWake 无命中 → 归档层扫描
  on(/碰撞判定模块/, JSON.stringify({ verdict: '无关', threadId: null, registerThread: false, reply: 'mock 回复。' }))
  failWith(/沉默池唤醒/) // 无 SILENT 线索，也不会调 LLM 唤醒
  // 输入含「宿舍网络」字符 → charOverlap 应 ≥0.4 → 重激活
  const r = await e.ingest('宿舍网络又掉线了')
  const t = e.getState().threads.find((x) => x.id === 't_net')!
  check('abandoned 线索被重激活（status → unresolved）', t.status === 'unresolved', t.status)
  check('重激活后池位为 DORMANT', t.pool === 'DORMANT', t.pool)
  check('重激活后 closureReason 已清除', !t.closureReason)
  check('IngestResult 记录了 silentWake（归档重激活）', !!r.silentWake, r.silentWake)
}

/* ================= 场景十四：P2-5 反转标记 → 关联论断置信下降 ================= */
{
  console.log('\n[14] P2-5 反转 verdict → 关联论断置信下降（不同于推进）')
  resetMocks()
  const s = baseState()
  s.fragments.push(frag('f1', 5, '深夜写作', 0.7), frag('f2', 3, '存稿推进', 0.5))
  s.threads.push(thread('t1', '写作主线', '写作往哪走？', ['f1', 'f2'], 5))
  s.claims.push({
    id: 'c1', docTitle: '驱动力', text: '写作是她的核心驱动力。', conviction: 0.8,
    evidenceIds: ['f1'], counterEvidence: [], boundary: '——',
    versions: [{ at: daysAgoISO(10), text: '写作是她的核心驱动力。', conviction: 0.8, reason: '初稿' }],
    status: 'active',
  })
  s.fragSeq = 3; s.claimSeq = 2
  const e = new HeadlessMuninn(s)

  on(/碰撞判定模块/, JSON.stringify({ verdict: '反转', threadId: 't1', registerThread: false, reply: '轨迹被否定了。' }))
  await e.ingest('我再也不想写了')
  const c1 = e.getState().claims.find((c) => c.id === 'c1')!
  check('反转后关联论断置信下降 0.8 → 0.75', Math.abs(c1.conviction - 0.75) < 1e-9, c1.conviction)
  check('版本史 +1 且标记反转', c1.versions.length === 2 && c1.versions[1].reason.includes('反转'))
}

/* ================= 场景五：LLM 全挂时的降级 ================= */
{
  console.log('\n[5] LLM 全挂：reflect 只推进 tick，结构不动')
  resetMocks()
  failWith(/./)
  const e = new HeadlessMuninn(reflectFixture())
  const before = JSON.stringify({ t: e.getState().threads.map((x) => x.id + x.status), c: e.getState().claims.length })
  const out = await e.reflect()
  const after = JSON.stringify({ t: e.getState().threads.map((x) => x.id + x.status), c: e.getState().claims.length })
  check('全部环节如实上报 skipped（6 = claims/counter/synthetic/merge/split/audit；无 contested → remention 不触发）',
    out.skipped.length === 6, out.skipped)
  check('线程/论断结构零改动', before === after)
}

console.log(`\n===== smoke 结果：${pass} 通过，${fail} 失败 =====`)
process.exit(fail > 0 ? 1 : 0)
