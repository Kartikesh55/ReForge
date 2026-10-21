export interface Project {
  id: string;
  name: string;
  description?: string;
  source_path?: string;
  source_stack?: string;
  target_stack?: string;
  status: string;
  created_at: string;
}

export type ProjectStatus = 'idle' | 'analyzing' | 'analyzed' | 'planning' | 'planned' | 'migrating' | 'migrated' | 'verifying' | 'verified' | 'modernizing' | 'completed' | 'failed' | 'warning';

export interface AgentEvent {
  event: string;
  data: any;
  timestamp?: string;
  message?: string;
}

export interface Analysis {
  status: string;
  file_count: number;
  loc: number;
  languages?: Record<string, number>;
  frameworks?: string[];
  controllers?: Array<{ id: string; name: string; file: string; methods?: string[] }>;
  api_routes?: Array<{ id: string; method: string; path: string; handler: string; file: string }>;
  services?: Array<{ id: string; name: string; file: string; methods: string[] }>;
  models_found?: Array<{ id: string; name: string; file: string; fields: Array<{ name: string; type: string }> }>;
  tests?: Array<{ id: string; name: string; file: string; cases: string[] }>;
}

export interface ArchitectureNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: string;
    file?: string;
    method?: string;
    path?: string;
    methods?: string[];
    fields?: Array<{ name: string; type: string }>;
    engine?: string;
    cases?: string[];
  };
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
  data?: {
    edge_type?: string;
  };
}

export interface Architecture {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export interface ImpactResult {
  component: string;
  component_id: string;
  type: string;
  file?: string;
  direct_dependents: string[];
  downstream_dependencies: string[];
  affected_apis: string[];
  affected_tests: string[];
  blast_radius_count: number;
  risk: 'High' | 'Medium' | 'Low';
  risk_reason?: string;
}

export interface Citation {
  file: string;
  lines: string;
  symbol: string;
  snippet: string;
}

export interface ChatMessage {
  sender: 'user' | 'agent';
  text?: string;
  data?: {
    summary: string;
    evidence: Array<{ text: string; file?: string; lines?: string }>;
    analysis: Array<{ text: string }>;
    hypothesis: Array<{ text: string }>;
    citations?: Citation[];
  };
}

export interface MappingItem {
  source: string;
  target: string;
  type: string;
  description: string;
  risk: string;
}

export interface MigrationPlan {
  source_stack: Record<string, any>;
  target_stack: Record<string, any>;
  mappings: MappingItem[];
  risks: {
    HIGH: Array<{ component: string; reason: string }>;
    MEDIUM: Array<{ component: string; reason: string }>;
    LOW: Array<{ component: string; reason: string }>;
  };
  confidence: number;
  total_files_mapped: number;
  files_affected: string[];
}

export interface ScenarioResult {
  id: string;
  scenario: string;
  method: string;
  path: string;
  original_status: number;
  migrated_status: number;
  original_body: any;
  migrated_body: any;
  status: 'PASS' | 'REPAIRED' | 'FAIL';
  match: boolean;
}

export interface VerificationResponse {
  total_scenarios: number;
  passed_scenarios: number;
  failed_scenarios: number;
  repaired_count: number;
  results: ScenarioResult[];
  repair_events: Array<{ scenario: string; issue: string; fix: string; status: string }>;
  parity_score: string;
  status: string;
}
