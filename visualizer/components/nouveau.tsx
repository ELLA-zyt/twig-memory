/**
 * 衔枝 Twig · 新艺术（Mucha）装饰组件库
 * 圆徽 / 藤蔓分隔 / 卷草饰角 / 光晕图标 / 页眉画框
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ---------------- 品牌圆徽：光晕刻线 + 松绿盘 + 月桂弧 ---------------- */
export function TwigMark({ size = 40, className }: { size?: number; className?: string }) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180
    return {
      x1: 32 + 26.5 * Math.cos(a), y1: 32 + 26.5 * Math.sin(a),
      x2: 32 + 29.5 * Math.cos(a), y2: 32 + 29.5 * Math.sin(a),
    }
  })
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn('shrink-0', className)} role="img" aria-label="衔枝 Twig">
      {/* 顶端金菱 */}
      <rect x="29.6" y="0.8" width="4.8" height="4.8" transform="rotate(45 32 3.2)" fill="hsl(var(--gold))" />
      {/* 光晕刻线 */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="hsl(var(--gold))" strokeWidth="1" opacity="0.85" />
      ))}
      <circle cx="32" cy="32" r="25" fill="none" stroke="hsl(var(--gold))" strokeWidth="1" />
      <circle cx="32" cy="32" r="22" fill="hsl(var(--pine))" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="hsl(var(--gold) / 0.5)" strokeWidth="0.5" />
      <text
        x="32" y="39.5" textAnchor="middle" fontSize="19" fill="hsl(44 36% 88%)"
        style={{ fontFamily: '"Noto Serif SC", "STKaiti", KaiTi, "Songti SC", serif' }}
      >
        衔
      </text>
      {/* 月桂弧 */}
      <path d="M20 46 Q32 54.5 44 46" fill="none" stroke="hsl(var(--gold))" strokeWidth="0.9" />
      <ellipse cx="23.6" cy="48.4" rx="2.6" ry="1.1" transform="rotate(-28 23.6 48.4)" fill="hsl(var(--gold))" opacity="0.9" />
      <ellipse cx="32" cy="50.6" rx="2.6" ry="1.1" fill="hsl(var(--gold))" opacity="0.9" />
      <ellipse cx="40.4" cy="48.4" rx="2.6" ry="1.1" transform="rotate(28 40.4 48.4)" fill="hsl(var(--gold))" opacity="0.9" />
    </svg>
  )
}

/* ---------------- 藤蔓分隔线：中心金菱 + 对称卷须 ---------------- */
export function VineDivider({ className, width = 220 }: { className?: string; width?: number }) {
  const half = (
    <>
      <path
        d="M6 10 C 30 5 52 5 74 8.5 C 88 10.8 97 9.5 99.5 5.5 C 101 2.5 97 0.5 94.5 2.5 C 92.8 4 94 6.8 96.6 6"
        fill="none" stroke="hsl(var(--gold))" strokeWidth="1" strokeLinecap="round"
      />
      <ellipse cx="38" cy="6.6" rx="4.2" ry="1.5" transform="rotate(-10 38 6.6)" fill="hsl(var(--gold))" opacity="0.75" />
      <ellipse cx="66" cy="7.8" rx="4.2" ry="1.5" transform="rotate(6 66 7.8)" fill="hsl(var(--gold))" opacity="0.75" />
      <circle cx="12" cy="9.4" r="1.3" fill="hsl(var(--gold))" opacity="0.8" />
    </>
  )
  return (
    <svg viewBox="0 0 220 20" width={width} height={width / 11} className={className} aria-hidden>
      <path d="M110 4.5 L115.5 10 L110 15.5 L104.5 10 Z" fill="hsl(var(--gold))" />
      <g transform="translate(220 0) scale(-1 1)">{half}</g>
      {half}
    </svg>
  )
}

