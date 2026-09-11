import { useCallback, useEffect, useRef, useState } from "react"
import { loadUid } from "../uid"
import treeImg from "../../../art/w/hua-chuanglian-v1.webp"

// 庭树：透过雕花窗看引擎的长势。状态三簿（碎片/线索/理解）、存储占用、盲推导审计。
// 审计（POST /v1/audit）为多段 LLM，慢——按钮点火，结果落最近审计。

interface AuditRecord {
  ranAt: string
  divergence: number
  baseline: number
  driftSignal: boolean
  flaggedForUser: boolean
  notes: string[]
  sampleSize: number
}

interface StorageInfo {
  totalBytes: number
  parts: { name: string; bytes: number }[]
  scannedAt: string
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 ** 2).toFixed(2)} MB`
}

export default function TingshuPage({ onBack }: { onBack: () => void }) {
  const uid = useRef(loadUid())
  const [counts, setCounts] = useState({ fragments: 0, threads: 0, unresolved: 0, claims: 0 })
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [lastAudit, setLastAudit] = useState<AuditRecord | null>(null)
  const [auditing, setAuditing] = useState(false)
  const [msg, setMsg] = useState("")

  const loadState = useCallback(async () => {
    try {
      const res = await fetch(`/v1/state?userId=${encodeURIComponent(uid.current)}`)
      if (!res.ok) return
      const s = (await res.json()) as {
        fragments?: unknown[]
        threads?: { status?: string }[]
        claims?: unknown[]
        audits?: AuditRecord[]
      }
      setCounts({
        fragments: s.fragments?.length ?? 0,
        threads: s.threads?.length ?? 0,
        unresolved: s.threads?.filter((t) => t.status === "unresolved").length ?? 0,
        claims: s.claims?.length ?? 0,
      })
      setLastAudit(s.audits?.[0] ?? null)
    } catch {
      /* 空态兜底 */
    }
    try {
      const res = await fetch("/v1/storage")
      if (res.ok) setStorage((await res.json()) as StorageInfo)
    } catch {
      /* 存储不可见即可 */
    }
  }, [])

  useEffect(() => {
    void loadState()
  }, [loadState])

  const runAudit = useCallback(async () => {
    if (auditing) return
    setAuditing(true)
    setMsg("盲推导审计中……null model 正在独立重走你的记忆（较慢）。")
    try {
      const res = await fetch("/v1/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid.current }),
      })
      const body = (await res.json()) as AuditRecord & { error?: string }
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setLastAudit(body)
      setMsg(body.driftSignal ? "审计毕：出现漂移信号，轩中正在自我校准。" : "审计毕：认识层未漂移。")
    } catch (err) {
      setMsg(`审计未成：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setAuditing(false)
    }
  }, [auditing])

  return (
    <div className="pavilion tingshu">
      <button type="button" className="pavilion-back" onClick={onBack}>
        〈 回轩
      </button>
      <header className="pavilion-head">
        <h1>庭 树</h1>
        <p>年轮记岁 · 虬枝记事 —— 引擎的长势与自省</p>
      </header>

      <figure className="tree-banner" aria-hidden>
        <img src={treeImg} alt="" draggable={false} />
      </figure>

      <div className="tree-stats">
        <div className="tree-stat">
          <span className="tree-num">{counts.fragments}</span>
          <span className="tree-cap">碎片入册</span>
        </div>
        <div className="tree-stat">
          <span className="tree-num">
            {counts.threads}
            <i className="tree-sub">{counts.unresolved ? `（未闭 ${counts.unresolved}）` : ""}</i>
          </span>
          <span className="tree-cap">线索抽枝</span>
        </div>
        <div className="tree-stat">
          <span className="tree-num">{counts.claims}</span>
          <span className="tree-cap">理解成形</span>
        </div>
        <div className="tree-stat">
          <span className="tree-num">{storage ? fmtBytes(storage.totalBytes) : "—"}</span>
          <span className="tree-cap">记忆占存</span>
        </div>
      </div>

      <div className="tingshu-cols">
        <section className="tingshu-col" aria-label="存储">
          <h2>仓廪 · 存储占用</h2>
          {!storage && <p className="pavilion-empty">仓廪未开。</p>}
          {storage?.parts.slice(0, 8).map((p) => {
            const pct = storage.totalBytes ? Math.round((p.bytes / storage.totalBytes) * 100) : 0
            return (
              <div key={p.name} className="store-row">
                <span className="store-name">{p.name}</span>
                <span className="store-bar">
                  <i style={{ width: `${pct}%` }} />
                </span>
                <span className="store-bytes">{fmtBytes(p.bytes)}</span>
              </div>
            )
          })}
          {storage && <p className="seal-legend">扫于 {storage.scannedAt.slice(0, 19).replace("T", " ")}</p>}
        </section>

        <section className="tingshu-col" aria-label="自检审计">
          <h2>自省 · 盲推导审计</h2>
          <div className="audit-ops">
            <button type="button" className="pavilion-btn" onClick={runAudit} disabled={auditing}>
              重走审计
            </button>
            <span className="pavilion-msg">{msg}</span>
          </div>
          {!lastAudit && !auditing && <p className="pavilion-empty">尚未审计。审计以 null model 盲推导同批碎片，度量认识层是否漂移。</p>}
          {lastAudit && (
            <article className="audit-card">
              <header>
                <span>{lastAudit.ranAt.slice(0, 19).replace("T", " ")}</span>
                <span className={`audit-verdict ${lastAudit.driftSignal ? "warn" : "ok"}`}>
                  {lastAudit.driftSignal ? "漂移信号" : "未漂移"}
                </span>
              </header>
              <div className="audit-nums">
                <span>
                  认识层分歧 <b>{lastAudit.divergence}</b>
                </span>
                <span>
                  基线 <b>{lastAudit.baseline}</b>
                </span>
                <span>
                  样本 <b>{lastAudit.sampleSize}</b>
                </span>
              </div>
              {lastAudit.flaggedForUser && <p className="audit-flag">分歧幅度超出阈值——轩中请你自己来看一眼。</p>}
              {lastAudit.notes.length > 0 && (
                <ul className="audit-notes">
                  {lastAudit.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
            </article>
          )}
        </section>
      </div>
    </div>
  )
}
