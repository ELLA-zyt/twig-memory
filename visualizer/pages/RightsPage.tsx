import { Eye, Flag, PenLine, ShieldCheck } from 'lucide-react'
import { useEngine } from '../state/EngineContext'
import { CornerSprigs, HaloIcon, PageHead, Seal, SectionTitle } from '../components/nouveau'

const AXES = [
  {
    Icon: Eye, name: '可见度', en: 'VISIBILITY',
    desc: '默认全透明——不可见就是监控，这条不退让。引擎看到的每一块记忆碎片、每一次改写，本人都能翻阅。',
  },
  {
    Icon: PenLine, name: '可编辑度', en: 'EDITABILITY',
    desc: '事实层不可改；诠释层由用户握最终解释权（硬边界）。论断可以被本人否决，而不是被系统说服。',
  },
  {
    Icon: Flag, name: 'contested', en: 'RIGHT TO CONTEST',
    desc: '删除后降级：不用同一批旧证据重申；再提须是邀请，不是断言。被否决的论断退出默认可见文档与检索上下文。',
  },
]

export default function RightsPage() {
  const { state } = useEngine()
  const contested = state.claims.filter((c) => c.status === 'contested')

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1200px] mx-auto">
      <PageHead
        kicker="User Rights · Three Independent Axes"
        title="用户权利 · 三根独立的轴"
        lead="权利设计不是合规附件，是架构本身——可见、可改、可否决，分别落在三层结构上"
      />

      {/* ---------- 三轴 ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {AXES.map(({ Icon, name, en, desc }) => (
          <div key={name} className="nv-card nv-card-double p-5 relative overflow-hidden">
            <CornerSprigs corners={['tr']} size={40} opacity={0.6} />
            <HaloIcon size={40} tone={name === 'contested' ? 'terra' : 'green'}><Icon size={16} /></HaloIcon>
            <div className="font-display text-lg font-semibold mt-3">{name}</div>
            <div className="text-[8px] tracking-[0.25em] text-fog font-display uppercase mt-0.5">{en}</div>
            <p className="text-[11px] text-fog leading-relaxed mt-3">{desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ---------- 权限墙 ---------- */}
        <div className="nv-dark nv-dark-double p-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-[hsl(38_52%_60%)]" />
            <span className="font-display text-base font-semibold text-[hsl(44_34%_88%)]">论断权限墙</span>
          </div>
          <p className="text-[11px] text-[hsl(44_22%_74%)] leading-relaxed mt-3">
            心理健康主题：只记事实「这周三次提到失眠」，不生成准诊断推断——写进架构，不写进免责条款。
          </p>
          <div className="mt-4 pt-4 border-t border-[hsl(38_52%_55%/0.2)] space-y-2.5 text-[11px] text-[hsl(44_22%_74%)]">
            <div className="flex gap-2"><span className="text-[hsl(38_52%_60%)]">◆</span>事实层：发生过的对话，只可追加更正标注，不可抹除</div>
            <div className="flex gap-2"><span className="text-[hsl(38_52%_60%)]">◆</span>诠释层：论断、画像、推断——本人一票否决</div>
            <div className="flex gap-2"><span className="text-[hsl(38_52%_60%)]">◆</span>检索层：被否决内容退出默认上下文，再提需更高证据门槛</div>
          </div>
        </div>

        {/* ---------- 已否决论断（live） ---------- */}
        <div className="nv-card nv-card-double p-5">
          <SectionTitle right={<Seal accent="cinnabar">user-vetoed</Seal>}>已否决论断 · 退出默认可见</SectionTitle>
          {contested.length === 0 ? (
            <div className="text-xs text-fog py-8 text-center">当前没有被本人否决的论断</div>
          ) : (
            <div className="space-y-3">
              {contested.map((c) => (
                <div key={c.id} className="rounded-xl border border-dashed border-[hsl(var(--cinnabar)/0.4)] bg-[hsl(var(--cinnabar)/0.05)] p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-display text-sm font-semibold text-foreground/85">{c.docTitle}</span>
                    <span className="flex-1" />
                    <Seal accent="cinnabar">已争议</Seal>
                  </div>
                  <div className="text-xs text-fog nv-strike mb-2">{c.text}</div>
                  <div className="text-[11px] text-foreground/75 leading-relaxed">{c.contestedNote}</div>
                </div>
              ))}
            </div>
          )}
          <div className="text-[10px] text-fog mt-4 pt-3 border-t border-[hsl(var(--gold)/0.25)] leading-relaxed">
            只有独立新证据积累到更高门槛，才能以邀请式措辞再提一次——closure_reason: user-vetoed
          </div>
        </div>
      </div>
    </div>
  )
}
