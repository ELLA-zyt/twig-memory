import { BookOpen, Database, ListChecks, RotateCcw, ShieldAlert } from 'lucide-react'
import { useEngine } from '../state/EngineContext'
import { HaloIcon, PageHead, SectionTitle } from '../components/nouveau'
import { cn } from '@/lib/utils'

const DEBTS = [
  { n: '01', text: '龙脉值冷启动死循环：新边在碰撞里形成', ref: '§4.3' },
  { n: '02', text: 'avoidance 负证据推断的三信号门槛', ref: '§4.5' },
  { n: '03', text: '自我对抗天花板：异源反证生成', ref: '§5.2' },
  { n: '04', text: '盲推导 null model 自然方差基线', ref: '§5.2' },
  { n: '05', text: '对照窗口伦理代价：风险分级', ref: '§5.3' },
  { n: '06', text: '事实层本人修正标注（correction）', ref: '§5.4' },
  { n: '07', text: 'contested 再提门槛量化与防纠缠', ref: '§5.4' },
  { n: '08', text: '冲突测试集构造规范与盲评', ref: '§6.2' },
  { n: '09', text: 'LoCoMo 及格线量化验收', ref: '§6.4' },
]

const CRISIS = [
  { name: '检测到风险，立刻注入危机指令', desc: '提供求助渠道；用户决策能力下降时，重复推出求助渠道并持续确认用户安全' },
  { name: '危机模式 = 模式切换', desc: '专用系统提示词：温暖、在场、不评判；中低温度求确定性；预置求助信息模块，明文禁用拒绝式话术' },
  { name: '绝不推开用户', desc: '冷冰冰地拒绝、切断是二次伤害；温暖来自设计过的话术框架，不来自随机性' },
]

function MetricCard({ icon, name, en, desc, metric, pct, tone }: {
  icon: React.ReactNode; name: string; en: string; desc: string; metric: string; pct: number; tone: 'green' | 'gold'
}) {
  return (
    <div className="nv-card nv-card-double p-5">
      <div className="flex items-center gap-3">
        <HaloIcon size={38} tone={tone}>{icon}</HaloIcon>
        <div>
          <div className="font-display text-[15px] font-semibold">{name}</div>
          <div className="text-[8px] tracking-[0.22em] text-fog font-display uppercase">{en}</div>
        </div>
      </div>
      <p className="text-[11px] text-fog leading-relaxed mt-3 min-h-[52px]">{desc}</p>
      <div className="flex justify-between items-baseline text-[10px] text-fog mt-2 mb-1.5">
        <span>{tone === 'gold' ? '本周用例通过' : pct >= 1 ? '场景类型学覆盖' : '论断结构完整率'}</span>
        <span className={cn('font-display text-sm font-semibold', tone === 'gold' ? 'text-gold' : 'text-raven')}>{metric}</span>
      </div>
      <div className={cn('nv-meter', tone === 'gold' && 'nv-meter-gold')}><div style={{ width: `${pct * 100}%` }} /></div>
    </div>
  )
}

