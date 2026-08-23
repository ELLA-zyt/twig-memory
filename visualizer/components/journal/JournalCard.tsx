import { useEffect, useState } from 'react'
import { getJournal, generateJournal } from '../../services/api'
import { SectionTitle } from '../nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function JournalCard() {
  const [content, setContent] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    getJournal(date, USER_ID).then((r) => setContent(r.content))
  }, [date])

  const generate = async () => {
    const r = await generateJournal(USER_ID)
    setDate(r.date)
    setContent(r.content)
  }

  return (
    <div className="nv-card nv-card-double p-5">
      <div className="flex items-center justify-between">
        <SectionTitle className="mb-0">今日日记 · Journal</SectionTitle>
        <button onClick={generate} className="nv-chip nv-chip-gold text-[10px]">生成</button>
      </div>
      <div className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-display min-h-[120px]">
        {content || <span className="text-fog">今日暂无日记</span>}
      </div>
    </div>
  )
}
