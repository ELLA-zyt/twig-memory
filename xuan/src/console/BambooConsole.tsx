import { useEffect, useRef, useState } from "react"
import { loadUid } from "../uid"
import bambooImg from "../../../art/w/console-bamboo-v1.webp"

// 竹简对话台：采诗官的书案，真正的实时对话控制台（POST /v1/chat）。
// 引擎回复非流式，墨迹逐字晕染由前端渐进显示完成。
// 收起态即 art/console-bamboo-v1（卷起的竹简），轻点展开为书案。

interface Msg {
  id: number
  role: "user" | "assistant" | "system"
  text: string
}

/** 逐字晕染：点击消息可立即显全 */
function InkText({ text }: { text: string }) {
  const [n, setN] = useState(0)
  const done = n >= text.length
  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => {
      setN((v) => (v + 2 >= text.length ? text.length : v + 2))
    }, 24)
    return () => window.clearInterval(id)
  }, [text, done])
  return (
    <span
      className={`ink${done ? "" : " revealing"}`}
      onClick={() => setN(text.length)}
      title={done ? undefined : "轻点显全"}
    >
      {text.slice(0, n)}
      {!done && <i className="ink-cursor" aria-hidden />}
    </span>
  )
}

export default function BambooConsole() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [errState, setErrState] = useState<"ok" | "down">("ok")
  const uid = useRef(loadUid())
  const nextId = useRef(1)
  const histRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    histRef.current?.scrollTo({ top: histRef.current.scrollHeight, behavior: "smooth" })
  }, [msgs])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput("")
    setMsgs((m) => [...m, { id: nextId.current++, role: "user", text }])
    setSending(true)
    try {
      const res = await fetch("/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid.current, text: text.slice(0, 4000) }),
      })
      if (!res.ok) {
        // vite 代理在引擎 7300 不可达时回 500——与引擎自身的 5xx 一并按「引擎未醒」处理
        if (res.status >= 500) throw new Error("__ENGINE_DOWN__")
        const e = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(e?.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { reply: string }
      setErrState("ok")
      setMsgs((m) => [...m, { id: nextId.current++, role: "assistant", text: data.reply }])
    } catch (err) {
      const down = err instanceof TypeError || (err instanceof Error && err.message === "__ENGINE_DOWN__")
      setErrState(down ? "down" : "ok")
      setMsgs((m) => [
        ...m,
        {
          id: nextId.current++,
          role: "system",
          text: down
            ? "引擎未醒——请先起服务：npm run server:http，再回来落笔。"
            : `这一笔没能落下：${err instanceof Error ? err.message : String(err)}`,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`bamboo${open ? " open" : ""}`}>
      {!open && (
        <button type="button" className="slips" onClick={() => setOpen(true)} aria-label="展开书案（对话台）">
          <img src={bambooImg} alt="" draggable={false} />
          <span className="slips-label">书案</span>
        </button>
      )}

      {open && (
        <section className="console" aria-label="书案 · 对话台">
          <header className="console-head">
            <span className="console-title">书案</span>
            <span className={`console-status ${errState}`} title={errState === "ok" ? "引擎在线" : "引擎未醒"} />
            <button type="button" className="console-close" onClick={() => setOpen(false)}>
              掩卷
            </button>
          </header>

          <div className="console-history" ref={histRef}>
            {msgs.length === 0 && <p className="console-empty">案上无字。此刻所诉，轩中会记住。</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`msg msg-${m.role}`}>
                {m.role === "assistant" ? <InkText text={m.text} /> : m.text}
              </div>
            ))}
            {sending && <div className="msg msg-sending">研墨中……</div>}
          </div>

          <footer className="composer">
            <input
              value={input}
              placeholder="向轩中诉说……"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={sending}
              maxLength={4000}
            />
            <button type="button" onClick={send} disabled={sending || !input.trim()}>
              落笔
            </button>
          </footer>
        </section>
      )}
    </div>
  )
}
