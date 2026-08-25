/**
 * 日记服务 JournalService
 * 路径：server/data/journal/{userId}/{YYYY-MM-DD}.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
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

/** 文档对齐版：返回 { content, hasContent, generatedAt } */
export function getJournalMeta(userId: string, date: string): { content: string | null; hasContent: boolean; generatedAt: string | null } {
  const path = filePath(userId, date)
  if (!existsSync(path)) return { content: null, hasContent: false, generatedAt: null }
  try {
    const content = readFileSync(path, 'utf8')
    const generatedAt = statSync(path).mtime.toISOString()
    return { content, hasContent: content.trim().length > 0, generatedAt }
  } catch {
    return { content: null, hasContent: false, generatedAt: null }
  }
}

/** 文档对齐版：range 查询返回 [{ date, hasContent }] */
export function listJournalDays(userId: string, from: string, to: string): { date: string; hasContent: boolean }[] {
  const dir = journalDir(userId)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({ date: f.replace(/\.md$/, ''), hasContent: readFileSync(join(dir, f), 'utf8').trim().length > 0 }))
    .filter((d) => d.date >= from && d.date <= to)
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

export function exportJournals(userId: string): { date: string; content: string }[] {
  const dir = journalDir(userId)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({ date: f.replace(/\.md$/, ''), content: readFileSync(join(dir, f), 'utf8') }))
}
