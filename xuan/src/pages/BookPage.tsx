import { useCallback, useEffect, useRef, useState } from "react"
import { loadUid } from "../uid"
import pageBlank from "../../../art/w/page-blank-1.webp"

// 书阁：线装典籍。左列书目（日记日期），右侧典籍空页上排日记正文；
// 「研墨成书」= POST /v1/journal/generate（同步 LLM，稍慢）。

interface JournalMeta {
  content: string | null
  hasContent: boolean
  generatedAt: string | null
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 轻量排印：# 标题、其余成段 */
function renderMd(content: string): { h: boolean; text: string }[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.startsWith("#") ? { h: true, text: l.replace(/^#+\s*/, "") } : { h: false, text: l }))
}

export default function BookPage({ onBack }: { onBack: () => void }) {
  const uid = useRef(loadUid())
  const [days, setDays] = useState<string[]>([])
  const [date, setDate] = useState(today())
  const [meta, setMeta] = useState<JournalMeta | null>(null)
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState("")

  const loadDays = useCallback(async () => {
    try {
      const res = await fetch(`/v1/journal/range?userId=${encodeURIComponent(uid.current)}&from=2000-01-01&to=2099-12-31`)
      if (!res.ok) return
      const s = (await res.json()) as { days: { date: string; hasContent: boolean }[] }
      setDays(s.days.map((d) => d.date).reverse())
    } catch {
      /* 书目为空即可 */
    }
  }, [])

  const loadJournal = useCallback(async (d: string) => {
    try {
      const res = await fetch(`/v1/journal?userId=${encodeURIComponent(uid.current)}&date=${d}`)
      if (!res.ok) return
      setMeta((await res.json()) as JournalMeta)
    } catch {
      setMeta(null)
    }
  }, [])

  useEffect(() => {
    void loadDays()
    void loadJournal(today())
  }, [loadDays, loadJournal])

  const pick = useCallback(
    (d: string) => {
      setDate(d)
      setMsg("")
      void loadJournal(d)
    },
    [loadJournal],
  )

  const generate = useCallback(async () => {
    if (generating) return
    setGenerating(true)
    setMsg("研墨中……")
    try {
      const res = await fetch("/v1/journal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid.current, date }),
      })
      const body = (await res.json()) as JournalMeta & { error?: string }
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setMeta(body)
      setMsg("成书。")
      void loadDays()
    } catch (err) {
      setMsg(`研墨未成：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGenerating(false)
    }
  }, [generating, date, loadDays])

  return (
    <div className="pavilion book">
      <button type="button" className="pavilion-back" onClick={onBack}>
        〈 回轩
      </button>
      <header className="pavilion-head">
        <h1>书 阁</h1>
        <p>日记典籍 · 一日一页 · 常誊常新</p>
      </header>

      <div className="book-cols">
        <aside className="book-toc">
          <h2>书目</h2>
          {days.length === 0 && <p className="book-toc-empty">书架上还没有页目。</p>}
          {days.map((d) => (
            <button key={d} type="button" className={`book-toc-item${d === date ? " on" : ""}`} onClick={() => pick(d)}>
              {d}
            </button>
          ))}
        </aside>

        <section className="book-page-wrap">
          <div className="book-page" key={date}>
            <img className="book-paper" src={pageBlank} alt="" draggable={false} aria-hidden />
            <div className="book-text">
              {meta === null && <p className="book-hint">翻检中……</p>}
              {meta !== null && !meta.hasContent && (
                <div className="book-blank">
                  <p>{date} 尚未成页。</p>
                  <p className="book-blank-sub">当日有碎片入册后，可研墨成书。</p>
                </div>
              )}
              {meta?.hasContent &&
                renderMd(meta.content ?? "").map((p, i) =>
                  p.h ? (
                    <h3 key={i} className="book-h">
                      {p.text}
                    </h3>
                  ) : (
                    <p key={i} className="book-p">
                      {p.text}
                    </p>
                  ),
                )}
            </div>
          </div>

          <div className="book-ops">
            <button type="button" className="pavilion-btn" onClick={generate} disabled={generating}>
              研墨成书
            </button>
            <span className="pavilion-msg">{msg || (meta?.generatedAt ? `成于 ${meta.generatedAt.slice(0, 10)}` : "")}</span>
          </div>
        </section>
      </div>
    </div>
  )
}
