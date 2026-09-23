// 风与时辰：全屋共享的环境层。
// 时辰 → 四套光色（CSS 变量 --ambience-tint）；风 → 平滑噪声驱动 --wind（-1..1）。

export type Phase = "dawn" | "day" | "dusk" | "night"

export interface Ambience {
  phase: Phase
  tint: string
  greeting: string
}

const PHASES: { phase: Phase; tint: string; greeting: string }[] = [
  { phase: "dawn", tint: "rgba(255, 214, 170, 0.10)", greeting: "晨光正好" },
  { phase: "day", tint: "rgba(255, 255, 240, 0.04)", greeting: "日影渐长" },
  { phase: "dusk", tint: "rgba(255, 170, 120, 0.12)", greeting: "暮色四合" },
  { phase: "night", tint: "rgba(40, 60, 90, 0.22)", greeting: "夜阑人静" },
]

export function currentAmbience(now = new Date()): Ambience {
  const h = now.getHours()
  const i = h >= 5 && h < 8 ? 0 : h >= 8 && h < 16 ? 1 : h >= 16 && h < 19 ? 2 : 3
  return PHASES[i]
}

/** 把时辰光色挂到容器上，返回清理函数。 */
export function applyAmbience(el: HTMLElement): () => void {
  const tick = () => {
    const a = currentAmbience()
    el.style.setProperty("--ambience-tint", a.tint)
  }
  tick()
  const id = window.setInterval(tick, 60_000)
  return () => window.clearInterval(id)
}

/** 平滑噪声风值，约 8fps 写入 --wind，供屏风/丝绦轻晃。 */
export function startWind(el: HTMLElement): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {}
  let target = 0
  let value = 0
  const drift = window.setInterval(() => {
    target = (Math.random() * 2 - 1) * (0.4 + Math.random() * 0.6)
  }, 2600)
  let last = 0
  const loop = (t: number) => {
    if (t - last > 120 && !document.hidden) {
      last = t
      value += (target - value) * 0.08
      el.style.setProperty("--wind", value.toFixed(3))
    }
    raf = requestAnimationFrame(loop)
  }
  let raf = requestAnimationFrame(loop)
  return () => {
    cancelAnimationFrame(raf)
    window.clearInterval(drift)
  }
}
