import { useEffect, useState } from 'react'
import { calendarMarks, getJournal, type CalendarDay } from '../services/api'
import { PageHead } from '../components/nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function BookPage() {
  const [month, setMonth] = useState(() => new Date().toLocaleDateString('sv-SE').slice(0, 7))
  const [days, setDays] = useState<CalendarDay[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [journal, setJournal] = useState<string>('')
  const [journalLoading, setJournalLoading] = useState(false)

  useEffect(() => {
    calendarMarks(month, USER_ID).then((r) => setDays(r.days))
  }, [month])

  const open = async (date: string) => {
    setSelected(date)
    setJournalLoading(true)
    try {
      const j = await getJournal(date, USER_ID)
      setJournal(j.content ?? '')
    } finally {
      setJournalLoading(false)
    }
  }

  const daysInMonth = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0).getDate()
  const firstDay = new Date(`${month}-01`).getDay()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => {
    const d = i - firstDay + 1
    return d > 0 ? String(d).padStart(2, '0') : ''
  })
  const dayMap = new Map(days.map((d) => [d.date, d]))

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead kicker="Book · 记忆书" title="记忆书" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="nv-card nv-card-double p-5">
          <div className="flex items-center gap-3 mb-4">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="nv-input px-3 py-1 text-sm" />
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-fog mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((c, i) => {
              if (!c) return <div key={i} />
              const date = `${month}-${c}`
              const d = dayMap.get(date)
              const has = d && (d.hasJournal || d.hasSoliloquy || d.hasNote || d.hasStamp)
              return (
                <button
                  key={i}
                  onClick={() => has && open(date)}
                  className={`h-10 rounded-lg text-sm flex items-center justify-center ${has ? 'bg-raven/10 text-raven font-medium hover:bg-raven/20' : 'text-foreground/60 hover:bg-muted'}`}
                >
                  {c}
                  {has && <span className="w-1 h-1 rounded-full bg-raven ml-1" />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="nv-card nv-card-double p-5">
          {selected ? (
            <div>
              <div className="text-[10px] text-fog mb-2">{selected} · 日记</div>
              {journalLoading ? (
                <div className="text-sm text-fog animate-pulse py-8 text-center">加载中...</div>
              ) : (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap font-display leading-relaxed text-foreground/90">
                  {journal || '暂无日记'}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-fog text-center py-20">点击左侧有标记的日期查看日记</div>
          )}
        </div>
      </div>
    </div>
  )
}