/* ---------------- 卷草饰角：双线弧 + 小叶 ---------------- */
function Sprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M5 59 C5 27 27 5 59 5" fill="none" stroke="hsl(var(--gold))" strokeWidth="0.9" opacity="0.8" />
      <path d="M13 59 C13 33 33 13 59 13" fill="none" stroke="hsl(var(--gold))" strokeWidth="0.5" opacity="0.55" />
      <ellipse cx="19" cy="41" rx="6" ry="2.2" transform="rotate(-52 19 41)" fill="hsl(var(--gold))" opacity="0.28" />
      <ellipse cx="41" cy="19" rx="6" ry="2.2" transform="rotate(-38 41 19)" fill="hsl(var(--gold))" opacity="0.28" />
      <circle cx="59" cy="5" r="1.5" fill="hsl(var(--gold))" opacity="0.8" />
      <circle cx="5" cy="59" r="1.5" fill="hsl(var(--gold))" opacity="0.8" />
    </svg>
  )
}

const CORNER_POS: Record<string, string> = {
  tl: 'top-0 left-0',
  tr: 'top-0 right-0 -scale-x-100',
  bl: 'bottom-0 left-0 -scale-y-100',
  br: 'bottom-0 right-0 -scale-100',
}

/** 卡片四角卷草（默认左上+右上） */
export function CornerSprigs({ corners = ['tl', 'tr'], size = 44, opacity = 0.85 }: {
  corners?: ('tl' | 'tr' | 'bl' | 'br')[]
  size?: number
  opacity?: number
}) {
  return (
    <>
      {corners.map((c) => (
        <span
          key={c}
          className={cn('pointer-events-none absolute z-10', CORNER_POS[c])}
          style={{ width: size, height: size, opacity }}
        >
          <Sprig className="w-full h-full" />
        </span>
      ))}
    </>
  )
}

/* ---------------- 光晕图标：双环金圈 ---------------- */
export function HaloIcon({ children, size = 44, tone = 'green' }: { children: ReactNode; size?: number; tone?: 'green' | 'gold' | 'terra' }) {
  const ring = tone === 'gold' ? 'hsl(var(--gold))' : tone === 'terra' ? 'hsl(var(--cinnabar))' : 'hsl(var(--raven))'
  return (
    <span className="relative inline-flex items-center justify-center shrink-0 rounded-full" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full border" style={{ borderColor: ring, opacity: 0.55 }} />
      <span className="absolute rounded-full border" style={{ inset: 3, borderColor: ring, opacity: 0.3 }} />
      <span className="absolute rounded-full" style={{ inset: 5, background: ring, opacity: 0.1 }} />
      <span className="relative" style={{ color: ring }}>{children}</span>
    </span>
  )
}

/* ---------------- 页眉：拉丁冠词 + 大标题 + 藤蔓分隔 ---------------- */
export function PageHead({ kicker, title, lead, right }: {
  kicker: string
  title: string
  lead?: ReactNode
  right?: ReactNode
}) {
  return (
    <header className="mb-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <div className="text-[11px] tracking-[0.42em] text-gold uppercase font-display font-semibold">{kicker}</div>
          <h1 className="font-display text-[28px] leading-tight font-semibold text-foreground mt-1">{title}</h1>
        </div>
        {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
      </div>
      {lead && <p className="text-[13px] text-fog mt-2.5 leading-relaxed max-w-3xl">{lead}</p>}
      <VineDivider className="mt-3 opacity-80" width={200} />
    </header>
  )
}

/* ---------------- 节标题：小叶点 + 衬线题字 ---------------- */
export function SectionTitle({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 mb-3', className)}>
      <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden>
        <path d="M10 2.5 L14 10 L10 17.5 L6 10 Z" fill="hsl(var(--gold))" opacity="0.9" />
        <circle cx="10" cy="10" r="1.6" fill="hsl(var(--card))" />
      </svg>
      <h2 className="font-display text-lg font-semibold text-foreground/95">{children}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-[hsl(var(--gold)/0.4)] to-transparent" />
      {right}
    </div>
  )
}

/* ---------------- 状态印章（胶囊式描金小标） ---------------- */
const SEAL_TONE: Record<string, string> = {
  raven: 'border-[hsl(var(--raven)/0.5)] text-raven bg-[hsl(var(--raven)/0.08)]',
  cinnabar: 'border-[hsl(var(--cinnabar)/0.5)] text-cinnabar bg-[hsl(var(--cinnabar)/0.08)]',
  gold: 'border-[hsl(var(--gold)/0.55)] text-gold bg-[hsl(var(--gold)/0.1)]',
  fog: 'border-border text-fog bg-secondary/60',
  pine: 'border-[hsl(38_52%_55%/0.4)] text-[hsl(44_30%_80%)] bg-[hsl(44_30%_85%/0.08)]',
}

export function Seal({ children, accent = 'fog', className }: { children: ReactNode; accent?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] tracking-wider whitespace-nowrap', SEAL_TONE[accent] ?? SEAL_TONE.fog, className)}>
      {children}
    </span>
  )
}

