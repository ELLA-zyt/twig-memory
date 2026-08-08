import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import {
  Bell, BookOpen, GitBranch, LayoutDashboard, Play, Puzzle, RefreshCw, Scale, Search, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEngine } from '../state/EngineContext'
import { TwigMark, VineDivider } from '../components/nouveau'
import ThemeSwitcher from '../components/ThemeSwitcher'

const NAV = [
  { to: '/', end: true, label: '总览', en: 'OVERVIEW', Icon: LayoutDashboard },
  { to: '/threads', label: '线索层', en: 'THREADS', Icon: GitBranch },
  { to: '/understanding', label: '认识层', en: 'UNDERSTANDING', Icon: BookOpen },
  { to: '/fragments', label: '碎片层', en: 'FRAGMENTS', Icon: Puzzle },
  { to: '/evaluation', label: '评测体系', en: 'EVALUATION', Icon: Scale },
  { to: '/rights', label: '用户权利', en: 'USER RIGHTS', Icon: ShieldCheck },
  { to: '/demo', label: '现场演示', en: 'LIVE DEMO', Icon: Play },
]

function GlobalSearch() {
  const { state } = useEngine()
  const nav = useNavigate()
  const [q, setQ] = useState('')

  const go = () => {
    const query = q.trim()
    if (!query) return
    const frag = state.fragments.find((f) => f.title.includes(query) || f.body.includes(query) || f.id === query)
    if (frag) { nav(`/fragments?hl=${frag.id}`); setQ(''); return }
    const th = state.threads.find((t) => t.label.includes(query) || t.openQuestion.includes(query))
    if (th) { nav(`/threads?sel=${th.id}`); setQ(''); return }
    const cl = state.claims.find((c) => c.docTitle.includes(query) || c.text.includes(query))
    if (cl) { nav('/understanding'); setQ('') }
  }

  return (
    <div className="relative">
      <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog pointer-events-none" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && go()}
        placeholder="搜索碎片、线索、论断……"
        className="nv-input w-64 lg:w-80 pl-9 pr-4 py-1.5 text-xs"
      />
    </div>
  )
}

function EngineCard() {
  const { engine, state } = useEngine()
  return (
    <div className="rounded-xl border border-[hsl(38_52%_55%/0.35)] bg-[hsl(44_30%_88%/0.04)] p-3.5">
      <div className="flex items-center gap-2">
        <span className="font-display text-sm text-[hsl(44_32%_86%)]">灰线 Grayline</span>
        <span className="text-[9px] font-mono border border-[hsl(38_52%_55%/0.4)] text-[hsl(38_52%_60%)] rounded-full px-1.5 py-px">v1.2</span>
      </div>
      <div className="text-[10px] text-[hsl(44_16%_62%)] mt-1 leading-relaxed">开源 · 长程 agent 记忆基础设施</div>
      <div className="flex items-center gap-1.5 text-[10px] text-[hsl(44_20%_72%)] mt-2">
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-[hsl(150_40%_55%)] opacity-60 animate-ping" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[hsl(150_40%_55%)]" />
        </span>
        引擎运行中 · 本地优先
      </div>
      <div className="flex gap-1.5 mt-3">
        <button
          onClick={() => engine.setLiveMode(!state.liveMode)}
          title={state.liveMode ? '判定层：实时 LLM 推理（点击切到预计算兜底）' : '判定层：预计算脚本（点击切到实时 LLM）'}
          className={cn(
            'flex-1 h-7 text-[10px] rounded-full border transition-colors flex items-center justify-center gap-1.5',
            state.liveMode
              ? 'border-[hsl(38_52%_55%/0.55)] text-[hsl(38_52%_62%)] hover:bg-[hsl(38_52%_55%/0.1)]'
              : 'border-[hsl(44_16%_45%/0.5)] text-[hsl(44_16%_62%)] hover:text-[hsl(44_24%_80%)]',
          )}
        >
          <span className={cn('w-1 h-1 rounded-full', state.liveMode ? 'bg-[hsl(38_52%_60%)]' : 'bg-[hsl(44_16%_55%)]')} />
          {state.liveMode ? '实时推理' : '预计算'}
        </button>
        <button
          onClick={() => engine.reset()}
          title="重置引擎状态"
          className="h-7 w-7 rounded-full border border-[hsl(44_16%_45%/0.5)] text-[hsl(44_16%_62%)] hover:text-[hsl(12_48%_62%)] hover:border-[hsl(12_48%_55%/0.6)] transition-colors flex items-center justify-center"
        >
          <RefreshCw size={11} />
        </button>
      </div>
    </div>
  )
}

