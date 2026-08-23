import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { useCountUp } from '@/hooks/useTween'
import { IMPORT_STATS } from '../engine/data'
import type { LogAccent, LogKind } from '../engine/types'
import { TwigMark, VineDivider } from './nouveau'

const ACCENT_TEXT: Record<LogAccent, string> = {
  raven: 'text-raven', cinnabar: 'text-cinnabar', gold: 'text-gold', fog: 'text-fog',
}
const KIND_TAG: Record<LogKind, string> = {
  ingest: '碎片', register: '登记', collision: '碰撞', adjudicate: '判定',
  transition: '状态机', merge: 'MERGE', split: 'SPLIT', rewrite: '改写',
  counter: '反证', silent: 'SILENT', reject: '拒绝', system: '系统',
}

/**
 * 历史压缩回放浮层
 * shadcn Dialog：ESC 可跳过 + 焦点陷阱；覆盖层改羊皮纸色调以匹配主题。
 */
export default function ImportOverlay({ lines, onDone }: {
  lines: { kind: LogKind; text: string; accent: LogAccent }[]
  onDone: () => void
}) {
  const [phase, setPhase] = useState(0) // 0 计消息 1 出三数 2 流日志 3 就绪
  const [shownLogs, setShownLogs] = useState(0)
  const msgs = useCountUp(IMPORT_STATS.messages, 1600, phase >= 0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1800)
    const t2 = setTimeout(() => setPhase(2), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (phase !== 2) return
    if (shownLogs >= lines.length) {
      const t = setTimeout(() => setPhase(3), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShownLogs((n) => n + 1), 420)
    return () => clearTimeout(t)
  }, [phase, shownLogs, lines.length])

  return (
    <Dialog open onOpenChange={(open) => { if (!open && phase >= 3) onDone() }}>
      <DialogPortal>
        <DialogOverlay className="bg-[hsl(42_33%_89%/0.97)]" />
        <DialogContent
          showCloseButton={false}
          className="fixed inset-0 z-50 max-w-none max-h-none w-full h-full translate-x-0 translate-y-0 top-0 left-0 rounded-none border-none bg-transparent shadow-none flex items-center justify-center p-6 gap-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">历史压缩 · 过去 90 天装入三层记忆</DialogTitle>
          <div className="w-full max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
              <TwigMark size={40} />
              <div>
                <div className="text-[10px] tracking-[0.35em] text-raven font-display font-semibold">1:00 · 历史压缩</div>
                <div className="font-display text-xl font-semibold mt-0.5">过去 90 天，一次性装进三层记忆</div>
              </div>
            </div>

            <div className="nv-card nv-card-double p-6 mb-5 text-center relative overflow-hidden">
              <div className="font-display text-5xl md:text-6xl font-semibold text-foreground tabular-nums">{msgs.toLocaleString()}</div>
              <div className="text-xs text-fog mt-2 tracking-[0.25em]">条消息 · 2026-05-09 → 2026-08-07</div>

              <div className={cn('grid grid-cols-3 gap-4 mt-6 transition-opacity duration-700', phase >= 1 ? 'opacity-100' : 'opacity-0')}>
                {[
                  { n: IMPORT_STATS.events, label: '事件', sub: 'VAD + 情绪调制衰减', cls: 'text-foreground' },
                  { n: IMPORT_STATS.threads, label: '长期线索', sub: '只登记悬置的问题', cls: 'text-raven' },
                  { n: IMPORT_STATS.claims, label: '核心认识', sub: '带证据结构存活', cls: 'text-gold' },
                ].map((s) => (
                  <div key={s.label} className="border-t border-[hsl(var(--gold)/0.3)] pt-3">
                    <div className={cn('font-display text-3xl font-semibold tabular-nums', s.cls)}>{s.n}</div>
                    <div className="text-xs mt-1">{s.label}</div>
                    <div className="text-[10px] text-fog mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-56 overflow-hidden font-mono text-[11px] leading-relaxed rounded-xl border border-[hsl(var(--gold)/0.3)] bg-[hsl(44_38%_93%/0.7)] p-3.5">
              {lines.slice(0, shownLogs).map((l, i) => (
                <div key={i} className="anim-fade py-0.5">
                  <span className={cn('mr-2 text-[10px]', ACCENT_TEXT[l.accent])}>[{KIND_TAG[l.kind]}]</span>
                  <span className="text-foreground/85">{l.text}</span>
                </div>
              ))}
              {phase < 2 && <div className="text-fog">……</div>}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={onDone}
                disabled={phase < 3}
                className={cn(
                  'px-8 py-2.5 rounded-full border text-sm transition-all font-display tracking-[0.2em]',
                  phase >= 3 ? 'border-[hsl(var(--raven)/0.6)] text-raven hover:bg-[hsl(var(--raven)/0.08)] anim-rise' : 'border-border text-fog/50 cursor-not-allowed',
                )}
              >
                进入演示 →
              </button>
              {phase >= 3 && <VineDivider className="mx-auto mt-4 opacity-70" width={150} />}
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
