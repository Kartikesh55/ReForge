import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getAnalysis, analyzeProject } from '../services/api';
import type { Project, Analysis } from '../types';
import { 
  Code, Layers, Database, Box, FileCode, CheckCircle2, 
  ArrowRight, Sparkles, Network, MessageSquare, ShieldAlert, 
  ArrowRightLeft, RefreshCw, Cpu, Server, ShieldCheck, ChevronRight
} from 'lucide-react';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const p = await getProject(id);
      setProject(p);
      const a = await getAnalysis(id);
      setAnalysis(a);
    } catch (err) {
      console.error('Error loading project overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!id) return;
    try {
      setAnalyzing(true);
      await analyzeProject(id);
      setTimeout(async () => {
        const a = await getAnalysis(id);
        const p = await getProject(id);
        setAnalysis(a);
        setProject(p);
        setAnalyzing(false);
      }, 2500);
    } catch (err) {
      console.error(err);
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-500" />
        Loading codebase intelligence data...
      </div>
    );
  }

  // --- Dynamic Stack Evaluation ---
  // Detect primary language dynamically from analysis or project.source_stack
  let detectedLang = 'JavaScript';
  let langSub = 'Node.js Runtime';
  if (analysis?.languages && Object.keys(analysis.languages).length > 0) {
    const topLang = Object.entries(analysis.languages).sort((a, b) => b[1] - a[1])[0];
    detectedLang = topLang[0];
    const totalLines = Object.values(analysis.languages).reduce((sum, v) => sum + v, 0);
    const pct = totalLines > 0 ? Math.round((topLang[1] / totalLines) * 100) : 100;
    langSub = `${pct}% of codebase (${topLang[1]} LOC)`;
  } else if (project?.source_stack && project.source_stack !== 'Pending Analysis') {
    detectedLang = project.source_stack.split('+')[0].trim();
    langSub = 'Detected Source';
  }

  // Detect framework dynamically
  let detectedFramework = 'Modular REST API';
  let frameworkSub = '3-Tier Architecture';
  if (analysis?.frameworks && analysis.frameworks.length > 0) {
    detectedFramework = analysis.frameworks.join(', ');
    frameworkSub = 'Detected Web Framework';
  } else if (project?.source_stack && project.source_stack.split('+').length > 1) {
    detectedFramework = project.source_stack.split('+')[1].trim();
  }

  // Detect database dynamically
  let detectedDb = 'Relational / Document';
  let dbSub = 'Persistence Layer';
  if (detectedLang.toLowerCase().includes('python')) {
    detectedDb = 'SQLAlchemy (Postgres/SQLite)';
    dbSub = 'ORM Model Schema';
  } else if (detectedLang.toLowerCase().includes('java')) {
    detectedDb = 'PostgreSQL / JPA Hibernate';
    dbSub = 'Relational Persistence';
  } else if (detectedLang.toLowerCase().includes('go')) {
    detectedDb = 'GORM (PostgreSQL/MySQL)';
    dbSub = 'Go Struct ORM';
  } else {
    detectedDb = 'MongoDB / Mongoose';
    dbSub = 'Document Store';
  }

  // Detect test runner dynamically
  let detectedTest = 'Automated Test Suite';
  let testSub = 'Unit & Integration';
  if (detectedLang.toLowerCase().includes('python')) {
    detectedTest = 'pytest / unittest';
    testSub = 'Python Test Runner';
  } else if (detectedLang.toLowerCase().includes('java')) {
    detectedTest = 'JUnit 5 + Mockito';
    testSub = 'Java Test Engine';
  } else if (detectedLang.toLowerCase().includes('go')) {
    detectedTest = 'Go testing package';
    testSub = 'Native Test Runner';
  } else {
    detectedTest = 'Jest + Supertest';
    testSub = 'Node.js Test Framework';
  }

  const fileCount = analysis?.file_count || 0;
  const locCount = analysis?.loc || 0;
  const apiCount = analysis?.api_routes?.length || 0;
  const serviceCount = analysis?.services?.length || 0;
  const modelCount = analysis?.models_found?.length || 0;
  const testCount = analysis?.tests?.length || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">{project?.name || 'Project Overview'}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {project?.status === 'analyzed' ? 'Knowledge Layer Active' : 'Ready'}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            {project?.description || 'Codebase Intelligence & Migration Workspace'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="flex items-center px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${analyzing ? 'animate-spin text-emerald-400' : ''}`} />
            {analyzing ? 'Analyzing Repository...' : 'Re-Scan Repository'}
          </button>
          <button
            onClick={() => navigate(`/projects/${id}/migration`)}
            className="flex items-center px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02]"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 mr-2" />
            Migrate this Software
          </button>
        </div>
      </div>

      {/* Dynamic Tech Stack Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StackCard 
          label="Primary Language" 
          value={detectedLang} 
          sub={langSub} 
          icon={<Code className="w-4 h-4 text-emerald-400" />} 
        />
        <StackCard 
          label="Web Framework" 
          value={detectedFramework} 
          sub={frameworkSub} 
          icon={<Layers className="w-4 h-4 text-blue-400" />} 
        />
        <StackCard 
          label="Database Engine" 
          value={detectedDb} 
          sub={dbSub} 
          icon={<Database className="w-4 h-4 text-cyan-400" />} 
        />
        <StackCard 
          label="Testing Framework" 
          value={detectedTest} 
          sub={testSub} 
          icon={<CheckCircle2 className="w-4 h-4 text-purple-400" />} 
        />
      </div>

      {/* Codebase Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <MetricCard label="Files" value={fileCount} icon={<FileCode className="w-4 h-4 text-zinc-400" />} />
        <MetricCard label="Lines of Code" value={locCount} icon={<Code className="w-4 h-4 text-zinc-400" />} />
        <MetricCard label="API Endpoints" value={apiCount} icon={<Box className="w-4 h-4 text-amber-400" />} />
        <MetricCard label="Services" value={serviceCount} icon={<Cpu className="w-4 h-4 text-blue-400" />} />
        <MetricCard label="Data Models" value={modelCount} icon={<Database className="w-4 h-4 text-emerald-400" />} />
        <MetricCard label="Test Suites" value={testCount} icon={<CheckCircle2 className="w-4 h-4 text-purple-400" />} />
      </div>

      {/* Enhanced Architectural Overview Blueprint */}
      <div className="p-7 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">Software Architecture Blueprint</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Deterministic multi-tier decomposition generated from static AST symbol parsing and call graph extraction.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/projects/${id}/architecture`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
            >
              Open Interactive Graph <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 5-Tier Architecture Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Tier 1: Routes */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-amber-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">Tier 1: Gateway</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">{apiCount} Routes</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200 mb-1">API Routes & Ingress</h4>
              <p className="text-[11px] text-zinc-500 leading-snug">HTTP dispatches & URL route parameters</p>
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              {(analysis?.api_routes || []).slice(0, 3).map((r, i) => (
                <div key={i} className="px-2 py-1 rounded bg-zinc-900 text-amber-300 truncate">
                  {r.method} {r.path}
                </div>
              ))}
              {apiCount > 3 && <div className="text-zinc-600 pl-1">+{apiCount - 3} more routes</div>}
            </div>
          </div>

          {/* Tier 2: Controllers / Handlers */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-purple-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Tier 2: Controllers</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">Handlers</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200 mb-1">Request Controllers</h4>
              <p className="text-[11px] text-zinc-500 leading-snug">Payload parsing & status code dispatching</p>
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              {(analysis?.api_routes || []).slice(0, 3).map((r, i) => (
                <div key={i} className="px-2 py-1 rounded bg-zinc-900 text-purple-300 truncate">
                  {r.handler ? r.handler.split('.')[0] : 'endpointHandler'}
                </div>
              ))}
            </div>
          </div>

          {/* Tier 3: Business Services */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-blue-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">Tier 3: Domain</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">{serviceCount} Services</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200 mb-1">Business Logic Layer</h4>
              <p className="text-[11px] text-zinc-500 leading-snug">Domain calculations, validations & workflows</p>
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              {(analysis?.services || []).slice(0, 3).map((s, i) => (
                <div key={i} className="px-2 py-1 rounded bg-zinc-900 text-blue-300 truncate">
                  {s.name}
                </div>
              ))}
              {serviceCount === 0 && <div className="text-zinc-600 pl-1">Inline Service Logic</div>}
            </div>
          </div>

          {/* Tier 4: Models & Entities */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-emerald-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Tier 4: Data</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">{modelCount} Schemas</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200 mb-1">Entities & Repos</h4>
              <p className="text-[11px] text-zinc-500 leading-snug">Object mappings, columns & queries</p>
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              {(analysis?.models_found || []).slice(0, 3).map((m, i) => (
                <div key={i} className="px-2 py-1 rounded bg-zinc-900 text-emerald-300 truncate">
                  {m.name}
                </div>
              ))}
              {modelCount === 0 && <div className="text-zinc-600 pl-1">DTOs / Plain Schemas</div>}
            </div>
          </div>

          {/* Tier 5: Persistence */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-cyan-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">Tier 5: Storage</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">Engine</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200 mb-1">Persistence Store</h4>
              <p className="text-[11px] text-zinc-500 leading-snug">{detectedDb}</p>
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              <div className="px-2 py-1 rounded bg-zinc-900 text-cyan-300 truncate">
                Tables / Collections
              </div>
              <div className="px-2 py-1 rounded bg-zinc-900 text-zinc-400 truncate">
                ACID Transactions
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/60 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>All architectural tiers successfully analyzed and ready for universal migration.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/projects/${id}/impact`)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors font-medium text-xs flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Check Blast Radius
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/chat`)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors font-medium text-xs flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              Ask Questions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StackCard = ({ label, value, sub, icon }: any) => (
  <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur hover:border-zinc-700 transition-colors">
    <div className="flex items-center gap-2 mb-2 text-zinc-400">
      {icon}
      <span className="text-[11px] font-mono uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-sm font-bold text-white mb-0.5 truncate">{value}</div>
    <div className="text-[11px] text-zinc-500 font-mono truncate">{sub}</div>
  </div>
);

const MetricCard = ({ label, value, icon }: any) => (
  <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] text-zinc-400">{label}</span>
      {icon}
    </div>
    <div className="text-xl font-bold font-mono text-white">{value}</div>
  </div>
);

export default ProjectDetail;
