import { useCurrentNote } from '../hooks/useNote'
import NoteShowcase from '../components/notes/NoteShowcase'
import JournalCard from '../components/journal/JournalCard'
import SoliloquyCard from '../components/soliloquy/SoliloquyCard'
import BeadJar from '../components/stamps/BeadJar'
import { PageHead, SectionTitle } from '../components/nouveau'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getState, type Thread } from '../services/api'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function TodayPage() {
  const { note, loading, refresh, createNote } = useCurrentNote(USER_ID)
  const [threads, setThreads] = useState<Thread[]>([])

  useEffect(() => {
    getState(USER_ID).then((s) => setThreads(s.threads.filter((t) => t.pool === 'ACTIVE')))
  }, [])

  const create = async () => {
    const content = window.prompt('写入今日便签：')
    if (!content) return
    await createNote(content, USER_ID)
    refresh()
  }

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead kicker="Today · 今日扉页" title="今天的故事" right={<button onClick={create} className="nv-chip nv-chip-gold cursor-pointer">写便签</button>} />

      {loading && <div className="text-sm text-fog">加载中...</div>}

      {!loading && note && <NoteShowcase note={note} onRespond={refresh} />}

      {!loading && !note && (
        <div className="nv-card nv-card-double p-10 text-center mb-6">
          <div className="text-sm text-fog mb-4">今天还没有便签</div>
          <button onClick={create} className="nv-btn px-5 py-2">写一条</button>
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
              <Link
                key={t.id}
                to={`/threads/${t.id}`}
                className="flex items-center justify-between rounded-lg border border-[hsl(var(--gold)/0.25)] px-3 py-2.5 hover:bg-[hsl(var(--gold)/0.06)] transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-foreground/90">「{t.label}」</div>
                  <div className="text-xs text-fog">{t.openQuestion}</div>
                </div>
                <div className="text-xs font-mono text-gold">龙脉 {t.dragonVein.toFixed(2)}</div>
              </Link>
            ))}
          </div>
        </div>
        <BeadJar />
      </div>
    </div>
  )
}
