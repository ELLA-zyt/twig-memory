import { useEffect, useState } from 'react'
import { getSoliloquy } from '../../services/api'
import { SectionTitle, InkEmpty } from '../nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function SoliloquyCard() {
  const [content, setContent] = useState('')

  useEffect(() => {
    getSoliloquy(undefined, USER_ID).then((r) => setContent(r.content ?? ''))
  }, [])

  return (
    <div className="nv-card nv-card-double p-5">
      <div><SectionTitle className="mb-0">今日心迹 · Soliloquy</SectionTitle><div className="text-[9px] text-fog mt-0.5">AI 基于记忆碎片生成 · 仅供参考</div></div>
      <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-display min-h-[80px]">
        {content || (
          <InkEmpty
            compact
            size={72}
            quote="心湖未起涟漪，墨迹尚在途中。"
          />
        )}
      </div>
    </div>
  )
}
