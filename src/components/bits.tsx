import type { ReactNode } from 'react'
import type { VAD } from '../engine/types'
import { Seal, VineDivider } from './nouveau'

/** @deprecated 统一使用 nouveau.Seal */
export { Seal }

/** 面板节标题（衬线题字 + 藤蔓分隔） */
export function SectionHead({ kicker, title, right }: { kicker: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[9px] tracking-[0.32em] text-gold uppercase font-display font-semibold mb-1">{kicker}</div>
          <h2 className="font-display text-lg font-semibold text-foreground/95">{title}</h2>
        </div>
        {right}
      </div>
      <VineDivider className="mt-2 opacity-70" width={150} />
    </div>
  )
}

/** VAD 三柱 */
export function VadBars({ vad }: { vad: VAD }) {
  const v = Math.abs(vad.valence)
  return (
    <div className="flex items-end gap-[3px]" title={`V ${vad.valence.toFixed(2)} · A ${vad.arousal.toFixed(2)} · D ${vad.dominance.toFixed(2)}`}>
      <div className="w-[3px] rounded-t-sm" style={{ height: 4 + v * 12, background: vad.valence >= 0 ? 'hsl(var(--raven))' : 'hsl(var(--cinnabar))' }} />
      <div className="w-[3px] rounded-t-sm bg-gold" style={{ height: 4 + vad.arousal * 12 }} />
      <div className="w-[3px] rounded-t-sm bg-fog" style={{ height: 4 + vad.dominance * 12 }} />
    </div>
  )
}

/** 龙脉值细条 */
export function VeinBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5" title={`龙脉值 ${value.toFixed(2)}`}>
      <span className="text-[10px] text-fog">龙脉</span>
      <div className="nv-meter nv-meter-gold w-12 !h-[4px]">
        <div style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gold">{value.toFixed(2)}</span>
    </div>
  )
}
