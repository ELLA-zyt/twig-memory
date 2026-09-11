import { useCallback, useEffect, useRef, useState } from "react"
import { loadUid } from "../uid"
import muduoImg from "../../../art/w/prop-muduo-v1.webp"

// 采诗阁：振木铎以徇于路。振铎=点火 /v1/reflect（async=1，后台多段 LLM，数分钟）；
// 铎摇期间轮询 /v1/state，claims 有变即「诗成」。故事线为诗笺，理解列「轩中之解」。

interface ThreadRow {
  id: string
  label: string
  openQuestion: string
  pool?: string
  daysOpen?: number
  status?: string
}

interface ClaimRow {
  id: string
  text: string
  conviction: number
  boundary?: string
  status?: string
}

type Phase = "idle" | "collecting" | "done"

const POOL_LABEL: Record<string, string> = {
  ACTIVE: "正采",
  DORMANT: "暂歇",
  SILENT: "沉眠",
}

const POLL_MS = 8000
const GIVE_UP_MS = 10 * 60 * 1000

function claimsHash(claims: ClaimRow[]): string {
  return JSON.stringify(claims.map((c) => [c.id, c.text, c.conviction, c.status]))
}

export default function CaishiPage({ onBack }: { onBack: () => void }) {
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [claims, setClaims] = useState<ClaimRow[]>([])
  const [phase, setPhase] = useState<Phase>("idle")
  const [msg, setMsg] = useState("铎在架上，静候来客。")
  const uid = useRef(loadUid())
  const pollRef = useRef(0)
  const giveUpRef = useRef(0)

  const fetchState = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`/v1/state?userId=${encodeURIComponent(uid.current)}`)
      if (!res.ok) return null
      const s = (await res.json()) as { threads?: ThreadRow[]; claims?: ClaimRow[] }
      setThreads(s.threads ?? [])
      setClaims(s.claims ?? [])
      return claimsHash(s.claims ?? [])
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    void fetchState()
    return () => {
      window.clearInterval(pollRef.current)
      window.clearTimeout(giveUpRef.current)
    }
  }, [fetchState])

  const startCollect = useCallback(async () => {
    if (phase === "collecting") return
    const before = claimsHash(claims)
    setPhase("collecting")
    setMsg("木铎既振，采诗官正沿街而歌——多段采风约需数分钟，可掩卷稍候。")
    try {
      const res = await fetch("/v1/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid.current, async: 1 }),
      })
      if (!res.ok && res.status !== 202) {
        const e = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(e?.error ?? `HTTP ${res.status}`)
      }
    } catch (err) {
      setPhase("idle")
      setMsg(
        err instanceof TypeError
          ? "引擎未醒——请先起服务：npm run server:http。"
          : `振铎未应：${err instanceof Error ? err.message : String(err)}`,
      )
      return
    }

    pollRef.current = window.setInterval(async () => {
      const now = await fetchState()
      if (now !== null && now !== before) {
        window.clearInterval(pollRef.current)
        window.clearTimeout(giveUpRef.current)
        setPhase("done")
        setMsg("诗成——新的理解已入阁。")
      }
    }, POLL_MS)

    giveUpRef.current = window.setTimeout(() => {
      window.clearInterval(pollRef.current)
      void fetchState()
      setPhase("idle")
      setMsg("此番采风未见新句——或仍在路上，稍后可再振铎。")
    }, GIVE_UP_MS)
  }, [phase, claims, fetchState])

  return (
    <div className="caishi">
      <button type="button" className="caishi-back" onClick={onBack}>
        〈 回轩
      </button>

      <header className="caishi-head">
        <h1>采诗</h1>
        <p>行人振木铎徇于路 · 碎片织作故事线</p>
      </header>

      <div className="muduo-zone">
        <button
          type="button"
          className={`muduo${phase === "collecting" ? " ringing" : ""}`}
          onClick={startCollect}
          aria-label="振铎采诗"
        >
          <img src={muduoImg} alt="" draggable={false} />
        </button>
        <button type="button" className="caishi-btn" onClick={startCollect} disabled={phase === "collecting"}>
          振铎采诗
        </button>
        <p className={`caishi-msg${phase === "done" ? " done" : ""}`}>{msg}</p>
      </div>

      <div className="caishi-cols">
        <section className="caishi-col" aria-label="故事线 · 诗笺">
          <h2>诗笺 · 未闭合之事</h2>
          {threads.length === 0 && <p className="caishi-empty">架上无笺。与轩中多谈几句，事自会上笺。</p>}
          {threads.map((t, i) => (
            <article key={t.id} className={`poem-slip tilt-${i % 2}`} style={{ ["--tilt" as string]: `${i % 2 === 0 ? -0.8 : 0.8}deg` }}>
              <header>
                <span className="slip-label">{t.label}</span>
                <span className={`slip-pool pool-${(t.pool ?? "ACTIVE").toLowerCase()}`}>
                  {POOL_LABEL[t.pool ?? ""] ?? t.pool}
                </span>
              </header>
              <p className="slip-q">{t.openQuestion}</p>
              <footer>
                {typeof t.daysOpen === "number" ? <span>悬而未决 {t.daysOpen} 日</span> : null}
                {t.status && t.status !== "unresolved" ? <span>· {t.status === "resolved" ? "已圆" : "已搁"}</span> : null}
              </footer>
            </article>
          ))}
        </section>

        <section className="caishi-col" aria-label="轩中之解">
          <h2>轩中之解 · 认识层</h2>
          {claims.length === 0 && <p className="caishi-empty">解尚未成。待采风数轮，轩中自有判断。</p>}
          {claims.map((c) => (
            <article key={c.id} className="claim-card">
              <p className="claim-text">{c.text}</p>
              <div className="claim-meter" title={`信值 ${Math.round(c.conviction * 100)}%`}>
                <i style={{ width: `${Math.round(Math.min(1, Math.max(0, c.conviction)) * 100)}%` }} />
              </div>
              {c.boundary && <p className="claim-boundary">界：{c.boundary}</p>}
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
