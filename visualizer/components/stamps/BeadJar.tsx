import { useEffect, useState } from 'react'
import { listStamps } from '../../services/api'
import { STAMP_REGISTRY, type StampType, BEAD_REGISTRY, type BeadType } from '../../../shared/stamps'
import WaxSeal from './WaxSeal'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

interface ListStampsResponse {
  jar: {
    id: string
    stampType: string
    beadType: string
    date: string
    beadName: string
    memoPreview?: string
  }[]
}

interface JarEntry {
  id: string
  stampType: StampType
  beadType: BeadType
  date: string
  beadName: string
  memoPreview?: string
}

export default function BeadJar() {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<JarEntry[]>([])

  useEffect(() => {
    if (!open) return
    listStamps(USER_ID).then((r) => {
      const jar = r.jar as ListStampsResponse['jar']
      setEntries(
        jar.map((j) => ({
          id: j.id,
          stampType: j.stampType as StampType,
          beadType: j.beadType as BeadType,
          date: j.date,
          beadName: j.beadName,
          memoPreview: j.memoPreview,
        }))
      )
    })
  }, [open])

  const byMonth = entries.reduce<Record<string, JarEntry[]>>((acc, e) => {
    const month = e.date.slice(0, 7)
    if (!acc[month]) acc[month] = []
    acc[month].push(e)
    return acc
  }, {})

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="fixed top-6 right-6 z-30 w-10 h-10 rounded-full border border-[hsl(var(--gold)/0.4)] bg-card/80 backdrop-blur text-foreground/80 hover:text-gold hover:border-[hsl(var(--gold)/0.7)] transition-colors flex items-center justify-center"
        title="玻璃珠罐"
      >
        🫙
      </button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div
            className="absolute top-0 right-0 h-full w-[340px] max-w-full bg-[rgba(12,12,20,0.96)] border-l border-white/5 backdrop-blur-md p-7 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[13px] text-[#8a8a9a] uppercase tracking-[0.2em] mb-6 pb-3 border-b border-white/5">
              珠子罐 · Glass Bead Jar
            </div>

            {entries.length === 0 && (
              <div className="text-sm text-fog text-center py-10">还没有玻璃珠</div>
            )}

            {Object.entries(byMonth)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([month, items]) => (
                <div key={month} className="mb-6">
                  <div className="text-[11px] text-[#5a5a6a] uppercase tracking-[0.15em] mb-3">
                    {month}
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const bead = BEAD_REGISTRY[item.beadType]
                      const stamp = STAMP_REGISTRY[item.stampType]
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                        >
                          <div
                            className="w-8 h-8 rounded-full shrink-0"
                            style={{
                              background: bead?.color ?? '#888',
                              boxShadow: 'inset -3px -3px 6px rgba(0,0,0,0.3), inset 3px 3px 6px rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.3)'
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-[#c0c0d0] truncate">{item.beadName}</div>
                            <div className="text-[10px] text-[#5a5a6a] font-mono">{item.date} · {stamp?.name}</div>
                          </div>
                          <div className="w-6 h-6 shrink-0">
                            {stamp && <WaxSeal stamp={stamp} size={24} />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
