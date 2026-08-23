/**
 * 新前端 API 客户端
 * 默认连接本地 server/http.ts 的 http://localhost:7300
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:7300'
const USER_ID = (import.meta.env.VITE_USER_ID as string) || 'default'

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json() as T
}

export interface Note {
  id: string
  userId: string
  date: string
  seq: number
  content: string
  status: 'unread' | 'read' | 'responded' | 'archived'
  stamp?: {
    type: string
    beadType: string
    beadName: string
    stampedAt: string
    userNote?: string
  }
  response?: { text: string; mood?: string; at: string }
  createdAt: string
  updatedAt: string
}

export interface Claim {
  id: string
  text: string
  conviction: number
  boundary: string
  versions: { at: string; text: string; conviction: number; reason: string }[]
}

export interface StampResult {
  record: { id: string; type: string; beadType: string; noteId: string; stampedAt: string }
  jar: { id: string; beadName: string; date: string }
  bead: { id: string; name: string; color: string; texture: string; whisper: string; source: string }
}

export function currentNote(userId = USER_ID): Promise<{ note: Note | null }> {
  return fetchJson(`${API_BASE}/v1/notes/current?userId=${encodeURIComponent(userId)}`)
}

export function listNotes(page = 1, limit = 20, userId = USER_ID): Promise<{ notes: Note[]; total: number }> {
  return fetchJson(`${API_BASE}/v1/notes?userId=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`)
}

export function createNote(content: string, userId = USER_ID): Promise<Note> {
  return fetchJson(`${API_BASE}/v1/notes`, {
    method: 'POST',
    body: JSON.stringify({ userId, content }),
  })
}

export function readNote(noteId: string, userId = USER_ID): Promise<{ note: Note | null }> {
  return fetchJson(`${API_BASE}/v1/notes/current?userId=${encodeURIComponent(userId)}`)
}

export function markRead(noteId: string, userId = USER_ID): Promise<{ note: Note | null }> {
  return fetchJson(`${API_BASE}/v1/notes/${noteId}/read`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export function respondNote(noteId: string, text: string, mood?: string, userId = USER_ID): Promise<{ note: Note | null }> {
  return fetchJson(`${API_BASE}/v1/notes/${noteId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ userId, text, mood }),
  })
}

export function stampNote(noteId: string, type: string, userId = USER_ID): Promise<StampResult> {
  return fetchJson(`${API_BASE}/v1/notes/${noteId}/stamp`, {
    method: 'POST',
    body: JSON.stringify({ userId, type }),
  })
}

export function listStamps(userId = USER_ID): Promise<{ records: unknown[]; jar: unknown[]; total: number }> {
  return fetchJson(`${API_BASE}/v1/stamps?userId=${encodeURIComponent(userId)}`)
}

export function recentStamps(limit = 7, userId = USER_ID): Promise<{ recent: unknown[] }> {
  return fetchJson(`${API_BASE}/v1/stamps/recent?userId=${encodeURIComponent(userId)}&limit=${limit}`)
}

export function getJournal(date?: string, userId = USER_ID): Promise<{ date: string; content: string }> {
  const qs = date ? `&date=${date}` : ''
  return fetchJson(`${API_BASE}/v1/journal?userId=${encodeURIComponent(userId)}${qs}`)
}

export function generateJournal(userId = USER_ID): Promise<{ date: string; content: string }> {
  return fetchJson(`${API_BASE}/v1/journal/generate`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export function getSoliloquy(date?: string, userId = USER_ID): Promise<{ date: string; content: string }> {
  const qs = date ? `&date=${date}` : ''
  return fetchJson(`${API_BASE}/v1/soliloquy?userId=${encodeURIComponent(userId)}${qs}`)
}

export function recentSoliloquy(limit = 7, userId = USER_ID): Promise<{ entries: { date: string; preview: string }[] }> {
  return fetchJson(`${API_BASE}/v1/soliloquy/recent?userId=${encodeURIComponent(userId)}&limit=${limit}`)
}

export function calendarMarks(month?: string, userId = USER_ID): Promise<{ month: string; marked: string[] }> {
  const qs = month ? `&month=${month}` : ''
  return fetchJson(`${API_BASE}/v1/calendar?userId=${encodeURIComponent(userId)}${qs}`)
}
