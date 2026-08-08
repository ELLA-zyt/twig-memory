import { ArrowRight, BookOpen, Flame, GitBranch, Layers, Moon, Puzzle, RefreshCw } from 'lucide-react'
import { useEngine } from '../state/EngineContext'
import { CornerSprigs, HaloIcon, PageHead, Seal, SectionTitle, VineDivider } from '../components/nouveau'
import { cn } from '@/lib/utils'

/* ---------------- 统计卡 ---------------- */
function StatCard({ icon, label, en, value, sub, tone = 'green', flash }: {
  icon: React.ReactNode
  label: string
  en: string
  value: React.ReactNode
  sub: React.ReactNode
  tone?: 'green' | 'gold' | 'terra'
  flash?: boolean
}) {
  return (
    <div className={cn('nv-card p-4 pl-5 overflow-hidden', flash && 'anim-flash')}>
      <CornerSprigs corners={['tr']} size={38} opacity={0.6} />
      <div className="flex items-center gap-2.5">
        <HaloIcon size={34} tone={tone}>{icon}</HaloIcon>
        <div className="min-w-0">
          <div className="text-[11px] text-foreground/80 truncate">{label}</div>
          <div className="text-[8px] tracking-[0.2em] text-fog font-display uppercase">{en}</div>
        </div>
      </div>
      <div className="font-display text-[34px] leading-none font-semibold text-foreground mt-3">{value}</div>
      <div className="text-[10px] text-fog mt-2 leading-relaxed">{sub}</div>
    </div>
  )
}

