import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { getThreadTimeline, type Thread } from '../services/api'
import { PageHead, SectionTitle } from '../components/nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function ThreadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<{ thread: Thread; events: any[] } | null>(null)

  useEffect(() => {
    if (!id) return
    getThreadTimeline(id, USER_ID).then(setData)
  }, [id])

  if (!data) return <div className="p-10 text-sm text-fog">加载中...</div>

  const { thread, events } = data

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead kicker="Thread Timeline" title={thread.label} lead={thread.openQuestion} />
      <div className="nv-card nv-card-double p-5">
        <SectionTitle>线索时间线</SectionTitle>
        <div className="space-y-4">
          {events.map((e, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-raven" />
                {i < events.length - 1 && <span className="w-px flex-1 bg-[hsl(var(--gold)/0.3)]" />}
              </div>
              <div className="pb-4">
                <div className="text-xs text-fog font-mono">{e.day === 0 ? '今天' : `${e.day} 天前`}</div>
                <div className="text-sm text-foreground/90 mt-0.5">{e.note}</div>
                {e.fragment && (
                  <div className="text-xs text-fog mt-1 border-l border-dashed border-[hsl(var(--fog)/0.4)] pl-2">
                    {e.fragment.title}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
