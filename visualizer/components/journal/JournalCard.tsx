import { useEffect, useState } from 'react'
import { getJournal, generateJournal } from '../../services/api'
import { SectionTitle, InkEmpty } from '../nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function JournalCard() {
  const [content, setContent] = useState('')
  const [date, setDate] = useState(() => new Date().toLocaleDateString('sv-SE'))

  useEffect(() => {
    getJournal(date, USER_ID).then((r) => setContent(r.content ?? ''))
  }, [date])

  const generate = async () => {
    try {
      const r = await generateJournal(USER_ID, date)
      setDate(r.date)
      setContent(r.content ?? '')
    } catch (err) {
      console.error('[journal generate error]', err)
    }
  }

  return (
    <div className="nv-card nv-card-double p-5">
      <div className="flex items-center justify-between">
        <div><SectionTitle className="mb-0">今日日记 · Journal</SectionTitle><div className="text-[9px] text-fog mt-0.5">AI 基于记忆碎片生成 · 仅供参考</div></div>
        <button onClick={generate} className="nv-chip nv-chip-gold text-[10px]">生成</button>
      </div>
      <div className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-display min-h-[120px]">
        {content || (
          <InkEmpty
            compact
            size={72}
            quote="暮色尚未沉降，等待第一缕思绪落笔。"
            hint="日记由引擎基于今日碎片生成"
          />
        )}
      </div>
    </div>
  )
}
