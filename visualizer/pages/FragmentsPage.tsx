import { useEffect, useState } from 'react'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { PageHead, SectionTitle } from '../components/nouveau'
import { getState, type MuninnState } from '../services/api'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function FragmentsPage() {
  const [state, setState] = useState<MuninnState | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    getState(USER_ID).then((s) => {
      setState(s)
      setLoading(false)
    })
  }, [])

  const fragments = state?.fragments ?? []
  const filtered = filter
    ? fragments.filter(
        (f) =>
          f.title.toLowerCase().includes(filter.toLowerCase()) ||
          f.body.toLowerCase().includes(filter.toLowerCase()) ||
          f.tags?.some((t) => t.toLowerCase().includes(filter.toLowerCase())),
      )
    : fragments

  // 按日期分组（最新在前）
  const byDate = filtered.reduce((acc, f) => {
    const date = f.dateLabel
    if (!acc[date]) acc[date] = []
    acc[date].push(f)
    return acc
  }, {} as Record<string, typeof fragments>)

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="anim-fade">
      <PageHead kicker="Fragments · 碎片层" title="原始记忆碎片" />

      <div className="mt-4 flex items-center gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜索标题、内容或标签…"
          className="nv-input px-3 py-1.5 text-sm flex-1"
        />
        <span className="text-xs text-fog whitespace-nowrap">
          共 {fragments.length} 条
        </span>
      </div>

      <div className="mt-6 space-y-6">
        {loading && (
          <div className="text-sm text-fog animate-pulse">加载中…</div>
        )}

        {!loading && dates.length === 0 && (
          <div className="text-sm text-fog">没有匹配的碎片</div>
        )}

        {dates.map((date) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-display text-sm text-foreground/80">
                {date}
              </span>
              <span className="text-xs text-fog">
                {byDate[date].length} 条
              </span>
              <div className="flex-1 h-px bg-[hsl(var(--gold)/0.2)]" />
            </div>

            <div className="space-y-2">
              {byDate[date].map((f) => {
                const isExpanded = expandedId === f.id
                return (
                  <div
                    key={f.id}
                    className="nv-card p-4 cursor-pointer hover:border-[hsl(var(--gold)/0.5)] transition-colors"
                    onClick={() => toggle(f.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground/90">
                          {f.title}
                        </div>
                        {isExpanded && (
                          <div className="mt-3 text-sm text-foreground/75 leading-relaxed whitespace-pre-wrap">
                            {f.body}
                          </div>
                        )}
                        {!isExpanded && (
                          <div className="mt-1 text-xs text-fog line-clamp-1">
                            {f.body.slice(0, 80)}…
                          </div>
                        )}
                        {f.tags && f.tags.length > 0 && isExpanded && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {f.tags.map((tag) => (
                              <span
                                key={tag}
                                className="nv-chip nv-chip-gold text-[11px]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {f.threadIds && f.threadIds.length > 0 && isExpanded && (
                          <div className="mt-2 text-xs text-fog">
                            关联线索：{f.threadIds.join('、')}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-fog">
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
