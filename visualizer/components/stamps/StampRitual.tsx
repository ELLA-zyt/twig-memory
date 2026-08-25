import { useState, useRef, useEffect } from 'react'
import { STAMP_REGISTRY, type StampType } from '../../../shared/stamps'
import type { Note, StampResult } from '../../services/api'
import { stampNote } from '../../services/api'
import WaxSeal from './WaxSeal'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'inspecting' | 'dropping' | 'done'

interface StampRitualProps {
  note: Note
  anchorRef: React.RefObject<HTMLDivElement | null>
  onStamp?: () => void
  onShake?: () => void
  onRipple?: () => void
  onImprint?: () => void
}

export default function StampRitual({
  note,
  anchorRef,
  onStamp,
  onShake,
  onRipple,
  onImprint,
}: StampRitualProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [selected, setSelected] = useState<StampType | null>(null)
  const [reward, setReward] = useState<StampResult['bead'] | null>(null)
  const [busy, setBusy] = useState(false)
  const [falling, setFalling] = useState<{ from: { x: number; y: number }; to: { x: number; y: number }; stamp: StampType } | null>(null)
  const inspectSealRef = useRef<HTMLDivElement>(null)

  const startInspect = (key: StampType) => {
    if (phase !== 'idle' || note.stamp) return
    setSelected(key)
    setPhase('inspecting')
  }

  const cancelInspect = () => {
    if (phase === 'inspecting') {
      setPhase('idle')
      setSelected(null)
    }
  }

  const confirm = async () => {
    if (!selected || busy || note.stamp) return
    setBusy(true)
    try {
      // 1. 触发后端盖章
      const res = await stampNote(note.id, selected)

      // 2. 计算起始/目标位置
      const startRect = inspectSealRef.current?.getBoundingClientRect()
      const targetRect = anchorRef.current?.getBoundingClientRect()
      if (startRect && targetRect) {
        setFalling({
          from: { x: startRect.left + startRect.width / 2, y: startRect.top + startRect.height / 2 },
          to: { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 },
          stamp: selected,
        })
      }
      setPhase('dropping')

      // 3. 等待坠落动画完成
      setTimeout(() => {
        onShake?.()
        onRipple?.()
        onImprint?.()
        setReward(res.bead)
        setPhase('done')
        setFalling(null)
        onStamp?.()
      }, 650)
    } finally {
      setBusy(false)
    }
  }

  const stamps = Object.entries(STAMP_REGISTRY)
  const canStamp = !note.stamp && phase !== 'done'

  return (
    <div className="relative mt-6">
      {/* 印章托盘 */}
      <div
        className={cn(
          'flex flex-wrap justify-center gap-3 transition-all duration-500',
          phase === 'inspecting' ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100'
        )}
      >
        {stamps.map(([key, stamp]) => (
          <button
            key={key}
            onClick={() => startInspect(key as StampType)}
            disabled={!canStamp}
            className={cn(
              'group relative flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all duration-300',
              canStamp ? 'hover:-translate-y-2 cursor-pointer' : 'opacity-40 cursor-default',
              note.stamp?.type === key ? 'ring-2 ring-offset-2 ring-[hsl(var(--gold))]' : ''
            )}
            title={`${stamp.name} · ${stamp.mood}`}
          >
            <WaxSeal stamp={stamp} size={52} />
            <span className="absolute -bottom-5 text-[9px] text-fog opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {stamp.name}
            </span>
          </button>
        ))}
      </div>

      {/* 端详遮罩 */}
      {phase === 'inspecting' && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={cancelInspect}
        >
          <div className="relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div ref={inspectSealRef} className="stamp-inspect">
              <WaxSeal stamp={STAMP_REGISTRY[selected]} size={280} detail />
            </div>
            <button
              onClick={confirm}
              disabled={busy}
              className="mt-10 px-6 py-2 rounded-full border border-[hsl(var(--gold)/0.5)] text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold)/0.1)] transition-colors text-sm"
            >
              {busy ? '盖印中…' : '盖下这枚印章'}
            </button>
            <p className="mt-3 text-xs text-fog">点击遮罩外取消</p>
          </div>
        </div>
      )}

      {/* 坠落印章（portal 到 body） */}
      {falling && <FallingSeal from={falling.from} to={falling.to} stamp={STAMP_REGISTRY[falling.stamp]} />}

      {/* 玻璃珠回礼 */}
      {reward && (
        <div className="mt-6 text-center">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-3 bead-float"
            style={{
              background: reward.color,
              boxShadow: 'inset -8px -8px 16px rgba(0,0,0,0.3), inset 8px 8px 16px rgba(255,255,255,0.3), 0 4px 24px rgba(0,0,0,0.4)'
            }}
          />
          <div className="text-sm text-foreground/90 font-medium">{reward.name}</div>
          <div className="text-sm text-fog italic mt-1">{reward.whisper}</div>
          <div className="text-[10px] text-fog/70 mt-2 font-mono">{reward.source}</div>
        </div>
      )}

      {/* 已盖印提示 */}
      {note.stamp && !reward && (
        <div className="mt-4 text-center text-xs text-fog">
          今日便签已用「{STAMP_REGISTRY[note.stamp.type as StampType]?.name ?? note.stamp.type}」封存
        </div>
      )}
    </div>
  )
}

function FallingSeal({
  from,
  to,
  stamp,
}: {
  from: { x: number; y: number }
  to: { x: number; y: number }
  stamp: typeof STAMP_REGISTRY[keyof typeof STAMP_REGISTRY]
}) {
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.style.setProperty('--start-x', `${from.x}px`)
      el.style.setProperty('--start-y', `${from.y}px`)
      el.style.setProperty('--target-x', `${to.x}px`)
      el.style.setProperty('--target-y', `${to.y}px`)
      el.classList.add('dropping')
    })
  }, [from, to])

  return (
    <div
      ref={elRef}
      className="fixed z-[60] pointer-events-none falling-seal"
      style={{ left: 0, top: 0 }}
    >
      <WaxSeal stamp={stamp} size={300} detail />
    </div>
  )
}
