/**
 * JSON 文件持久化层（零依赖 MVP）
 * 每个 userId 一个文件：server/data/<userId>.json
 * 写盘采用 tmp + rename，避免半写状态。
 * 后续可替换为 SQLite / Postgres——只要实现同样的 load/save 接口。
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_DIR = process.env.MUNINN_DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), 'data')

export class JsonStore<T> {
  private dir: string

  constructor(dir: string = DEFAULT_DIR) {
    this.dir = dir
    mkdirSync(dir, { recursive: true })
  }

  private file(userId: string): string {
    const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
    return join(this.dir, `${safe}.json`)
  }

  load(userId: string): T | null {
    const f = this.file(userId)
    if (!existsSync(f)) return null
    try {
      return JSON.parse(readFileSync(f, 'utf8')) as T
    } catch {
      return null
    }
  }

  save(userId: string, state: T): void {
    const f = this.file(userId)
    const tmp = `${f}.tmp`
    writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8')
    renameSync(tmp, f)
  }
}