/* ---------------- 衔枝淡水印：曲茎 + 互生小叶 + 菱尖 ---------------- */
export function TwigWatermark({ size = 110, className }: { size?: number; className?: string }) {
  const leaves: [number, number, number][] = [
    // [cx, cy, 旋转角]：沿茎交替左右
    [46, 78, -38], [58, 64, 132], [70, 52, -40], [82, 42, 128],
  ]
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden>
      <g fill="none" stroke="hsl(var(--gold))" strokeWidth="1.4" strokeLinecap="round">
        <path d="M26 98 C48 72 70 52 96 30" />
        <path d="M96 30 l7 -7 M96 30 l1 -10" strokeWidth="1" opacity="0.7" />
      </g>
      {leaves.map(([cx, cy, r], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="10" ry="3.1" transform={`rotate(${r} ${cx} ${cy})`} fill="hsl(var(--gold))" opacity="0.85" />
      ))}
      <rect x="94" y="16" width="5.5" height="5.5" transform="rotate(45 96.75 18.75)" fill="hsl(var(--gold))" />
      <circle cx="30" cy="94" r="2" fill="hsl(var(--cinnabar))" opacity="0.8" />
    </svg>
  )
}

/* ---------------- 留白仪轨：淡水印 + 叙事引言 + 可选动作 ---------------- */
export function InkEmpty({ quote, hint, children, size = 96, compact = false }: {
  quote: string
  hint?: string
  children?: ReactNode
  size?: number
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-4' : 'py-8')}>
      <TwigWatermark size={size} className="opacity-[0.15]" />
      <p className="mt-3 text-[13px] font-display italic text-fog">{quote}</p>
      {hint && <p className="mt-1 text-[11px] text-fog/70">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

/* ---------------- 活体脉搏：单次 QRS 波群 + 描画式流光（纯装饰，不标假数字） ---------------- */
export function PulseLine({ className, label }: { className?: string; label?: string }) {
  // 双心动周期：P 微隆 → PR 平走 → Q 下沉 → R 冲顶 → S 深槽 → ST 回归 → T 饱满复极（第二组 +300 平移）
  const d = 'M0 30 L140 30 C148 30 152 24 158 24 C164 24 168 30 174 30 L190 30 L195 35 L204 4 L213 48 L220 30 L235 30 C245 30 252 16 265 16 C278 16 285 30 295 30 L440 30 C448 30 452 24 458 24 C464 24 468 30 474 30 L490 30 L495 35 L504 4 L513 48 L520 30 L535 30 C545 30 552 16 565 16 C578 16 585 30 595 30 L600 30'
  return (
    <div className={cn('flex items-center gap-3', className)} aria-hidden>
      <svg viewBox="0 0 600 60" preserveAspectRatio="none" className="flex-1 h-12 min-w-0 overflow-visible">
        {/* 常显的淡基线：让波形在两次扫掠之间仍可辨认 */}
        <path d={d} fill="none" stroke="hsl(var(--gold))" strokeWidth="1" opacity="0.22" />
        <path
          d={d} fill="none" stroke="hsl(var(--gold))" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
          pathLength={1000} className="ecg-line"
        />
      </svg>
      {label && <span className="text-[9px] tracking-[0.3em] font-display text-gold/70 shrink-0 uppercase">{label}</span>}
    </div>
  )
}
