import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Background, Controls, MiniMap, ReactFlow, useNodesState, useEdgesState, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { EmptyState } from '../components/EmptyState'
import { analyzeProject, askReforge, fetchAnalysisStatus, fetchGraph, fetchNodeRelations, traceFlow, type AskResponse, type FlowTrace, type GraphNode } from '../services/api'
import { Page } from './Workspace'

const colors: Record<string, string> = {
  file: '#2563eb', function: '#059669', class: '#9333ea', method: '#c026d3',
  route: '#ea580c', module: '#64748b', dependency: '#64748b', external_dependency: '#64748b',
}

function visualNodes(nodes: GraphNode[]): Node[] {
  return nodes.map((item, index) => ({
    id: item.id,
    position: { x: (index % 4) * 230, y: Math.floor(index / 4) * 120 },
    data: { label: `${item.name}\n${item.type}${item.file ? ` · ${item.file}` : ''}` },
    style: { background: colors[item.type] ?? '#3f3f46', color: 'white', border: '0', width: 205, whiteSpace: 'pre-line', fontSize: 12 },
  }))
}

export function Archaeology() {
  const { id = '' } = useParams()
  const [status, setStatus] = useState('IDLE')
  const [error, setError] = useState<string>()
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: { source: string; target: string; type: string }[] }>()
  const [selected, setSelected] = useState<GraphNode>()
  const [relations, setRelations] = useState<GraphNode[]>([])
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState<'expert' | 'developer' | 'beginner' | 'layman'>('developer')
  const [answer, setAnswer] = useState<AskResponse>()
  const [asking, setAsking] = useState(false)
  const [traceQuery, setTraceQuery] = useState('')
  const [trace, setTrace] = useState<FlowTrace>()
  const [tracing, setTracing] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const loadGraph = useCallback(async () => {
    try {
      const result = await fetchGraph(id)
      setGraph(result)
      setNodes(visualNodes(result.nodes))
      setEdges(result.edges.map((edge, index) => ({ id: `edge-${index}`, source: edge.source, target: edge.target, label: edge.type, type: 'smoothstep' })))
    } catch (err) {
      setError('No completed analysis is available for this project.')
    }
  }, [id, setEdges, setNodes])

  useEffect(() => {
    fetchAnalysisStatus(id).then((result) => {
      setStatus(result.status)
      if (result.status === 'COMPLETED') void loadGraph()
    }).catch(() => setError('The API is unavailable or this project does not exist.'))
  }, [id, loadGraph])

  const selectNode = async (node: Node) => {
    const item = graph?.nodes.find((candidate) => candidate.id === node.id)
    setSelected(item)
    if (item) {
      try {
        const [dependencies, dependents] = await Promise.all([
          fetchNodeRelations(id, item.id, 'dependencies'),
          fetchNodeRelations(id, item.id, 'dependents'),
        ])
        setRelations([...dependencies.nodes, ...dependents.nodes])
      } catch {
        setRelations([])
      }
    }
  }

  const runAnalysis = async () => {
    setError(undefined)
    setStatus('ANALYZING')
    try {
      const result = await analyzeProject(id)
      setStatus(result.status)
      await loadGraph()
    } catch {
      setStatus('FAILED')
      setError('Repository analysis failed. Check the project source directory and try again.')
    }

  }

  const ask = async () => {
    if (!question.trim()) return
    setAsking(true)
    setAnswer(undefined)
    setError(undefined)
    try {
      setAnswer(await askReforge(id, question, mode))
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail ?? 'Ask ReForge could not query this repository.')
    } finally {
      setAsking(false)
    }

  }

  const runTrace = async () => {
    if (!traceQuery.trim()) return
    setTracing(true)
    setError(undefined)
    try {
      const result = await traceFlow(id, traceQuery)
      setTrace(result)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setTrace(undefined)
      setError(detail ?? 'No static flow could be resolved for this query.')
    } finally {
      setTracing(false)
    }
  }

  const traceIds = new Set(trace?.steps.map((step) => step.node_id) ?? [])

  const hasGraph = useMemo(() => Boolean(graph?.nodes.length), [graph])
  return <Page title="Archaeologist" eyebrow="Understand">
    <div className="mb-5 flex items-center justify-between">
      <div><p className="text-sm text-zinc-400">Status: <span className="font-mono text-accent">{status}</span></p>{error && <p className="mt-2 text-sm text-red-400">{error}</p>}</div>
      <button onClick={runAnalysis} disabled={status === 'ANALYZING'} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{status === 'ANALYZING' ? 'Analyzing…' : 'Analyze Repository'}</button>
    </div>
    {hasGraph && <section className="mb-6 rounded border border-zinc-800 bg-zinc-900 p-5">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-accent">Ask ReForge</p>
      <p className="mb-4 text-sm text-zinc-500">Ask about this analyzed repository using its graph and source evidence.</p>
      <div className="flex flex-col gap-3 md:flex-row">
        <input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void ask() }} placeholder="What handles POST /orders?" className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-accent" />
        <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"><option value="developer">Developer</option><option value="expert">Expert</option><option value="beginner">Beginner</option><option value="layman">Layman</option></select>
        <button onClick={() => void ask()} disabled={asking || !question.trim()} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{asking ? 'Thinking…' : 'Ask ReForge'}</button>
      </div>
      {answer && <div className="mt-5 space-y-5 border-t border-zinc-800 pt-5">
        <div><h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Answer</h2><p className="text-sm leading-6 text-zinc-200">{answer.answer}</p></div>
        <div><h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Evidence</h2>{answer.evidence.length ? <div className="space-y-2">{answer.evidence.map((item) => <div key={`${item.file}:${item.start_line}`} className="rounded border border-zinc-800 bg-zinc-950 p-3 text-xs"><p className="font-mono text-accent">{item.file}:{item.start_line}-{item.end_line}</p><p className="mt-1 text-zinc-400">{item.reason}</p></div>)}</div> : <p className="text-sm text-zinc-500">No source evidence was found.</p>}</div>
        <div><h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Related components</h2><div className="flex flex-wrap gap-2">{answer.related_nodes.map((item) => <button key={item.id} onClick={() => { const graphNode = graph?.nodes.find((node) => node.id === item.id); if (graphNode) setSelected(graphNode) }} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-accent">{item.name} · {item.type}</button>)}</div></div>
      </div>}
    </section>}
    {hasGraph && <section className="mb-6 rounded border border-zinc-800 bg-zinc-900 p-5">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-accent">Static Flow Trace</p>
      <p className="mb-4 text-sm text-zinc-500">Reconstruct a likely execution path from the analyzed graph. This is static analysis, not runtime tracing.</p>
      <div className="flex gap-3">
        <input value={traceQuery} onChange={(event) => setTraceQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void runTrace() }} placeholder="Trace the request flow for a customer support query" className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-accent" />
        <button onClick={() => void runTrace()} disabled={tracing || !traceQuery.trim()} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{tracing ? 'Tracing…' : 'Trace Flow'}</button>
      </div>
      {trace && <div className="mt-5 border-t border-zinc-800 pt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Static flow trace</p><div className="space-y-2">{trace.steps.map((step, index) => <button key={`${step.node_id}-${index}`} onClick={() => { const graphNode = graph?.nodes.find((node) => node.id === step.node_id); if (graphNode) setSelected(graphNode) }} className={`block w-full rounded border p-3 text-left ${traceIds.has(step.node_id) ? 'border-accent bg-accent/10' : 'border-zinc-700 bg-zinc-950'}`}><p className="font-medium">{step.name} <span className="ml-2 text-xs text-zinc-500">{step.type}</span></p>{step.file && <p className="mt-1 font-mono text-xs text-accent">{step.file}:{step.start_line}-{step.end_line}</p>}<p className="mt-1 text-xs text-zinc-400">{step.reason}</p>{index < trace.steps.length - 1 && <p className="mt-2 text-zinc-600">↓</p>}</button>)}</div>{trace.unresolved.length > 0 && <p className="mt-4 text-sm text-amber-300">Unresolved dynamic calls: {trace.unresolved.map((item) => item.name).join(', ')}</p>}{trace.alternatives.length > 0 && <p className="mt-2 text-sm text-amber-300">Alternative entry points were found.</p>}</div>}
    </section>}
    {!hasGraph ? <EmptyState title={status === 'ANALYZING' ? 'Analyzing repository' : 'No graph available'} description="Run archaeology to discover files and structural relationships from the repository." /> :
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="h-[600px] overflow-hidden rounded border border-zinc-800 bg-zinc-950">
          <ReactFlow nodes={nodes.map((node) => ({ ...node, style: { ...node.style, opacity: trace && !traceIds.has(node.id) ? 0.25 : 1, border: traceIds.has(node.id) ? '2px solid #f59e0b' : '0' } }))} edges={edges.map((edge) => ({ ...edge, animated: Boolean(trace && trace.edges.some((item) => item.source === edge.source && item.target === edge.target)), style: { opacity: trace && !trace.edges.some((item) => item.source === edge.source && item.target === edge.target) ? 0.2 : 1, stroke: trace && trace.edges.some((item) => item.source === edge.source && item.target === edge.target) ? '#f59e0b' : undefined } }))} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={(_, node) => void selectNode(node)} fitView>
            <Background /><Controls /><MiniMap />
          </ReactFlow>
        </div>
        <aside className="rounded border border-zinc-800 bg-zinc-900 p-4 text-sm">
          <h2 className="mb-4 font-medium">Node details</h2>
          {selected ? <><p className="font-medium">{selected.name}</p><p className="mt-1 text-zinc-400">{selected.type}</p>{selected.file && <p className="mt-3 break-all text-zinc-400">{selected.file}</p>}{selected.start_line && <p className="mt-1 text-zinc-400">Lines {selected.start_line}–{selected.end_line}</p>}<p className="mt-4 text-zinc-400">Related nodes: {relations.length}</p>{relations.length > 0 && <ul className="mt-2 space-y-1 text-xs text-zinc-500">{relations.map((relation) => <li key={relation.id}>{relation.name} · {relation.type}</li>)}</ul>}</> : <p className="text-zinc-500">Select a node to inspect it.</p>}
        </aside>
      </div>}
  </Page>
}
