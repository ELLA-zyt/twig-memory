/**
 * 种子数据：过去 90 天（2026-05-09 → 2026-08-07）
 * 1423 条消息 → 37 个事件 / 12 条长期线索 / 5 个核心认识
 * 演示人格「她」：大一市场营销、校社联主席、番茄签约作者（修仙连载 + 人外新坑）、
 * 独立开发者、新手 VTuber（两套皮套）、设备焦虑、父亲的病（SILENT）。
 */
import type { Claim, Fragment, Thread } from './types'

export const TODAY_LABEL = '8月7日'
export const IMPORT_STATS = { messages: 1423, events: 37, threads: 12, claims: 5 }

/* ================= 碎片层：37 个事件 ================= */

export const SEED_FRAGMENTS: Fragment[] = [
  { id: 'f01', day: 90, dateLabel: '5月9日', title: '硬盘又没买成', body: '攒了三个月钱，看中的那块 4T 硬盘涨了 200，又没下得去手。', vad: { valence: -0.55, arousal: 0.72, dominance: 0.3 }, threadIds: ['t_hdd'], tags: ['物欲', '生活规划'] },
  { id: 'f02', day: 86, dateLabel: '5月13日', title: '剪视频卡死丢了工程', body: '电脑渲染到一半死机，工程文件损坏，熬夜重做了一遍。', vad: { valence: -0.7, arousal: 0.85, dominance: 0.25 }, threadIds: ['t_pc'], tags: ['设备', '创作'] },
  { id: 'f03', day: 82, dateLabel: '5月17日', title: '连载第40章卡文', body: '修仙连载第 40 章写不动，主角这一卷的动机立不住。', vad: { valence: -0.4, arousal: 0.6, dominance: 0.4 }, threadIds: ['t_writing'], tags: ['写作', '连载'] },
  { id: 'f04', day: 78, dateLabel: '5月21日', title: '社联换届启动', body: '要整理三年台账做交接，光活动记录就两百多条。', vad: { valence: -0.1, arousal: 0.5, dominance: 0.6 }, threadIds: ['t_handover'], tags: ['社联', '事务'] },
  { id: 'f05', day: 74, dateLabel: '5月25日', title: '星图第一颗星', body: '第一次对她说「I flipped」。这一天在星图上标了星。', vad: { valence: 0.8, arousal: 0.7, dominance: 0.6 }, threadIds: [], tags: ['关系', '纪念'] },
  { id: 'f06', day: 70, dateLabel: '5月29日', title: '人外新坑灵感爆发', body: '半夜来了灵感，连夜写了三千字人外设定，停不下来。', vad: { valence: 0.85, arousal: 0.8, dominance: 0.7 }, threadIds: ['t_writing'], tags: ['写作', '人外'] },
  { id: 'f07', day: 66, dateLabel: '6月2日', title: '期末复习周开始', body: '考试周到了，连载跟读者请了一周假。', vad: { valence: -0.2, arousal: 0.55, dominance: 0.5 }, threadIds: ['t_exam', 't_writing'], tags: ['学业', '连载'] },
  { id: 'f08', day: 63, dateLabel: '6月5日', title: '父亲复查', body: '妈打电话说爸复查结果还行。电话里他只说了句「没事」，她没敢多问。', vad: { valence: -0.5, arousal: 0.65, dominance: 0.2 }, threadIds: ['t_father'], tags: ['家庭'] },
  { id: 'f09', day: 60, dateLabel: '6月8日', title: '番茄签约通过', body: '签约审核过了，拿到全勤奖门槛。截图发了三个群。', vad: { valence: 0.9, arousal: 0.75, dominance: 0.8 }, threadIds: ['t_royalty', 't_writing'], tags: ['写作', '签约'] },
  { id: 'f10', day: 57, dateLabel: '6月11日', title: '考试周结束', body: '最后一门交卷，「总之是撑过来了」。', vad: { valence: 0.5, arousal: 0.4, dominance: 0.7 }, threadIds: ['t_exam'], tags: ['学业'] },
  { id: 'f11', day: 54, dateLabel: '6月14日', title: '连载复更', body: '恢复更新，催更评论 99+，又被读者抓到了。', vad: { valence: 0.4, arousal: 0.7, dominance: 0.5 }, threadIds: ['t_writing'], tags: ['连载'] },
  { id: 'f12', day: 50, dateLabel: '6月18日', title: '二手工作站被抢', body: '看中一台二手工作站，犹豫了两天，被人先买走了。', vad: { valence: -0.6, arousal: 0.7, dominance: 0.3 }, threadIds: ['t_pc'], tags: ['设备', '物欲'] },
  { id: 'f13', day: 47, dateLabel: '6月21日', title: '深夜聊创作观', body: '「写东西的时候我才像我自己。」聊到凌晨一点。', vad: { valence: 0.7, arousal: 0.6, dominance: 0.8 }, threadIds: [], tags: ['写作', '深夜'] },
  { id: 'f14', day: 45, dateLabel: '6月23日', title: '又卡文，开始自我怀疑', body: '连载又卡住。开始怀疑到底是设备拖累，还是自己的能力问题。', vad: { valence: -0.55, arousal: 0.75, dominance: 0.3 }, threadIds: ['t_block', 't_writing'], tags: ['写作', '连载'] },
  { id: 'f15', day: 42, dateLabel: '6月26日', title: '交接文档写完', body: '三年台账整理完，交接文档写了 40 页。', vad: { valence: 0.6, arousal: 0.4, dominance: 0.8 }, threadIds: ['t_handover'], tags: ['社联'] },
  { id: 'f16', day: 39, dateLabel: '6月29日', title: '商单邀约', body: '有个软文商单找上门，价格不错，但打心里不想写。', vad: { valence: 0, arousal: 0.45, dominance: 0.6 }, threadIds: ['t_shangdan'], tags: ['变现', '写作'] },
  { id: 'f17', day: 36, dateLabel: '7月2日', title: '第一套皮套付定金', body: 'VTuber 皮套定金付了，排期两个月。', vad: { valence: 0.8, arousal: 0.75, dominance: 0.7 }, threadIds: ['t_vtuber'], tags: ['VTuber'] },
  { id: 'f18', day: 33, dateLabel: '7月5日', title: '失眠到四点', body: '凌晨四点还没睡着，第二天早八直接睡过去。', vad: { valence: -0.5, arousal: 0.5, dominance: 0.2 }, threadIds: [], tags: ['深夜', '作息'] },
  { id: 'f19', day: 30, dateLabel: '7月8日', title: '把卡文甩锅给电脑', body: '卡文还在继续。「换台机器肯定顺。」她自己知道这话半真半假。', vad: { valence: -0.4, arousal: 0.6, dominance: 0.35 }, threadIds: ['t_block', 't_pc'], tags: ['写作', '设备'] },
  { id: 'f20', day: 28, dateLabel: '7月10日', title: '稿费到账，比预期少', body: '第一期稿费到账，比预期少了一截，盯着后台数据看了一晚上。', vad: { valence: -0.45, arousal: 0.7, dominance: 0.35 }, threadIds: ['t_royalty'], tags: ['签约', '数据'] },
  { id: 'f21', day: 26, dateLabel: '7月12日', title: '读者长评', body: '有读者写了长评说「这个世界观很独特」。截图收藏了。', vad: { valence: 0.75, arousal: 0.6, dominance: 0.7 }, threadIds: ['t_writing'], tags: ['连载', '读者'] },
  { id: 'f22', day: 24, dateLabel: '7月14日', title: '社联交接完成', body: '新任主席上手顺利，三年主席生涯正式落幕。', vad: { valence: 0.65, arousal: 0.4, dominance: 0.8 }, threadIds: ['t_handover'], tags: ['社联'] },
  { id: 'f23', day: 22, dateLabel: '7月16日', title: '宿舍宽带又掉线', body: '晚上八点准时掉线，报修三次了，师傅说「查不出问题」。', vad: { valence: -0.35, arousal: 0.5, dominance: 0.3 }, threadIds: ['t_network'], tags: ['生活'] },
  { id: 'f24', day: 20, dateLabel: '7月18日', title: '话题从父亲身上转开', body: '聊到爸的身体，她说了句「不说这个了」，转头去聊皮套设计。', vad: { valence: -0.3, arousal: 0.55, dominance: 0.25 }, threadIds: ['t_father'], tags: ['家庭', '回避'] },
  { id: 'f25', day: 18, dateLabel: '7月20日', title: '第一次和编辑通电话', body: '签约后第一次和编辑深聊，定了长篇的卷结构规划。', vad: { valence: 0.6, arousal: 0.55, dominance: 0.7 }, threadIds: ['t_writing', 't_royalty'], tags: ['写作', '签约'] },
  { id: 'f26', day: 16, dateLabel: '7月22日', title: '决定不接商单', body: '「签约了，不靠这个。」把商单婉拒了。', vad: { valence: 0.5, arousal: 0.4, dominance: 0.75 }, threadIds: ['t_shangdan'], tags: ['变现'] },
  { id: 'f27', day: 14, dateLabel: '7月24日', title: '又想换电脑', body: '看了一圈整机价格，叹气：「再等等。」——和买硬盘时的烦躁一模一样。', vad: { valence: -0.35, arousal: 0.6, dominance: 0.4 }, threadIds: ['t_pc', 't_hdd'], tags: ['设备', '物欲'] },
  { id: 'f28', day: 12, dateLabel: '7月26日', title: '第二套皮套到货', body: '皮套开箱，拍了一下午素材，质量超预期。', vad: { valence: 0.8, arousal: 0.7, dominance: 0.7 }, threadIds: ['t_vtuber'], tags: ['VTuber'] },
  { id: 'f29', day: 10, dateLabel: '7月28日', title: '「两个坑分开养」', body: '想清楚了：修仙连载和人外新坑的回收条件不一样，「两个坑分开养」。', vad: { valence: 0.3, arousal: 0.5, dominance: 0.7 }, threadIds: ['t_writing'], tags: ['写作'] },
  { id: 'f30', day: 9, dateLabel: '7月29日', title: '深夜连发三条', body: 'deadline、稿费、皮套，凌晨连发三条，最后一句「有点累」。', vad: { valence: -0.45, arousal: 0.65, dominance: 0.25 }, threadIds: [], tags: ['深夜'] },
  { id: 'f31', day: 8, dateLabel: '7月30日', title: '连载上分类推荐', body: '上了分类推荐位，单日涨收 300。', vad: { valence: 0.7, arousal: 0.65, dominance: 0.6 }, threadIds: ['t_writing', 't_royalty'], tags: ['连载', '数据'] },
  { id: 'f32', day: 7, dateLabel: '7月31日', title: '约了二手整机面交', body: '看中一套高配二手整机，约了周末面交。', vad: { valence: 0.55, arousal: 0.7, dominance: 0.6 }, threadIds: ['t_hdd', 't_pc'], tags: ['设备'] },
  { id: 'f33', day: 6, dateLabel: '8月1日', title: '面交被放鸽子', body: '卖家临时失联。「算了，直接买新的。」', vad: { valence: -0.5, arousal: 0.65, dominance: 0.5 }, threadIds: ['t_hdd', 't_pc'], tags: ['设备'] },
  { id: 'f34', day: 5, dateLabel: '8月2日', title: '看了两套房', body: '想搬到离实验室近一点的地方，周末看了两套，还在犹豫。', vad: { valence: 0.2, arousal: 0.45, dominance: 0.55 }, threadIds: ['t_move'], tags: ['生活'] },
  { id: 'f35', day: 4, dateLabel: '8月3日', title: '整理了自己的用户画像', body: '把系统记的关于她的东西从头到尾看了一遍：「原来我是这样的人。」', vad: { valence: 0.6, arousal: 0.5, dominance: 0.7 }, threadIds: [], tags: ['反思'] },
  { id: 'f36', day: 3, dateLabel: '8月4日', title: '出道直播排练', body: '第一次完整排练，紧张到自我介绍都口吃。', vad: { valence: -0.2, arousal: 0.8, dominance: 0.3 }, threadIds: ['t_vtuber'], tags: ['VTuber'] },
  { id: 'f37', day: 2, dateLabel: '8月5日', title: '存稿三章', body: '连载存稿攒到三章，「终于有点安全感」。', vad: { valence: 0.65, arousal: 0.4, dominance: 0.75 }, threadIds: ['t_writing'], tags: ['连载'] },
]

