import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { POOL_LABEL, STATUS_LABEL } from '../engine/engine'
import type { Thread } from '../engine/types'
import { Seal, VeinBar } from './bits'

const POOL_ORDER = ['ACTIVE', 'DORMANT', 'SILENT', 'ARCHIVE'] as const
const POOL_DESC: Record<string, string> = {
  ACTIVE: '实时碰撞 · 100%',
  DORMANT: '绝不脱离碰撞：低频扫描 + 事件触发',
  SILENT: '回避型高权重 · 触发器唤醒',
  ARCHIVE: '终态与降级 · 热路径扑空才扫',
}

function statusAccent(t: Thread): string {
  if (t.pool === 'SILENT') return 'cinnabar'
  if (t.status === 'resolved') return 'gold'
  if (t.status === 'unresolved') return t.pool === 'ACTIVE' ? 'raven' : 'fog'
  return 'fog'
}

function ThreadSlip({ t, flash, onJump, allThreads }: {
  t: Thread
  flash: boolean
  onJump: (id: string) => void
  allThreads: Thread[]
}) {
  const byId = (id: string) => allThreads.find((x) => x.id === id)
  return (
    <div className={cn(
      'rounded-xl border bg-card transition-colors shadow-sm',
      t.pool === 'SILENT' ? 'border-dashed border-[hsl(var(--cinnabar)/0.45)]' : 'border-[hsl(var(--gold)/0.3)]',
      flash && (t.status === 'resolved' ? 'anim-flash' : t.pool === 'SILENT' ? 'anim-flash-warn' : 'anim-flash'),
    )}>
      {/* shadcn Accordion：键盘导航 + 展开动画 + ARIA；用主题变量覆盖默认样式 */}
      <Accordion type="single" collapsible>
        <AccordionItem value="detail" className="border-b-0">
          <AccordionTrigger className="w-full text-left px-3.5 py-2.5 hover:no-underline [&>svg]:text-fog [&>svg]:shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-foreground/95 font-medium truncate">{t.label}</span>
                <span className="flex-1" />
                <Seal accent={statusAccent(t)}>{STATUS_LABEL[t.status]}</Seal>
              </div>
              <div className="font-display text-xs text-fog leading-relaxed">「{t.openQuestion}」</div>
              <div className="flex items-center gap-3 mt-2">
                <VeinBar value={t.dragonVein} />
                <span className="text-[10px] text-fog">情感权重 {t.emotionalWeight.toFixed(2)}</span>
                <span className="text-[10px] text-fog">历史 {t.history.length}</span>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-3.5 pb-3 pt-0 space-y-3 anim-fade">
            {t.closureReason && (
              <div className="border-l-2 border-[hsl(var(--gold)/0.7)] pl-2.5 py-0.5 text-[11px] text-gold leading-relaxed">
                closure_reason：{t.closureReason}
              </div>
            )}

            {t.silentSignals && (
              <div className="rounded-lg border border-[hsl(var(--cinnabar)/0.35)] p-2.5 bg-[hsl(var(--cinnabar)/0.06)]">
                <div className="text-[9px] tracking-[0.25em] text-cinnabar mb-1.5">SILENT 信号 · 三信号齐备方可入池</div>
                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-foreground/80">
                  <div>重要度<br /><span className="text-cinnabar">{t.silentSignals.importance}</span></div>
                  <div>提及频率<br /><span className="text-cinnabar">{t.silentSignals.mentionFrequency}</span></div>
                  <div>回避信号<br /><span className="text-cinnabar">{t.silentSignals.avoidanceSignal}</span></div>
                  <div>唤醒阈值<br /><span className="text-cinnabar">{t.silentSignals.triggerThreshold}</span></div>
                </div>
              </div>
            )}

            <div>
              <div className="text-[9px] tracking-[0.25em] text-fog mb-1">合成句 · 抽象层（召回兜底）</div>
              {t.synthetic.abstractFloor.map((s, i) => (
                <div key={i} className="text-[11px] text-foreground/75 font-display">· {s}</div>
              ))}
              {t.synthetic.concreteGuesses.length > 0 && (
                <>
                  <div className="text-[9px] tracking-[0.25em] text-fog mt-2 mb-1">合成句 · 具体层（回收长相猜测）</div>
                  {t.synthetic.concreteGuesses.map((s, i) => (
                    <div key={i} className="text-[11px] text-foreground/75">· {s}</div>
                  ))}
                </>
              )}
            </div>

            <div>
              <div className="text-[9px] tracking-[0.25em] text-fog mb-1">事件历史</div>
              <div className="space-y-1">
                {[...t.history].sort((a, b) => a.day - b.day).map((h, i) => (
                  <div key={i} className="flex gap-2 text-[11px]">
                    <span className="font-mono text-fog shrink-0 w-14">{h.day === 0 ? '今天' : `-${h.day}天`}</span>
                    <span className="text-foreground/75">{h.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {(t.lineage.parentIds.length > 0 || t.lineage.childIds.length > 0) && (
              <div>
                <div className="text-[9px] tracking-[0.25em] text-fog mb-1">lineage · 从哪来 / 变成了什么</div>
                <div className="flex flex-wrap gap-1">
                  {t.lineage.parentIds.map((p) => (
                    <button key={p} onClick={() => onJump(p)} className="text-[10px] border border-border rounded-full px-2 py-0.5 text-fog hover:text-raven hover:border-[hsl(var(--raven)/0.5)] transition-colors">
                      ← {byId(p)?.label ?? p}
                    </button>
                  ))}
                  {t.lineage.childIds.map((c) => (
                    <button key={c} onClick={() => onJump(c)} className="text-[10px] border border-border rounded-full px-2 py-0.5 text-fog hover:text-raven hover:border-[hsl(var(--raven)/0.5)] transition-colors">
                      → {byId(c)?.label ?? c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {t.softLinks.length > 0 && (
              <div>
                <div className="text-[9px] tracking-[0.25em] text-fog mb-1">软链接（待印证）</div>
                {t.softLinks.map((s, i) => (
                  <div key={i} className="text-[11px] text-fog border-l border-dashed border-[hsl(var(--fog)/0.5)] pl-2">{s.note}</div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export default function ThreadBoard({ threads, flashIds }: { threads: Thread[]; flashIds: Record<string, number> }) {
  const [pool, setPool] = useState<string>('ACTIVE')
  const [jumpId, setJumpId] = useState<string | null>(null)
  const counts = Object.fromEntries(POOL_ORDER.map((p) => [p, threads.filter((t) => t.pool === p).length]))
  const list = threads.filter((t) => t.pool === pool)

  const handleJump = (id: string) => {
    const t = threads.find((x) => x.id === id)
    if (t) { setPool(t.pool); setJumpId(id) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1.5 shrink-0">
        {/* shadcn Select：键盘导航 + 焦点环；替换手写 tab 按钮 */}
        <Select value={pool} onValueChange={setPool}>
          <SelectTrigger className="h-7 min-w-[9rem] w-auto text-xs rounded-full border-[hsl(var(--gold)/0.4)] bg-transparent px-3 focus:ring-1 focus:ring-[hsl(var(--raven)/0.4)]">
            <SelectValue placeholder="选择线索池" />
          </SelectTrigger>
          <SelectContent className="border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--card))]">
            {POOL_ORDER.map((p) => (
              <SelectItem key={p} value={p} className="text-xs">
                {POOL_LABEL[p]} · <span className="font-mono">{counts[p]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] text-fog">{POOL_DESC[pool]}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-4">
        {list.length === 0 && <div className="text-xs text-fog text-center py-8">此池暂空</div>}
        {list.map((t) => (
          <div key={t.id} id={`thread-${t.id}`} className={cn(jumpId === t.id && 'anim-flash rounded-xl')}>
            <ThreadSlip t={t} flash={!!flashIds[t.id]} onJump={handleJump} allThreads={threads} />
          </div>
        ))}
      </div>
    </div>
  )
}
