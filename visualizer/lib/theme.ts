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