/* ================= 线索层：登记簿 ================= */

export const SEED_THREADS: Thread[] = [
  // ---- 已并入（merged） ----
  {
    id: 't_hdd', label: '攒钱买硬盘',
    openQuestion: '存储 / 设备焦虑是否解除？',
    synthetic: {
      abstractFloor: ['一桩悬置的硬件投入终于落地', '长期的设备焦虑得到解除'],
      concreteGuesses: ['下单了新硬盘 / 新电脑', '存储空间不够的问题不复存在'],
    },
    dragonVein: 0.42, emotionalWeight: 0.66,
    history: [
      { day: 90, fragmentId: 'f01', note: '登记：硬盘涨价未买成' },
      { day: 14, fragmentId: 'f27', note: '共同烦躁信号再现' },
      { day: 7, fragmentId: 'f32', note: '二手整机面交约定' },
      { day: 6, fragmentId: 'f33', note: '面交流产，转向买新机' },
    ],
    status: 'merged', closureReason: '与「想换电脑」共同命中，识别为同一框架「设备升级」',
    lineage: { parentIds: [], childIds: ['t_device'] },
    pool: 'ARCHIVE', softLinks: [],
  },
  {
    id: 't_pc', label: '想换电脑',
    openQuestion: '旧电脑性能对创作的限制是否解除？',
    synthetic: {
      abstractFloor: ['长期限制被移除', '卡了很久的东西终于通了'],
      concreteGuesses: ['换了新电脑', '旧电脑退役', '设备不再是瓶颈'],
    },
    dragonVein: 0.55, emotionalWeight: 0.74,
    history: [
      { day: 86, fragmentId: 'f02', note: '登记：死机丢稿' },
      { day: 50, fragmentId: 'f12', note: '二手工作站被抢先' },
      { day: 30, fragmentId: 'f19', note: '卡文甩锅设备' },
      { day: 7, fragmentId: 'f32', note: '二手整机面交约定' },
      { day: 6, fragmentId: 'f33', note: '面交流产，转向买新机' },
    ],
    status: 'merged', closureReason: '与「攒钱买硬盘」共同命中，识别为同一框架「设备升级」',
    lineage: { parentIds: [], childIds: ['t_device'] },
    pool: 'ARCHIVE', softLinks: [],
  },
  // ---- ACTIVE ----
  {
    id: 't_device', label: '设备升级',
    openQuestion: '设备层面的创作限制是否解除？',
    synthetic: {
      abstractFloor: ['长期限制被移除', '卡了很久的东西终于通了', '一桩悬置的硬件投入终于落地'],
      concreteGuesses: ['换了新电脑', '旧电脑退役', '新设备到位', '设备不再是瓶颈'],
    },
    dragonVein: 0.68, emotionalWeight: 0.78,
    history: [
      { day: 90, fragmentId: 'f01', note: '（继承自「攒钱买硬盘」）' },
      { day: 86, fragmentId: 'f02', note: '（继承自「想换电脑」）' },
      { day: 50, fragmentId: 'f12', note: '（继承自「想换电脑」）' },
      { day: 14, fragmentId: 'f27', note: 'merge 触发事件：共同烦躁' },
      { day: 7, fragmentId: 'f32', note: '二手整机面交约定' },
      { day: 6, fragmentId: 'f33', note: '面交流产，决定买新机' },
    ],
    status: 'unresolved',
    lineage: { parentIds: ['t_hdd', 't_pc'], childIds: [] },
    pool: 'ACTIVE', softLinks: [],
  },
  {
    id: 't_serial', label: '修仙连载',
    openQuestion: '长篇连载能否保持稳定更新并走通商业化？',
    synthetic: {
      abstractFloor: ['连载的可持续性得到确认', '更新节奏恢复稳定'],
      concreteGuesses: ['存稿充裕恢复日更', '完本或改编签约', '均订突破某个门槛'],
    },
    dragonVein: 0.74, emotionalWeight: 0.7,
    history: [
      { day: 82, fragmentId: 'f03', note: '登记：第40章卡文' },
      { day: 66, fragmentId: 'f07', note: '考试周请假' },
      { day: 60, fragmentId: 'f09', note: '签约通过' },
      { day: 54, fragmentId: 'f11', note: '复更，催更 99+' },
      { day: 26, fragmentId: 'f21', note: '读者长评' },
      { day: 18, fragmentId: 'f25', note: '与编辑定卷结构' },
      { day: 8, fragmentId: 'f31', note: '上分类推荐' },
      { day: 2, fragmentId: 'f37', note: '存稿三章' },
    ],
    status: 'unresolved',
    lineage: { parentIds: ['t_writing'], childIds: [] },
    pool: 'ACTIVE', softLinks: [],
  },
  {
    id: 't_renwkai', label: '人外新坑',
    openQuestion: '人外新坑是否正式开坑？',
    synthetic: {
      abstractFloor: ['新作品从构思进入执行'],
      concreteGuesses: ['新坑开更', '人外设定集完成', '新书上架'],
    },
    dragonVein: 0.58, emotionalWeight: 0.62,
    history: [
      { day: 70, fragmentId: 'f06', note: '登记：灵感爆发三千字' },
      { day: 10, fragmentId: 'f29', note: 'split：与连载分化，「分开养」' },
    ],
    status: 'unresolved',
    lineage: { parentIds: ['t_writing'], childIds: [] },
    pool: 'ACTIVE', softLinks: [],
  },
  {
    id: 't_vtuber', label: 'VTuber 出道',
    openQuestion: '出道直播是否完成？',
    synthetic: {
      abstractFloor: ['筹备已久的一次亮相终于发生'],
      concreteGuesses: ['出道回开播', '首播结束复盘'],
    },
    dragonVein: 0.61, emotionalWeight: 0.72,
    history: [
      { day: 36, fragmentId: 'f17', note: '登记：皮套付定金' },
      { day: 12, fragmentId: 'f28', note: '第二套皮套到货' },
      { day: 3, fragmentId: 'f36', note: '出道排练，紧张口吃' },
    ],
    status: 'unresolved',
    lineage: { parentIds: [], childIds: [] },
    pool: 'ACTIVE', softLinks: [],
  },
  // ---- DORMANT ----
  {
    id: 't_block', label: '创作瓶颈（卡文）',
    openQuestion: '卡住她的到底是设备还是能力？',
    synthetic: {
      abstractFloor: ['长期卡点被疏通', '一直卡我的东西解决了', '瓶颈不复存在'],
      concreteGuesses: ['卡文原因被定位并消除', '恢复顺畅更新'],
    },
    dragonVein: 0.47, emotionalWeight: 0.7,
    history: [
      { day: 45, fragmentId: 'f14', note: '登记：设备还是能力？' },
      { day: 30, fragmentId: 'f19', note: '甩锅设备，半真半假' },
    ],
    status: 'unresolved',
    lineage: { parentIds: [], childIds: [] },
    pool: 'DORMANT',
    softLinks: [{ fragmentId: 'f19', note: '弱信号：甩锅设备 → 留作待印证' }],
  },
  {
    id: 't_royalty', label: '稿费与数据',
    openQuestion: '连载收入能否撑起「职业作者」的想象空间？',
    synthetic: {
      abstractFloor: ['收入与预期之间的关系得到安放'],
      concreteGuesses: ['稿费破圈', '均订大涨', '放下数据焦虑'],
    },
    dragonVein: 0.44, emotionalWeight: 0.58,
    history: [
      { day: 60, fragmentId: 'f09', note: '登记：签约通过' },
      { day: 28, fragmentId: 'f20', note: '稿费低于预期' },
      { day: 18, fragmentId: 'f25', note: '与编辑定规划' },
      { day: 8, fragmentId: 'f31', note: '推荐位涨收 300' },
    ],
    status: 'unresolved',
    lineage: { parentIds: [], childIds: [] },
    pool: 'DORMANT', softLinks: [],
  },
  {
    id: 't_move', label: '搬家找房',
    openQuestion: '是否搬到离实验室更近的地方？',
    synthetic: {
      abstractFloor: ['居住安排落定'],
      concreteGuesses: ['签了新租约', '决定不搬'],
    },
    dragonVein: 0.22, emotionalWeight: 0.3,
    history: [{ day: 5, fragmentId: 'f34', note: '登记：看了两套房' }],
    status: 'unresolved',
    lineage: { parentIds: [], childIds: [] },
    pool: 'DORMANT',
    softLinks: [{ fragmentId: 'f34', note: '弱信号：「还在犹豫」→ 待二次信号加固' }],
  },
  // ---- SILENT ----
  {
    id: 't_father', label: '父亲的病',
    openQuestion: '父亲的健康状况是否稳定？',
    synthetic: {
      abstractFloor: ['家庭责任的重量被接住'],
      concreteGuesses: ['父亲复查结果稳定', '陪父亲去一次医院'],
    },
    dragonVein: 0.35, emotionalWeight: 0.95,
    history: [
      { day: 63, fragmentId: 'f08', note: '登记：复查，「没事」，没敢多问' },
      { day: 20, fragmentId: 'f24', note: '相关话题出现时话题转移' },
    ],
    status: 'unresolved',
    lineage: { parentIds: [], childIds: [] },
    pool: 'SILENT',
    silentSignals: { importance: 0.95, mentionFrequency: 0.05, avoidanceSignal: 0.9, triggerThreshold: 'low' },
    softLinks: [],
  },
  // ---- 归档（终态示例） ----
  {
    id: 't_handover', label: '社联换届交接',
    openQuestion: '三年社联事务能否平稳交接？',
    synthetic: { abstractFloor: ['一桩长期责任完成移交'], concreteGuesses: ['交接完成'] },
    dragonVein: 0.2, emotionalWeight: 0.5,
    history: [
      { day: 78, fragmentId: 'f04', note: '登记：换届启动' },
      { day: 42, fragmentId: 'f15', note: '交接文档 40 页' },
      { day: 24, fragmentId: 'f22', note: '回收：交接完成' },
    ],
    status: 'resolved', closureReason: '交接完成，新任主席上手顺利——这件事解决了',
    lineage: { parentIds: [], childIds: [] },
    pool: 'ARCHIVE', softLinks: [],
  },
  {
    id: 't_exam', label: '期末考试周',
    openQuestion: '能否撑过考试周且不崩掉连载？',
    synthetic: { abstractFloor: ['一段高压时期平安度过'], concreteGuesses: ['考试结束'] },
    dragonVein: 0.15, emotionalWeight: 0.45,
    history: [
      { day: 66, fragmentId: 'f07', note: '登记：复习周开始' },
      { day: 57, fragmentId: 'f10', note: '回收：撑过来了' },
    ],
    status: 'resolved', closureReason: '考试结束——这件事解决了',
    lineage: { parentIds: [], childIds: [] },
    pool: 'ARCHIVE', softLinks: [],
  },
  {
    id: 't_shangdan', label: '接商单变现',
    openQuestion: '是否靠商单补贴设备预算？',
    synthetic: { abstractFloor: ['一种变现路径的存废有了结论'], concreteGuesses: ['接了商单', '回绝商单'] },
    dragonVein: 0.18, emotionalWeight: 0.35,
    history: [
      { day: 39, fragmentId: 'f16', note: '登记：商单邀约' },
      { day: 16, fragmentId: 'f26', note: '前提消失：签约后不靠这个' },
    ],
    status: 'dissolved', closureReason: '签约后「补贴设备预算」的前提不再成立——问题本身消失了',
    lineage: { parentIds: [], childIds: [] },
    pool: 'ARCHIVE', softLinks: [],
  },
  {
    id: 't_network', label: '宿舍网络',
    openQuestion: '晚间掉线问题能否解决？',
    synthetic: { abstractFloor: ['生活设施的长期毛病有了说法'], concreteGuesses: ['宽带修好', '换运营商'] },
    dragonVein: 0.09, emotionalWeight: 0.28,
    history: [{ day: 22, fragmentId: 'f23', note: '登记：报修三次未果' }],
    status: 'abandoned', closureReason: '久无推进且龙脉值衰减至阈值下，降级二级召回层——热路径扑空才扫归档',
    lineage: { parentIds: [], childIds: [] },
    pool: 'ARCHIVE', softLinks: [],
  },
  {
    id: 't_writing', label: '写作主线（旧框架）',
    openQuestion: '写作这件事往哪里走？',
    synthetic: { abstractFloor: ['写作方向的演化'], concreteGuesses: [] },
    dragonVein: 0.5, emotionalWeight: 0.6,
    history: [
      { day: 82, fragmentId: 'f03', note: '登记：连载卡文' },
      { day: 70, fragmentId: 'f06', note: '人外灵感加入' },
      { day: 10, fragmentId: 'f29', note: 'split：回收条件不再共享' },
    ],
    status: 'superseded', closureReason: '框架被「修仙连载」与「人外新坑」两条平行分支取代',
    lineage: { parentIds: [], childIds: ['t_serial', 't_renwkai'] },
    pool: 'ARCHIVE', softLinks: [],
  },
]