export default function AppLayout() {
  return (
    <div className="h-screen flex overflow-hidden">
      {/* ---------- 侧边栏：深松绿 + 描金 ---------- */}
      <aside className="w-60 shrink-0 flex flex-col relative bg-[hsl(var(--pine))] text-[hsl(44_28%_82%)] border-r border-[hsl(38_52%_55%/0.25)]">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(90% 40% at 50% -5%, hsl(152 32% 24% / 0.65), transparent 70%)' }} />
        {/* 品牌 */}
        <div className="relative px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <TwigMark size={44} />
            <div className="leading-tight">
              <div className="font-display text-xl font-semibold text-[hsl(44_34%_88%)] tracking-wide">衔枝</div>
              <div className="text-[9px] tracking-[0.3em] text-[hsl(38_52%_58%)] font-display mt-0.5">TWIG · 叙事记忆引擎</div>
            </div>
          </div>
          <div className="mt-4 opacity-50"><VineDivider width={168} /></div>
        </div>

        {/* 导航 */}
        <div className="relative px-3 mt-1">
          <div className="px-2 text-[9px] tracking-[0.35em] text-[hsl(44_16%_60%)] mb-2">工作区 · WORKSPACE</div>
          <nav className="space-y-0.5">
            {NAV.map(({ to, end, label, en, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors',
                  isActive
                    ? 'bg-[hsl(44_32%_88%/0.09)] text-[hsl(38_52%_62%)]'
                    : 'text-[hsl(44_22%_74%/0.85)] hover:bg-[hsl(44_32%_88%/0.05)] hover:text-[hsl(44_30%_88%)]',
                )}
              >
                {({ isActive }) => (
                  <>
                    <span className={cn(
                      'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full transition-all',
                      isActive ? 'bg-[hsl(38_52%_58%)]' : 'bg-transparent group-hover:bg-[hsl(44_24%_60%/0.4)]',
                    )} />
                    <Icon size={15} strokeWidth={1.8} className="shrink-0" />
                    <span className="font-medium">{label}</span>
                    <span className={cn('ml-auto text-[8px] tracking-[0.18em] font-display', isActive ? 'text-[hsl(38_52%_58%)]' : 'text-[hsl(44_18%_62%/0.75)]')}>{en}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex-1" />

        {/* 主题切换 & 引擎状态卡 */}
        <div className="relative p-3.5 space-y-3">
          <ThemeSwitcher />
          <EngineCard />
        </div>
      </aside>

      {/* ---------- 主区 ---------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 顶栏 */}
        <div className="h-14 shrink-0 flex items-center gap-4 px-6 border-b border-[hsl(var(--gold)/0.3)] bg-[hsl(44_38%_93%/0.75)] backdrop-blur">
          <div className="flex-1 flex justify-center">
            <GlobalSearch />
          </div>
          <button className="relative w-8 h-8 rounded-full border border-[hsl(var(--gold)/0.4)] text-fog hover:text-gold hover:border-[hsl(var(--gold)/0.7)] transition-colors flex items-center justify-center" title="通知">
            <Bell size={14} />
            <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-[hsl(var(--gold))]" />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[hsl(var(--raven))] text-[hsl(44_36%_90%)] flex items-center justify-center text-sm font-display border border-[hsl(38_52%_55%/0.5)]">灰</span>
            <div className="leading-tight hidden md:block">
              <div className="text-xs font-medium">灰线主创</div>
              <div className="text-[9px] text-fog">Pro · 本地</div>
            </div>
          </div>
        </div>

        {/* 页面内容 */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
