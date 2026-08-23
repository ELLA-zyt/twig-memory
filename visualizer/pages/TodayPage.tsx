import { useCurrentNote } from '../hooks/useNote'
import NoteShowcase from '../components/notes/NoteShowcase'
import { PageHead } from '../components/nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function TodayPage() {
  const { note, loading, refresh, createNote } = useCurrentNote(USER_ID)

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
        <div className="nv-card nv-card-double p-10 text-center">
          <div className="text-sm text-fog mb-4">今天还没有便签</div>
          <button onClick={create} className="nv-btn px-5 py-2">写一条</button>
        </div>
      )}
    </div>
  )
}
