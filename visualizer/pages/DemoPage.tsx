import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import ChatPane from '../components/ChatPane'
import ClosureOverlay from '../components/ClosureOverlay'
import DemoTimeline from '../components/DemoTimeline'
import ImportOverlay from '../components/ImportOverlay'
import MemoryPanel, { type MemTab } from '../components/MemoryPanel'
import { DEMO_STEPS } from '../engine/demoScript'
import type { DemoKey } from '../engine/types'
import { useEngine } from '../state/EngineContext'

export default function DemoPage() {
  const { engine, state } = useEngine()
  const [activeStep, setActiveStep] = useState<DemoKey>('contrast')
  const [showImport, setShowImport] = useState(false)
  const [memTab, setMemTab] = useState<MemTab>('threads')
  const [hlFrag, setHlFrag] = useState<string | null>(null)
  const [showClosure, setShowClosure] = useState(false)
  const lastClosure = useRef(0)
  const lastCompleted = useRef<DemoKey[]>([])

  // 步骤完成 → 自动推进到下一未完成的节点；伏笔回收 → 显影浮层
  // （在引擎订阅回调中更新，避免渲染级联）
  useEffect(() => engine.subscribe(() => {
    const s = engine.getState()
    setActiveStep((cur) => {
      if (!s.completedSteps.includes(cur)) return cur
      return DEMO_STEPS.find((d) => !s.completedSteps.includes(d.key))?.key ?? cur
    })
    if (s.closureFlash > lastClosure.current) {
      lastClosure.current = s.closureFlash
      setShowClosure(true)
    }
    // shadcn Sonner：关键记忆事件 → 全局通知（仅在步骤首次完成时触发）
    const newlyDone = s.completedSteps.filter((k) => !lastCompleted.current.includes(k))
    lastCompleted.current = s.completedSteps
    for (const k of newlyDone) {
      if (k === 'contrast') toast.success('记忆修复完成', { description: '旧限制解除 → 相关线索关闭 → 限制模型更新' })
      if (k === 'import') toast.success('历史压缩完成', { description: '1423 条消息 → 37 事件 / 12 线索 / 5 核心认识' })
      if (k === 'counter') toast.warning('认识冲突已修正', { description: '发现冲突 → 降低置信 → 修改认识 · 推理链全程留痕' })
      if (k === 'closure') toast.success('草蛇灰线显影', { description: '45 天前悬置的问题，今日得到回答 · 叙事闭环' })
      if (k === 'finale') toast.info('演示完成', { description: '可自由探索——包括那些她平时不太提的事' })
    }
  }), [engine])

  const handleSelectStep = (k: DemoKey) => {
    setActiveStep(k)
    if (k === 'import' && !state.completedSteps.includes('import')) setShowImport(true)
  }

  const locateFragment = (id: string) => {
    setHlFrag(id)
    setMemTab('fragments')
    setTimeout(() => document.getElementById(`frag-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }

  return (
    <div className="h-full flex flex-col">
      <DemoTimeline active={activeStep} completed={state.completedSteps} onSelect={handleSelectStep} />
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 min-h-0 border-b lg:border-b-0 border-[hsl(var(--gold)/0.25)]">
          <ChatPane
            chat={state.chat}
            busy={state.busy}
            activeStep={activeStep}
            completedSteps={state.completedSteps}
            onContrast={() => engine.runContrast()}
            onCounter={(t) => engine.runCounter(t)}
            onClosure={(t) => engine.runClosure(t)}
            onFinale={() => engine.runFinale()}
            onEvidence={() => { engine.runEvidence(); setMemTab('claims') }}
            onShowImport={() => setShowImport(true)}
            onFree={(t) => engine.ingestFree(t)}
          />
        </div>
        <div className="lg:col-span-5 min-h-0">
          <MemoryPanel
            tab={memTab}
            onTab={setMemTab}
            threads={state.threads}
            claims={state.claims}
            fragments={state.fragments}
            logs={state.logs}
            flashIds={state.flashIds}
            highlightFragmentId={hlFrag}
            onLocateFragment={locateFragment}
          />
        </div>
      </div>

      {showImport && (
        <ImportOverlay
          lines={engine.getImportLogLines()}
          onDone={() => { engine.finishImport(); setShowImport(false) }}
        />
      )}
      {showClosure && <ClosureOverlay onClose={() => setShowClosure(false)} />}
    </div>
  )
}
