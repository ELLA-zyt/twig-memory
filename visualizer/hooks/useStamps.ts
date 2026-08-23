import { useCallback, useEffect, useState } from 'react'
import * as api from '../services/api'

export function useStamps(userId?: string) {
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listStamps(userId)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  return { total, loading, refresh }
}
