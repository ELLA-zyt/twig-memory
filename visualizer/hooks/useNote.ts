import { useCallback, useEffect, useState } from 'react'
import * as api from '../services/api'

export function useCurrentNote(userId?: string) {
  const [note, setNote] = useState<api.Note | null>(null)
  const [shouldPopup, setShouldPopup] = useState(false)
  const [loading, setLoading] = useState(false)

  // silent 刷新不切 loading：盖章/回应后局部更新，避免便签卡卸载重挂载导致动画中断
  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const res = await api.currentNote(userId)
      setNote(res.note)
      setShouldPopup(res.shouldPopup ?? false)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  return { note, shouldPopup, loading, refresh, createNote: api.createNote, respondNote: api.respondNote, markRead: api.markRead, stampNote: api.stampNote }
}
