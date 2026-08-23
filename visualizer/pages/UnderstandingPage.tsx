import { useNavigate } from 'react-router'
import { Anchor, Eye, PenLine, RotateCcw, ScanSearch, ShieldCheck } from 'lucide-react'
import { useEngine } from '../state/EngineContext'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CornerSprigs, HaloIcon, PageHead, Seal, SectionTitle } from '../components/nouveau'

const COUNTER_STEPS = [
  '取论断 → 生成反面假设：「她的回升只是新设备的新鲜感」',
  '拿反面假设检索碎片库（HyDE 反用），主动寻找能推翻它的反证碎片',
  '命中反证 → 强制 adjudication：改论断 / 加限定 / 写明为何不足以推翻，说明留痕',
  '即使辩赢，conviction 仍小幅衰减——反复被挑战的论断更快进入下轮重审',
]

const DRIFT_GUARDS = [
  { Icon: Anchor, name: '证据锚定', desc: '每条论断引用碎片 ID，改写留版本史' },
  { Icon: RotateCcw, name: '反证搜索', desc: '先生成反面假设再检索反证，命中必须显式回应' },
  { Icon: ScanSearch, name: 'conviction 分数', desc: '反证被解释掉仍小幅衰减，不固化成教条' },
  { Icon: Eye, name: '盲推导审计', desc: '系统排程触发 · 二分定位漂移源 · log(n) 次调用' },
]

