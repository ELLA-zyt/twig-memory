import { useEffect, useRef, useState } from "react"
import { WaterSurface } from "../water/WaterEngine"
import { CHUNSHUI_FLOWERS } from "../water/flowers"
import bgUrl from "../../../art/w/chunshui-bg-v1.webp"
import petal1 from "../../../art/w/petal-1.webp"
import petal2 from "../../../art/w/petal-2.webp"
import petal3 from "../../../art/w/petal-3.webp"

// 春水子页：桃花屏展开后的水面。点击投石、划过起澜；引擎见 water/WaterEngine.ts。

const PETAL_SPRITES = [petal1, petal2, petal3]

export default function SpringWater({ onBack }: { onBack: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let ws: WaterSurface | null = null
    let cancelled = false
    WaterSurface.create(stage, bgUrl, CHUNSHUI_FLOWERS, PETAL_SPRITES)
      .then((w) => {
        if (cancelled) w.dispose()
        else ws = w
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      ws?.dispose()
    }
  }, [])

  return (
    <div className="spring">
      <div ref={stageRef} className="spring-stage" />
      {failed && (
        <div className="spring-fallback" style={{ backgroundImage: `url(${bgUrl})` }} aria-hidden />
      )}

      <button type="button" className="spring-back" onClick={onBack}>
        〈 回轩
      </button>

      <header className="spring-head">
        <h1>春水</h1>
        <p>春水碧于天 · 画船听雨眠</p>
      </header>

      <p className="spring-hint">拂水起澜 · 点石问涟</p>
      <i className="spring-wash" aria-hidden />
    </div>
  )
}
