/**
 * 心迹服务 SoliloquyService
 * 路径：server/data/soliloquy/{userId}/{YYYY-MM-DD}.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.MUNINN_DATA_DIR || join(__dirname, '..', 'data')

function soliloquyDir(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(DATA_DIR, 'soliloquy', safe)
}

function ensure(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

function filePath(userId: string, date: string): string {
  return join(soliloquyDir(userId), `${date}.md`)
}

export function getSoliloquy(userId: string, date: string): string | null {
  const path = filePath(userId, date)
  if (!existsSync(path)) return null
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

export function listSoliloquy(userId: string): { date: string; preview: string }[] {
  const dir = soliloquyDir(userId)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse()
    .map((f) => {
      const text = readFileSync(join(dir, f), 'utf8')
      return { date: f.replace(/\.md$/, ''), preview: text.slice(0, 80) }
    })
}

export function saveSoliloquy(userId: string, date: string, content: string): void {
  const dir = soliloquyDir(userId)
  ensure(dir)
  writeFileSync(filePath(userId, date), content, 'utf8')
}

export function generateSoliloquy(engineText?: string): string {
  const now = new Date().toISOString()
  return `# 心迹 · ${now.slice(0, 10)}\n\n（由反刍流程触发，TODO 接入 LLM 生成）\n\n${engineText ? `引擎摘要：\n${engineText}` : ''}`
}
