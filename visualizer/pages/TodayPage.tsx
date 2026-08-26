import { useCurrentNote } from '../hooks/useNote'
import NoteShowcase from '../components/notes/NoteShowcase'
import JournalCard from '../components/journal/JournalCard'
import SoliloquyCard from '../components/soliloquy/SoliloquyCard'
import { PageHead, SectionTitle, InkEmpty, PulseLine } from '../components/nouveau'
import { useEffect, useRef, useState } from 'react'
import { getState, generateNote, type Thread, type MuninnState } from '../services/api'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

type Fragment = MuninnState['fragments'][number]

export default function TodayPage() {
  const { note, loading, refresh, markRead } = useCurrentNote(USER_ID)
  const [threads, setThreads] = useState<Thread[]>([])
  const [fragments, setFragments] = useState<Fragment[]>([])
  const [generating, setGenerating] = useState(false)
  const noteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getState(USER_ID).then((s) => {
      setThreads(s.threads.filter((t) => t.pool === 'ACTIVE'))
      setFragments(s.fragments)
    })
  }, [])

  useEffect(() => {
    if (!note || note.status !== 'unread' || !noteRef.current) return
    const el = noteRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          markRead(note.id, USER_ID).then(() => refresh())
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [note, markRead, refresh])

  const create = async () => {
    setGenerating(true)
    try {
      await generateNote(USER_ID)
      refresh()
    } catch {
      alert('生成失败，请稍后再试')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="anim-fade">
      <PageHead
        kicker="Today · 今日扉页"
        title="今天的故事"
        right={
          <button
            onClick={create}
            disabled={generating}
            className="nv-chip nv-chip-gold cursor-pointer disabled:opacity-50"
          >
            {generating ? '生成中...' : '生成便签'}
          </button>
        }
      />

      <PulseLine className="-mt-2 mb-5 opacity-80" label="Memoria Viva" />

      {loading && <div className="text-sm text-fog">加载中...</div>}

      {!loading && note && (
        <div ref={noteRef}>
          <NoteShowcase key={note.id} note={note} onRespond={() => refresh({ silent: true })} onStamp={() => refresh({ silent: true })} />
        </div>
      )}

      {!loading && !note && (
        <div className="nv-card nv-card-double px-10 py-4 mb-6">
          <InkEmpty
            size={110}
            quote="今日的便签尚未抵达，乌鸦仍在途中。"
            hint="便签由引擎基于今日碎片与活跃线索生成"
          >
            <button
              onClick={create}
              disabled={generating}
              className="nv-btn px-5 py-2 disabled:opacity-50"
            >
              {generating ? '生成中...' : '召唤一条便签'}
            </button>
          </InkEmpty>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <JournalCard />
        <SoliloquyCard />
      </div>

      <div className="mt-6">
        <div className="nv-card nv-card-double p-5">
          <SectionTitle>正在关注的事 · 活跃线索</SectionTitle>
          {threads.length === 0 && (
            <InkEmpty
              compact
              size={64}
              quote="草蛇灰线，伏脉千里——尚无线索被激活。"
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {threads.slice(0, 6).map((t) => {
              const linked = fragments.filter((f) => f.threadIds?.includes(t.id)).slice(0, 3)
              return (
                <div
                  key={t.id}
                  className="group relative overflow-hidden rounded-lg border border-[hsl(var(--gold)/0.3)] px-3.5 py-3 hover:border-[hsl(var(--gold)/0.55)] hover:bg-[hsl(var(--gold)/0.05)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground/90 truncate">「{t.label}」</div>
                      <div className="text-xs text-fog mt-0.5 line-clamp-2">{t.openQuestion}</div>
                    </div>
                    <div className="text-[10px] font-mono text-gold shrink-0">龙脉 {t.dragonVein.toFixed(2)}</div>
                  </div>
                  <div className="nv-meter nv-meter-gold mt-2.5"><div style={{ width: `${t.dragonVein * 100}%` }} /></div>
                  {/* 悬浮浮现关联碎片摘要（数据来自已加载的 state，无额外请求） */}
                  {linked.length > 0 && (
                    <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-[hsl(var(--card)/0.96)] border-t border-[hsl(var(--gold)/0.3)] px-3.5 py-2">
                      <div className="text-[9px] tracking-[0.2em] text-gold/80 font-display mb-1">关联碎片</div>
                      {linked.map((f) => (
                        <div key={f.id} className="text-[11px] text-foreground/75 truncate leading-relaxed">· {f.title}</div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
