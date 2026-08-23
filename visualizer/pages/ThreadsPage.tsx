import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { GitMerge, Split } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { STATUS_LABEL } from '../engine/engine'
import type { Thread } from '../engine/types'
import { useEngine } from '../state/EngineContext'
import { CornerSprigs, PageHead, Seal, SectionTitle } from '../components/nouveau'

const POOLS = [
  { key: 'ACTIVE', name: 'ACTIVE · 实时碰撞', dot: 'bg-raven', foot: '碰撞策略：实时 100%' },
  { key: 'DORMANT', name: 'DORMANT · 低频扫描', dot: 'bg-fog', foot: '绝不脱离碰撞——脱离等于死亡' },
  { key: 'SILENT', name: 'SILENT · 触发器待机', dot: 'bg-pine', foot: '三信号齐备才入池 · 接受一定虚警率' },
] as const

function ago(day: number) {
  if (day === 0) return '今日'
  if (day >= 30) return `${Math.round(day / 30)} 月`
  if (day >= 7) return `${Math.round(day / 7)} 周`
  return `${day} 天`
}

function statusAccent(t: Thread): string {
  if (t.pool === 'SILENT') return 'cinnabar'
  if (t.status === 'resolved') return 'gold'
  if (t.status === 'unresolved') return t.pool === 'ACTIVE' ? 'raven' : 'fog'
  return 'fog'
}

/* ---------------- 池内小卡 ---------------- */
function PoolSlip({ t, selected, onSelect, flash }: { t: Thread; selected: boolean; onSelect: () => void; flash: boolean }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-xl border bg-card px-3.5 py-3 transition-all',
        t.pool === 'SILENT' ? 'border-dashed border-[hsl(var(--cinnabar)/0.45)]' : 'border-[hsl(var(--gold)/0.3)]',
        selected ? 'ring-2 ring-[hsl(var(--raven)/0.35)] border-[hsl(var(--raven)/0.6)] shadow-md' : 'hover:border-[hsl(var(--raven)/0.5)] hover:shadow-md',
        flash && (t.pool === 'SILENT' ? 'anim-flash-warn' : 'anim-flash'),
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-display text-[13px] font-semibold text-foreground/95 truncate">「{t.label}」</span>
        <span className="flex-1" />
        <span className="text-[10px] text-fog shrink-0">{ago(t.history[t.history.length - 1]?.day ?? 0)}</span>
      </div>
      <div className="text-[10px] text-fog mt-1 truncate">
        {t.id.replace('t_', 'TH-').toUpperCase()} · {t.openQuestion}
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <div className="nv-meter nv-meter-gold flex-1"><div style={{ width: `${t.dragonVein * 100}%` }} /></div>
        <span className="text-[10px] font-mono text-gold">龙脉 {t.dragonVein.toFixed(2)}</span>
      </div>
    </button>
  )
}

/* ---------------- 六态状态机 ---------------- */
function StateMachine() {
  const terminals = [
    { y: 26, label: 'resolved · 回答了悬置问题', color: 'hsl(var(--gold))', dash: false },
    { y: 74, label: 'dissolved · 前提不再成立', color: 'hsl(var(--raven))', dash: false },
    { y: 122, label: 'abandoned · 可重激活', color: 'hsl(var(--cinnabar))', dash: true },
    { y: 170, label: 'superseded · 框架被替换', color: 'hsl(var(--fog))', dash: false },
    { y: 218, label: 'merged · 并入他线', color: 'hsl(var(--pine))', dash: false },
  ]
  return (
    <svg viewBox="0 0 400 252" className="w-full" style={{ fontFamily: 'inherit' }}>
      {terminals.map((t) => (
        <path
          key={t.y}
          d={`M 128 126 H 168 V ${t.y + 15} H 196`}
          fill="none" stroke={t.color} strokeWidth="1" opacity="0.55"
          strokeDasharray={t.dash ? '4 3' : undefined}
        />
      ))}
      <rect x="18" y="108" width="110" height="36" rx="18" fill="hsl(var(--raven))" />
      <text x="73" y="130" textAnchor="middle" fontSize="11.5" fill="hsl(44 40% 92%)">unresolved</text>
      {terminals.map((t) => (
        <g key={t.label}>
          <rect x="196" y={t.y} width="186" height="30" rx="15" fill="hsl(var(--card))" stroke={t.color} strokeWidth="1" strokeDasharray={t.dash ? '4 3' : undefined} />
          <text x="289" y={t.y + 19.5} textAnchor="middle" fontSize="11" fill={t.color}>{t.label}</text>
        </g>
      ))}
      <text x="382" y="12" textAnchor="end" fontSize="9" fill="hsl(var(--fog))">abandoned 可廉价重激活</text>
    </svg>
  )
}

