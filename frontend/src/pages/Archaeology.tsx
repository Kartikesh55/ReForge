import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Background, Controls, MiniMap, ReactFlow, useNodesState, useEdgesState, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { EmptyState } from '../components/EmptyState'
import { analyzeProject, fetchAnalysisStatus, fetchGraph, fetchNodeRelations, type GraphNode } from '../services/api'
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

  const hasGraph = useMemo(() => Boolean(graph?.nodes.length), [graph])
  return <Page title="Archaeologist" eyebrow="Understand">
    <div className="mb-5 flex items-center justify-between">
      <div><p className="text-sm text-zinc-400">Status: <span className="font-mono text-accent">{status}</span></p>{error && <p className="mt-2 text-sm text-red-400">{error}</p>}</div>
      <button onClick={runAnalysis} disabled={status === 'ANALYZING'} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{status === 'ANALYZING' ? 'Analyzing…' : 'Analyze Repository'}</button>
    </div>
    {!hasGraph ? <EmptyState title={status === 'ANALYZING' ? 'Analyzing repository' : 'No graph available'} description="Run archaeology to discover files and structural relationships from the repository." /> :
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="h-[600px] overflow-hidden rounded border border-zinc-800 bg-zinc-950">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={(_, node) => void selectNode(node)} fitView>
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
