import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { PageHead, SectionTitle, Seal } from '../components/nouveau'
import { getJournal, getSoliloquy, listNotes, type Note, type ContentMeta } from '../services/api'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function DayCardPage() {
  const [date, setDate] = useState(() => new Date().toLocaleDateString('sv-SE'))
  const [journal, setJournal] = useState<ContentMeta | null>(null)
  const [soliloquy, setSoliloquy] = useState<ContentMeta | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getJournal(date, USER_ID),
      getSoliloquy(date, USER_ID),
      listNotes(1, 100, USER_ID),
    ]).then(([j, s, n]) => {
      setJournal(j)
      setSoliloquy(s)
      setNotes(n.notes.filter((note) => note.date === date))
      setLoading(false)
    })
  }, [date])

  const exportDay = () => {
    const parts = [`# ${date}\n`]
    parts.push(`\n## 日记\n\n${journal?.content ?? '无'}\n`)
    parts.push(`\n## 心迹\n\n${soliloquy?.content ?? '无'}\n`)
    if (notes.length > 0) {
      parts.push(`\n## 便签\n\n${notes.map((n) => `- ${n.content}`).join('\n')}\n`)
    }
    const blob = new Blob([parts.join('')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${date}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="anim-fade">
      <PageHead kicker="Day Card · 日卡" title="日卡" right={
        <button onClick={exportDay} className="nv-chip nv-chip-gold cursor-pointer">
          <Download size={13} /> 导出
        </button>
      } />
      <div className="mt-4">
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setLoading(true) }} className="nv-input px-3 py-1 text-sm" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        <div className="nv-card nv-card-double p-5">
          <SectionTitle>日记 · JOURNAL</SectionTitle>
          {loading ? (
            <div className="text-sm text-fog animate-pulse mt-3">加载中…</div>
          ) : journal?.content ? (
            <div className="whitespace-pre-wrap font-display leading-relaxed text-foreground/90 mt-3">{journal.content}</div>
          ) : (
            <div className="text-sm text-fog mt-3">无日记</div>
          )}
        </div>
        <div className="nv-card nv-card-double p-5">
          <SectionTitle>心迹 · SOLILOQUY</SectionTitle>
          {loading ? (
            <div className="text-sm text-fog animate-pulse mt-3">加载中…</div>
          ) : soliloquy?.content ? (
            <div className="whitespace-pre-wrap font-display leading-relaxed text-foreground/90 mt-3">{soliloquy.content}</div>
          ) : (
            <div className="text-sm text-fog mt-3">无心迹</div>
          )}
        </div>
        <div className="nv-card nv-card-double p-5">
          <SectionTitle>便签 · NOTES（{notes.length}）</SectionTitle>
          {loading ? (
            <div className="text-sm text-fog animate-pulse mt-3">加载中…</div>
          ) : notes.length > 0 ? (
            <div className="space-y-2 mt-3">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-2">
                  <div className="text-sm text-foreground/90">{n.content}</div>
                  <Seal accent="fog">{n.status}</Seal>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-fog mt-3">无便签</div>
          )}
        </div>
      </div>
    </div>
  )
}
