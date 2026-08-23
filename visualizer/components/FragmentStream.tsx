import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { memoryStrength } from '../engine/engine'
import type { Fragment, Thread } from '../engine/types'
import { VadBars } from './bits'

export default function FragmentStream({ fragments, threads, flashIds, highlightId }: {
  fragments: Fragment[]
  threads: Thread[]
  flashIds: Record<string, number>
  highlightId?: string | null
}) {
  const sorted = [...fragments].sort((a, b) => a.day - b.day)
  const threadLabel = (id: string) => threads.find((t) => t.id === id)?.label ?? id

  return (
    <ScrollArea className="h-full" type="hover">
      <div className="space-y-2 pr-3 pb-4">
        {sorted.map((f) => {
          const s = memoryStrength(f)
          const hl = highlightId === f.id
          return (
            <div
              key={f.id}
              id={`frag-${f.id}`}
              className={cn(
                'rounded-xl border px-3.5 py-2.5 bg-card transition-all shadow-sm',
                hl ? 'border-[hsl(var(--raven)/0.7)] anim-flash' : 'border-[hsl(var(--gold)/0.3)]',
                flashIds[f.id] && 'anim-flash',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-fog w-12 shrink-0">{f.day === 0 ? '今天' : f.dateLabel}</span>
                <span className="text-xs text-foreground/95 font-medium truncate">{f.title}</span>
                <span className="flex-1" />
                <VadBars vad={f.vad} />
              </div>
              <div className="text-[11px] text-fog leading-relaxed mt-1">{f.body}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
                  {f.threadIds.map((id) => (
                    <span key={id} className="text-[9px] border border-[hsl(var(--gold)/0.35)] rounded-full px-1.5 py-px text-fog whitespace-nowrap">
                      {threadLabel(id)}
                    </span>
                  ))}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 shrink-0 cursor-help">
                      <div className="nv-meter w-10 !h-[3px]">
                        <div style={{ width: `${s * 100}%`, opacity: 0.4 + s * 0.6, background: 'hsl(var(--fog))' }} />
                      </div>
                      <span className="text-[9px] font-mono text-fog">{(s * 100).toFixed(0)}%</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="font-mono text-[10px] border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--card))] text-foreground shadow-md">
                    记忆强度 {(s * 100).toFixed(0)}% · R = e^(-t/S)，高唤醒衰减更慢
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
