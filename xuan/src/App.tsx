import { useEffect, useRef, useState } from "react"
import { applyAmbience, startWind } from "./ambience"
import Hall from "./pages/Hall"
import SpringWater from "./pages/SpringWater"
import CaishiPage from "./pages/CaishiPage"
import BookPage from "./pages/BookPage"
import QiongyaoPage from "./pages/QiongyaoPage"
import TingshuPage from "./pages/TingshuPage"
import BambooConsole from "./console/BambooConsole"

type View = "hall" | "spring" | "caishi" | "shuge" | "qiongyao" | "tingshu"

export default function App() {
  const [view, setView] = useState<View>("hall")
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const stopAmbience = applyAmbience(el)
    const stopWind = startWind(el)
    return () => {
      stopAmbience()
      stopWind()
    }
  }, [])

  return (
    <div className="app" ref={rootRef}>
      <div className="ambience" aria-hidden />
      <div className="view" key={view}>
        {view === "hall" ? (
          <Hall onEnter={(key) => setView(key as View)} />
        ) : view === "spring" ? (
          <SpringWater onBack={() => setView("hall")} />
        ) : view === "caishi" ? (
          <CaishiPage onBack={() => setView("hall")} />
        ) : view === "shuge" ? (
          <BookPage onBack={() => setView("hall")} />
        ) : view === "qiongyao" ? (
          <QiongyaoPage onBack={() => setView("hall")} />
        ) : (
          <TingshuPage onBack={() => setView("hall")} />
        )}
      </div>
      <BambooConsole />
    </div>
  )
}
