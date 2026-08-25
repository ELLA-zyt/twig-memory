import { useEffect, useState } from 'react'
import { getState } from '../services/api'
import { PageHead } from '../components/nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function SettingsPage() {
  const [state, setState] = useState<{ fragments: unknown[]; threads: unknown[]; claims: unknown[] } | null>(null)

  useEffect(() => {
    getState(USER_ID).then(setState)
  }, [])

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead kicker="Settings · 设置" title="引擎状态" />
      {!state && <div className="text-sm text-fog">加载中...</div>}
      {state && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '碎片', value: state.fragments.length },
            { label: '线索', value: state.threads.length },
            { label: '论断', value: state.claims.length },
            { label: '用户', value: USER_ID },
          ].map((s) => (
            <div key={s.label} className="nv-card p-4 text-center">
              <div className="text-xs text-fog">{s.label}</div>
              <div className="text-2xl font-display font-semibold text-foreground/90 mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
