import { useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function Workspace() {
  const { id } = useParams()
  return <Page title={`Project ${id ?? ''}`} eyebrow="Overview"><EmptyState title="Workspace is awaiting a project" description="Project details and pipeline metrics will appear here when the backend exposes them." /></Page>
}

export function Page({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <section><p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">{eyebrow}</p><h1 className="mb-8 text-3xl font-semibold tracking-tight">{title}</h1>{children}</section>
}
