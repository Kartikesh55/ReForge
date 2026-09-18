import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function Dashboard() {
  return (
    <section>
      <div className="mb-10">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">Control plane</p>
        <h1 className="text-3xl font-semibold tracking-tight">Software modernization, grounded in evidence.</h1>
        <p className="mt-3 max-w-2xl text-zinc-500">ReForge will map existing systems, plan migrations, and verify behavior without inventing analysis results.</p>
      </div>
      <EmptyState title="No projects yet" description="Project ingestion is not available in the current backend. Once a project is created, it will appear here." />
      <Link to="/projects/demo" className="mt-6 inline-block text-sm text-zinc-600 hover:text-zinc-400">Preview workspace shell →</Link>
    </section>
  )
}
