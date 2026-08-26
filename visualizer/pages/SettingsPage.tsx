import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  getState, getHealth, getStorage, getLastAudit,
  type HealthStatus, type StorageStats, type AuditSnapshot, type MuninnState,
} from '../services/api'
import { PageHead, SectionTitle, PulseLine, Seal } from '../components/nouveau'

const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

/* ---------- 状态灯：真实 /health 状态位 ---------- */
function StatusLamp({ label, en, ok, text }: { label: string; en: string; ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex w-2.5 h-2.5 shrink-0">
        <span className={`absolute inline-flex w-full h-full rounded-full ${ok ? 'bg-raven animate-ping opacity-40' : ''}`} />
        <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${ok ? 'bg-raven' : 'bg-cinnabar'}`} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] tracking-[0.2em] text-fog font-display uppercase">{en}</div>
        <div className="text-xs text-foreground/90">{label} · <span className="font-mono">{text}</span></div>
      </div>
    </div>
  )
}

/* ---------- 三层架构流向：碎片层 → 线索层 → 认识层 ---------- */
function LayerFlow({ state }: { state: MuninnState }) {
  const layers = [
    { label: '碎片层', en: 'FRAGMENTS', count: state.fragments.length },
    { label: '线索层', en: 'THREADS', count: state.threads.length },
    { label: '认识层', en: 'CLAIMS', count: state.claims.length },
  ]
  return (
    <div className="flex items-stretch gap-0">
      {layers.map((l, i) => (
        <div key={l.en} className="flex items-center flex-1 min-w-0">
          <div className="flex-1 min-w-0 rounded-xl border border-[hsl(var(--gold)/0.35)] bg-[hsl(var(--card)/0.7)] px-4 py-3 text-center">
            <div className="text-[9px] tracking-[0.3em] text-fog font-display">{l.en}</div>
            <div className="text-2xl font-display font-semibold text-foreground/90 mt-0.5">{l.count}</div>
            <div className="text-[11px] text-fog">{l.label}</div>
          </div>
          {i < layers.length - 1 && (
            <div className="w-8 lg:w-12 shrink-0 self-center border-t border-dashed border-[hsl(var(--gold)/0.6)] relative" aria-hidden>
              <span className="absolute -right-0.5 -top-[3px] text-[8px] text-gold">▸</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ---------- 存储环图：按数据目录顶层条目占比 ---------- */
const RING_PALETTE = ['hsl(var(--gold))', 'hsl(var(--raven))', 'hsl(var(--cinnabar))', 'hsl(var(--fog))', 'hsl(var(--pine))', 'hsl(var(--gold) / 0.5)']

function StorageRing({ storage }: { storage: StorageStats }) {
  const R = 34
  const C = 2 * Math.PI * R
  const nonZero = storage.parts.filter((p) => p.bytes > 0)
  const fracs = nonZero.map((p) => (storage.totalBytes > 0 ? p.bytes / storage.totalBytes : 0))
  const segments = nonZero.map((p, i) => {
    const start = fracs.slice(0, i).reduce((a, b) => a + b, 0)
    return { ...p, frac: fracs[i], dash: `${Math.max(fracs[i] * C - 1.5, 0)} ${C}`, offset: -start * C, color: RING_PALETTE[i % RING_PALETTE.length] }
  })
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 88 88" className="w-[104px] h-[104px] shrink-0 -rotate-90">
        <circle cx="44" cy="44" r={R} fill="none" stroke="hsl(var(--border))" strokeWidth="7" />
        {segments.map((s) => (
          <circle key={s.name} cx="44" cy="44" r={R} fill="none" stroke={s.color} strokeWidth="7"
            strokeDasharray={s.dash} strokeDashoffset={s.offset} strokeLinecap="butt" />
        ))}
        <text x="44" y="41" textAnchor="middle" transform="rotate(90 44 44)" className="fill-[hsl(var(--foreground))] font-display" fontSize="12" fontWeight="600">
          {formatBytes(storage.totalBytes)}
        </text>
        <text x="44" y="54" textAnchor="middle" transform="rotate(90 44 44)" className="fill-[hsl(var(--fog))]" fontSize="7">
          总占用
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {segments.slice(0, 6).map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-[11px] min-w-0">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="truncate text-foreground/80 font-mono">{s.name}</span>
            <span className="ml-auto text-fog font-mono shrink-0">{formatBytes(s.bytes)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SettingsPage() {
  const [state, setState] = useState<MuninnState | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [storage, setStorage] = useState<StorageStats | null>(null)
  const [auditRec, setAuditRec] = useState<AuditSnapshot | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // 各接口独立成败：引擎没启动时不至于整页空白
    getState(USER_ID).then(setState).catch(() => setFailed(true))
    getHealth().then(setHealth).catch(() => setHealth(null))
    getStorage().then(setStorage).catch(() => setStorage(null))
    getLastAudit(USER_ID).then((r) => setAuditRec(r.record)).catch(() => setAuditRec(null))
  }, [])

  return (
    <div className="anim-fade">
      <PageHead kicker="Settings · 设置" title="引擎状态" />
      <PulseLine className="-mt-2 mb-5 opacity-80" label="Muninn Engine" />

      {failed && <div className="text-sm text-cinnabar">引擎连接失败——请确认本地服务已启动（默认 :7300）。</div>}

      {/* 状态灯 */}
      <div className="nv-card nv-card-double p-5">
        <SectionTitle>引擎脉搏 · Vitals</SectionTitle>
        {health ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatusLamp label="语言模型" en="LLM" ok={health.llm === 'live'} text={health.llm === 'live' ? 'live' : '规则兜底'} />
            <StatusLamp label="嵌入召回" en="EMBED" ok={health.embed === 'vector-recall'} text={health.embed === 'vector-recall' ? 'vector-recall' : 'dragonvein'} />
            <StatusLamp label="访问认证" en="AUTH" ok={health.auth} text={health.auth ? 'token 已配置' : '未配置'} />
          </div>
        ) : (
          <div className="text-xs text-fog">/health 不可达</div>
        )}
        <div className="mt-4 pt-3 border-t border-[hsl(var(--gold)/0.2)] text-[10px] text-fog font-mono">用户 · {USER_ID}</div>
      </div>

      {/* 三层架构流向 */}
      {state && (
        <div className="nv-card nv-card-double p-5 mt-4">
          <SectionTitle>三层架构 · 数据流向</SectionTitle>
          <LayerFlow state={state} />
          <p className="text-[11px] text-fog mt-3 leading-relaxed">
            碎片在低处蓄积，引擎将其编织为线索，成熟的判断最终汇聚为论断。数字为当前实时计数。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* 存储占用 */}
        <div className="nv-card nv-card-double p-5">
          <SectionTitle>存储占用 · Storage</SectionTitle>
          {storage ? <StorageRing storage={storage} /> : <div className="text-xs text-fog">存储统计不可用</div>}
        </div>

        {/* 上次自检 */}
        <div className="nv-card nv-card-double p-5">
          <SectionTitle>最近自检 · Last Audit</SectionTitle>
          {auditRec ? (
            <div>
              <div className="text-[10px] text-fog">{new Date(auditRec.ranAt).toLocaleString('zh-CN')} · 抽样 {auditRec.sampleSize} 次</div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-fog shrink-0">分歧</span>
                <div className="nv-meter nv-meter-gold flex-1"><div style={{ width: `${auditRec.divergence * 100}%` }} /></div>
                <span className="text-xs font-mono text-gold">{auditRec.divergence.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {auditRec.driftSignal
                  ? <Seal accent="cinnabar">检测到漂移信号</Seal>
                  : <Seal accent="raven">未见漂移</Seal>}
                {auditRec.flaggedForUser && <Seal accent="gold">已标记待你确认</Seal>}
              </div>
            </div>
          ) : (
            <div className="text-xs text-fog leading-relaxed">
              还没有审计记录。前往<Link to="/audit" className="text-gold underline underline-offset-2 mx-1">自检日志</Link>运行一次盲推导审计。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
