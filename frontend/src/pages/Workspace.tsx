import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { fetchAnalysisStatus, type GraphStats } from '../services/api'

export function Workspace() {
  const { id } = useParams()
  const [stats, setStats] = useState<GraphStats>()
  useEffect(() => { if (id) void fetchAnalysisStatus(id).then((result) => setStats(result.statistics)).catch(() => undefined) }, [id])
  return <Page title={`Project ${id ?? ''}`} eyebrow="Overview">{stats ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Files', stats.total_files], ['Functions', stats.node_types.function ?? 0], ['Classes', stats.node_types.class ?? 0], ['Routes', stats.node_types.route ?? 0], ['Graph nodes', stats.node_count], ['Graph edges', stats.edge_count]].map(([label, value]) => <div key={label} className="rounded border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs uppercase text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div> : <EmptyState title="Workspace is awaiting analysis" description="Analyze the repository to populate project metrics." />}</Page>
}

export function Page({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <section><p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">{eyebrow}</p><h1 className="mb-8 text-3xl font-semibold tracking-tight">{title}</h1>{children}</section>
}
