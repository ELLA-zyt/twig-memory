import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useTween } from '@/hooks/useTween'
import { Progress } from '@/components/ui/progress'
import type { Claim, Fragment } from '../engine/types'
import { Seal } from './bits'

function ConvictionGauge({ value, dropped }: { value: number; dropped?: boolean }) {
  const v = useTween(value, 1400)
  return (
    <div className="flex items-center gap-2">
      {/* shadcn Progress：ARIA role + 动画；用主题变量覆盖默认颜色 */}
      <Progress
        value={v * 100}
        className={cn(
          'flex-1 h-1.5',
          dropped ? '[&>div]:bg-[hsl(var(--cinnabar))]' : '[&>div]:bg-gradient-to-r [&>div]:from-[hsl(var(--gold)/0.75)] [&>div]:to-[hsl(var(--gold))]',
        )}
      />
      <span className={cn('font-mono text-sm tabular-nums', dropped ? 'text-cinnabar' : 'text-gold')}>
        {v.toFixed(2)}
      </span>
    </div>
  )
}

function ClaimCard({ c, fragments, flash, onLocateFragment }: {
  c: Claim
  fragments: Fragment[]
  flash: boolean
  onLocateFragment: (id: string) => void
}) {
  const [showVersions, setShowVersions] = useState(false)
  const fragTitle = (id: string) => fragments.find((f) => f.id === id)?.title ?? id
  const latestVersion = c.versions[c.versions.length - 1]
  const dropped = latestVersion && latestVersion.conviction < c.versions[0].conviction && c.versions.length > 1
    ? c.versions[c.versions.length - 2]?.conviction > c.conviction
    : false

  if (c.status === 'contested') {
    return (
      <div className="rounded-xl border border-dashed border-[hsl(var(--cinnabar)/0.4)] p-3.5 bg-[hsl(var(--cinnabar)/0.05)] opacity-90">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-display text-sm font-semibold text-foreground/85">{c.docTitle}</span>
          <span className="flex-1" />
          <Seal accent="cinnabar">已争议 · user-vetoed</Seal>
        </div>
        <div className="text-xs text-fog nv-strike mb-2">{c.text}</div>
        <div className="text-[11px] text-foreground/75 leading-relaxed">{c.contestedNote}</div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-[hsl(var(--gold)/0.3)] bg-card p-3.5 shadow-sm', flash && 'anim-flash')}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-display text-base font-semibold text-gold">{c.docTitle}</span>
        <span className="flex-1" />
        <Seal accent="gold">置信 {c.conviction.toFixed(2)}</Seal>
      </div>

      <p className="font-display text-sm leading-relaxed text-foreground/95 mb-3">{c.text}</p>

      <ConvictionGauge value={c.conviction} dropped={dropped} />

      <div className="mt-3 space-y-2.5">
        <div>
          <div className="text-[9px] tracking-[0.25em] text-fog mb-1">证据锚定 · 每条论断必须引用支撑碎片</div>
          <div className="flex flex-wrap gap-1">
            {c.evidenceIds.map((id) => (
              <button
                key={id}
                onClick={() => onLocateFragment(id)}
                className="text-[10px] border border-[hsl(var(--raven)/0.4)] text-raven rounded-full px-2 py-0.5 hover:bg-[hsl(var(--raven)/0.08)] transition-colors"
                title="定位碎片"
              >
                {id} · {fragTitle(id)}
              </button>
            ))}
          </div>
        </div>

        {c.counterEvidence.length > 0 && (
          <div>
            <div className="text-[9px] tracking-[0.25em] text-fog mb-1">反证 · 说明留痕，不许悄悄吞掉</div>
            <div className="space-y-1.5">
              {c.counterEvidence.map((ce, i) => (
                <div key={i} className="border-l-2 border-[hsl(var(--cinnabar)/0.7)] pl-2.5 py-0.5">
                  <div className="text-[11px] text-foreground/85 leading-relaxed">{ce.text}</div>
                  <div className="text-[10px] text-fog mt-0.5">↳ {ce.resolution}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[11px] text-fog leading-relaxed">
          <span className="text-[9px] tracking-[0.25em]">边界条件 · </span>{c.boundary}
        </div>

        <div>
          <button onClick={() => setShowVersions(!showVersions)} className="text-[10px] tracking-[0.2em] text-fog hover:text-gold transition-colors">
            版本史 ×{c.versions.length} {showVersions ? '−' : '+'}
          </button>
          {showVersions && (
            <div className="mt-1.5 space-y-2 anim-fade">
              {c.versions.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex flex-col items-center">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-1', i === c.versions.length - 1 ? 'bg-gold' : 'bg-[hsl(var(--fog)/0.5)]')} />
                    {i < c.versions.length - 1 && <div className="w-px flex-1 bg-[hsl(var(--gold)/0.3)]" />}
                  </div>
                  <div className="pb-1">
                    <div className="text-[10px] font-mono text-fog">{v.at} · 置信 {v.conviction.toFixed(2)}</div>
                    <div className="text-[11px] font-display text-foreground/85 leading-relaxed">{v.text}</div>
                    <div className="text-[10px] text-fog">↳ {v.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UnderstandingDoc({ claims, fragments, flashIds, onLocateFragment }: {
  claims: Claim[]
  fragments: Fragment[]
  flashIds: Record<string, number>
  onLocateFragment: (id: string) => void
}) {
  const active = claims.filter((c) => c.status === 'active')
  const contested = claims.filter((c) => c.status === 'contested')
  return (
    <div className="h-full overflow-y-auto space-y-3 pr-1 pb-4">
      <div className="text-[11px] text-fog leading-relaxed rounded-xl border border-[hsl(var(--gold)/0.35)] bg-[hsl(var(--gold)/0.06)] px-3 py-2.5">
        改写式活文档：过去理解 A → 新证据重新解释 → 现在理解 B。<span className="text-gold">「我知道我对你的理解可能错，并且我能修正。」</span>
      </div>
      {active.map((c) => (
        <ClaimCard key={c.id} c={c} fragments={fragments} flash={!!flashIds[c.id]} onLocateFragment={onLocateFragment} />
      ))}
      {contested.length > 0 && (
        <div>
          <div className="text-[9px] tracking-[0.28em] text-fog mt-4 mb-2">已争议 · 退出默认可见文档</div>
          {contested.map((c) => (
            <ClaimCard key={c.id} c={c} fragments={fragments} flash={false} onLocateFragment={onLocateFragment} />
          ))}
        </div>
      )}
    </div>
  )
}
