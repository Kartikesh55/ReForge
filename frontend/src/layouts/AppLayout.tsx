import { NavLink, Outlet, useParams } from 'react-router-dom'
import { HealthIndicator } from '../components/HealthIndicator'

const navigation = [
  { label: 'Overview', path: '' },
  { label: 'Archaeologist', path: '/archaeology' },
  { label: 'Migration', path: '/migration' },
  { label: 'Verification', path: '/verification' },
  { label: 'Modernization', path: '/modernization' },
]

export function AppLayout() {
  const { id } = useParams()
  const projectBase = id ? `/projects/${id}` : '/'

  return (
    <div className="min-h-screen bg-ink text-zinc-100">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-panel px-4 py-5">
        <NavLink to="/" className="mb-10 flex items-center gap-3 px-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-black text-ink">R</span>
          <span className="text-sm font-semibold tracking-[0.2em] text-zinc-200">REFORGE</span>
        </NavLink>
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Workspace</div>
        <nav className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.label}
              to={`${projectBase}${item.path}`}
              end={item.path === ''}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm transition ${isActive ? 'bg-zinc-800 text-accent' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line px-3 pt-4">
          <HealthIndicator />
        </div>
      </aside>
      <main className="ml-64 min-h-screen">
        <header className="flex h-16 items-center justify-between border-b border-line px-8">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Migration control plane</span>
          <span className="font-mono text-xs text-zinc-600">v0.1.0</span>
        </header>
        <div className="mx-auto max-w-6xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
