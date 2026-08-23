import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { LogAccent, LogEntry, LogKind } from '../engine/types'

const KIND_TAG: Record<LogKind, string> = {
  ingest: '碎片', register: '登记', collision: '碰撞', adjudicate: '判定',
  transition: '状态机', merge: 'MERGE', split: 'SPLIT', rewrite: '改写',
  counter: '反证', silent: 'SILENT', reject: '拒绝', system: '系统',
}

const ACCENT_TEXT: Record<LogAccent, string> = {
  raven: 'text-raven', cinnabar: 'text-cinnabar', gold: 'text-gold', fog: 'text-fog',
}

export default function LogFeed({ logs, compact }: { logs: LogEntry[]; compact?: boolean }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [logs.length])

  return (
    <div className="h-full overflow-y-auto font-mono text-[11px] leading-relaxed pr-1 pb-2">
      {logs.length === 0 && (
        <div className="text-fog text-center py-8">引擎判定日志 —— 等待输入……</div>
      )}
      {logs.map((l) => (
        <div key={l.id} className="py-1 border-b border-[hsl(var(--gold)/0.18)] anim-fade">
          <div className="flex items-baseline gap-2">
            <span className="text-fog/60 shrink-0">{l.time}</span>
            <span className={cn('shrink-0 text-[10px]', ACCENT_TEXT[l.accent])}>[{KIND_TAG[l.kind]}]</span>
            <span className="text-foreground/90">{l.title}</span>
          </div>
          {l.detail && !compact && (
            <div className="pl-[7.5rem] text-fog text-[10px] mt-0.5">{l.detail}</div>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}
