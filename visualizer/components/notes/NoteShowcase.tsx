import { useState, useRef, forwardRef } from 'react'
import type { Note } from '../../services/api'
import { respondNote } from '../../services/api'
import { STAMP_REGISTRY, type StampType } from '../../../shared/stamps'
import StampRitual from '../stamps/StampRitual'
import WaxSeal from '../stamps/WaxSeal'
import { cn } from '@/lib/utils'

interface NoteShowcaseProps {
  note: Note
  onRespond?: (note: Note) => void
  onStamp?: () => void
}

const NoteShowcase = forwardRef<HTMLDivElement, NoteShowcaseProps>(function NoteShowcase({ note, onRespond, onStamp }, ref) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [rippleKey, setRippleKey] = useState(0)
  // 刚盖下的章（服务端回写 note.stamp 之前先本地渲染压痕，保住落印动画）
  const [freshStamp, setFreshStamp] = useState<StampType | null>(null)
  const [imprintPlaced, setImprintPlaced] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  const submit = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      const res = await respondNote(note.id, text.trim())
      if (res.note) onRespond?.(res.note)
      setText('')
    } finally {
      setBusy(false)
    }
  }

  const triggerShake = () => {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  const triggerRipple = () => {
    setRippleKey((k) => k + 1)
  }

  const triggerImprint = (type: StampType) => {
    setFreshStamp(type)
    // 双 rAF：先挂到起始态（放大+透明），下一帧再切到落印态，让 transition 生效
    requestAnimationFrame(() => requestAnimationFrame(() => setImprintPlaced(true)))
  }

  // 优先用服务端回写的 stamp 类型；回写前用本地刚盖的类型兜底
  const stampType = (note.stamp?.type as StampType | undefined) ?? freshStamp ?? undefined
  const imprintStamp = stampType ? STAMP_REGISTRY[stampType] : undefined
  const imprintVisible = Boolean(note.stamp) || imprintPlaced

  return (
    <div className="relative">
      {/* 便签卡片：羊皮纸质感 */}
      <div
        ref={ref}
        className={cn(
          'relative rounded-sm p-8 min-h-[240px]',
          'bg-[#f4f1ea] text-[#2d2d2d] shadow-[0_6px_30px_rgba(0,0,0,0.5),inset_0_0_80px_rgba(139,119,101,0.05)]',
          shaking && 'memo-card-shake'
        )}
        style={{ backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(244,241,234,0) 100%)' }}
      >
        {/* 顶部装订线 */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] opacity-60"
          style={{
            background: 'repeating-linear-gradient(90deg,#d4c5b5 0px,#d4c5b5 2px,transparent 2px,transparent 6px)'
          }}
        />

        <div className="text-[11px] text-[#8b7765] uppercase tracking-[0.2em] mb-4 font-mono">
          {note.date} · 记忆便签
        </div>

        <div className="text-base leading-[1.85] text-[#3d3d3d] whitespace-pre-wrap font-serif pr-24">
          {note.content}
        </div>

        {/* 涟漪容器 */}
        <div className="absolute bottom-5 right-5 pointer-events-none">
          {rippleKey > 0 && <div key={rippleKey} className="ripple-ring active" />}
        </div>

        {/* 压痕锚点 */}
        <div ref={anchorRef} className="absolute bottom-5 right-5 w-1 h-1" />

        {/* 已盖印压痕：中心与坠落锚点对齐（锚点距边 20px，压痕半径 35px） */}
        {imprintStamp && (
          <div
            className="absolute pointer-events-none transition-all duration-500"
            style={{
              bottom: 'calc(1.25rem - 35px)',
              right: 'calc(1.25rem - 35px)',
              width: 70,
              height: 70,
              opacity: imprintVisible ? 0.92 : 0,
              transform: `rotate(-7deg) scale(${imprintVisible ? 1 : 1.1})`,
              filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))',
            }}
          >
            <WaxSeal stamp={imprintStamp} size={70} />
            {/* 落印扫光：仅新鲜盖印时播放一次 */}
            {freshStamp && imprintPlaced && (
              <div className="imprint-sweep absolute inset-0 rounded-full overflow-hidden" />
            )}
          </div>
        )}
      </div>

      {/* 用户回应 */}
      <div className="mt-4">
        {note.response ? (
          <div className="text-sm text-fog border-l-2 border-raven/30 pl-3 py-1">
            你的回应：{note.response.text}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="回应这条便签……"
              className="nv-input flex-1 text-sm px-3 py-2 bg-transparent"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button onClick={submit} disabled={busy} className="nv-btn text-sm px-4">
              发送
            </button>
          </div>
        )}
      </div>

      {/* 印章仪式 */}
      <StampRitual
        note={note}
        anchorRef={anchorRef}
        onStamp={onStamp}
        onShake={triggerShake}
        onRipple={triggerRipple}
        onImprint={triggerImprint}
      />
    </div>
  )
})

export default NoteShowcase
