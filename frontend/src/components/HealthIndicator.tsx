import { useApiHealth } from '../hooks/useApiHealth'

export function HealthIndicator() {
  const { health, loading } = useApiHealth()
  const online = Boolean(health)

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400" title={health?.app ?? 'Backend unavailable'}>
      <span className={`h-2 w-2 rounded-full ${loading ? 'animate-pulse bg-amber-400' : online ? 'bg-lime-400' : 'bg-red-400'}`} />
      <span>{loading ? 'Checking API' : online ? `API ${health?.version}` : 'API offline'}</span>
    </div>
  )
}
