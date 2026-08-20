import type { ReactNode } from 'react'
import type { VAD } from '../engine/types'
import { Seal, VineDivider } from './nouveau'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

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

/** VAD 三柱 — shadcn Tooltip 替换原生 title（无障碍 + 动画 + 可复制文本） */
export function VadBars({ vad }: { vad: VAD }) {
  const v = Math.abs(vad.valence)
  const label = `效价 ${vad.valence.toFixed(2)} · 唤醒 ${vad.arousal.toFixed(2)} · 支配 ${vad.dominance.toFixed(2)}`
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-end gap-[3px] cursor-help" role="img" aria-label={label}>
          <div className="w-[3px] rounded-t-sm" style={{ height: 4 + v * 12, background: vad.valence >= 0 ? 'hsl(var(--raven))' : 'hsl(var(--cinnabar))' }} />
          <div className="w-[3px] rounded-t-sm bg-gold" style={{ height: 4 + vad.arousal * 12 }} />
          <div className="w-[3px] rounded-t-sm bg-fog" style={{ height: 4 + vad.dominance * 12 }} />
        </div>
      </TooltipTrigger>
      <TooltipContent className="font-mono text-[10px] border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--card))] text-foreground shadow-md">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** 龙脉值细条 — shadcn Tooltip */
export function VeinBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-fog">龙脉</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="nv-meter nv-meter-gold w-12 !h-[4px] cursor-help">
            <div style={{ width: `${value * 100}%` }} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-[10px] border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--card))] text-foreground shadow-md">
          龙脉值 {value.toFixed(2)} · 只管「看哪里」，不管「记不记」
        </TooltipContent>
      </Tooltip>
      <span className="text-[10px] font-mono text-gold">{value.toFixed(2)}</span>
    </div>
  )
}
