import { Fragment, useCallback, useEffect, useState } from "react"
import { currentAmbience } from "../ambience"
import artTaohua from "../../../art/w/hua-taohua-v1.webp"
import artMuduo from "../../../art/w/hua-muduo-v1.webp"
import artZhishan from "../../../art/w/hua-zhishan-v1.webp"
import artQiongyao from "../../../art/w/hua-qiongyao-v1.webp"
import artChuanglian from "../../../art/w/hua-chuanglian-v1.webp"
import artTaoyuan from "../../../art/w/taoyuan-v1.webp"
import plaqueImg from "../../../art/w/plaque-hengzhixie-v1.webp"

// 厅堂：五扇折叠屏风立于眺园图前。
// 交互分两段：单击屏风，其身侧横向滑出一张等高的卷轴卡片（防误触）；
// 卡片上再决定是否入内；再点同一扇或按 Esc 收卷。

interface Panel {
  key: string
  title: string
  sub: string
  unlocked: boolean
  enterLabel: string
  art: string
  quote: string
  source: string
  desc: string
}

const PANELS: Panel[] = [
  {
    key: "spring",
    title: "春水",
    sub: "碎片 · 记忆流",
    unlocked: true,
    enterLabel: "入 水",
    art: artTaohua,
    quote: "桃之夭夭，灼灼其华。",
    source: "诗经 · 周南 · 桃夭",
    desc: "碎片层与记忆之流。每一片落瓣，是一段被记下的时刻；水面澄澈，投石可问近事。",
  },
  {
    key: "caishi",
    title: "采诗",
    sub: "木铎 · 反思",
    unlocked: true,
    enterLabel: "入 阁",
    art: artMuduo,
    quote: "行人振木铎徇于路，以采诗。",
    source: "汉书 · 食货志",
    desc: "引擎如采诗官，收拢散落的言语，织成故事线。铎响一声，是新的理解成形。",
  },
  {
    key: "shuge",
    enterLabel: "入 阁",
    title: "书阁",
    sub: "典籍 · 理解",
    unlocked: true,
    art: artZhishan,
    quote: "温故而知新。",
    source: "论语 · 为政",
    desc: "日记与理解文档——一部不断被誊写的线装活书，写着轩中此刻对你的理解。",
  },
  {
    key: "qiongyao",
    enterLabel: "入 阁",
    title: "琼瑶",
    sub: "心迹 · 印章",
    unlocked: true,
    art: artQiongyao,
    quote: "投我以木桃，报之以琼瑶。",
    source: "诗经 · 卫风 · 木瓜",
    desc: "心迹、便签与印章玉牒。你说出口的是木桃，轩中回赠的是琼瑶。",
  },
  {
    key: "tingshu",
    enterLabel: "入 阁",
    title: "庭树",
    sub: "窗棂 · 自检",
    unlocked: true,
    art: artChuanglian,
    quote: "年轮记岁，虬枝记事。",
    source: "临水轩 · 自题",
    desc: "引擎的自省之所。老树每抽一根新枝，是一条线索；花开花落，是线索的闭合与归档。",
  },
]

export default function Hall({ onEnter }: { onEnter: (key: string) => void }) {
  const [intro, setIntro] = useState<Panel | null>(null)
  const amb = currentAmbience()

  const toggle = useCallback((p: Panel) => {
    setIntro((cur) => (cur?.key === p.key ? null : p))
  }, [])

  useEffect(() => {
    if (!intro) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIntro(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [intro])

  return (
    <div className="hall">
      <div className="hall-backdrop" aria-hidden>
        <img className="hall-view" src={artTaoyuan} alt="" draggable={false} />
        <i className="mist mist-a" />
        <i className="mist mist-b" />
        <i className="water-glow" />
      </div>

      <header className="hall-header">
        <span className="seal">临水</span>
        <p className="hall-greet">
          {amb.greeting} · 衔枝记忆引擎
        </p>
      </header>

      <figure className="plaque" aria-hidden>
        <img src={plaqueImg} alt="" draggable={false} />
      </figure>

      <main className={`screens${intro ? " has-card" : ""}`} style={{ perspective: "1600px" }}>
        {PANELS.map((p, i) => (
          <Fragment key={p.key}>
            <button
              type="button"
              className="panel"
              style={{ ["--rest-rot" as string]: `${i % 2 === 0 ? 7 : -7}deg` }}
              onClick={() => toggle(p)}
              aria-label={`屏风${i + 1}·${p.title}——${p.sub}`}
              aria-expanded={intro?.key === p.key}
            >
              <span className="panel-frame">
                <span className="panel-face">
                  <img className="panel-art" src={p.art} alt="" draggable={false} />
                  <span className="panel-tag">{p.title}</span>
                </span>
              </span>
            </button>
            {intro?.key === p.key && (
              <aside className="side-scroll" role="dialog" aria-label={`${p.title} · 简介`}>
                <i className="side-knob side-knob-r" aria-hidden />
                <div className="side-paper">
                  <div className="side-vert">
                    <span className="side-title">{p.title}</span>
                    <span className="side-sub">{p.sub}</span>
                  </div>
                  <div className="side-main">
                    <p className="side-quote">
                      {p.quote}
                      <i className="side-source">{p.source}</i>
                    </p>
                    <p className="side-desc">{p.desc}</p>
                    <div className="side-actions">
                      {p.unlocked ? (
                        <>
                          <span className="side-hint">由此入内</span>
                          <button type="button" className="side-enter" onClick={() => onEnter(p.key)}>
                            {p.enterLabel}
                          </button>
                        </>
                      ) : (
                        <span className="side-note">此阁尚在修缮 · 二期开馆</span>
                      )}
                      <button type="button" className="side-close" onClick={() => setIntro(null)}>
                        掩卷
                      </button>
                    </div>
                  </div>
                </div>
                <i className="side-knob side-knob-l" aria-hidden />
              </aside>
            )}
          </Fragment>
        ))}
      </main>

      <footer className="hall-foot">投我以木桃 · 报之以琼瑶</footer>
    </div>
  )
}
