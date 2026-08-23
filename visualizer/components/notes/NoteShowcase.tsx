import { useState } from 'react'
import type { Note } from '../../services/api'
import StampTray from '../stamps/StampTray'
import { respondNote } from '../../services/api'

interface NoteShowcaseProps {
  note: Note
  onRespond?: (note: Note) => void
}

export default function NoteShowcase({ note, onRespond }: NoteShowcaseProps) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

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

  return (
    <div className="nv-card nv-card-double p-5">
      <div className="text-[10px] tracking-[0.25em] text-fog mb-2">今日便签 · NOTE</div>
      <div className="text-lg font-display leading-relaxed text-foreground/90">{note.content}</div>
      {note.response && (
        <div className="mt-3 text-sm text-raven/90 border-l-2 border-raven/30 pl-3">
          你回应：{note.response.text}
        </div>
      )}
      {!note.response && (
        <div className="mt-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="回应这条便签..."
            className="nv-input flex-1 text-sm px-3 py-2"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button onClick={submit} disabled={busy} className="nv-btn text-sm px-4">发送</button>
        </div>
      )}
      <StampTray note={note} onStamp={() => onRespond?.(note)} />
    </div>
  )
}
