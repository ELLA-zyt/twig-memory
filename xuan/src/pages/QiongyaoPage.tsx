import { useCallback, useEffect, useRef, useState } from "react"
import { loadUid } from "../uid"
import jadeImg from "../../../art/w/prop-qiongyao-v1.webp"
import sealBranch from "../../../art/w/seal-branch.webp"
import sealFawn from "../../../art/w/seal-fawn.webp"
import sealRaven from "../../../art/w/seal-raven.webp"
import sealSpark from "../../../art/w/seal-spark.webp"
import sealTide from "../../../art/w/seal-tide.webp"
import sealKintsugi from "../../../art/w/seal-kintsugi.webp"
import sealDew from "../../../art/w/seal-dew.webp"
import sealEmber from "../../../art/w/seal-ember.webp"

// 琼瑶：投我以木桃，报之以琼瑶。心迹、便签与八章玉牒。
// 章元数据与 shared/stamps.ts 注册表对齐（此处为前端副本）。

interface SealDef {
  id: string
  name: string
  img: string
  color: string
}

const SEALS: SealDef[] = [
  { id: "branch", name: "衔枝·栖止", img: sealBranch, color: "#4A6B5D" },
  { id: "fawn", name: "回首·小鹿", img: sealFawn, color: "#6E433C" },
  { id: "raven", name: "夜航·渡鸦", img: sealRaven, color: "#2B333E" },
  { id: "spark", name: "星火·共振", img: sealSpark, color: "#8C3A3E" },
  { id: "tide", name: "潮退·静默", img: sealTide, color: "#525D68" },
  { id: "kintsugi", name: "裂隙·重塑", img: sealKintsugi, color: "#8a6d3b" },
  { id: "dew", name: "朝露·初醒", img: sealDew, color: "#7A9E7E" },
  { id: "ember", name: "余烬·未冷", img: sealEmber, color: "#8C4A3E" },
]

interface NoteRow {
  id: string
  date: string
  content: string
  status?: string
  stamp?: { type: string; beadName?: string } | null
}

interface StampRecord {
  type: string
  beadName?: string
  stampedAt?: string
}

export default function QiongyaoPage({ onBack }: { onBack: () => void }) {
  const uid = useRef(loadUid())
  const [soliloquies, setSoliloquies] = useState<{ date: string; preview: string }[]>([])
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [stampCount, setStampCount] = useState<Record<string, number>>({})
  const [stamping, setStamping] = useState<string | null>(null)
  const [msg, setMsg] = useState("")
  const [generating, setGenerating] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      const [sRes, nRes, stRes] = await Promise.all([
        fetch(`/v1/soliloquy/recent?userId=${encodeURIComponent(uid.current)}&limit=7`),
        fetch(`/v1/notes?userId=${encodeURIComponent(uid.current)}&page=1&limit=10`),
        fetch(`/v1/stamps?userId=${encodeURIComponent(uid.current)}`),
      ])
      if (sRes.ok) setSoliloquies(((await sRes.json()) as { entries: { date: string; preview: string }[] }).entries ?? [])
      if (nRes.ok) setNotes(((await nRes.json()) as { notes: NoteRow[] }).notes ?? [])
      if (stRes.ok) {
        const s = (await stRes.json()) as { records?: StampRecord[] }
        const count: Record<string, number> = {}
        for (const r of s.records ?? []) count[r.type] = (count[r.type] ?? 0) + 1
        setStampCount(count)
      }
    } catch {
      /* 空态兜底 */
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const genNote = useCallback(async () => {
    if (generating) return
    setGenerating(true)
    setMsg("轩中研墨留笺……")
    try {
      const res = await fetch("/v1/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid.current }),
      })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setMsg("一笺已留。")
      await loadAll()
    } catch (err) {
      setMsg(`留笺未成：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGenerating(false)
    }
  }, [generating, loadAll])

  const stampNote = useCallback(
    async (noteId: string, type: string) => {
      setStamping(null)
      try {
        const res = await fetch(`/v1/notes/${noteId}/stamp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: uid.current, type }),
        })
        const body = (await res.json()) as { error?: string; record?: { beadName?: string } }
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
        setMsg(`盖印既毕 · ${body.record?.beadName ? `得珠「${body.record.beadName}」` : ""}`)
        await loadAll()
      } catch (err) {
        setMsg(`盖印未成：${err instanceof Error ? err.message : String(err)}`)
      }
    },
    [loadAll],
  )

  return (
    <div className="pavilion qiongyao">
      <button type="button" className="pavilion-back" onClick={onBack}>
        〈 回轩
      </button>
      <header className="pavilion-head">
        <h1>琼 瑶</h1>
        <p>投我以木桃 · 报之以琼瑶 —— 心迹 / 便签 / 印章玉牒</p>
      </header>

      <div className="jade-zone">
        <img className="jade-img" src={jadeImg} alt="" draggable={false} />
      </div>

      <div className="qiongyao-cols">
        <section className="qiongyao-col" aria-label="心迹">
          <h2>心迹 · 轩中自语</h2>
          {soliloquies.length === 0 && <p className="pavilion-empty">心迹尚无。待碎片渐丰，轩中自有低语。</p>}
          {soliloquies.map((s) => (
            <article key={s.date} className="soliloquy-card">
              <span className="soliloquy-date">{s.date}</span>
              <p>{s.preview}</p>
            </article>
          ))}
        </section>

        <section className="qiongyao-col" aria-label="便签">
          <h2>便签 · 木桃往来</h2>
          <div className="note-ops">
            <button type="button" className="pavilion-btn" onClick={genNote} disabled={generating}>
              请轩中留一笺
            </button>
            <span className="pavilion-msg">{msg}</span>
          </div>
          {notes.length === 0 && <p className="pavilion-empty">案上无笺。让轩中先留一笺，或待反刍后自至。</p>}
          {notes.map((n) => (
            <article key={n.id} className="note-card">
              <header>
                <span className="note-date">{n.date}</span>
                {n.stamp ? (
                  <span className="note-stamped">已盖 {SEALS.find((x) => x.id === n.stamp?.type)?.name ?? n.stamp.type}</span>
                ) : (
                  <button type="button" className="note-stamp-btn" onClick={() => setStamping(stamping === n.id ? null : n.id)}>
                    盖印
                  </button>
                )}
              </header>
              <p className="note-content">{n.content}</p>
              {stamping === n.id && (
                <div className="stamp-picker">
                  {SEALS.map((s) => (
                    <button key={s.id} type="button" title={s.name} onClick={() => stampNote(n.id, s.id)}>
                      <img src={s.img} alt={s.name} draggable={false} />
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="qiongyao-col" aria-label="印章玉牒">
          <h2>玉牒 · 八章</h2>
          <div className="seal-grid">
            {SEALS.map((s) => {
              const got = stampCount[s.id] ?? 0
              return (
                <div key={s.id} className={`seal-cell${got > 0 ? " got" : ""}`} style={{ ["--seal-color" as string]: s.color }}>
                  <img src={s.img} alt={s.name} draggable={false} />
                  <span className="seal-name">{s.name}</span>
                  <span className="seal-count">{got > 0 ? `×${got}` : "未得"}</span>
                </div>
              )
            })}
          </div>
          <p className="seal-legend">一签一章，盖印生成影子碎片，让轩中知道今日的心境。</p>
        </section>
      </div>
    </div>
  )
}
