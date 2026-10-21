import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, { 
  Background, Controls, MiniMap, Node, Edge, 
  useNodesState, useEdgesState, MarkerType, Handle, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getArchitecture } from '../services/api';
import { 
  Search, ShieldAlert, Layers, 
  X, ArrowRight, RefreshCw, Cpu, Globe, 
  CheckCircle2, Box, Code2, Server
} from 'lucide-react';

// Custom Node Components
const CustomRouteNode = ({ data, selected }: any) => {
  const method = (data.method || 'GET').toUpperCase();
  const methodColors: Record<string, { bg: string; text: string; border: string }> = {
    GET: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
    POST: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
    PUT: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
    PATCH: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
    DELETE: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' },
  };
  const color = methodColors[method] || methodColors.GET;

  return (
    <div className={`group relative w-64 rounded-xl border bg-gradient-to-b from-zinc-900 to-zinc-950 p-3.5 shadow-xl transition-all duration-200 ${
      selected 
        ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/40' 
        : 'border-amber-500/30 hover:border-amber-500/60 hover:shadow-amber-500/10'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-zinc-900 !rounded-full" 
      />
      
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-400">
            API INGRESS
          </span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${color.bg} ${color.text} ${color.border}`}>
          {method}
        </span>
      </div>

      <div className="font-mono text-xs font-semibold text-white truncate mb-2" title={data.path || data.label}>
        {data.path || data.label}
      </div>

      {data.file && (
        <div className="text-[9px] font-mono text-zinc-400 truncate flex items-center gap-1 pt-2 border-t border-zinc-800/80">
          <Code2 className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
          <span className="truncate">{data.file.split('/').pop()}</span>
        </div>
      )}

      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-zinc-900 !rounded-full" 
      />
    </div>
  );
};

