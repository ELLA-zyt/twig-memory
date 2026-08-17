/**
 * 多用户引擎管理：按需加载、惰性实例化、变更后落盘。
 */
import { HeadlessMuninn, type MuninnState } from './core'
import { JsonStore } from './store'

export class EngineManager {
  private engines = new Map<string, HeadlessMuninn>()
  private store = new JsonStore<MuninnState>()

  get(userId: string): HeadlessMuninn {
    let e = this.engines.get(userId)
    if (!e) {
      e = new HeadlessMuninn(this.store.load(userId))
      this.engines.set(userId, e)
    }
    return e
  }

  /** 有变更才写盘（tmp + rename 原子写） */
  persist(userId: string): void {
    const e = this.engines.get(userId)
    if (e?.isDirty()) {
      this.store.save(userId, e.getState())
      e.markClean()
    }
  }

  /** 当前已加载进内存的用户（自动反刍用；不做全目录扫描） */
  loadedUserIds(): string[] {
    return [...this.engines.keys()]
  }
}
