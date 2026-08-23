import { useEffect, useRef, useState } from 'react'
import { COUNTER_CANDIDATES } from '../engine/demoScript'
import type { ChatMsg, DemoKey } from '../engine/types'
import { VineDivider } from './nouveau'

function MsgBubble({ m }: { m: ChatMsg }) {
  if (m.kind === 'quote') {
    return (
      <div className="py-10 px-6 text-center anim-rise">
        <VineDivider className="mx-auto mb-6" width={170} />
        <p className="font-display text-xl md:text-2xl leading-loose text-foreground/95 font-medium">{m.text}</p>
        {m.meta && <p className="text-xs text-gold mt-6 tracking-wider">{m.meta}</p>}
        <VineDivider className="mx-auto mt-6" width={170} />
      </div>
    )
  }
  if (m.role === 'system') {
    return <div className="text-center text-[11px] text-fog py-2 anim-fade">{m.text}</div>
  }
  if (m.role === 'user') {
    return (
      <div className="flex justify-end anim-rise">
        <div className="max-w-[80%] rounded-2xl rounded-br-md border border-[hsl(var(--raven)/0.45)] bg-[hsl(var(--raven)/0.08)] px-4 py-2.5 shadow-sm">
          <div className="text-sm text-foreground/95">{m.text}</div>
        </div>
      </div>
    )
  }
  if (m.kind === 'compare') {
    return (
      <div className="space-y-2 anim-rise">
        <div className="max-w-[92%] rounded-xl border border-dashed border-border px-4 py-2.5 bg-secondary/40">
          <div className="text-[9px] tracking-[0.25em] text-fog mb-1 font-display">普通 AI · 现有记忆系统</div>
          <div className="text-sm text-fog">{m.plainText}</div>
        </div>
        <div className="max-w-[92%] rounded-xl border border-[hsl(var(--raven)/0.5)] px-4 py-2.5 bg-card shadow-sm" style={{ boxShadow: 'inset 0 0 0 1px hsl(46 45% 97% / 0.6), 0 10px 24px -18px hsl(158 30% 18% / 0.35)' }}>
          <div className="text-[9px] tracking-[0.25em] text-raven mb-1 font-display font-semibold">衔枝 TWIG</div>
          <div className="text-sm leading-relaxed text-foreground/95">{m.text}</div>
        </div>
        {m.meta && (
          <div className="text-[11px] text-gold border border-[hsl(var(--gold)/0.45)] bg-[hsl(var(--gold)/0.08)] rounded-full px-3 py-1.5 inline-block">
            {m.meta}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="flex anim-rise">
      <div className="max-w-[92%] rounded-xl border border-[hsl(var(--gold)/0.35)] border-l-[3px] border-l-[hsl(var(--raven))] px-4 py-2.5 bg-card shadow-sm">
        <div className="text-[9px] tracking-[0.25em] text-raven mb-1 font-display font-semibold">衔枝 TWIG</div>
        <div className="text-sm leading-relaxed text-foreground/95">{m.text}</div>
        {m.meta && <div className="text-[10px] text-gold/90 mt-1.5">{m.meta}</div>}
      </div>
    </div>
  )
}

export default function ChatPane({
  chat, busy, activeStep, completedSteps,
  onContrast, onCounter, onClosure, onFinale, onEvidence, onShowImport, onFree,
}: {
  chat: ChatMsg[]
  busy: boolean
  activeStep: DemoKey
  completedSteps: DemoKey[]
  onContrast: () => void
  onCounter: (t: string) => void
  onClosure: (t?: string) => void
  onFinale: () => void
  onEvidence: () => void
  onShowImport: () => void
  onFree: (t: string) => void
}) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat.length, busy])

  const done = (k: DemoKey) => completedSteps.includes(k)
  const counterPending = activeStep === 'counter' && !done('counter')
  const closurePending = activeStep === 'closure' && !done('closure')

  const submit = () => {
    const t = input.trim()
    if (!t || busy) return
    setInput('')
    // 评委现场输入：反例 / 回收步骤的自由表述也走对应判定流（文档 §7 唯一的可控交互点）
    if (counterPending) onCounter(t)
    else if (closurePending) onClosure(t)
    else onFree(t)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 space-y-4">
        {chat.length === 0 && (
          <div className="text-center text-fog text-xs pt-16">
            <VineDivider className="mx-auto mb-5 opacity-70" width={170} />
            <div className="font-display text-base text-foreground/75 mb-2 font-medium">记忆已装载：过去 90 天</div>
            37 事件 · 12 线索 · 5 核心认识 —— 第一句台词已经备好 ↓
          </div>
        )}
        {chat.map((m) => <MsgBubble key={m.id} m={m} />)}
        {busy && (
          <div className="flex">
            <div className="rounded-xl border border-[hsl(var(--gold)/0.35)] px-4 py-3 bg-card typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* 预设动作区（设计债务⑩：现场交互只留可控点，候选备五组） */}
      <div className="shrink-0 px-4 md:px-8 pb-2 space-y-2">
        {activeStep === 'contrast' && !done('contrast') && (
          <div className="flex flex-wrap gap-2 anim-fade">
            <button onClick={onContrast} disabled={busy} className="nv-btn text-xs px-3.5 py-1.5">
              💬 「我终于换电脑了」
            </button>
          </div>
        )}
        {activeStep === 'import' && !done('import') && (
          <div className="flex flex-wrap gap-2 anim-fade">
            <button onClick={onShowImport} disabled={busy} className="nv-btn text-xs px-3.5 py-1.5">
              ▶ 播放历史压缩（1423 条消息 → 三层记忆）
            </button>
          </div>
        )}
        {activeStep === 'evidence' && !done('evidence') && (
          <div className="flex flex-wrap gap-2 anim-fade">
            <button onClick={onEvidence} disabled={busy} className="nv-btn nv-btn-gold text-xs px-3.5 py-1.5">
              ▶ 认识生成对比：标签画像 vs 带证据结构的论断
            </button>
          </div>
        )}
        {counterPending && (
          <div className="anim-fade">
            <div className="text-[9px] tracking-[0.25em] text-cinnabar mb-1.5 font-display">人为反例 · 候选输入备五组（也可直接在输入框里写你自己的反例）</div>
            <div className="flex flex-wrap gap-2">
              {COUNTER_CANDIDATES.map((c) => (
                <button key={c} onClick={() => onCounter(c)} disabled={busy}
                  className="nv-btn nv-btn-cinnabar text-xs px-3.5 py-1.5">
                  「{c}」
                </button>
              ))}
            </div>
          </div>
        )}
        {closurePending && (
          <div className="flex flex-wrap gap-2 anim-fade">
            <button onClick={() => onClosure()} disabled={busy} className="nv-btn text-xs px-3.5 py-1.5">
              💬 「终于把那个一直卡我的东西解决了」
            </button>
          </div>
        )}
        {activeStep === 'finale' && !done('finale') && (
          <div className="flex flex-wrap gap-2 anim-fade">
            <button onClick={onFinale} disabled={busy} className="nv-btn nv-btn-gold text-xs px-3.5 py-1.5">
              ▶ 播放收尾
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[hsl(var(--gold)/0.3)] px-4 md:px-8 py-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={
              counterPending ? '或者写一句你自己的反例，看系统敢不敢认怂……'
                : closurePending ? '不说「电脑」两个字，看系统能不能听懂……'
                : done('finale') ? '自由探索：说点什么，看引擎怎么处理（试试提起她的父亲）'
                : '也可以直接输入，走通用判定流程……'
            }
            className="nv-input flex-1 px-4 py-2 text-sm"
            disabled={busy}
          />
          <button onClick={submit} disabled={busy || !input.trim()}
            className="nv-btn px-5 py-2 text-sm">
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
