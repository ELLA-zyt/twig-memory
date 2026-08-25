import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { PageHead, SectionTitle } from '../components/nouveau'
import { getState, type Thread } from '../services/api'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

const POOLS = [
  { key: 'ACTIVE', label: '活跃' },
  { key: 'DORMANT', label: '蛰伏' },
  { key: 'SILENT', label: '沉默' },
] as const

export default function ThreadsPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getState(USER_ID).then((s) => {
      setThreads(s.threads)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead kicker="Threads · 线索层" title="线索层" />
      <div className="text-sm text-fog">加载中...</div>
    </div>
  )

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead kicker="Threads · 线索层" title="线索层" />
      {POOLS.map((pool) => {
        const items = threads.filter((t) => t.pool === pool.key)
        if (items.length === 0) return null
        return (
          <div key={pool.key} className="mb-8">
            <SectionTitle>{pool.label} · {pool.key}（{items.length}）</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
              {items.map((t) => (
                <Link key={t.id} to={`/threads/${t.id}`} className="nv-card nv-card-double p-5 block hover:bg-[hsl(var(--gold)/0.06)] transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground/90">「{t.label}」</div>
                      <div className="text-xs text-fog mt-1">{t.openQuestion}</div>
                    </div>
                    <div className="text-xs font-mono text-gold shrink-0 ml-3">龙脉 {t.dragonVein.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="nv-meter nv-meter-gold flex-1"><div style={{ width: `${t.dragonVein * 100}%` }} /></div>
                  </div>
                  <div className="text-[10px] text-fog mt-2">{t.history.length} 条事件 · {t.status}</div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
      {threads.length === 0 && <div className="text-sm text-fog text-center py-20">暂无线索</div>}
    </div>
  )
}
