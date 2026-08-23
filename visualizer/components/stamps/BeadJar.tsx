import { useEffect, useState } from 'react'
import { listStamps } from '../../services/api'
import { SectionTitle } from '../nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function BeadJar() {
  const [stamps, setStamps] = useState<{ id: string; beadName: string; color: string; date: string; memoPreview?: string }[]>([])

  useEffect(() => {
    listStamps(USER_ID).then((r) => {
      setStamps(r.jar.map((j: any) => ({
        id: j.id,
        beadName: j.beadName,
        color: j.beadType === 'jade_water' ? 'linear-gradient(135deg, #4A6B5D, #8FB8A0)' : '#888',
        date: j.date,
        memoPreview: j.memoPreview,
      })))
    })
  }, [])

  return (
    <div className="nv-card nv-card-double p-5">
      <SectionTitle>玻璃珠罐 · Bead Jar</SectionTitle>
      {stamps.length === 0 && <div className="text-sm text-fog text-center py-6">暂无玻璃珠</div>}
      <div className="flex flex-wrap gap-3">
        {stamps.map((s) => (
          <div key={s.id} className="group relative flex items-center justify-center w-10 h-10 rounded-full shadow-sm" style={{ background: s.color }}>
            <span className="w-8 h-8 rounded-full border border-white/30" />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-fog opacity-0 group-hover:opacity-100 whitespace-nowrap">{s.beadName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
