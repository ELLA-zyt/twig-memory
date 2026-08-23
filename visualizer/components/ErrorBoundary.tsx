import { Component, type ReactNode } from 'react'

/** 渲染错误兜底：任何运行时异常显示可读面板而非黑屏 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#e9e2cf', color: '#2e4038', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif', padding: 24 }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ color: '#a2782e', letterSpacing: 4, marginBottom: 12 }}>衔枝 TWIG · 运行时异常</div>
            <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</div>
            <button onClick={() => location.reload()} style={{ marginTop: 20, padding: '8px 20px', border: '1px solid #3d6b52', borderRadius: 999, color: '#3d6b52', background: 'transparent', cursor: 'pointer' }}>重新加载</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