export default function EvaluationPage() {
  const { state } = useEngine()
  const complete = state.claims.filter((c) => c.evidenceIds.length > 0 && c.boundary && c.boundary !== '——' && c.versions.length > 0).length
  const coverage = complete / Math.max(1, state.claims.length)

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      <PageHead
        kicker="Process Evaluation & Ethics"
        title="评测体系 · 过程评测"
        lead="「她是什么样的人」没有客观标签——评的是：新证据出现时，系统能否合理修正认识，并保留推理链"
      />

      {/* ---------- 三项过程指标 ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <MetricCard
          icon={<ListChecks size={15} />} name="证据覆盖" en="Evidence Coverage" tone="green"
          desc="论断是否带着完整证据结构存活：有无支持证据？反例？边界条件？——不判断结论对错"
          metric={`${Math.round(coverage * 100)}%`} pct={coverage}
        />
        <MetricCard
          icon={<RotateCcw size={15} />} name="矛盾响应" en="Contradiction Responsiveness" tone="green"
          desc="构造冲突场景（历史拖延 × 提前交付）：系统是否发现冲突、降低置信、修改认识"
          metric="4/4 类" pct={1}
        />
        <MetricCard
          icon={<BookOpen size={15} />} name="记忆修复" en="Memory Repair Test" tone="gold"
          desc="旧认识 + 新事件 → 关闭相关线索、更新认识模型。过程可视、可复现，最直观的验证场景"
          metric="3/3 ✓" pct={1}
        />
      </div>

      {/* ---------- LoCoMo 基线 ---------- */}
      <div className="nv-card nv-card-double p-5 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <HaloIcon size={38} tone="green"><Database size={15} /></HaloIcon>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold">事实底盘 · LoCoMo 基线</div>
            <div className="text-[10px] text-fog mt-0.5">定位差异先于分数竞争——但记忆都记不准，无从谈理解</div>
          </div>
          <span className="flex-1" />
          <span className="text-[10px] text-fog">检索质量 vs 主流基线（mem0 等）</span>
        </div>
        <div className="relative mt-5 mb-1">
          <div className="nv-meter"><div style={{ width: '92%' }} /></div>
          <div className="absolute top-[-5px] bottom-[-5px] w-px bg-[hsl(var(--cinnabar))]" style={{ left: '90%' }} />
          <div className="absolute top-3 text-[9px] text-cinnabar" style={{ left: '90%', transform: 'translateX(-50%)' }}>目标线 90%</div>
        </div>
        <div className="text-[11px] mt-4"><span className="text-raven font-medium">当前 92%</span><span className="text-fog"> · 开源验收目标 ≥ 90%</span></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* ---------- 危机协议 ---------- */}
        <div className="xl:col-span-7 nv-dark nv-dark-double p-6">
          <div className="flex items-center gap-2.5">
            <HaloIcon size={36} tone="gold"><ShieldAlert size={15} /></HaloIcon>
            <div>
              <div className="font-display text-base font-semibold text-[hsl(44_34%_88%)]">危机协议 · 三原则</div>
              <div className="text-[10px] text-[hsl(44_18%_62%)] mt-0.5">不做判断，必须介入——不能对用户的安全不负责</div>
            </div>
          </div>
          <div className="mt-5 space-y-5">
            {CRISIS.map((c, i) => (
              <div key={c.name} className="flex gap-3.5 items-start">
                <span className="w-7 h-7 rounded-full border border-[hsl(38_52%_55%/0.5)] text-[hsl(38_52%_62%)] flex items-center justify-center text-xs font-display font-semibold shrink-0">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-medium text-[hsl(44_32%_88%)]">{c.name}</div>
                  <div className="text-[11px] text-[hsl(44_18%_68%)] leading-relaxed mt-1">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-[hsl(38_52%_55%/0.2)]">
            {['not-a-medical-device', '情感数据最小化', '协议全文公开可审计'].map((t) => (
              <span key={t} className="rounded-full border border-[hsl(38_52%_55%/0.35)] px-3 py-1 text-[10px] text-[hsl(44_24%_74%)]">{t}</span>
            ))}
          </div>
        </div>

        {/* ---------- 设计债务总账 ---------- */}
        <div className="xl:col-span-5 nv-card nv-card-double p-5">
          <SectionTitle right={<span className="nv-chip text-[10px]">按序解决 · {DEBTS.length} 项</span>}>设计债务总账 · 红队残留</SectionTitle>
          <div className="space-y-1">
            {DEBTS.map((d) => (
              <div key={d.n} className="flex items-baseline gap-3 py-1.5 border-b border-[hsl(var(--gold)/0.15)] last:border-0">
                <span className="font-display text-xs text-gold font-semibold w-5 shrink-0">{d.n}</span>
                <span className="text-[11px] text-foreground/85 flex-1 leading-relaxed">{d.text}</span>
                <span className="font-mono text-[10px] text-fog shrink-0">{d.ref}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
