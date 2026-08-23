import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useEngine } from '../state/EngineContext'
import FragmentStream from '../components/FragmentStream'
import { PageHead, SectionTitle } from '../components/nouveau'

export default function FragmentsPage() {
  const { state } = useEngine()
  const [params] = useSearchParams()
  const hl = params.get('hl')

  useEffect(() => {
    if (hl) {
      const t = setTimeout(() => document.getElementById(`frag-${hl}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
      return () => clearTimeout(t)
    }
  }, [hl])

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1100px] mx-auto h-full flex flex-col">
      <PageHead
        kicker="Fragment Layer · Specific Episodes"
        title="碎片层 · 事件桶"
        lead="情绪调制衰减：R = e^(-t/S)，S 随唤醒度增大——高唤醒记忆衰减更慢（emotion-enhanced memory）"
        right={<>
          <span className="nv-chip"><span className="w-1.5 h-1.5 rounded-full bg-raven" />V 效价</span>
          <span className="nv-chip"><span className="w-1.5 h-1.5 rounded-full bg-gold" />A 唤醒</span>
          <span className="nv-chip"><span className="w-1.5 h-1.5 rounded-full bg-fog" />D 支配</span>
        </>}
      />
      <div className="nv-card nv-card-double p-4 flex-1 min-h-0 flex flex-col">
        <SectionTitle>事件流 · 90 天</SectionTitle>
        <div className="flex-1 min-h-0">
          <FragmentStream fragments={state.fragments} threads={state.threads} flashIds={state.flashIds} highlightId={hl} />
        </div>
      </div>
    </div>
  )
}
