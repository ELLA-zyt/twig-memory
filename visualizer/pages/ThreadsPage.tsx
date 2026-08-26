import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { PageHead, InkEmpty } from '../components/nouveau'
import { getState, getClaims, type Thread, type Claim } from '../services/api'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

/** 看板枚举映射：pool 枚举是 ACTIVE/DORMANT/SILENT，论断是独立实体（见 /v1/claims），第三栏混排 claims */
const COLUMNS = [
  { key: 'latent', label: '潜伏 · 萌芽', pools: ['DORMANT', 'SILENT'] },
  { key: 'active', label: '活跃追踪', pools: ['ACTIVE'] },
  { key: 'claims', label: '汇聚 · 论断', pools: [] },
] as const

function ThreadCard({ t }: { t: Thread }) {
  return (
    <Link
      to={`/threads/${t.id}`}
      className="nv-card nv-card-double p-4 block hover:bg-[hsl(var(--gold)/0.06)] transition-colors -rotate-[0.4deg] odd:rotate-[0.4deg] hover:rotate-0"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground/90">「{t.label}」</div>
          <div className="text-xs text-fog mt-1 line-clamp-2">{t.openQuestion}</div>
        </div>
        <div className="text-xs font-mono text-gold shrink-0 ml-3">龙脉 {t.dragonVein.toFixed(2)}</div>
      </div>
      <div className="nv-meter nv-meter-gold mt-3"><div style={{ width: `${t.dragonVein * 100}%` }} /></div>
      <div className="text-[10px] text-fog mt-2">{t.history.length} 条事件 · {t.status}</div>
    </Link>
  )
}

function ClaimCard({ c }: { c: Claim }) {
  return (
    <div className="nv-card nv-card-double p-4 border-[hsl(var(--gold)/0.5)]">
      <div className="text-sm font-medium text-foreground/90 leading-relaxed">{c.text}</div>
      {c.boundary && <div className="text-[11px] text-fog mt-1.5 line-clamp-2">边界：{c.boundary}</div>}
      <div className="nv-meter nv-meter-gold mt-3"><div style={{ width: `${c.conviction * 100}%` }} /></div>
      <div className="text-[10px] text-fog mt-2">确信度 {c.conviction.toFixed(2)} · {c.versions.length} 个版本</div>
    </div>
  )
}

function EmptyColumn({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[hsl(var(--gold)/0.3)] py-8 px-4 text-center">
      <div className="text-[11px] text-fog/80 font-display italic">{text}</div>
    </div>
  )
}

export default function ThreadsPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getState(USER_ID), getClaims(USER_ID)]).then(([s, c]) => {
      setThreads(s.threads)
      setClaims(c)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="anim-fade">
      <PageHead kicker="Threads · 线索层" title="线索层" />
      <div className="text-sm text-fog">加载中...</div>
    </div>
  )

  const latent = threads.filter((t) => t.pool === 'DORMANT' || t.pool === 'SILENT')
  const active = threads.filter((t) => t.pool === 'ACTIVE')

  if (threads.length === 0 && claims.length === 0) return (
    <div className="anim-fade">
      <PageHead kicker="Threads · 线索层" title="线索层" />
      <InkEmpty size={110} quote="草蛇灰线，伏脉千里。" hint="碎片积累到一定程度后，引擎会在这里牵出线索" />
    </div>
  )

  return (
    <div className="anim-fade">
      <PageHead
        kicker="Threads · 线索层"
        title="线索层"
        lead="潜伏的碎片在低处蓄积，活跃的线索在被追踪，成熟的判断最终汇聚为论断。"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {COLUMNS.map((col) => {
          const items = col.key === 'latent' ? latent : col.key === 'active' ? active : []
          const count = col.key === 'claims' ? claims.length : items.length
          return (
            <section key={col.key} className="min-w-0">
              <div className="flex items-baseline justify-between mb-3 px-1">
                <h2 className="font-display text-sm font-semibold text-foreground/90 tracking-wide">{col.label}</h2>
                <span className="text-[10px] font-mono text-fog">{count}</span>
              </div>
              <div className="space-y-3">
                {col.key === 'claims'
                  ? (claims.length > 0
                      ? claims.map((c) => <ClaimCard key={c.id} c={c} />)
                      : <EmptyColumn text="尚无论断汇聚——认识仍在途中。" />)
                  : (items.length > 0
                      ? items.map((t) => <ThreadCard key={t.id} t={t} />)
                      : <EmptyColumn text={col.key === 'latent' ? '此刻没有蛰伏的线索。' : '没有正在追踪的线索。'} />)}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
