import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { VineDivider } from './nouveau'

/**
 * 草蛇灰线 · 现场显影
 * 主脉：创作瓶颈线索（45 天前登记 → 今日回收）
 * 副脉：设备升级龙脉（90 天前 → 今日），两线在今天交叠 —— 鸾胶续弦
 *
 * shadcn Dialog：ESC 可关闭 + 焦点陷阱 + aria-modal；覆盖层改羊皮纸色调以匹配主题。
 */
export default function ClosureOverlay({ onClose }: { onClose: () => void }) {
  const [drawn, setDrawn] = useState(false)
  const [stamped, setStamped] = useState(false)

  useEffect(() => {
    const t0 = setTimeout(() => setDrawn(true), 150)
    const t1 = setTimeout(() => setStamped(true), 2100)
    const t2 = setTimeout(onClose, 5200)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [onClose])

  const nodes = [
    { x: 120, y: 215, date: '6月23日', label: '登记：卡住她的是设备还是能力？' },
    { x: 360, y: 190, date: '7月8日', label: '「换台机器肯定顺」' },
    { x: 780, y: 120, date: '今天', label: '卡点解除' },
  ]
  const veinNodes = [
    { x: 80, y: 260, date: '5月9日' },
    { x: 300, y: 250, date: '7月24日' },
    { x: 560, y: 205, date: '8月1日' },
    { x: 780, y: 120, date: '今天' },
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-[hsl(42_33%_89%/0.96)]" />
        <DialogContent
          showCloseButton={false}
          className="fixed inset-0 z-50 max-w-none max-h-none w-full h-full translate-x-0 translate-y-0 top-0 left-0 rounded-none border-none bg-transparent shadow-none flex items-center justify-center p-6 gap-0 sm:max-w-none"
          onClick={onClose}
        >
          <DialogTitle className="sr-only">草蛇灰线 · 现场显影</DialogTitle>
          <div className="w-full max-w-4xl">
            <div className="text-center mb-6">
              <div className="text-[10px] tracking-[0.35em] text-raven font-display font-semibold mb-1">7:00 · 伏笔回收</div>
              <div className="font-display text-2xl font-semibold">草蛇灰线 · 现场显影</div>
              <div className="text-xs text-fog mt-1.5">45 天前登记的不是那句话，是它悬置的问题</div>
              <VineDivider className="mx-auto mt-3 opacity-80" width={190} />
            </div>

            <svg viewBox="0 0 900 320" className="w-full">
              {/* 时间轴 */}
              <line x1="40" y1="290" x2="860" y2="290" stroke="hsl(var(--border))" strokeWidth="1" />
              <text x="45" y="308" fill="hsl(var(--fog))" fontSize="10">5月</text>
              <text x="830" y="308" fill="hsl(var(--fog))" fontSize="10">8月7日</text>

              {/* 副脉：设备龙脉（淡） */}
              <path
                d="M 80 260 C 180 265 240 255 300 250 C 400 242 500 225 560 205 C 640 180 720 145 780 120"
                fill="none" stroke="hsl(var(--raven))" strokeWidth="1.5" opacity="0.4"
                pathLength={1} className={cn('draw-path', drawn && 'drawn')}
              />
              {veinNodes.map((n, i) => (
                <g key={i} opacity={drawn ? 0.6 : 0} style={{ transition: `opacity 0.5s ${0.4 + i * 0.4}s` }}>
                  <circle cx={n.x} cy={n.y} r="3" fill="hsl(var(--raven))" opacity="0.7" />
                  <text x={n.x} y={n.y + 18} fill="hsl(var(--fog))" fontSize="9" textAnchor="middle">{n.date}</text>
                </g>
              ))}
              <text x="150" y="245" fill="hsl(var(--raven))" fontSize="10" opacity={drawn ? 0.55 : 0} style={{ transition: 'opacity 0.8s 1.2s' }}>龙脉 · 设备升级（90 天）</text>

              {/* 主脉：创作瓶颈（亮） */}
              <path
                d="M 120 215 C 220 212 300 200 360 190 C 480 172 660 140 780 120"
                fill="none" stroke="hsl(var(--raven))" strokeWidth="2.5"
                pathLength={1} className={cn('draw-path', drawn && 'drawn')}
              />
              {nodes.map((n, i) => (
                <g key={i} opacity={drawn ? 1 : 0} style={{ transition: `opacity 0.5s ${0.3 + i * 0.55}s` }}>
                  <circle cx={n.x} cy={n.y} r={i === 2 ? 6 : 4} fill={i === 2 ? 'hsl(var(--gold))' : 'hsl(var(--raven))'} />
                  <circle cx={n.x} cy={n.y} r={i === 2 ? 9 : 7} fill="none" stroke={i === 2 ? 'hsl(var(--gold))' : 'hsl(var(--raven))'} strokeWidth="0.75" opacity="0.5" />
                  <text x={n.x} y={n.y - 14} fill="hsl(var(--foreground))" fontSize="11" textAnchor="middle" opacity="0.9">{n.date}</text>
                  <text x={n.x} y={n.y + (i === 2 ? 26 : 22)} fill="hsl(var(--fog))" fontSize="9.5" textAnchor="middle">{n.label}</text>
                </g>
              ))}
            </svg>

            {stamped && (
              <div className="flex flex-col items-center mt-2">
                {/* 火漆圆章 */}
                <div className="anim-stamp relative w-28 h-28">
                  <div className="absolute inset-0 rounded-full border-2 border-[hsl(var(--cinnabar))]" />
                  <div className="absolute inset-[5px] rounded-full border border-[hsl(var(--cinnabar)/0.6)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-[22px] font-semibold text-cinnabar tracking-[0.2em] leading-none text-center">
                      叙事<br />闭环
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-fog mt-4 tracking-[0.4em] font-display">鸾胶续弦 · 伏脉千里</div>
              </div>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
