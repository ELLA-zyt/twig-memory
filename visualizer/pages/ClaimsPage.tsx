import { useEffect, useState } from 'react'
import { PageHead, Seal } from '../components/nouveau'
import type { Claim } from '../services/api'

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:7300'
const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/v1/claims?userId=${USER_ID}`)
      .then((r) => r.json())
      .then((data) => setClaims(Array.isArray(data) ? data : []))
  }, [])

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead kicker="Claims · 理解文档" title="理解文档" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {claims.map((c) => (
          <div key={c.id} className="nv-card p-4">
            <div className="text-[13px] text-foreground/90 leading-relaxed">{c.text}</div>
            <div className="flex items-center gap-2 mt-3">
              <div className="nv-meter nv-meter-gold flex-1"><div style={{ width: `${c.conviction * 100}%` }} /></div>
              <span className="text-xs font-mono text-gold">{c.conviction.toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Seal accent="raven">边界：{c.boundary}</Seal>
              {c.versions.length > 1 && <Seal accent="gold">版本 ×{c.versions.length}</Seal>}
            </div>
          </div>
        ))}
        {claims.length === 0 && <div className="text-sm text-fog col-span-full text-center py-20">暂无论断</div>}
      </div>
    </div>
  )
}
