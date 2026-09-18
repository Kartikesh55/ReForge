import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 5000,
})

export type HealthResponse = {
  status: string
  app: string
  version: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/health')
  return response.data
}

export type Project = {
  project_id: string
  name: string
  status: string
  ingestion_status: string
  analysis_status: string
  created_at: string
  statistics?: GraphStats
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await api.get<Project[]>('/api/projects')
  return response.data
}

export async function fetchProject(projectId: string): Promise<Project> {
  const response = await api.get<Project>(`/api/projects/${encodeURIComponent(projectId)}`)
  return response.data
}

export async function uploadProject(file: File, name?: string): Promise<Project> {
  const form = new FormData()
  form.append('file', file)
  if (name?.trim()) form.append('name', name.trim())
  const response = await api.post<Project>('/api/projects/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  })
  return response.data
}

export type AnalysisStatus = {
  project_id: string
  status: string
  analysis_id?: string
  created_at?: string
  statistics?: GraphStats
}

export type GraphNode = {
  id: string
  type: string
  name: string
  file?: string
  start_line?: number
  end_line?: number
  metadata?: Record<string, unknown>
  evidence?: Record<string, unknown>
}

export type GraphEdge = { source: string; target: string; type: string; [key: string]: unknown }
export type GraphResponse = { nodes: GraphNode[]; edges: GraphEdge[]; statistics: GraphStats }
export type GraphStats = {
  node_count: number
  edge_count: number
  node_types: Record<string, number>
  edge_types: Record<string, number>
  total_files?: number
  source_files?: number
  test_files?: number
  lines_of_code?: number
}

export async function fetchAnalysisStatus(projectId: string) {
  return (await api.get<AnalysisStatus>(`/api/projects/${encodeURIComponent(projectId)}/analysis`)).data
}

export async function analyzeProject(projectId: string) {
  return (await api.post<AnalysisStatus>(`/api/projects/${encodeURIComponent(projectId)}/analyze`)).data
}

export async function fetchGraph(projectId: string) {
  return (await api.get<GraphResponse>(`/api/projects/${encodeURIComponent(projectId)}/graph`)).data
}

export async function fetchGraphStats(projectId: string) {
  return (await api.get<GraphStats>(`/api/projects/${encodeURIComponent(projectId)}/graph/stats`)).data
}

export async function fetchNode(projectId: string, nodeId: string) {
  return (await api.get<GraphNode>(`/api/projects/${encodeURIComponent(projectId)}/nodes/${encodeURIComponent(nodeId)}`)).data
}

export async function fetchNodeRelations(projectId: string, nodeId: string, relation: 'dependencies' | 'dependents') {
  return (await api.get<{ nodes: GraphNode[] }>(`/api/projects/${encodeURIComponent(projectId)}/nodes/${encodeURIComponent(nodeId)}/${relation}`)).data
}
