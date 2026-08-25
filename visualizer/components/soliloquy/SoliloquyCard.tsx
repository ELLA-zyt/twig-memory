import { useEffect, useState } from 'react'
import { getSoliloquy } from '../../services/api'
import { SectionTitle } from '../nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function SoliloquyCard() {
  const [content, setContent] = useState('')

  useEffect(() => {
    getSoliloquy(undefined, USER_ID).then((r) => setContent(r.content ?? ''))
  }, [])

  return (
    <div className="nv-card nv-card-double p-5">
      <SectionTitle>今日心迹 · Soliloquy</SectionTitle>
      <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-display min-h-[80px]">
        {content || <span className="text-fog">今日暂无心迹</span>}
      </div>
    </div>
  )
}
