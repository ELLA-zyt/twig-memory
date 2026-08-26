import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { PageHead, Seal, SectionTitle } from '../components/nouveau'
import { audit } from '../services/api'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

interface AuditRecord {
  ranAt: string
  divergence: number
  baseline: number
  driftSignal: boolean
  flaggedForUser: boolean
  notes: string[]
  sampleSize: number
}

export default function AuditPage() {
  const [result, setResult] = useState<AuditRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAudit = async () => {
    setLoading(true)
    try {
      const res = (await audit(USER_ID)) as AuditRecord
      setResult(res)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="anim-fade">
      <PageHead kicker="Audit · 自检日志" title="自检日志" right={
        <button onClick={runAudit} disabled={loading} className="nv-chip nv-chip-gold cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> 运行盲推导审计
        </button>
      } />
      {loading && (
        <div className="text-sm text-fog mt-4">审计运行中…（盲推导需多次 LLM 调用，可能需要 30-60 秒）</div>
      )}
      {error && (
        <div className="text-sm text-red-500 mt-4">{error}</div>
      )}
      {result && (
        <div className="nv-card nv-card-double p-5 mt-4">
          <div className="text-[10px] text-fog">{new Date(result.ranAt).toLocaleString('zh-CN')}</div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-fog">分歧</span>
              <div className="nv-meter nv-meter-gold flex-1"><div style={{ width: `${result.divergence * 100}%` }} /></div>
              <span className="text-xs font-mono text-gold">{result.divergence.toFixed(2)}</span>
            </div>
            <div className="text-xs font-mono text-fog">基线 {result.baseline.toFixed(2)}</div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {result.driftSignal && <Seal accent="raven">漂移信号</Seal>}
            {result.flaggedForUser && <Seal accent="gold">需用户关注</Seal>}
            {!result.driftSignal && !result.flaggedForUser && <Seal accent="fog">自然方差内</Seal>}
          </div>
          <div className="mt-4">
            <SectionTitle>差异点 · NOTES</SectionTitle>
            <div className="mt-2">
              {result.notes.map((note, i) => (
                <div key={i} className="text-sm text-foreground/80 mt-1">· {note}</div>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-fog mt-4">盲推导抽样 {result.sampleSize} 次</div>
        </div>
      )}
      {!result && !loading && !error && (
        <div className="text-sm text-fog text-center py-20">点击上方按钮运行第一次盲推导审计</div>
      )}
    </div>
  )
}
