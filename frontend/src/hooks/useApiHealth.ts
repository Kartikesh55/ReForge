import { useEffect, useState } from 'react'
import { fetchHealth, type HealthResponse } from '../services/api'

export function useApiHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchHealth()
      .then((data) => active && setHealth(data))
      .catch(() => active && setHealth(null))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { health, loading }
}
