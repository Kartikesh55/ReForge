import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { analyzeProject, fetchAnalysisStatus, fetchProject, type GraphStats, type Project } from '../services/api'

export function Workspace() {
  const { id } = useParams()
  const [stats, setStats] = useState<GraphStats>()
  const [project, setProject] = useState<Project>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const load = () => id ? Promise.all([fetchProject(id), fetchAnalysisStatus(id)]).then(([item, analysis]) => { setProject(item); setStats(analysis.statistics) }).catch(() => setError('Unable to load this project.')) : Promise.resolve()
  useEffect(() => { void load() }, [id])
  const analyze = async () => { if (!id) return; setBusy(true); setError(undefined); try { await analyzeProject(id); await load() } catch { setError('Repository analysis failed.') } finally { setBusy(false) } }
  return <Page title={project?.name ?? `Project ${id ?? ''}`} eyebrow="Overview"><div className="mb-6 flex items-center justify-between"><div><p className="text-sm text-zinc-400">Ingestion: <span className="text-accent">{project?.ingestion_status ?? 'Loading'}</span></p><p className="mt-1 text-sm text-zinc-400">Analysis: <span className="text-accent">{project?.analysis_status ?? 'Loading'}</span></p></div>{project?.analysis_status !== 'COMPLETED' && <button onClick={() => void analyze()} disabled={busy} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Analyzing…' : 'Analyze Repository'}</button>}</div>{error && <p className="mb-4 text-sm text-red-400">{error}</p>}{stats ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Files', stats.total_files], ['Source Files', stats.source_files], ['Test Files', stats.test_files], ['Functions', stats.node_types.function ?? 0], ['Classes', stats.node_types.class ?? 0], ['Routes', stats.node_types.route ?? 0], ['Graph nodes', stats.node_count], ['Graph edges', stats.edge_count]].map(([label, value]) => <div key={label} className="rounded border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs uppercase text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value ?? 0}</p></div>)}</div> : <EmptyState title="Workspace is awaiting analysis" description="Analyze the repository to populate project metrics." />}</Page>
}

export function Page({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <section><p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">{eyebrow}</p><h1 className="mb-8 text-3xl font-semibold tracking-tight">{title}</h1>{children}</section>
}
