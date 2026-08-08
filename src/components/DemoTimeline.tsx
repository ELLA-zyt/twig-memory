import { cn } from '@/lib/utils'
import { DEMO_STEPS, STEP_HINTS } from '../engine/demoScript'
import type { DemoKey } from '../engine/types'

export default function DemoTimeline({
  active, completed, onSelect,
}: {
  active: DemoKey
  completed: DemoKey[]
  onSelect: (k: DemoKey) => void
}) {
  const activeStep = DEMO_STEPS.find((s) => s.key === active)
  return (
    <div className="shrink-0 border-b border-[hsl(var(--gold)/0.3)] bg-[hsl(44_38%_93%/0.6)] px-6 pt-4 pb-2.5">
      <div className="flex items-start max-w-5xl mx-auto">
        {DEMO_STEPS.map((s, i) => {
          const done = completed.includes(s.key)
          const isActive = s.key === active
          return (
            <div key={s.key} className="flex-1 flex items-start">
              <button onClick={() => onSelect(s.key)} className="group flex flex-col items-center gap-1.5 min-w-0">
                {/* 光晕双环节点 */}
                <span className={cn(
                  'relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-display font-semibold transition-all',
                  done ? 'bg-gold text-[hsl(44_40%_95%)]' : isActive ? 'text-raven' : 'text-fog group-hover:text-foreground',
                )}>
                  <span className={cn(
                    'absolute inset-0 rounded-full border transition-colors',
                    done ? 'border-gold' : isActive ? 'border-raven' : 'border-border group-hover:border-fog',
                  )} />
                  <span className={cn(
                    'absolute inset-[3px] rounded-full border',
                    done ? 'border-[hsl(44_40%_95%/0.5)]' : isActive ? 'border-[hsl(var(--raven)/0.4)]' : 'border-[hsl(var(--border)/0.5)]',
                  )} />
                  {isActive && <span className="absolute inset-[-5px] rounded-full border border-[hsl(var(--raven)/0.25)]" />}
                  <span className="relative">{done ? '✓' : i + 1}</span>
                </span>
                <span className={cn('text-[9px] font-mono', isActive ? 'text-raven' : done ? 'text-gold' : 'text-fog')}>{s.t}</span>
                <span className={cn('text-xs whitespace-nowrap font-medium', isActive ? 'text-foreground' : 'text-fog')}>{s.title}</span>
              </button>
              {i < DEMO_STEPS.length - 1 && (
                <div className={cn('flex-1 h-px mt-3 mx-1', done ? 'bg-[hsl(var(--gold)/0.7)]' : 'bg-border')} />
              )}
            </div>
          )
        })}
      </div>
      {activeStep && (
        <div className="text-center text-[11px] text-fog mt-2 pb-0.5">
          <span className="text-raven/90 mr-2 font-medium">{activeStep.subtitle}</span>
          {STEP_HINTS[activeStep.key]}
        </div>
      )}
    </div>
  )
}