export default function UnderstandingPage() {
  const { state } = useEngine()
  const nav = useNavigate()
  const { claims, fragments, flashIds } = state

  const active = claims.filter((c) => c.status === 'active')
  const repaired = [...claims].filter((c) => c.versions.length > 1).sort((a, b) => b.versions.length - a.versions.length)[0]
  const fragTitle = (id: string) => fragments.find((f) => f.id === id)?.title ?? id

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead
        kicker="Understanding Layer · Living Documents"
        title="认识层 · 长程理解层"
        lead="改写式，不是追加式——过去理解 A → 新证据重新解释 → 现在理解 B"
        right={<>
          <span className="nv-chip opacity-70">追加式：只变长 · 不会变</span>
          <span className="nv-chip nv-chip-gold">改写式：会漂移 · 可审计演化</span>
        </>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* ---------- 左：活叙事文档 + 反证搜索 ---------- */}
        <div className="xl:col-span-7 space-y-4">
          <div className="nv-card nv-card-double p-5 relative overflow-hidden">
            <CornerSprigs corners={['tl', 'tr']} size={42} opacity={0.7} />
            <div className="flex items-center gap-2.5 flex-wrap">
              <HaloIcon size={34} tone="gold"><PenLine size={14} /></HaloIcon>
              <span className="font-display text-base font-semibold">「她与创作」 · 活叙事文档</span>
              <span className="flex-1" />
              <span className="flex items-center gap-1 text-[10px] text-fog"><Eye size={11} /> 全透明</span>
              <Seal accent="gold">{repaired ? `${repaired.versions[repaired.versions.length - 1].at} 改写` : '初稿'}</Seal>
            </div>

            {repaired && (
              <div className="mt-4 rounded-xl border border-[hsl(var(--gold)/0.3)] bg-[hsl(44_40%_95%/0.6)] px-4 py-3.5 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                <div>
                  <div className="text-[9px] text-fog mb-1">过去理解 · {repaired.versions[repaired.versions.length - 2].at}</div>
                  <div className="text-xs text-fog nv-strike leading-relaxed">「{repaired.versions[repaired.versions.length - 2].text}」</div>
                </div>
                <div className="flex md:flex-col items-center gap-1 text-gold">
                  <span className="hidden md:block w-px h-3 bg-[hsl(var(--gold)/0.6)]" />
                  <span className="text-base">→</span>
                  <span className="hidden md:block w-px h-3 bg-[hsl(var(--gold)/0.6)]" />
                </div>
                <div>
                  <div className="text-[9px] text-raven mb-1">现在理解 · {repaired.versions[repaired.versions.length - 1].at}</div>
                  <div className="text-xs text-foreground/90 leading-relaxed">「{repaired.versions[repaired.versions.length - 1].text}」</div>
                </div>
              </div>
            )}

            <div className="mt-5">
              <div className="text-[9px] tracking-[0.28em] text-fog mb-2.5">论断 · CLAIMS（每条引用支撑碎片，改写留版本史）</div>
              <div className="space-y-4">
                {active.map((c) => (
                  <div key={c.id} className={flashIds[c.id] ? 'anim-flash rounded-lg' : ''}>
                    <div className="text-[13px] text-foreground/90 leading-relaxed">{c.text}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                        {c.evidenceIds.map((id) => {
                          const ev = fragments.find((f) => f.id === id)
                          return (
                            <Popover key={id}>
                              <PopoverTrigger asChild>
                                <button
                                  onClick={() => nav(`/fragments?hl=${id}`)}
                                  className="text-[9px] font-mono border border-[hsl(var(--raven)/0.4)] text-raven rounded-full px-2 py-px hover:bg-[hsl(var(--raven)/0.08)] transition-colors"
                                >
                                  {id.replace('f', 'EP-')}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="top" align="start" className="w-64 p-3 border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--card))] text-foreground shadow-md">
                                <div className="text-[10px] text-fog mb-1">碎片 · {fragTitle(id)}</div>
                                <div className="text-xs leading-relaxed line-clamp-3 font-display">
                                  {ev?.body ?? '暂无摘要'}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )
                        })}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 w-40">
                        <span className="text-[8px] tracking-[0.2em] text-fog">CONVICTION</span>
                        <div className="nv-meter nv-meter-gold flex-1"><div style={{ width: `${c.conviction * 100}%` }} /></div>
                        <span className="font-mono text-xs text-gold">{c.conviction.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[hsl(var(--gold)/0.25)] flex items-start gap-2 text-[10px] text-fog leading-relaxed">
              <PenLine size={11} className="text-raven shrink-0 mt-0.5" />
              语言去定性化：写带情境与时间窗的观察，不写「她是拖延的人」式人格定性
            </div>
          </div>

          <div className="nv-card nv-card-double p-5">
            <SectionTitle right={<Seal accent="cinnabar">确认偏误对策 · HyDE 反用</Seal>}>反证搜索 · Counter-Evidence</SectionTitle>
            <div className="space-y-3.5">
              {COUNTER_STEPS.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full border border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.08)] text-gold flex items-center justify-center text-[11px] font-display font-semibold shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-xs text-foreground/85 leading-relaxed pt-0.5">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- 右：防漂移 + 权限墙 + 漂移审计 ---------- */}
        <div className="xl:col-span-5 space-y-4">
          <div className="nv-card nv-card-double p-5">
            <SectionTitle>防漂移机制组</SectionTitle>
            <div className="space-y-3.5">
              {DRIFT_GUARDS.map(({ Icon, name, desc }) => (
                <div key={name} className="flex gap-3 items-start">
                  <HaloIcon size={32} tone="green"><Icon size={13} /></HaloIcon>
                  <div>
                    <div className="text-[13px] font-medium text-foreground/95">{name}</div>
                    <div className="text-[10px] text-fog mt-0.5 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="nv-dark nv-dark-double p-5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-[hsl(38_52%_60%)]" />
              <span className="font-display text-base font-semibold text-[hsl(44_34%_88%)]">论断权限墙</span>
            </div>
            <p className="text-[11px] text-[hsl(44_22%_74%)] leading-relaxed mt-2.5">
              心理健康主题：只记事实「这周三次提到失眠」，不生成准诊断推断——写进架构，不写进免责条款
            </p>
          </div>

          <div className="nv-card nv-card-double p-5">
            <div className="flex items-center gap-2">
              <SectionTitle className="mb-0 flex-1">本周漂移审计 · 盲推导</SectionTitle>
              <Seal accent="raven">无漂移信号 ✓</Seal>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] text-fog mb-1"><span>基线</span><span className="font-mono">6.0%</span></div>
                <div className="nv-meter"><div style={{ width: '60%' }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-fog mb-1"><span>当前</span><span className="font-mono text-raven">4.2%</span></div>
                <div className="nv-meter"><div style={{ width: '42%' }} /></div>
              </div>
            </div>
            <div className="text-[10px] text-fog mt-3 pt-3 border-t border-[hsl(var(--gold)/0.25)] leading-relaxed">
              系统排程触发，不等用户发起——责任不交给当事人
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
