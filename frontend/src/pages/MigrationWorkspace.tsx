import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { 
  createMigrationPlan, getMigrationPlan, startMigration, 
  getMigrationDiff, getDownloadTargetUrl 
} from '../services/api';
import type { MigrationPlan } from '../types';
import { 
  Play, Loader2, CheckCircle2, AlertTriangle, ArrowRight, 
  Download, Terminal, Layers, ArrowRightLeft, Sparkles, 
  CheckCircle, FileCode, Split, RefreshCw
} from 'lucide-react';

const MigrationWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Stack selection
  const [targetLang, setTargetLang] = useState('Java');
  const [targetFramework, setTargetFramework] = useState('Spring Boot');
  const [targetDb, setTargetDb] = useState('PostgreSQL');
  const [targetTesting, setTargetTesting] = useState('JUnit 5');

  // Migration Plan & Diff
  const [plan, setPlan] = useState<MigrationPlan | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'COMPLETE'>('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'plan' | 'diff' | 'console'>('plan');
  
  // Diff viewer state
  const [diffComponent, setDiffComponent] = useState('');
  const [diffData, setDiffData] = useState<any | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!id) return;
    loadPlan();

    // WebSocket connection for real-time agent console streaming
    const wsUrl = `ws://${window.location.host}/ws/projects/${id}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log') {
          setLogs((prev) => [...prev, data.message]);
        } else if (data.type === 'status') {
          if (data.message === 'RUNNING') setStatus('RUNNING');
          if (data.message === 'COMPLETE') {
            setStatus('COMPLETE');
            if (diffComponent) loadDiff(diffComponent);
          }
        } else if (data.type === 'agent_event') {
          setLogs((prev) => [...prev, `[${data.agent.toUpperCase()}] ${data.message}`]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [id]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const loadPlan = async () => {
    try {
      const res = await getMigrationPlan(id!);
      setPlan(res);
      if (res?.mappings && res.mappings.length > 0) {
        const firstComp = res.mappings[0].source || res.mappings[0].target;
        setDiffComponent((prev) => prev || firstComp);
        loadDiff(firstComp);
      } else {
        loadDiff('');
      }
    } catch (err) {
      console.error(err);
      loadDiff('');
    }
  };

  const loadDiff = async (comp: string) => {
    try {
      const d = await getMigrationDiff(id!, comp);
      setDiffData(d);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGeneratePlan = async () => {
    if (!id) return;
    try {
      const p = await createMigrationPlan(id, {
        language: targetLang,
        framework: targetFramework,
        database: targetDb,
        testing: targetTesting
      });
      setPlan(p);
      if (p?.mappings && p.mappings.length > 0) {
        const firstComp = p.mappings[0].source || p.mappings[0].target;
        setDiffComponent(firstComp);
        loadDiff(firstComp);
      }
      setActiveTab('plan');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartMigration = async () => {
    if (!id) return;
    try {
      setStatus('RUNNING');
      setActiveTab('console');
      setLogs([
        `[Planner] Target Stack Approved: ${targetLang} + ${targetFramework} + ${targetDb} + ${targetTesting}`,
        "[Planner] Commencing incremental 7-layer architecture migration...",
      ]);
      await startMigration(id, {
        language: targetLang,
        framework: targetFramework,
        database: targetDb,
        testing: targetTesting
      });
    } catch (err) {
      console.error(err);
      setStatus('IDLE');
    }
  };

  const handleDiffCompChange = (comp: string) => {
    setDiffComponent(comp);
    loadDiff(comp);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-zinc-950 text-zinc-100 p-6 overflow-hidden">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">Universal Migration Workspace</h1>
          </div>
          <p className="text-xs text-zinc-400">
            {plan?.source_stack ? (
              <span>{plan.source_stack.language} {plan.source_stack.framework ? `/ ${plan.source_stack.framework}` : ''}</span>
            ) : (
              <span>Source Project</span>
            )}
            <span className="text-zinc-600 mx-1.5">&rarr;</span> 
            <span className="text-emerald-400 font-semibold">{targetLang} / {targetFramework} / {targetDb}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {status === 'COMPLETE' && (
            <a
              href={getDownloadTargetUrl(id!)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg text-white border border-zinc-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Download Target Project (.ZIP)
            </a>
          )}

          <button
            onClick={handleStartMigration}
            disabled={status === 'RUNNING'}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all shadow-lg ${
              status === 'RUNNING'
                ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 hover:scale-[1.02]'
            }`}
          >
            {status === 'RUNNING' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                Autonomous Agents Migrating...
              </>
            ) : status === 'COMPLETE' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Re-Run Migration Pipeline
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Start Migration Pipeline
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target Stack Configuration Bar */}
      <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 shrink-0 text-xs">
        <div>
          <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Target Language</label>
          <select
            value={targetLang}
            onChange={(e) => {
              setTargetLang(e.target.value);
              if (e.target.value === 'Java') {
                setTargetFramework('Spring Boot'); setTargetTesting('JUnit 5');
              } else if (e.target.value === 'Python') {
                setTargetFramework('FastAPI'); setTargetTesting('pytest');
              } else if (e.target.value === 'Go') {
                setTargetFramework('Gin'); setTargetTesting('testing');
              } else if (e.target.value === 'TypeScript') {
                setTargetFramework('NestJS'); setTargetTesting('Jest');
              }
            }}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="Java">Java 21 (Spring Boot)</option>
            <option value="Python">Python 3.12 (FastAPI)</option>
            <option value="Go">Go 1.22 (Gin)</option>
            <option value="TypeScript">TypeScript (NestJS)</option>
            <option value="CSharp">C# 12 (.NET Core)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Target Framework</label>
          <select
            value={targetFramework}
            onChange={(e) => setTargetFramework(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="Spring Boot">Spring Boot 3.2</option>
            <option value="FastAPI">FastAPI</option>
            <option value="Gin">Gin Web Framework</option>
            <option value="NestJS">NestJS</option>
            <option value="ASP.NET Core">ASP.NET Core 8</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Target Database</label>
          <select
            value={targetDb}
            onChange={(e) => setTargetDb(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="PostgreSQL">PostgreSQL</option>
            <option value="MySQL">MySQL</option>
            <option value="SQLite">SQLite</option>
            <option value="MongoDB">MongoDB</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Testing Framework</label>
          <select
            value={targetTesting}
            onChange={(e) => setTargetTesting(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="JUnit 5">JUnit 5 + Mockito</option>
            <option value="pytest">Pytest + Mock</option>
            <option value="testing">Go testing</option>
            <option value="Jest">Jest</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleGeneratePlan}
            className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Update Plan
          </button>
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 mb-4 shrink-0 text-xs">
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'plan' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Migration Plan & Mappings ({plan?.mappings?.length || 0})
        </button>

        <button
          onClick={() => {
            setActiveTab('diff');
            if (!diffData) {
              const comp = diffComponent || (plan?.mappings && plan.mappings[0]?.source) || '';
              loadDiff(comp);
            }
          }}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'diff' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Source &rarr; Target Diff Viewer
        </button>

        <button
          onClick={() => setActiveTab('console')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'console' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Agent Activity Console ({logs.length})
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* 1. MIGRATION PLAN TAB */}
        {activeTab === 'plan' && plan && (
          <div className="space-y-6 pb-6">
            {/* Risk Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider block mb-2">
                  High Risk Components ({plan.risks?.HIGH?.length || 0})
                </span>
                <div className="space-y-1.5 text-xs text-zinc-300">
                  {plan.risks?.HIGH?.map((r, i) => (
                    <div key={i} className="leading-snug">
                      <strong className="text-red-300 block">{r.component}</strong>
                      <span className="text-zinc-400 text-[11px]">{r.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block mb-2">
                  Medium Risk Components ({plan.risks?.MEDIUM?.length || 0})
                </span>
                <div className="space-y-1.5 text-xs text-zinc-300">
                  {plan.risks?.MEDIUM?.map((r, i) => (
                    <div key={i} className="leading-snug">
                      <strong className="text-amber-300 block">{r.component}</strong>
                      <span className="text-zinc-400 text-[11px]">{r.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                  Low Risk Deterministic ({plan.risks?.LOW?.length || 0})
                </span>
                <div className="space-y-1.5 text-xs text-zinc-300">
                  {plan.risks?.LOW?.map((r, i) => (
                    <div key={i} className="leading-snug">
                      <strong className="text-emerald-300 block">{r.component}</strong>
                      <span className="text-zinc-400 text-[11px]">{r.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mappings Table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-zinc-400">
                  Source-to-Target Mappings ({plan.mappings?.length || 0})
                </h3>
                <span className="text-xs text-emerald-400 font-mono">Confidence: {(plan.confidence * 100).toFixed(0)}%</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-mono text-[11px]">
                  <tr>
                    <th className="px-5 py-3">Source Origin</th>
                    <th className="px-5 py-3">Target Artifact</th>
                    <th className="px-5 py-3">Transformation Rule</th>
                    <th className="px-5 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-zinc-300 font-mono">
                  {plan.mappings?.map((m, i) => (
                    <tr 
                      key={i} 
                      onClick={() => {
                        handleDiffCompChange(m.source || m.target);
                        setActiveTab('diff');
                      }}
                      className="hover:bg-zinc-900/60 cursor-pointer transition-colors"
                      title="Click to inspect in Diff Viewer"
                    >
                      <td className="px-5 py-3 text-amber-400 hover:underline">{m.source}</td>
                      <td className="px-5 py-3 text-emerald-400">{m.target}</td>
                      <td className="px-5 py-3 text-zinc-400 font-sans text-xs">{m.description}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.risk === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {m.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. SIDE-BY-SIDE DIFF TAB */}
        {activeTab === 'diff' && (
          <div className="flex flex-col h-full space-y-4 pb-4">
            {/* Component Picker & Semantic explanation */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2 flex-wrap max-w-2xl">
                <span className="text-xs font-mono text-zinc-400 mr-1">Component:</span>
                {plan?.mappings && plan.mappings.length > 0 ? (
                  plan.mappings.map((m: any, idx: number) => {
                    const compKey = m.source || m.target;
                    const label = m.source ? m.source.split('/').pop() : (m.target ? m.target.split('/').pop() : `Comp ${idx + 1}`);
                    const isSelected = diffComponent === m.source || diffComponent === m.target || diffData?.source_path === m.source;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleDiffCompChange(compKey)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-emerald-600 text-white font-semibold shadow-sm' 
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        }`}
                        title={`${m.source} → ${m.target}`}
                      >
                        <FileCode className="w-3 h-3 text-emerald-300" />
                        <span>{label}</span>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs font-mono text-zinc-500">
                    {diffData?.component || 'Analyzing...'}
                  </span>
                )}
              </div>

              {diffData?.semantic_explanation && (
                <div className="text-xs text-zinc-300 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 flex-1 max-w-xl">
                  <span className="text-emerald-400 font-mono font-semibold mr-1.5">Semantic Mapping:</span>
                  {diffData.semantic_explanation}
                </div>
              )}
            </div>

            {/* Split Code View */}
            {diffData ? (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[400px]">
                {/* Left: Source */}
                <div className="rounded-xl border border-zinc-800 bg-[#1e1e1e] flex flex-col overflow-hidden">
                  <div className="p-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-amber-400 truncate max-w-[70%]" title={diffData.source_path}>
                      SOURCE: {diffData.source_path}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 uppercase font-semibold">
                      {diffData.source_lang || 'Source'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <Editor
                      height="100%"
                      language={diffData.source_lang}
                      theme="vs-dark"
                      value={diffData.source_code}
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                    />
                  </div>
                </div>

                {/* Right: Target */}
                <div className="rounded-xl border border-zinc-800 bg-[#1e1e1e] flex flex-col overflow-hidden">
                  <div className="p-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 truncate max-w-[70%]" title={diffData.target_path}>
                      TARGET: {diffData.target_path}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 uppercase font-semibold">
                      {diffData.target_lang || 'Target'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <Editor
                      height="100%"
                      language={diffData.target_lang}
                      theme="vs-dark"
                      value={diffData.target_code}
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-emerald-500" />
                Loading diff viewer...
              </div>
            )}
          </div>
        )}


        {/* 3. AGENT ACTIVITY CONSOLE TAB */}
        {activeTab === 'console' && (
          <div className="h-full rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-zinc-200 font-bold">Multi-Agent Streaming Activity Console</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                status === 'RUNNING' ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {status}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-zinc-300 space-y-2">
              {logs.length === 0 && (
                <div className="text-zinc-600 italic">
                  Agent event stream initialized. Click "Start Migration Pipeline" to begin autonomous translation.
                </div>
              )}
              {logs.map((log, i) => {
                let color = "text-zinc-300";
                if (log.includes("[PLANNER]") || log.includes("[Planner]")) color = "text-purple-400";
                else if (log.includes("[MIGRATION]") || log.includes("[Migration]")) color = "text-emerald-400";
                else if (log.includes("[BUILD]") || log.includes("[Build]")) color = "text-cyan-400";
                else if (log.includes("[VERIFICATION]") || log.includes("[Verification]")) color = "text-blue-400 font-semibold";
                else if (log.includes("[REPAIR]") || log.includes("[Repair]")) color = "text-amber-400 font-bold";

                return (
                  <div key={i} className={`leading-relaxed ${color}`}>
                    <span className="text-zinc-600 mr-2 text-[10px]">
                      {(new Date()).toISOString().split('T')[1].substring(0, 8)}
                    </span>
                    {log.replace(/\x1b\[[0-9;]*m/g, '')}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>

            {status === 'COMPLETE' && (
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Code migration complete. Proceed to behavioral verification to test contract equivalence.
                </div>
                <button
                  onClick={() => navigate(`/projects/${id}/verification`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  Open Verification Center <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrationWorkspace;