const CustomControllerNode = ({ data, selected }: any) => {
  return (
    <div className={`group relative w-64 rounded-xl border bg-gradient-to-b from-zinc-900 to-zinc-950 p-3.5 shadow-xl transition-all duration-200 ${
      selected 
        ? 'border-purple-500 shadow-purple-500/20 ring-2 ring-purple-500/40' 
        : 'border-purple-500/30 hover:border-purple-500/60 hover:shadow-purple-500/10'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-zinc-900 !rounded-full" 
      />
      
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-purple-400">
            HANDLER / CONTROLLER
          </span>
        </div>
      </div>

      <div className="font-bold text-xs text-white truncate mb-2" title={data.label}>
        {data.label}
      </div>

      {data.methods && data.methods.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {data.methods.slice(0, 2).map((m: string) => (
            <span key={m} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 truncate max-w-[110px]">
              {m}()
            </span>
          ))}
          {data.methods.length > 2 && (
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">
              +{data.methods.length - 2}
            </span>
          )}
        </div>
      )}

      {data.file && (
        <div className="text-[9px] font-mono text-zinc-400 truncate flex items-center gap-1 pt-2 border-t border-zinc-800/80">
          <Code2 className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
          <span className="truncate">{data.file.split('/').pop()}</span>
        </div>
      )}

      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-zinc-900 !rounded-full" 
      />
    </div>
  );
};

const CustomServiceNode = ({ data, selected }: any) => {
  return (
    <div className={`group relative w-64 rounded-xl border bg-gradient-to-b from-zinc-900 to-zinc-950 p-3.5 shadow-xl transition-all duration-200 ${
      selected 
        ? 'border-blue-500 shadow-blue-500/20 ring-2 ring-blue-500/40' 
        : 'border-blue-500/30 hover:border-blue-500/60 hover:shadow-blue-500/10'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-zinc-900 !rounded-full" 
      />
      
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-blue-400">
            DOMAIN SERVICE
          </span>
        </div>
      </div>

      <div className="font-bold text-xs text-white truncate mb-2" title={data.label}>
        {data.label}
      </div>

      {data.methods && data.methods.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {data.methods.slice(0, 2).map((m: string) => (
            <span key={m} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40 truncate max-w-[110px]">
              {m}()
            </span>
          ))}
          {data.methods.length > 2 && (
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">
              +{data.methods.length - 2}
            </span>
          )}
        </div>
      )}

      {data.file && (
        <div className="text-[9px] font-mono text-zinc-400 truncate flex items-center gap-1 pt-2 border-t border-zinc-800/80">
          <Code2 className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
          <span className="truncate">{data.file.split('/').pop()}</span>
        </div>
      )}

      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-zinc-900 !rounded-full" 
      />
    </div>
  );
};

const CustomModelNode = ({ data, selected }: any) => {
  const isRepo = data.type === 'repository';
  return (
    <div className={`group relative w-64 rounded-xl border bg-gradient-to-b from-zinc-900 to-zinc-950 p-3.5 shadow-xl transition-all duration-200 ${
      selected 
        ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/40' 
        : 'border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-emerald-500/10'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-2.5 !h-2.5 !bg-emerald-400 !border-2 !border-zinc-900 !rounded-full" 
      />
      
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400">
            {isRepo ? 'REPOSITORY' : 'MODEL / SCHEMA'}
          </span>
        </div>
      </div>

      <div className="font-bold text-xs text-white truncate mb-2" title={data.label}>
        {data.label}
      </div>

      {data.fields && data.fields.length > 0 && (
        <div className="space-y-1 mb-2 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/60">
          {data.fields.slice(0, 2).map((f: any) => (
            <div key={f.name} className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-300 truncate max-w-[120px]">{f.name}</span>
              <span className="text-emerald-400 text-[9px]">{f.type}</span>
            </div>
          ))}
          {data.fields.length > 2 && (
            <div className="text-[9px] font-mono text-zinc-500 text-center">
              +{data.fields.length - 2} more fields
            </div>
          )}
        </div>
      )}

      {data.file && (
        <div className="text-[9px] font-mono text-zinc-400 truncate flex items-center gap-1 pt-2 border-t border-zinc-800/80">
          <Code2 className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
          <span className="truncate">{data.file.split('/').pop()}</span>
        </div>
      )}

      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-2.5 !h-2.5 !bg-emerald-400 !border-2 !border-zinc-900 !rounded-full" 
      />
    </div>
  );
};

const CustomDatabaseNode = ({ data, selected }: any) => {
  return (
    <div className={`group relative w-64 rounded-xl border bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-xl transition-all duration-200 ${
      selected 
        ? 'border-cyan-500 shadow-cyan-500/20 ring-2 ring-cyan-500/40' 
        : 'border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-cyan-500/10'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-zinc-900 !rounded-full" 
      />
      
      <div className="flex items-center gap-2 mb-2">
        <Server className="w-4 h-4 text-cyan-400" />
        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-cyan-400">
          PERSISTENCE LAYER
        </span>
      </div>

      <div className="font-bold text-sm text-white mb-1">
        {data.label || 'Primary Database'}
      </div>

      <div className="text-[11px] font-mono text-cyan-300/80 bg-cyan-950/40 border border-cyan-800/40 rounded px-2 py-1 mt-2">
        {data.engine || 'PostgreSQL / SQLite / MongoDB'}
      </div>
    </div>
  );
};

const CustomTestNode = ({ data, selected }: any) => {
  return (
    <div className={`group relative w-64 rounded-xl border bg-gradient-to-b from-zinc-900 to-zinc-950 p-3.5 shadow-xl transition-all duration-200 ${
      selected 
        ? 'border-lime-500 shadow-lime-500/20 ring-2 ring-lime-500/40' 
        : 'border-lime-500/30 hover:border-lime-500/60 hover:shadow-lime-500/10'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-2.5 !h-2.5 !bg-lime-400 !border-2 !border-zinc-900 !rounded-full" 
      />
      
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-lime-400">
            TEST SUITE
          </span>
        </div>
      </div>

      <div className="font-bold text-xs text-white truncate mb-2" title={data.label}>
        {data.label}
      </div>

      {data.cases && data.cases.length > 0 && (
        <div className="text-[10px] font-mono text-lime-300/80 bg-lime-950/40 px-2 py-1 rounded border border-lime-800/40 mb-2">
          {data.cases.length} automated test spec{data.cases.length > 1 ? 's' : ''}
        </div>
      )}

      {data.file && (
        <div className="text-[9px] font-mono text-zinc-400 truncate flex items-center gap-1 pt-2 border-t border-zinc-800/80">
          <Code2 className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
          <span className="truncate">{data.file.split('/').pop()}</span>
        </div>
      )}

      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-2.5 !h-2.5 !bg-lime-400 !border-2 !border-zinc-900 !rounded-full" 
      />
    </div>
  );
};

const CustomGenericNode = ({ data, selected }: any) => {
  return (
    <div className={`group relative w-60 rounded-xl border bg-gradient-to-b from-zinc-900 to-zinc-950 p-3 shadow-xl ${
      selected ? 'border-zinc-400 ring-2 ring-zinc-400/40' : 'border-zinc-800'
    }`}>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-zinc-400 !border-2 !border-zinc-900 !rounded-full" />
      <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
        {data.type || 'COMPONENT'}
      </div>
      <div className="font-bold text-xs text-white truncate">{data.label}</div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-zinc-400 !border-2 !border-zinc-900 !rounded-full" />
    </div>
  );
};

const Architecture: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [rawEdges, setRawEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Register Custom Node Types
  const nodeTypes = useMemo(() => ({
    customRoute: CustomRouteNode,
    customController: CustomControllerNode,
    customService: CustomServiceNode,
    customModel: CustomModelNode,
    customDatabase: CustomDatabaseNode,
    customTest: CustomTestNode,
    route: CustomRouteNode,
    controller: CustomControllerNode,
    service: CustomServiceNode,
    model: CustomModelNode,
    repository: CustomModelNode,
    database: CustomDatabaseNode,
    test: CustomTestNode,
    default: CustomGenericNode,
  }), []);

  useEffect(() => {
    loadGraph();
  }, [id]);

  const loadGraph = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getArchitecture(id);
      
      const formattedNodes: Node[] = res.nodes.map((n: any) => {
        const rawType = n.data?.type || n.type || 'generic';
        let customType = n.type;
        if (!customType || customType === 'default') {
          if (rawType === 'route') customType = 'customRoute';
          else if (rawType === 'controller') customType = 'customController';
          else if (rawType === 'service') customType = 'customService';
          else if (rawType === 'model' || rawType === 'repository') customType = 'customModel';
          else if (rawType === 'database') customType = 'customDatabase';
          else if (rawType === 'test') customType = 'customTest';
          else customType = 'default';
        }

        return {
          id: n.id,
          type: customType,
          position: n.position || { x: 100, y: 100 },
          data: {
            ...n.data,
            rawLabel: n.data?.label || n.id,
            rawType: rawType,
            file: n.data?.file,
            methods: n.data?.methods,
            fields: n.data?.fields,
            cases: n.data?.cases,
            engine: n.data?.engine,
            method: n.data?.method,
            path: n.data?.path
          }
        };
      });

      const formattedEdges: Edge[] = res.edges.map((e: any, idx: number) => {
        const edgeType = e.data?.edge_type || 'calls';
        let strokeColor = '#3b82f6';
        let arrowColor = '#60a5fa';

        if (edgeType === 'queries' || edgeType === 'persists') {
          strokeColor = '#10b981';
          arrowColor = '#34d399';
        } else if (edgeType === 'tests') {
          strokeColor = '#84cc16';
          arrowColor = '#a3e635';
        }

        return {
          id: e.id || `edge_${idx}`,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          animated: true,
          style: { stroke: strokeColor, strokeWidth: 1.75 },
          markerEnd: { type: MarkerType.ArrowClosed, color: arrowColor },
          label: e.label || '',
          labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }
        };
      });

      setRawNodes(formattedNodes);
      setRawEdges(formattedEdges);
      setNodes(formattedNodes);
      setEdges(formattedEdges);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter nodes based on search and type filter
  useEffect(() => {
    let filtered = rawNodes;
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(n => {
        const t = (n.data?.rawType || '').toUpperCase();
        if (typeFilter === 'ROUTE') return t === 'ROUTE';
        if (typeFilter === 'CONTROLLER') return t === 'CONTROLLER';
        if (typeFilter === 'SERVICE') return t === 'SERVICE';
        if (typeFilter === 'MODEL') return t === 'MODEL' || t === 'REPOSITORY';
        if (typeFilter === 'STORAGE') return t === 'DATABASE';
        if (typeFilter === 'TEST') return t === 'TEST';
        return true;
      });
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.data?.rawLabel?.toLowerCase().includes(q) || 
        n.id.toLowerCase().includes(q) ||
        (n.data?.file && n.data.file.toLowerCase().includes(q))
      );
    }
    setNodes(filtered);
  }, [searchTerm, typeFilter, rawNodes]);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node);
  }, []);

  const counts = useMemo(() => {
    const res = { routes: 0, controllers: 0, services: 0, models: 0, tests: 0 };
    rawNodes.forEach(n => {
      const t = n.data?.rawType;
      if (t === 'route') res.routes++;
      else if (t === 'controller') res.controllers++;
      else if (t === 'service') res.services++;
      else if (t === 'model' || t === 'repository') res.models++;
      else if (t === 'test') res.tests++;
    });
    return res;
  }, [rawNodes]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] relative bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Filter Toolbar */}
      <div className="h-16 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search components, routes, models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-64"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-1 rounded-lg text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ROUTE', label: `Routes (${counts.routes})` },
              { id: 'CONTROLLER', label: `Handlers (${counts.controllers})` },
              { id: 'SERVICE', label: `Services (${counts.services})` },
              { id: 'MODEL', label: `Models (${counts.models})` },
              { id: 'TEST', label: `Tests (${counts.tests})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1 rounded-md text-[11px] font-mono font-medium transition-colors ${
                  typeFilter === tab.id 
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
            <span>{rawNodes.length} nodes</span>
            <span>•</span>
            <span>{rawEdges.length} edges</span>
          </div>
          <button
            onClick={() => loadGraph()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            Reset Layout
          </button>
        </div>
      </div>

      {/* Layer Architecture Flow Banner */}
      <div className="bg-zinc-900/60 border-b border-zinc-800/60 px-6 py-2 flex items-center justify-between text-[11px] font-mono text-zinc-400 overflow-x-auto">
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">Architecture Tiers:</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <Globe className="w-3 h-3" /> Tier 1: Inbound Routes
            </span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className="flex items-center gap-1 text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              <Cpu className="w-3 h-3" /> Tier 2: Controllers
            </span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              <Layers className="w-3 h-3" /> Tier 3: Domain Services
            </span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Box className="w-3 h-3" /> Tier 4: Schemas & Repos
            </span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className="flex items-center gap-1 text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              <Server className="w-3 h-3" /> Tier 5: Persistence
            </span>
          </div>
        </div>
        <div className="hidden xl:flex items-center gap-2 text-zinc-500 text-[10px]">
          <span>Click any node to inspect blast radius & source file</span>
        </div>
      </div>

      {/* Main React Flow Canvas */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
            <span>Assembling interactive architecture graph...</span>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background color="#18181b" gap={24} size={1} />
            <Controls className="bg-zinc-900 border border-zinc-800 fill-zinc-300 rounded-xl overflow-hidden shadow-2xl" />
            <MiniMap 
              nodeColor={(n: any) => {
                const t = n.data?.rawType;
                if (t === 'route') return '#f59e0b';
                if (t === 'controller') return '#a855f7';
                if (t === 'service') return '#3b82f6';
                if (t === 'model' || t === 'repository') return '#10b981';
                if (t === 'database') return '#06b6d4';
                if (t === 'test') return '#84cc16';
                return '#71717a';
              }}
              maskColor="rgba(9, 9, 11, 0.8)"
              className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl"
            />
          </ReactFlow>
        )}

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute right-6 top-6 w-96 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 shadow-2xl z-20 animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-semibold">
                  {selectedNode.data?.rawType}
                </span>
                <h3 className="text-base font-bold text-white mt-2 font-mono">
                  {selectedNode.data?.rawLabel}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {selectedNode.data?.file && (
                <div>
                  <span className="text-zinc-500 block mb-1 font-mono uppercase text-[10px]">Source File</span>
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-zinc-300 flex items-center justify-between">
                    <span className="truncate">{selectedNode.data.file}</span>
                    <button 
                      onClick={() => navigate(`/projects/${id}/code`)}
                      className="text-emerald-400 hover:text-emerald-300 ml-2 font-medium"
                    >
                      View
                    </button>
                  </div>
                </div>
              )}

              {selectedNode.data?.methods && selectedNode.data.methods.length > 0 && (
                <div>
                  <span className="text-zinc-500 block mb-1 font-mono uppercase text-[10px]">Exported Methods</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.data.methods.map((m: string) => (
                      <span key={m} className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px]">
                        {m}()
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.data?.fields && selectedNode.data.fields.length > 0 && (
                <div>
                  <span className="text-zinc-500 block mb-1 font-mono uppercase text-[10px]">Schema Properties</span>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedNode.data.fields.map((f: any) => (
                      <div key={f.name} className="flex justify-between p-1.5 bg-zinc-950/60 rounded font-mono text-[11px]">
                        <span className="text-zinc-300">{f.name}</span>
                        <span className="text-emerald-400">{f.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.data?.cases && selectedNode.data.cases.length > 0 && (
                <div>
                  <span className="text-zinc-500 block mb-1 font-mono uppercase text-[10px]">Test Cases</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {selectedNode.data.cases.map((c: string) => (
                      <div key={c} className="p-1.5 bg-zinc-950/60 rounded font-mono text-[11px] text-lime-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-800 flex gap-2">
                <button
                  onClick={() => navigate(`/projects/${id}/impact`)}
                  className="flex-1 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Analyze Impact
                </button>
                <button
                  onClick={() => navigate(`/projects/${id}/chat`)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-semibold text-xs transition-colors"
                >
                  Ask in Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Architecture;
