import { useCallback, useEffect, useState } from 'react'
import * as api from '../services/api'

export function useCurrentNote(userId?: string) {
  const [note, setNote] = useState<api.Note | null>(null)
  const [shouldPopup, setShouldPopup] = useState(false)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.currentNote(userId)
      setNote(res.note)
      setShouldPopup(res.shouldPopup ?? false)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  return { note, shouldPopup, loading, refresh, createNote: api.createNote, respondNote: api.respondNote, markRead: api.markRead, stampNote: api.stampNote }
}
