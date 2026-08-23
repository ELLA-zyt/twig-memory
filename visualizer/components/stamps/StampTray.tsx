import { useState } from 'react'
import { STAMP_REGISTRY, type StampType } from '../../../shared/stamps'
import type { Note } from '../../services/api'
import { stampNote } from '../../services/api'
import { cn } from '@/lib/utils'

interface StampTrayProps {
  note: Note
  onStamp?: () => void
}

export default function StampTray({ note, onStamp }: StampTrayProps) {
  const [busy, setBusy] = useState(false)

  const handle = async (type: StampType) => {
    if (busy) return
    setBusy(true)
    try {
      await stampNote(note.id, type)
      onStamp?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {Object.entries(STAMP_REGISTRY).map(([key, stamp]) => (
        <button
          key={key}
          onClick={() => handle(key as StampType)}
          disabled={busy}
          className={cn(
            'group flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 transition-all',
            note.stamp?.type === key ? 'opacity-50 cursor-default' : 'hover:scale-110 hover:shadow-lg',
          )}
          style={{ borderColor: stamp.baseColor, background: `${stamp.baseColor}22` }}
          title={`${stamp.name} · ${stamp.mood}`}
        >
          <span className="text-[10px] font-medium text-foreground/80 text-center leading-none px-1">{stamp.name}</span>
        </button>
      ))}
    </div>
  )
}