/* ---------------- 线索详情 ---------------- */
function ThreadDetail({ t, onJump, allThreads }: { t: Thread; onJump: (id: string) => void; allThreads: Thread[] }) {
  const byId = (id: string) => allThreads.find((x) => x.id === id)
  return (
    <div className="nv-card nv-card-double p-5 h-full">
      <div className="flex items-center gap-2 flex-wrap">
        <SectionTitle className="mb-0 flex-1">线索详情 · Thread Detail</SectionTitle>
        <Seal accent={statusAccent(t)}>{STATUS_LABEL[t.status]}</Seal>
        <Seal accent="fog">{t.id.replace('t_', 'TH-').toUpperCase()}</Seal>
      </div>

      <div className="mt-3">
        <div className="text-[9px] tracking-[0.3em] text-fog">悬置问题 · OPEN QUESTION</div>
        <div className="font-display text-lg font-semibold text-foreground/95 mt-1">「{t.openQuestion}」</div>
      </div>

      {t.closureReason && (
        <div className="mt-3 border-l-2 border-[hsl(var(--gold)/0.7)] pl-3 py-1 text-[11px] text-gold leading-relaxed">
          closure_reason：{t.closureReason}
        </div>
      )}

      {t.silentSignals && (
        <div className="mt-3 rounded-xl border border-[hsl(var(--cinnabar)/0.35)] bg-[hsl(var(--cinnabar)/0.06)] p-3">
          <div className="text-[9px] tracking-[0.25em] text-cinnabar mb-2">SILENT 信号 · 三信号齐备方可入池</div>
          <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-foreground/80">
            <div>重要度<br /><span className="text-cinnabar">{t.silentSignals.importance}</span></div>
            <div>提及频率<br /><span className="text-cinnabar">{t.silentSignals.mentionFrequency}</span></div>
            <div>回避信号<br /><span className="text-cinnabar">{t.silentSignals.avoidanceSignal}</span></div>
            <div>唤醒阈值<br /><span className="text-cinnabar">{t.silentSignals.triggerThreshold}</span></div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="text-[9px] tracking-[0.3em] text-fog mb-1.5">合成句双层 · SYNTHETIC SENTENCES</div>
        <div className="flex flex-wrap items-center gap-2">
          <Seal accent="raven">抽象层 abstract_floor</Seal>
          <span className="font-display text-xs text-foreground/80">「{t.synthetic.abstractFloor[0]}」</span>
        </div>
        {t.synthetic.concreteGuesses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Seal accent="gold">具体层 concrete</Seal>
            <span className="font-display text-xs text-foreground/80">「{t.synthetic.concreteGuesses[0]}」</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 text-[9px] tracking-[0.3em] text-fog mb-1.5">
          龙脉值 · DRAGON VEIN
          <span className="flex-1" />
          <span className="normal-case tracking-normal">只管「看哪里」，不管「记不记」</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="nv-meter nv-meter-gold flex-1"><div style={{ width: `${t.dragonVein * 100}%` }} /></div>
          <span className="font-display text-xl font-semibold text-gold">{t.dragonVein.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[9px] tracking-[0.3em] text-fog mb-2">事件历史 · EVENT HISTORY</div>
        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
          {[...t.history].sort((a, b) => b.day - a.day).map((h, i) => (
            <div key={i} className="flex gap-2.5 text-[11px]">
              <div className="flex flex-col items-center shrink-0">
                <span className={cn('w-1.5 h-1.5 rounded-full mt-1', i === 0 ? 'bg-raven' : 'bg-[hsl(var(--fog)/0.5)]')} />
                {i < t.history.length - 1 && <span className="w-px flex-1 bg-[hsl(var(--gold)/0.3)]" />}
              </div>
              <span className="font-mono text-fog shrink-0 w-12">{h.day === 0 ? '今天' : `-${h.day}天`}</span>
              <span className="text-foreground/80 leading-relaxed">{h.note}</span>
            </div>
          ))}
        </div>
      </div>

      {(t.lineage.parentIds.length > 0 || t.lineage.childIds.length > 0) && (
        <div className="mt-4">
          <div className="text-[9px] tracking-[0.3em] text-fog mb-1.5">谱系 · LINEAGE</div>
          <div className="flex flex-wrap gap-1.5">
            {t.lineage.parentIds.map((p) => (
              <button key={p} onClick={() => onJump(p)} className="nv-chip hover:border-[hsl(var(--raven)/0.7)] transition-colors">← {byId(p)?.label ?? p}</button>
            ))}
            {t.lineage.childIds.map((c) => (
              <button key={c} onClick={() => onJump(c)} className="nv-chip hover:border-[hsl(var(--raven)/0.7)] transition-colors">→ {byId(c)?.label ?? c}</button>
            ))}
          </div>
        </div>
      )}

      {t.softLinks.length > 0 && (
        <div className="mt-4">
          <div className="text-[9px] tracking-[0.3em] text-fog mb-1.5">软链接 · 待印证</div>
          {t.softLinks.map((s, i) => (
            <div key={i} className="text-[11px] text-fog border-l border-dashed border-[hsl(var(--fog)/0.5)] pl-2.5 py-0.5">{s.note}</div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- 页面 ---------------- */
export default function ThreadsPage() {
  const { state } = useEngine()
  const { threads, flashIds } = state
  const [params, setParams] = useSearchParams()
  // 选中线索由 URL 参数派生（支持全局搜索跳转 ?sel=）
  const selId = params.get('sel') ?? ''
  const sel = threads.find((t) => t.id === selId) ?? threads.find((t) => t.pool === 'ACTIVE') ?? threads[0]

  const mergeEx = useMemo(() => threads.find((t) => t.lineage.parentIds.length > 1), [threads])
  const splitEx = useMemo(() => threads.find((t) => t.lineage.childIds.length > 1), [threads])
  const byId = (id: string) => threads.find((t) => t.id === id)

  const jump = (id: string) => {
    setParams({ sel: id }, { replace: true })
  }

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead
        kicker="Thread Layer · Open Threads"
        title="线索层 · 草蛇灰线系统"
        lead="线索的单位不是「事件」，而是未闭合的状态——登记的是悬置的问题，不是那句话"
        right={<>
          <span className="nv-chip nv-chip-solid">登记 · 宽进严升</span>
          <span className="nv-chip nv-chip-gold">龙脉值只管「看哪里」</span>
        </>}
      />

      {/* ---------- 三池分列 ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {POOLS.map(({ key, name, dot, foot }) => {
          const list = threads.filter((t) => t.pool === key)
          return (
            <section key={key}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className={cn('w-2 h-2 rounded-full', dot)} />
                <span className="font-display text-sm font-semibold">{name}</span>
                <span className="flex-1" />
                {/* shadcn Badge：标准 badge 样式，与 Seal 并存 */}
                <Badge variant="outline" className="text-[10px] font-normal border-[hsl(var(--gold)/0.4)] text-foreground bg-transparent">
                  {list.length}
                </Badge>
              </div>
              <div className="space-y-2.5">
                {list.length === 0 && <div className="text-[11px] text-fog text-center py-6 rounded-xl border border-dashed border-border">此池暂空</div>}
                {list.map((t) => (
                  <PoolSlip key={t.id} t={t} selected={sel?.id === t.id} onSelect={() => jump(t.id)} flash={!!flashIds[t.id]} />
                ))}
              </div>
              <div className="text-[10px] text-fog mt-2.5 px-1">{foot}</div>
            </section>
          )
        })}
      </div>

      {/* ---------- 详情 + 状态机 + 谱系 ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7">
          {sel && <ThreadDetail t={sel} onJump={jump} allThreads={threads} />}
        </div>
        <div className="xl:col-span-5 space-y-4">
          <div className="nv-card nv-card-double p-5">
            <SectionTitle>六态状态机</SectionTitle>
            <StateMachine />
          </div>
          <div className="nv-card nv-card-double p-5 relative overflow-hidden">
            <CornerSprigs corners={['br']} size={40} opacity={0.55} />
            <SectionTitle>谱系 lineage · merge / split</SectionTitle>
            {mergeEx && (
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="nv-chip">{mergeEx.lineage.parentIds.map((p) => byId(p)?.label ?? p).join(' × ')}</span>
                <GitMerge size={14} className="text-raven shrink-0" />
                <span className="nv-chip nv-chip-gold">{mergeEx.label}</span>
                <span className="text-[9px] text-fog w-full">merged · 龙脉饱和合并</span>
              </div>
            )}
            {splitEx && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="nv-chip">{splitEx.label}</span>
                <Split size={14} className="text-gold shrink-0" />
                {splitEx.lineage.childIds.map((c) => (
                  <span key={c} className="nv-chip">{byId(c)?.label ?? c}</span>
                ))}
              </div>
            )}
            <Separator className="my-3 bg-[hsl(var(--gold)/0.25)]" />
            <div className="text-[10px] text-fog leading-relaxed">
              split：龙脉与情感权重复制而非对半分 · 分裂点前历史共享
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
