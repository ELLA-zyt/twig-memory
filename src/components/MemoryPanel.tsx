import { cn } from '@/lib/utils'
import type { Claim, Fragment, LogEntry, Thread } from '../engine/types'
import FragmentStream from './FragmentStream'
import LogFeed from './LogFeed'
import ThreadBoard from './ThreadBoard'
import UnderstandingDoc from './UnderstandingDoc'

export type MemTab = 'threads' | 'claims' | 'fragments' | 'log'

const TABS: { key: MemTab; label: string; layer: string }[] = [
  { key: 'claims', label: '认识', layer: '长程理解层' },
  { key: 'threads', label: '线索', layer: '草蛇灰线系统' },
  { key: 'fragments', label: '碎片', layer: '事件桶 · VAD' },
  { key: 'log', label: '判定日志', layer: 'adjudication' },
]

export default function MemoryPanel({
  tab, onTab, threads, claims, fragments, logs, flashIds, highlightFragmentId, onLocateFragment,
}: {
  tab: MemTab
  onTab: (t: MemTab) => void
  threads: Thread[]
  claims: Claim[]
  fragments: Fragment[]
  logs: LogEntry[]
  flashIds: Record<string, number>
  highlightFragmentId?: string | null
  onLocateFragment: (id: string) => void
}) {
  const active = TABS.find((t) => t.key === tab)!
  return (
    <div className="flex flex-col h-full bg-[hsl(44_36%_91%/0.5)] border-l border-[hsl(var(--gold)/0.25)]">
      <div className="shrink-0 px-3 pt-3">
        <div className="flex gap-1 border-b border-[hsl(var(--gold)/0.25)] pb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onTab(t.key)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full transition-colors border',
                tab === t.key
                  ? 'text-raven bg-[hsl(var(--raven)/0.08)] border-[hsl(var(--raven)/0.4)]'
                  : 'text-fog border-transparent hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="text-[9px] tracking-[0.25em] text-gold py-1.5 font-display uppercase">{active.layer}</div>
      </div>
      <div className="flex-1 min-h-0 px-3">
        {tab === 'threads' && <ThreadBoard threads={threads} flashIds={flashIds} />}
        {tab === 'claims' && <UnderstandingDoc claims={claims} fragments={fragments} flashIds={flashIds} onLocateFragment={onLocateFragment} />}
        {tab === 'fragments' && <FragmentStream fragments={fragments} threads={threads} flashIds={flashIds} highlightId={highlightFragmentId} />}
        {tab === 'log' && <LogFeed logs={logs} />}
      </div>
    </div>
  )
}
