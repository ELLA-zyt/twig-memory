/**
 * 便签服务 NoteService
 * 路径：server/data/notes/{userId}/{YYYY-MM-DD}_{NNN}.json
 * 便签本身不进引擎；用户回应时产生影子碎片。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HeadlessMuninn } from '../core'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.MUNINN_DATA_DIR || join(__dirname, '..', 'data')

export interface Note {
  id: string
  userId: string
  date: string
  seq: number
  content: string
  status: 'unread' | 'read' | 'responded' | 'archived'
  stamp?: {
    type: StampType
    beadType: string
    beadName: string
    stampedAt: string
    userNote?: string
  }
  response?: {
    text: string
    mood?: string
    at: string
  }
  shadowFragmentId?: string
  createdAt: string
  updatedAt: string
}

function notesDir(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(DATA_DIR, 'notes', safe)
}

function ensure(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

function padSeq(n: number): string {
  return String(n).padStart(3, '0')
}

function listNoteFiles(userId: string): string[] {
  const dir = notesDir(userId)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
}

function loadNote(path: string): Note | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Note
  } catch {
    return null
  }
}

function saveNote(note: Note): void {
  const dir = notesDir(note.userId)
  ensure(dir)
  const path = join(dir, `${note.date}_${padSeq(note.seq)}.json`)
  writeFileSync(path, JSON.stringify(note, null, 2), 'utf8')
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function currentNote(userId: string): Note | null {
  const files = listNoteFiles(userId)
  for (let i = files.length - 1; i >= 0; i--) {
    const note = loadNote(join(notesDir(userId), files[i]))
    if (note && note.status !== 'archived') return note
  }
  return null
}

export function listNotes(userId: string, page = 1, limit = 20): { notes: Note[]; total: number } {
  const files = listNoteFiles(userId)
  const notes = files
    .map((f) => loadNote(join(notesDir(userId), f)))
    .filter((n): n is Note => n !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const total = notes.length
  const start = (page - 1) * limit
  return { notes: notes.slice(start, start + limit), total }
}

export function createNote(userId: string, content: string): Note {
  const date = todayStr()
  const files = listNoteFiles(userId)
  const todayFiles = files.filter((f) => f.startsWith(`${date}_`))
  const seq = todayFiles.length + 1
  // 新便签生成时，旧便签自动 archived
  const cur = currentNote(userId)
  if (cur && cur.status !== 'archived') {
    cur.status = 'archived'
    cur.updatedAt = new Date().toISOString()
    saveNote(cur)
  }
  const note: Note = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    date,
    seq,
    content,
    status: 'unread',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  saveNote(note)
  return note
}

export function readNote(userId: string, noteId: string): Note | null {
  const files = listNoteFiles(userId)
  for (const f of files) {
    const note = loadNote(join(notesDir(userId), f))
    if (note && note.id === noteId) return note
  }
  return null
}

export function saveNoteByPath(userId: string, note: Note): void {
  const dir = notesDir(userId)
  const path = join(dir, `${note.date}_${padSeq(note.seq)}.json`)
  writeFileSync(path, JSON.stringify(note, null, 2), 'utf8')
}

export function markRead(userId: string, noteId: string): Note | null {
  const note = readNote(userId, noteId)
  if (!note) return null
  note.status = 'read'
  note.updatedAt = new Date().toISOString()
  saveNoteByPath(userId, note)
  return note
}

export function respondNote(userId: string, noteId: string, text: string, mood?: string, engine?: HeadlessMuninn): Note | null {
  const note = readNote(userId, noteId)
  if (!note) return null
  note.response = { text, mood, at: new Date().toISOString() }
  note.status = 'responded'
  note.updatedAt = new Date().toISOString()
  saveNoteByPath(userId, note)

  // 创建影子碎片，让引擎看到用户回应
  if (engine) {
    const shadowId = `sf-${note.id}`
    engine.ingest(text, {
      title: `回应便签：${note.content.slice(0, 16)}`,
      shadow: true,
      source: 'note-response',
      noteId: note.id,
      contextAnchor: {
        type: 'note-response',
        shadowFragmentId: shadowId,
        notePreview: note.content.slice(0, 40),
      },
    }).catch(() => { /* engine 内部已持久化由 manager 负责 */ })
  }
  return note
}
