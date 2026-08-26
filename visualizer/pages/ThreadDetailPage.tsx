import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { PageHead, Seal, SectionTitle } from '../components/nouveau'
import { getThreadTimeline, type Thread } from '../services/api'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

interface TimelineEvent {
  day: number
  note: string
  fragment: { id: string; title: string; body: string } | null
}

export default function ThreadDetailPage() {
  const { id } = useParams()
  const threadId = id ?? ''
  const [thread, setThread] = useState<Thread | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getThreadTimeline(threadId, USER_ID)
      .then((res) => {
        setThread(res.thread)
        setEvents(res.events as TimelineEvent[])
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }, [threadId])

  if (loading) return (
    <div className="anim-fade">
      <PageHead kicker="Thread · 线索详情" title="加载中..." />
      <div className="text-sm text-fog mt-4">加载中...</div>
    </div>
  )

  if (error) return (
    <div className="anim-fade">
      <Link to="/threads" className="inline-flex items-center gap-1.5 text-sm text-fog hover:text-foreground mb-4">
        <ArrowLeft size={14} /> 返回线索层
      </Link>
      <div className="text-sm text-fog">加载失败：{error}</div>
    </div>
  )

  if (!thread) return (
    <div className="anim-fade">
      <Link to="/threads" className="inline-flex items-center gap-1.5 text-sm text-fog hover:text-foreground mb-4">
        <ArrowLeft size={14} /> 返回线索层
      </Link>
      <div className="text-sm text-fog text-center py-20">线索不存在</div>
    </div>
  )

  const sortedEvents = [...events].sort((a, b) => a.day - b.day)

  return (
    <div className="anim-fade">
      <Link to="/threads" className="inline-flex items-center gap-1.5 text-sm text-fog hover:text-foreground mb-4">
        <ArrowLeft size={14} /> 返回线索层
      </Link>
      <PageHead kicker="Thread · 线索详情" title={thread.label} />
      <div className="nv-card nv-card-double p-5 mt-4">
        <div className="text-sm text-foreground/90">{thread.openQuestion}</div>
        <div className="flex items-center gap-2 mt-3">
          <div className="nv-meter nv-meter-gold flex-1"><div style={{ width: `${thread.dragonVein * 100}%` }} /></div>
          <span className="text-xs font-mono text-gold">{thread.dragonVein.toFixed(2)}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Seal accent="raven">{thread.pool}</Seal>
          <Seal accent="gold">{thread.status}</Seal>
        </div>
      </div>
      <div className="mt-6">
        <SectionTitle>事件时间线 · TIMELINE（{sortedEvents.length}）</SectionTitle>
        <div className="space-y-4 mt-3">
          {sortedEvents.map((event, i) => (
            <div key={i}>
              <div className="text-[10px] font-mono text-gold">Day {event.day}</div>
              <div className="text-sm text-foreground/90 mt-1">{event.note}</div>
              {event.fragment ? (
                <div className="nv-card p-4 mt-2">
                  <div className="text-xs font-medium text-gold">{event.fragment.title}</div>
                  <div className="text-sm text-foreground/80 whitespace-pre-wrap mt-1">{event.fragment.body}</div>
                </div>
              ) : (
                <div className="text-xs text-fog mt-2">碎片已移除</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
