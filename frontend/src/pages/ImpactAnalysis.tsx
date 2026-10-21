import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getImpact, getArchitecture, getAnalysis } from '../services/api';
import type { ImpactResult } from '../types';
import { 
  ShieldAlert, AlertTriangle, CheckCircle, ArrowRight, 
  Cpu, FileCode, Box, Shield, RefreshCw 
} from 'lucide-react';

interface ComponentItem {
  id: string;
  label: string;
  type: string;
}

const ImpactAnalysis: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [selectedComp, setSelectedComp] = useState<string>('');
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadComponents();
    }
  }, [id]);

  const loadComponents = async () => {
    try {
      setLoading(true);
      const arch = await getArchitecture(id!);
      const list: ComponentItem[] = [];
      const seen = new Set<string>();

      (arch.nodes || []).forEach((n: any) => {
        const rawType = n.data?.rawType || n.type || 'component';
        const label = n.data?.rawLabel || n.data?.label || n.id;
        const compId = n.id;
        if (!seen.has(compId) && compId !== 'db_main') {
          seen.add(compId);
          list.push({ id: compId, label, type: rawType });
        }
      });

      if (list.length === 0) {
        const a = await getAnalysis(id!);
        (a.controllers || []).forEach((c: any) => {
          if (!seen.has(c.name)) { seen.add(c.name); list.push({ id: c.id || c.name, label: c.name, type: 'controller' }); }
        });
        (a.services || []).forEach((s: any) => {
          if (!seen.has(s.name)) { seen.add(s.name); list.push({ id: s.id || s.name, label: s.name, type: 'service' }); }
        });
        (a.models_found || []).forEach((m: any) => {
          if (!seen.has(m.name)) { seen.add(m.name); list.push({ id: m.id || m.name, label: m.name, type: 'model' }); }
        });
      }

      setComponents(list);
      if (list.length > 0) {
        setSelectedComp(list[0].id);
        await runAnalysis(list[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const runAnalysis = async (comp: string) => {
    if (!id || !comp) return;
    try {
      setLoading(true);
      const res = await getImpact(id, comp);
      setImpact(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (newComp: string) => {
    setSelectedComp(newComp);
    runAnalysis(newComp);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Blast Radius & Impact Analysis</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Deterministically calculates downstream dependents, affected API routes, and impacted test suites prior to modification or migration.
          </p>
        </div>

        {/* Component Selector */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl">
          <span className="text-[11px] font-mono text-zinc-500 pl-2">Select Component:</span>
          <select
            value={selectedComp}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 max-w-[260px] truncate"
          >
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.type.toUpperCase()}] {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin mr-2 text-emerald-500" />
          Traversing NetworkX dependency graph...
        </div>
      ) : impact ? (
        <div className="space-y-6">
          {/* Risk Level Alert Banner */}
          <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
            impact.risk === 'High' 
              ? 'bg-red-500/10 border-red-500/30 text-red-300' 
              : impact.risk === 'Medium' 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            {impact.risk === 'High' ? (
              <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
            ) : (
              <Shield className="w-6 h-6 text-emerald-400 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold uppercase tracking-wider font-mono">
                  {impact.risk} Impact Component: {impact.component}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-700 font-mono">
                  {impact.blast_radius_count} Connected Entities
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {impact.risk_reason || 'Critical business component affecting multiple service layers.'}
              </p>
            </div>
          </div>

          {/* 3 Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Direct Dependents */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-zinc-500 uppercase">Direct Dependents</span>
                <Cpu className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white mb-3">
                {impact.direct_dependents.length}
              </div>
              <div className="space-y-1.5">
                {impact.direct_dependents.map((dep, i) => (
                  <div key={i} className="p-2 rounded bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono text-zinc-300 flex items-center justify-between">
                    <span>{dep}</span>
                    <span className="text-[10px] text-blue-400">Caller</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Affected APIs */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-zinc-500 uppercase">Potentially Affected APIs</span>
                <Box className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white mb-3">
                {impact.affected_apis.length}
              </div>
              <div className="space-y-1.5">
                {impact.affected_apis.map((api, i) => (
                  <div key={i} className="p-2 rounded bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono text-zinc-300 flex items-center justify-between">
                    <span className="text-amber-300">{api}</span>
                    <span className="text-[10px] text-zinc-500">Route</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Affected Tests */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-zinc-500 uppercase">Impacted Test Suites</span>
                <FileCode className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white mb-3">
                {impact.affected_tests.length}
              </div>
              <div className="space-y-1.5">
                {impact.affected_tests.map((test, i) => (
                  <div key={i} className="p-2 rounded bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono text-zinc-300 flex items-center justify-between">
                    <span>{test}</span>
                    <span className="text-[10px] text-purple-400">Jest</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Proceed to Migration Planning</h4>
              <p className="text-xs text-zinc-400">This component has been classified with specific transformation mappings.</p>
            </div>
            <button
              onClick={() => navigate(`/projects/${id}/migration`)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              Configure Target Migration <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ImpactAnalysis;
