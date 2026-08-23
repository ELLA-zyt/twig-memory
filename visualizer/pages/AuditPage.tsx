import { useState } from 'react'
import { audit, reflect } from '../services/api'
import { PageHead, SectionTitle } from '../components/nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

export default function AuditPage() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runReflect = async () => {
    setBusy(true)
    try {
      const r = await reflect(USER_ID)
      setResult({ type: 'reflect', r })
    } finally { setBusy(false) }
  }

  const runAudit = async () => {
    setBusy(true)
    try {
      const r = await audit(USER_ID)
      setResult({ type: 'audit', r })
    } finally { setBusy(false) }
  }

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead kicker="Audit · 自检日志" title="反刍与审计" />
      <div className="flex gap-3 mb-6">
        <button onClick={runReflect} disabled={busy} className="nv-btn px-5 py-2">触发反刍</button>
        <button onClick={runAudit} disabled={busy} className="nv-btn nv-btn-gold px-5 py-2">盲推导审计</button>
      </div>
      {result && (
        <div className="nv-card nv-card-double p-5">
          <SectionTitle>{result.type === 'reflect' ? '反刍结果' : '审计结果'}</SectionTitle>
          <pre className="text-xs text-fog whitespace-pre-wrap">{JSON.stringify(result.r, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
