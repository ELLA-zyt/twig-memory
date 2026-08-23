import type { Note } from '../../services/api'

interface NoteCardProps {
  note: Note
  onClick?: () => void
}

export default function NoteCard({ note, onClick }: NoteCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left nv-card p-4 hover:bg-[hsl(var(--gold)/0.04)] transition-colors"
    >
      <div className="flex items-center gap-2 text-[10px] text-fog">
        <span>{note.date}</span>
        {note.stamp && <span className="text-gold">{note.stamp.beadName}</span>}
        {note.status === 'responded' && <span className="text-raven">已回应</span>}
      </div>
      <div className="text-sm text-foreground/90 mt-1 line-clamp-2">{note.content}</div>
    </button>
  )
}