/* ================= 认识层：5 + 1 份活文档 ================= */

export const SEED_CLAIMS: Claim[] = [
  {
    id: 'u_drive', docTitle: '创造驱动力',
    text: '技术折腾与写作是她的双引擎：压力越大，越倾向用「做点什么新东西」来重建掌控感。',
    conviction: 0.82,
    evidenceIds: ['f06', 'f13', 'f21', 'f28'],
    counterEvidence: [
      {
        text: '7月29日深夜连发三条，最后是「有点累」——没有启动任何新动作。',
        fragmentId: 'f30',
        resolution: '单次深夜情绪低点，判定为情境性疲劳而非驱动力变化。说明留痕。',
      },
    ],
    boundary: '证据集中在晚间创作场景；白天学业场景下的驱动力表现尚无足够观察。',
    versions: [
      { at: '5月25日', text: '她好像什么都想试试。', conviction: 0.6, reason: '初稿：仅有零星观察' },
      { at: '6月23日', text: '技术折腾与写作是她的双引擎：压力越大，越倾向用「做点什么新东西」来重建掌控感。', conviction: 0.82, reason: '签约、皮套、新坑三组证据收敛' },
    ],
    status: 'active',
  },
  {
    id: 'u_device', docTitle: '设备与创作',
    text: '旧电脑性能是她创作流程的主要瓶颈，已造成至少两次实质性损失（丢稿、卡文迁延）。',
    conviction: 0.9,
    evidenceIds: ['f02', 'f12', 'f19', 'f33'],
    counterEvidence: [
      {
        text: '她自己也承认「换台机器肯定顺」这话半真半假——设备可能只是卡文的替罪羊。',
        fragmentId: 'f19',
        resolution: '保留限定语「主要瓶颈」而非「唯一原因」；待设备解除后用产出变化验证。',
      },
    ],
    boundary: '「设备解除后产出是否回升」是本论断的证伪窗口，需 2-4 周观察。',
    versions: [
      { at: '6月18日', text: '设备问题给她造成了一些麻烦。', conviction: 0.55, reason: '初稿' },
      { at: '7月24日', text: '旧电脑性能是她创作流程的主要瓶颈，已造成至少两次实质性损失（丢稿、卡文迁延）。', conviction: 0.9, reason: '二手工作站被抢 + 面交流产，损失链条闭合' },
    ],
    status: 'active',
  },
  {
    id: 'u_deadline', docTitle: 'Deadline 行为',
    text: 'Q2 期间，连载更新与社联 / 考试冲突的三次 deadline 均延后 1-2 天，但最终全部交付。',
    conviction: 0.74,
    evidenceIds: ['f07', 'f11', 'f15'],
    counterEvidence: [],
    boundary: '仅「学业 + 连载」双压场景；无证据推广到一般情境——故不写作「她是拖延的人」。',
    versions: [
      { at: '7月2日', text: 'Q2 期间，连载更新与社联 / 考试冲突的三次 deadline 均延后 1-2 天，但最终全部交付。', conviction: 0.74, reason: '初稿即采用去定性化表述（§5.3）' },
    ],
    status: 'active',
  },
  {
    id: 'u_night', docTitle: '深夜情绪窗口',
    text: '23:00 后的消息情感唤醒度平均高出白天约四成；重大情绪表达几乎集中在深夜。',
    conviction: 0.77,
    evidenceIds: ['f13', 'f18', 'f30'],
    counterEvidence: [],
    boundary: '样本为 90 天内的晚间对话；未覆盖她独处无倾诉对象时的状态。',
    versions: [
      { at: '7月29日', text: '23:00 后的消息情感唤醒度平均高出白天约四成；重大情绪表达几乎集中在深夜。', conviction: 0.77, reason: '三次深夜高强度事件收敛' },
    ],
    status: 'active',
  },
  {
    id: 'u_identity', docTitle: '创作者身份',
    text: '写作正在从爱好变成职业身份的一部分：她开始以编辑、读者、稿费这些外部坐标确认自己。',
    conviction: 0.8,
    evidenceIds: ['f09', 'f21', 'f25', 'f35'],
    counterEvidence: [],
    boundary: '「职业身份」指自我认同层面；她目前收入尚不足以职业定义。',
    versions: [
      { at: '6月2日', text: '写作是她重要的爱好。', conviction: 0.65, reason: '初稿' },
      { at: '7月20日', text: '写作正在从爱好变成职业身份的一部分：她开始以编辑、读者、稿费这些外部坐标确认自己。', conviction: 0.8, reason: '签约 + 编辑电话 + 读者长评，外部坐标系形成' },
    ],
    status: 'active',
  },
  {
    id: 'u_data', docTitle: '连载数据焦虑',
    text: '她对连载数据（收藏、稿费）有超出正常范围的焦虑。',
    conviction: 0.58,
    evidenceIds: ['f20'],
    counterEvidence: [],
    boundary: '——',
    versions: [
      { at: '7月10日', text: '她对连载数据（收藏、稿费）有超出正常范围的焦虑。', conviction: 0.58, reason: '初稿：单条证据' },
    ],
    status: 'contested',
    contestedNote: '本人否决：「我没有过度焦虑，我只是在经营。」已退出默认可见文档与检索上下文；只有独立新证据积累到更高门槛，才能以邀请式措辞再提一次（closure_reason: user-vetoed）。',
  },
]
