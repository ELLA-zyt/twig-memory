import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { MuninnEngine, type EngineState } from '../engine/engine'

const EngineContext = createContext<MuninnEngine | null>(null)

let singleton: MuninnEngine | null = null
function getEngine() {
  if (!singleton) singleton = new MuninnEngine()
  return singleton
}

export function EngineProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<MuninnEngine>(null)
  if (!engineRef.current) engineRef.current = getEngine()
  const engine = engineRef.current
  const [, setVersion] = useState(0)

  useEffect(() => engine.subscribe(() => setVersion((v) => v + 1)), [engine])

  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>
}

export function useEngine(): { engine: MuninnEngine; state: EngineState } {
  const engine = useContext(EngineContext)
  if (!engine) throw new Error('useEngine must be used within EngineProvider')
  return { engine, state: engine.getState() }
}

export function resetEngine() {
  singleton = new MuninnEngine()
  return singleton
}
