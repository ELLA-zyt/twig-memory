import { NavLink, Outlet } from 'react-router'
import {
  Calendar, FileText, GitBranch, RefreshCw, Scale, Search, Settings, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TwigMark, VineDivider } from '../components/nouveau'
import ThemeSwitcher from '../components/ThemeSwitcher'

const NAV = [
  { to: '/', end: true, label: '今日', en: 'TODAY', Icon: Sparkles },
  { to: '/book', label: '记忆书', en: 'BOOK', Icon: Calendar },
  { to: '/day', label: '日卡', en: 'DAY CARD', Icon: FileText },
  { to: '/threads', label: '线索层', en: 'THREADS', Icon: GitBranch },
  { to: '/claims', label: '理解文档', en: 'CLAIMS', Icon: Scale },
  { to: '/audit', label: '自检日志', en: 'AUDIT', Icon: RefreshCw },
  { to: '/settings', label: '设置', en: 'SETTINGS', Icon: Settings },
]

function GlobalSearch() {
  return (
    <div className="relative">
      <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog pointer-events-none" />
      <input
        disabled
        placeholder="搜索暂未启用"
        className="nv-input w-40 sm:w-64 lg:w-80 pl-9 pr-4 py-1.5 text-xs disabled:opacity-50"
      />
    </div>
  )
}

export default function AppLayout() {
  return (
    <div className="h-screen flex overflow-hidden">
      {/* ---------- 侧边栏：深松绿 + 描金；窄屏折叠为图标栏 ---------- */}
      <aside className="w-16 lg:w-60 shrink-0 flex flex-col relative bg-[hsl(var(--pine))] text-[hsl(44_28%_82%)] border-r border-[hsl(38_52%_55%/0.25)]">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(90% 40% at 50% -5%, hsl(152 32% 24% / 0.65), transparent 70%)' }} />
        {/* 品牌 */}
        <div className="relative px-2 lg:px-5 pt-6 pb-4">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <TwigMark size={44} />
            <div className="leading-tight hidden lg:block">
              <div className="font-display text-xl font-semibold text-[hsl(44_34%_88%)] tracking-wide">衔枝</div>
              <div className="text-[9px] tracking-[0.3em] text-[hsl(38_52%_58%)] font-display mt-0.5">TWIG · 叙事记忆引擎</div>
            </div>
          </div>
          <div className="mt-4 opacity-50 hidden lg:block"><VineDivider width={168} /></div>
        </div>

        {/* 导航 */}
        <div className="relative px-2 lg:px-3 mt-1">
          <div className="px-2 text-[9px] tracking-[0.35em] text-[hsl(44_16%_60%)] mb-2 hidden lg:block">记忆书 · MEMORY</div>
          <nav className="space-y-0.5">
            {NAV.map(({ to, end, label, en, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={({ isActive }) => cn(
                  'group relative flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 lg:px-3 py-2.5 text-[13px] transition-colors',
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
                    <span className="font-medium hidden lg:inline">{label}</span>
                    <span className={cn('ml-auto text-[8px] tracking-[0.18em] font-display hidden lg:inline', isActive ? 'text-[hsl(38_52%_58%)]' : 'text-[hsl(44_18%_62%/0.75)]')}>{en}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex-1" />

        {/* 主题切换 */}
        <div className="relative p-3.5">
          <ThemeSwitcher />
        </div>
      </aside>

      {/* ---------- 主区 ---------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 顶栏 */}
        <div className="h-14 shrink-0 flex items-center gap-4 px-4 lg:px-6 border-b border-[hsl(var(--gold)/0.3)] bg-[hsl(44_38%_93%/0.75)] backdrop-blur">
          <div className="flex-1 flex justify-center">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[hsl(var(--raven))] text-[hsl(44_36%_90%)] flex items-center justify-center text-sm font-display border border-[hsl(38_52%_55%/0.5)]">灰</span>
            <div className="leading-tight hidden md:block">
              <div className="text-xs font-medium">{import.meta.env.VITE_USER_NAME || '灰线主创'}</div>
              <div className="text-[9px] text-fog">{import.meta.env.VITE_USER_PLAN || 'Pro · 本地'}</div>
            </div>
          </div>
        </div>

        {/* 页面内容：单点控制最大行宽，宽屏留出负空间 */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
