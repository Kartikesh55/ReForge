import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { fetchProjects, uploadProject, type Project } from '../services/api'

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [file, setFile] = useState<File>()
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadProjects = () => fetchProjects().then(setProjects).catch(() => setError('Unable to load projects from the API.'))
  useEffect(() => { void loadProjects() }, [])

  const createProject = async () => {
    if (!file) return setError('Choose a ZIP archive first.')
    setBusy(true)
    setError(undefined)
    try {
      await uploadProject(file, name)
      setShowCreate(false)
      setFile(undefined)
      setName('')
      await loadProjects()
    } catch (err) {
      const message = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(message ?? 'Project ingestion failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="mb-10">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">Control plane</p>
        <h1 className="text-3xl font-semibold tracking-tight">Software modernization, grounded in evidence.</h1>
        <p className="mt-3 max-w-2xl text-zinc-500">ReForge will map existing systems, plan migrations, and verify behavior without inventing analysis results.</p>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-400">Projects</h2>
        <button onClick={() => setShowCreate(true)} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white">+ Create Project</button>
      </div>
      {error && <p className="mb-4 rounded border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
      {projects.length === 0 ? <EmptyState title="No projects yet" description="Upload a ZIP archive to create your first isolated project workspace." /> :
        <div className="grid gap-4 md:grid-cols-2">{projects.map((project) => <article key={project.project_id} className="rounded border border-zinc-800 bg-zinc-900 p-5"><h3 className="font-medium">{project.name}</h3><p className="mt-2 text-xs uppercase tracking-wide text-accent">{project.ingestion_status}</p><p className="mt-1 text-sm text-zinc-500">Analysis: {project.analysis_status}</p><Link to={`/projects/${project.project_id}`} className="mt-5 inline-block text-sm text-zinc-300 hover:text-accent">Open Project →</Link></article>)}</div>}
      {showCreate && <div className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-4"><div className="w-full max-w-md rounded border border-zinc-700 bg-panel p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-medium">Create ReForge Project</h2><button onClick={() => setShowCreate(false)} className="text-zinc-500">×</button></div><label className="mt-6 block text-sm text-zinc-400">Project name <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional project name" className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none" /></label><input ref={inputRef} type="file" accept=".zip,application/zip" onChange={(event) => setFile(event.target.files?.[0])} className="hidden" /><button onClick={() => inputRef.current?.click()} className="mt-5 w-full rounded border border-dashed border-zinc-600 px-4 py-5 text-sm text-zinc-400">{file ? file.name : 'Choose ZIP'}</button><button onClick={() => void createProject()} disabled={busy || !file} className="mt-5 w-full rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Creating…' : 'Create Project'}</button></div></div>}
    </section>
  )
}
