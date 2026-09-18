import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { generateMigrationPlan, type MigrationPlan } from '../services/api'
import { Page } from './Workspace'

function StackCard({ label, stack }: { label: string; stack?: Record<string, unknown> }) {
  if (!stack) return null
  return <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      {Object.entries(stack).filter(([key]) => key !== 'evidence').map(([key, value]) => <div key={key}><span className="text-zinc-500">{key.replace('_', ' ')}: </span><span className="text-zinc-200">{String(value)}</span></div>)}
    </div>
  </div>
}

export function Migration() {
  const { id } = useParams()
  const [plan, setPlan] = useState<MigrationPlan>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const generate = async () => {
    if (!id) return
    setBusy(true)
    setError(undefined)
    try { setPlan(await generateMigrationPlan(id)) } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail ?? 'Migration planning could not be completed.')
    } finally { setBusy(false) }
  }

  return <Page title="Migration plan" eyebrow="Plan">
    <div className="mb-6 flex items-center justify-between gap-4">
      <p className="max-w-2xl text-sm text-zinc-400">Generate a read-only Node.js/Express to Spring Boot migration plan from analyzed repository evidence.</p>
      <button onClick={() => void generate()} disabled={busy} className="shrink-0 rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Planning…' : 'Generate Migration Plan'}</button>
    </div>
    {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
    {!plan && !error && <EmptyState title="No migration plan available" description="Analyze the repository, then generate a plan from its detected architecture." />}
    {plan && <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2"><StackCard label="Source" stack={plan.source_stack} /><StackCard label="Planned target" stack={plan.target_stack} /></div>
      <section className="rounded border border-zinc-800 bg-zinc-900 p-5"><p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Compatibility</p><p className={`mt-2 text-sm ${plan.compatibility.supported ? 'text-emerald-400' : 'text-red-400'}`}>{plan.compatibility.supported ? 'Supported migration profile' : 'Unsupported migration profile'}</p><ul className="mt-2 space-y-1 text-sm text-zinc-400">{plan.compatibility.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></section>
      {plan.compatibility.supported && <>
        <section><h2 className="mb-3 text-lg font-semibold">Architecture and file mapping</h2><div className="space-y-2">{plan.file_mappings.map(mapping => <div key={`${mapping.source_file}-${mapping.target_file}`} className="rounded border border-zinc-800 bg-zinc-900 p-4 text-sm"><p className="font-mono text-zinc-200">{mapping.source_file} <span className="mx-2 text-accent">→</span> <span className="text-zinc-400">{mapping.target_file}</span></p><p className="mt-2 text-zinc-500">{mapping.reason}</p></div>)}</div></section>
        <section><h2 className="mb-3 text-lg font-semibold">Database mapping</h2>{plan.database_mappings.length ? <div className="space-y-2">{plan.database_mappings.map(item => <div key={item.source_model} className="rounded border border-zinc-800 bg-zinc-900 p-4 text-sm"><p className="font-mono">{item.source_model} <span className="mx-2 text-accent">→</span> {item.target_table}</p>{item.requires_review.map(reason => <p key={reason} className="mt-2 text-amber-400">Requires review: {reason}</p>)}</div>)}</div> : <p className="text-sm text-zinc-500">No database models were detected.</p>}</section>
        <section><h2 className="mb-3 text-lg font-semibold">Migration steps</h2><ol className="space-y-2">{plan.migration_steps.map(step => <li key={step.order} className="rounded border border-zinc-800 bg-zinc-900 p-4 text-sm"><span className="mr-3 font-mono text-accent">{String(step.order).padStart(2, '0')}</span>{step.title}</li>)}</ol></section>
        <section><h2 className="mb-3 text-lg font-semibold">Risks / requires review</h2>{plan.risks.length ? <div className="space-y-2">{plan.risks.map(risk => <div key={`${risk.area}-${risk.reason}`} className="rounded border border-amber-900/60 bg-amber-950/20 p-4 text-sm"><p className="font-medium text-amber-400">Requires review · {risk.area} · {risk.risk}</p><p className="mt-1 text-zinc-400">{risk.reason}</p>{risk.evidence.map(item => <p key={`${item.file}-${item.start_line}`} className="mt-2 font-mono text-xs text-zinc-500">{item.file}:{item.start_line}-{item.end_line}</p>)}</div>)}</div> : <p className="text-sm text-zinc-500">No evidence-backed risks were detected.</p>}</section>
      </>}
    </div>}
  </Page>
}
