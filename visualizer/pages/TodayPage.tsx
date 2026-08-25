import { useCurrentNote } from '../hooks/useNote'
import NoteShowcase from '../components/notes/NoteShowcase'
import JournalCard from '../components/journal/JournalCard'
import SoliloquyCard from '../components/soliloquy/SoliloquyCard'
import BeadJar from '../components/stamps/BeadJar'
import { PageHead, SectionTitle } from '../components/nouveau'
import { useEffect, useRef, useState } from 'react'
import { getState, generateNote, type Thread } from '../services/api'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function TodayPage() {
  const { note, loading, refresh, markRead } = useCurrentNote(USER_ID)
  const [threads, setThreads] = useState<Thread[]>([])
  const [generating, setGenerating] = useState(false)
  const noteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getState(USER_ID).then((s) => setThreads(s.threads.filter((t) => t.pool === 'ACTIVE')))
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
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
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

      {loading && <div className="text-sm text-fog">加载中...</div>}

      {!loading && note && (
        <div ref={noteRef}>
          <NoteShowcase note={note} onRespond={refresh} />
        </div>
      )}

      {!loading && !note && (
        <div className="nv-card nv-card-double p-10 text-center mb-6">
          <div className="text-sm text-fog mb-4">今天还没有便签</div>
          <button
            onClick={create}
            disabled={generating}
            className="nv-btn px-5 py-2 disabled:opacity-50"
          >
            {generating ? '生成中...' : '生成一条'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <JournalCard />
        <SoliloquyCard />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-6">
        <div className="xl:col-span-2 nv-card nv-card-double p-5">
          <SectionTitle>正在关注的事 · 活跃线索</SectionTitle>
          {threads.length === 0 && <div className="text-sm text-fog py-6 text-center">暂无活跃线索</div>}
          <div className="space-y-2.5">
            {threads.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-[hsl(var(--gold)/0.25)] px-3 py-2.5 hover:bg-[hsl(var(--gold)/0.06)] transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-foreground/90">「{t.label}」</div>
                  <div className="text-xs text-fog">{t.openQuestion}</div>
                </div>
                <div className="text-xs font-mono text-gold">龙脉 {t.dragonVein.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
        <BeadJar />
      </div>
    </div>
  )
}
