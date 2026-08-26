import { useEffect, useState } from 'react'
import { calendarMarks, getJournal, type CalendarDay } from '../services/api'
import { PageHead, Seal } from '../components/nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

const weekdayOf = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { weekday: 'long' })

/** 中缝：书页合拢处的渐变阴影 */
function BookGutter() {
  return (
    <>
      {/* 宽屏：垂直中缝 */}
      <div
        className="hidden xl:block w-[22px] self-stretch shrink-0"
        style={{
          background:
            'linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.10) 38%, hsl(var(--foreground) / 0.20) 50%, hsl(var(--foreground) / 0.10) 62%, transparent)',
        }}
        aria-hidden
      />
      {/* 窄屏：水平中缝 */}
      <div
        className="xl:hidden h-[18px] w-full shrink-0"
        style={{
          background:
            'linear-gradient(180deg, transparent, hsl(var(--foreground) / 0.10) 38%, hsl(var(--foreground) / 0.20) 50%, hsl(var(--foreground) / 0.10) 62%, transparent)',
        }}
        aria-hidden
      />
    </>
  )
}

/** 丝带书签：从书脊顶部垂下 */
function BookmarkRibbon() {
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none" aria-hidden>
      <div
        className="w-[15px] h-[72px] shadow-md"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--cinnabar) / 0.92), hsl(var(--cinnabar)))',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%)',
        }}
      />
    </div>
  )
}

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
  const today = new Date().toLocaleDateString('sv-SE')

  return (
    <div className="anim-fade">
      <PageHead kicker="Book · 记忆书" title="记忆书" />

      {/* 对开书页：左日历右日记，共享一道书脊 */}
      <div className="nv-card nv-card-double relative overflow-hidden flex flex-col xl:flex-row">
        <BookmarkRibbon />

        {/* 左页：月历 */}
        <div className="flex-1 min-w-0 p-5 lg:p-7">
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
              const active = selected === date
              return (
                <button
                  key={i}
                  onClick={() => has && open(date)}
                  className={`h-10 rounded-lg text-sm flex items-center justify-center transition-colors ${
                    active
                      ? 'bg-raven/25 text-raven font-semibold ring-1 ring-[hsl(var(--raven)/0.4)]'
                      : has
                        ? 'bg-raven/10 text-raven font-medium hover:bg-raven/20'
                        : 'text-foreground/60 hover:bg-muted'
                  }`}
                >
                  {c}
                  {has && <span className="w-1 h-1 rounded-full bg-raven ml-1" />}
                </button>
              )
            })}
          </div>
        </div>

        <BookGutter />

        {/* 右页：日记（翻页淡入） */}
        <div className="flex-1 min-w-0 p-5 lg:p-7">
          {selected ? (
            <div key={selected} className="anim-fade">
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-[10px] text-fog">{selected} · 日记</div>
                <div className="text-[10px] font-display text-gold/80 tracking-widest">{weekdayOf(selected)}</div>
              </div>
              {journalLoading ? (
                <div className="text-sm text-fog animate-pulse py-8 text-center">加载中...</div>
              ) : journal ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap font-display leading-relaxed text-foreground/90">
                  {journal}
                </div>
              ) : (
                /* 选了日期但没有日记内容：留白印章 */
                <div className="flex flex-col items-center text-center py-12">
                  <div className="font-display text-2xl text-foreground/70 tracking-[0.3em]">{weekdayOf(selected)}</div>
                  <Seal accent="gold" className="mt-4 rotate-[-4deg] !px-3 !py-1 text-[11px]">今日留白 · 风平浪静</Seal>
                  <p className="mt-3 text-[11px] text-fog/80">这一天有别的痕迹，但没有写成日记。</p>
                </div>
              )}
            </div>
          ) : (
            /* 未选日期：今日星期艺术字 */
            <div className="flex flex-col items-center text-center py-12">
              <div className="font-display text-3xl text-foreground/75 tracking-[0.35em]">{weekdayOf(today)}</div>
              <div className="mt-2 text-[10px] tracking-[0.25em] text-fog font-display">{today}</div>
              <p className="mt-5 text-[13px] font-display italic text-fog">指尖落于左页的金色标记，翻至有墨迹的一页。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