export default function OverviewPage() {
  const { state } = useEngine()
  const { fragments, threads, claims, logs, flashIds } = state

  const today = fragments.filter((f) => f.day === 0).length
  const active = threads.filter((t) => t.pool === 'ACTIVE')
  const dormant = threads.filter((t) => t.pool === 'DORMANT')
  const silent = threads.filter((t) => t.pool === 'SILENT')
  const versions = claims.reduce((n, c) => n + c.versions.length, 0)
  const repaired = [...claims].filter((c) => c.versions.length > 1).sort((a, b) => b.versions.length - a.versions.length)[0]

  const LAYERS = [
    { name: '认识层 · 长程理解层', desc: '对人 / 关系 / 主题的活叙事文档 · 增量重述 + 版本史 + 全套防漂移', tone: 'gold' as const, Icon: BookOpen },
    { name: '线索层 · 草蛇灰线系统', desc: '开放线索登记簿：追踪未闭合状态 · ACTIVE / DORMANT / SILENT 三池', tone: 'green' as const, Icon: Layers },
    { name: '碎片层 · 事件桶', desc: 'VAD 情感坐标 + 情绪调制衰减 · 成熟机制复用层', tone: 'green' as const, Icon: Puzzle },
  ]

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead kicker="Overview · Narrative Memory" title="总览" />

      {/* ---------- 拱形英雄画幅 + 反刍节拍器 ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        <div className="xl:col-span-8 nv-card nv-card-double nv-arch nv-arch-double overflow-hidden">
          <CornerSprigs corners={['tl', 'tr']} size={56} opacity={0.9} />
          <div className="px-8 pt-16 pb-8 text-center relative">
            <VineDivider className="mx-auto mb-5 opacity-90" width={180} />
            <h2 className="font-display text-[26px] md:text-[32px] leading-snug font-semibold text-foreground">
              记忆不是一盒卡片，<span className="text-raven">是一部还在连载的书。</span>
            </h2>
            <p className="text-[13px] text-fog mt-3">
              现有系统记住「发生了什么」；衔枝持续修正「我如何理解你」
            </p>
            <VineDivider className="mx-auto mt-5 opacity-90" width={180} />
          </div>
        </div>

        <div className="xl:col-span-4 nv-card nv-card-double p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-raven opacity-50 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-raven" />
            </span>
            <span className="font-display font-semibold text-sm">反刍节拍器 · 运行中</span>
            <span className="flex-1" />
            <RefreshCw size={14} className="text-raven" />
          </div>
          <div className="text-[11px] text-fog mt-2.5 leading-relaxed">
            今晚 02:00 低频扫描 + 盲推导审计
          </div>
          <div className="mt-3 pt-3 border-t border-[hsl(var(--gold)/0.25)] text-[10px] text-fog leading-relaxed">
            DORMANT 池绝不脱离碰撞——脱离等于死亡；SILENT 池触发器待机
          </div>
        </div>
      </div>

      {/* ---------- 统计卡 ---------- */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Puzzle size={15} />} label="碎片层 · 事件桶" en="Episodes" tone="green"
          value={fragments.length.toLocaleString()}
          sub={<><span className="text-raven">+{today} 今日</span> · VAD 坐标已标注 96%</>}
          flash={!!flashIds[fragments[0]?.id]}
        />
        <StatCard
          icon={<Flame size={15} />} label="活跃线索 · ACTIVE" en="Open threads" tone="terra"
          value={<>{active.length}<span className="text-lg text-fog">/{threads.filter((t) => t.status === 'unresolved').length}</span></>}
          sub={<><span className="text-gold">实时碰撞 100%</span> · 登记宽进严升</>}
        />
        <StatCard
          icon={<Moon size={15} />} label="沉睡 · 静默线索" en="Dormant · Silent" tone="green"
          value={dormant.length + silent.length}
          sub={<>DORMANT {dormant.length} · SILENT {silent.length}</>}
        />
        <StatCard
          icon={<BookOpen size={15} />} label="认识层 · 理解版本" en="Living docs" tone="gold"
          value={<>v{versions}</>}
          sub={<><span className="text-raven">本周改写 {claims.filter((c) => c.versions.length > 1).length} 次</span> · 漂移审计通过</>}
        />
      </div>

      {/* ---------- 三层叙事记忆引擎 ---------- */}
      <SectionTitle right={<span className="text-[10px] text-gold tracking-wider cursor-default">查看架构文档 →</span>}>
        三层叙事记忆引擎
      </SectionTitle>
      <div className="nv-card nv-card-double p-5 mb-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
          <div className="xl:col-span-7 space-y-3">
            {LAYERS.map(({ name, desc, tone, Icon }) => (
              <div key={name} className="flex items-center gap-3.5 rounded-xl border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--raven)/0.05)] px-4 py-3">
                <HaloIcon size={36} tone={tone}><Icon size={15} /></HaloIcon>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground/95">{name}</div>
                  <div className="text-[11px] text-fog mt-0.5 leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden xl:flex xl:col-span-1 flex-col items-center">
            <div className="text-[9px] text-fog mb-1 whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>检索组装</div>
            <ArrowRight size={18} className="text-raven" />
          </div>

          <div className="xl:col-span-4 nv-dark nv-dark-double p-5">
            <div className="text-[9px] tracking-[0.3em] text-[hsl(38_52%_60%)] font-display">RETRIEVAL OUTPUT</div>
            <div className="font-display text-lg font-semibold text-[hsl(44_34%_88%)] mt-1">叙事上下文包</div>
            <div className="mt-3 space-y-2 text-[11px] text-[hsl(44_22%_76%)]">
              <div className="flex items-center gap-2"><Puzzle size={12} className="text-[hsl(38_52%_60%)]" />相关碎片 × 6 · 含 VAD 情感坐标</div>
              <div className="flex items-center gap-2"><GitBranch size={12} className="text-[hsl(38_52%_60%)]" />所在线索位置 × 2 · 龙脉值排序</div>
              <div className="flex items-center gap-2"><BookOpen size={12} className="text-[hsl(38_52%_60%)]" />当前认识状态 · 理解版本 v{versions}</div>
            </div>
            <div className="mt-4 inline-flex rounded-full bg-[hsl(38_52%_55%/0.15)] border border-[hsl(38_52%_55%/0.35)] px-3 py-1 text-[10px] text-[hsl(38_52%_62%)]">
              不是 top-k 卡片
            </div>
          </div>
        </div>
      </div>

      {/* ---------- 碰撞记录 + 记忆修复 ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="nv-card nv-card-double p-5">
          <SectionTitle right={<span className="text-[10px] text-gold tracking-wider">全部日志 →</span>}>
            今日碰撞记录 · Collision Log
          </SectionTitle>
          {logs.length === 0 ? (
            <div className="py-8 text-center">
              <VineDivider className="mx-auto mb-4 opacity-60" width={150} />
              <div className="text-xs text-fog leading-relaxed">碰撞判定尚待显影 —— 前往「现场演示」注入第一条事件</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...logs].slice(-4).reverse().map((l) => (
                <div key={l.id} className="flex items-center gap-3 anim-fade">
                  <span className="font-mono text-[10px] text-fog w-12 shrink-0">{l.time.slice(0, 5)}</span>
                  <span className="text-xs text-foreground/90 flex-1 min-w-0 truncate" title={l.detail}>{l.title}</span>
                  <Seal accent={l.accent}>{KIND_LABEL[l.kind] ?? l.kind}</Seal>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="nv-card nv-card-double p-5">
          <SectionTitle>本周记忆修复 · Memory Repair</SectionTitle>
          {repaired ? (
            <div className="anim-fade">
              <div className="text-[10px] text-fog mb-1.5">过去理解 · {repaired.versions[repaired.versions.length - 2].at}</div>
              <div className="rounded-xl bg-[hsl(var(--cinnabar)/0.06)] border border-[hsl(var(--cinnabar)/0.2)] px-3.5 py-2.5 text-xs text-fog">
                <span className="nv-strike">{repaired.versions[repaired.versions.length - 2].text}</span>
              </div>
              <div className="flex items-center gap-2 my-2.5 text-[10px] text-gold">
                <span className="w-4 h-px bg-[hsl(var(--gold)/0.6)]" />
                新证据重新解释 · 改写留痕
              </div>
              <div className="text-[10px] text-fog mb-1.5">现在理解 · {repaired.versions[repaired.versions.length - 1].at}</div>
              <div className="rounded-xl bg-[hsl(var(--raven)/0.07)] border border-[hsl(var(--raven)/0.25)] px-3.5 py-2.5 text-xs text-foreground/90 leading-relaxed">
                「{repaired.versions[repaired.versions.length - 1].text}」
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Seal accent="raven">关闭线索 ×{threads.filter((t) => t.status !== 'unresolved').length}</Seal>
                <Seal accent="gold">认识改写 · {repaired.docTitle}</Seal>
                <Seal accent="fog">过程可复现</Seal>
              </div>
            </div>
          ) : (
            <div className="text-xs text-fog py-8 text-center">暂无改写记录</div>
          )}
        </div>
      </div>
    </div>
  )
}

const KIND_LABEL: Record<string, string> = {
  ingest: '碎片', register: '登记', collision: '碰撞', adjudicate: '判定',
  transition: '状态机', merge: 'MERGE', split: 'SPLIT', rewrite: '改写',
  counter: '反证', silent: 'SILENT', reject: '拒绝', system: '系统',
}
