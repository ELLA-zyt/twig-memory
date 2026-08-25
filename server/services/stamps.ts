/**
 * 印章与玻璃珠服务 StampsService
 * 路径：server/data/stamps/{userId}/beads.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HeadlessMuninn } from '../core'
import { STAMP_REGISTRY, BEAD_REGISTRY, type BeadType, type StampType } from '../../shared/stamps'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.MUNINN_DATA_DIR || join(__dirname, '..', 'data')

export interface StampRecord {
  id: string
  type: StampType
  beadType: BeadType
  beadName: string
  noteId: string
  stampedAt: string
  userNote?: string
}

export interface JarEntry {
  id: string
  stampType: StampType
  beadType: BeadType
  noteId: string
  date: string
  beadName: string
  stampedAt: string
  memoPreview?: string
}

export interface UserStampState {
  records: StampRecord[]
  jar: JarEntry[]
  lastStampedAt?: string
}

function stampsDir(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(DATA_DIR, 'stamps', safe)
}

function filePath(userId: string): string {
  return join(stampsDir(userId), 'beads.json')
}

export function loadStamps(userId: string): UserStampState {
  const path = filePath(userId)
  if (!existsSync(path)) return { records: [], jar: [] }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as UserStampState
  } catch {
    return { records: [], jar: [] }
  }
}

function saveStamps(userId: string, state: UserStampState): void {
  const dir = stampsDir(userId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(filePath(userId), JSON.stringify(state, null, 2), 'utf8')
}

const TZ = process.env.MUNINN_TZ || 'Asia/Shanghai'
function todayStr(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

const keywordMap: Record<string, BeadType[]> = {
  '累': ['amber_honey', 'frosted_salt'],
  '睡不着': ['gray_moonstone', 'lapis_depth'],
  '开心': ['coral_pulse', 'jade_water'],
  '谢谢': ['aquamarine_drop', 'mother_pearl'],
  '不甘心': ['blood_amber', 'obsidian_gold'],
}

export function selectBead(stampType: StampType, noteContent: string, recent: JarEntry[]): BeadType {
  const candidates = STAMP_REGISTRY[stampType].eligibleBeads
  const recentTypes = recent.slice(-14).map((e) => e.beadType)
  const deduped = candidates.filter((b) => !recentTypes.includes(b as BeadType))
  const pool = deduped.length > 0 ? deduped : candidates

  const noteText = noteContent.toLowerCase()
  for (const [keyword, matched] of Object.entries(keywordMap)) {
    if (noteText.includes(keyword)) {
      const intersection = pool.filter((b) => matched.includes(b as BeadType))
      if (intersection.length > 0) {
        return intersection[Math.floor(Math.random() * intersection.length)]
      }
    }
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

export function stampNote(
  userId: string,
  noteId: string,
  noteContent: string,
  type: StampType,
  engine?: HeadlessMuninn,
): { record: StampRecord; jar: JarEntry; bead: { id: BeadType; name: string; color: string; texture: string; whisper: string; source: string } } | null {
  const state = loadStamps(userId)
  if (state.records.some((r) => r.noteId === noteId)) return null
  const stampDef = STAMP_REGISTRY[type]
  const beadType = selectBead(type, noteContent, state.jar)
  const bead = BEAD_REGISTRY[beadType]

  const record: StampRecord = {
    id: randomId('stamp'),
    type,
    beadType,
    beadName: bead.name,
    noteId,
    stampedAt: new Date().toISOString(),
  }

  const jarEntry: JarEntry = {
    id: randomId('bead'),
    stampType: type,
    beadType,
    noteId,
    date: todayStr(),
    beadName: bead.name,
    stampedAt: record.stampedAt,
    memoPreview: noteContent.slice(0, 50),
  }

  state.records.push(record)
  state.jar.push(jarEntry)
  state.lastStampedAt = record.stampedAt
  saveStamps(userId, state)

  if (engine) {
    const body = `〔印章：${stampDef.name}〕${stampDef.mood} · 回赠 ${bead.name}`
    engine.ingest(body, {
      title: `印章：${stampDef.name}`,
      shadow: true,
      source: 'stamp',
      noteId,
      contextAnchor: {
        type: 'stamp',
        shadowFragmentId: `sf-stamp-${record.id}`,
        notePreview: noteContent.slice(0, 40),
      },
    }).catch(() => { })
  }

  return { record, jar: jarEntry, bead }
}

export function listStamps(userId: string): UserStampState & { total: number } {
  const state = loadStamps(userId)
  return { ...state, total: state.jar.length }
}

export function recentStamps(userId: string, limit = 7): { type: string; beadType: string; beadName: string; date: string; notePreview: string }[] {
  const state = loadStamps(userId)
  return state.records.slice(-limit).map((r) => ({
    type: r.type,
    beadType: r.beadType,
    beadName: BEAD_REGISTRY[r.beadType].name,
    date: r.stampedAt.slice(0, 10),
    notePreview: state.jar.find((j) => j.noteId === r.noteId && j.stampedAt === r.stampedAt)?.memoPreview ?? '',
  }))
}
