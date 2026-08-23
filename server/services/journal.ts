/**
 * 日记服务 JournalService
 * 路径：server/data/journal/{userId}/{YYYY-MM-DD}.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.MUNINN_DATA_DIR || join(__dirname, '..', 'data')

function journalDir(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(DATA_DIR, 'journal', safe)
}

function ensure(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

function filePath(userId: string, date: string): string {
  return join(journalDir(userId), `${date}.md`)
}

export function getJournal(userId: string, date: string): string | null {
  const path = filePath(userId, date)
  if (!existsSync(path)) return null
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

export function listJournals(userId: string): { date: string; preview: string }[] {
  const dir = journalDir(userId)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const text = readFileSync(join(dir, f), 'utf8')
      return { date: f.replace(/\.md$/, ''), preview: text.slice(0, 80) }
    })
}

export function saveJournal(userId: string, date: string, content: string): void {
  const dir = journalDir(userId)
  ensure(dir)
  writeFileSync(filePath(userId, date), content, 'utf8')
}

export function generateJournal(engineText?: string): string {
  const now = new Date().toISOString()
  return `# 日记 · ${now.slice(0, 10)}\n\n（由反刍流程触发，TODO 接入 LLM 生成）\n\n${engineText ? `引擎摘要：\n${engineText}` : ''}`
}
