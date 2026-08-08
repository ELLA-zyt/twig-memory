import { useState } from 'react'
import { cn } from '@/lib/utils'

export const THEMES: { key: string; name: string; color: string }[] = [
  { key: '', name: '穆夏·羊皮纸', color: '#3d6b52' },
  { key: 'liuzihong', name: '榴子红', color: '#F1908C' },
  { key: 'jianshilan', name: '涧石蓝', color: '#66A9C9' },
  { key: 'usuaao', name: '薄青', color: '#91B493' },
  { key: 'byakugun', name: '白群', color: '#78C2C4' },
  { key: 'ouchi', name: '楝', color: '#9B90C2' },
]

export function applyTheme(key: string) {
  const html = document.documentElement
  if (!key) {
    html.removeAttribute('data-theme')
  } else {
    html.setAttribute('data-theme', key)
  }
  try {
    localStorage.setItem('twig-theme', key)
  } catch { /* ignore */ }
}

export function initTheme() {
  try {
    const saved = localStorage.getItem('twig-theme')
    if (saved !== null) applyTheme(saved)
  } catch { /* ignore */ }
}

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState(document?.documentElement?.getAttribute('data-theme') ?? '')

  const select = (key: string) => {
    applyTheme(key)
    setCurrent(key)
  }

  return (
    <div className="rounded-xl border border-[hsl(var(--gold)/0.35)] p-3.5">
      <div className="text-[9px] tracking-[0.35em] text-[hsl(var(--sidebar-foreground)/0.7)] mb-2.5 font-display uppercase">主题 · Theme</div>
      <div className="flex items-center gap-2">
        {THEMES.map(({ key, name, color }) => {
          const active = current === key
          return (
            <button
              key={key || 'default'}
              onClick={() => select(key)}
              title={name}
              aria-label={name}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-all',
                active ? 'border-[hsl(var(--sidebar-foreground))] scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105',
              )}
              style={{ backgroundColor: color }}
            />
          )
        })}
      </div>
      <div className="mt-2 text-[10px] text-[hsl(var(--sidebar-foreground)/0.75)]">
        {THEMES.find((t) => t.key === current)?.name ?? THEMES[0].name}
      </div>
    </div>
  )
}
