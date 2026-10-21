import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, ArrowRight, Zap, Shield, Sparkles, Layers, 
  Upload, CheckCircle, Code2, ArrowRightLeft, FolderGit2,
  AlertTriangle, XCircle, RefreshCw
} from 'lucide-react';
import { createDemoProject, createProject, uploadProjectZip, analyzeProject } from '../services/api';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkBackend = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setBackendOnline(true);
        setErrorMessage(null);
      } else {
        setBackendOnline(false);
      }
    } catch (e) {
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  const handleLaunchDemo = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const proj = await createDemoProject();
      if (proj && proj.id) {
        navigate(`/projects/${proj.id}`);
      } else {
        throw new Error('Project ID was not returned by the server');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message || 'Connection refused';
      setErrorMessage(`Cannot connect to backend server (${msg}). Please verify that backend is running at http://127.0.0.1:8000.`);
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !selectedFile) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const proj = await createProject({ name: uploadName, source: 'upload' });
      await uploadProjectZip(proj.id, selectedFile);
      await analyzeProject(proj.id);
      setShowUploadModal(false);
      navigate(`/projects/${proj.id}`);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message || 'Upload failed';
      setErrorMessage(`Upload failed (${msg}). Please make sure the backend server is running.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden flex flex-col text-zinc-100 selection:bg-emerald-500/30">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none"></div>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Flame className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white">ReForge</span>
            <span className="ml-2 text-xs font-mono text-zinc-500">Universal Migration</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/projects')}
            className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-1.5"
          >
            <FolderGit2 className="w-4 h-4" />
            Projects
          </button>
          <button 
            onClick={handleLaunchDemo}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-lg shadow-emerald-950/50"
          >
            {loading ? 'Launching Demo...' : '1-Click Demo'}
          </button>
        </div>
      </header>

      {/* Backend Offline Warning Banner */}
      {backendOnline === false && (
        <div className="relative z-20 mx-auto max-w-4xl w-full px-6 pt-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="font-semibold">Backend server unreachable:</span> Make sure the backend server is running on <code className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono text-[11px]">http://127.0.0.1:8000</code>.
                {errorMessage && <p className="mt-1 text-zinc-400 font-mono text-[10px]">{errorMessage}</p>}
              </div>
            </div>
            <button
              onClick={checkBackend}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors text-xs whitespace-nowrap ml-4"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {errorMessage && backendOnline !== false && (
        <div className="relative z-20 mx-auto max-w-4xl w-full px-6 pt-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs shadow-lg">
            <div className="flex items-center gap-2.5">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 text-red-400 hover:text-red-200 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-24 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-8 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          Two-Pillar Architecture: Understand Existing Software &rarr; Migrate Any Stack
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          Codebase Intelligence & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Software Migration Platform
          </span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
          Understand the software you inherited. Migrate the software you want to change.
          Preserve the knowledge, contracts, and behavioral integrity you already have.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            onClick={handleLaunchDemo}
            disabled={loading}
            className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/20 hover:scale-[1.02]"
          >
            <Zap className="w-5 h-5 fill-zinc-950" />
            {loading ? 'Initializing Demo Repository...' : 'Launch Golden Demo (Node.js &rarr; Java/FastAPI)'}
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-100 font-semibold transition-all flex items-center gap-2 hover:scale-[1.02]"
          >
            <Upload className="w-5 h-5 text-zinc-400" />
            Upload Custom Project (.ZIP)
          </button>
        </div>

        {/* Supported Stacks Carousel/Pills */}
        <div className="w-full max-w-4xl p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm mb-16">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-4">
            Convert Any Language Project into Any Target Framework
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-yellow-400 border border-yellow-500/20">Node.js / Express</span>
            <span className="text-zinc-600">&rarr;</span>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-blue-400 border border-blue-500/20">Java 21 / Spring Boot</span>
            <span className="text-zinc-600">|</span>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-emerald-400 border border-emerald-500/20">Python / FastAPI</span>
            <span className="text-zinc-600">|</span>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-cyan-400 border border-cyan-500/20">Go / Gin</span>
            <span className="text-zinc-600">|</span>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-purple-400 border border-purple-500/20">TypeScript / NestJS</span>
          </div>
        </div>

        {/* 4 Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full text-left">
          <FeatureCard 
            icon={<Layers className="w-5 h-5 text-blue-400" />}
            title="1. Static Analysis"
            desc="AST extraction of routes, controllers, services, entities, and NetworkX dependency graphs."
          />
          <FeatureCard 
            icon={<Code2 className="w-5 h-5 text-emerald-400" />}
            title="2. Grounded Chat"
            desc="RAG chat explicitly distinguishing Evidence, Analysis, and Hypothesis with file line citations."
          />
          <FeatureCard 
            icon={<ArrowRightLeft className="w-5 h-5 text-amber-400" />}
            title="3. Incremental Migration"
            desc="Target project scaffolding, entities, repositories, services, controllers, and tests."
          />
          <FeatureCard 
            icon={<Shield className="w-5 h-5 text-purple-400" />}
            title="4. Autonomous Verification"
            desc="Executes behavioral scenario parity checks and auto-repairs contract discrepancies."
          />
        </div>
      </main>

      {/* Upload ZIP Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Upload Project Repository</h3>
            <p className="text-xs text-zinc-400 mb-6">Upload a ZIP archive containing any source language codebase (Node.js, Python, Go, Java, etc.).</p>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Project Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. My Microservice"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">ZIP File</label>
                <input 
                  type="file"
                  accept=".zip"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  {loading ? 'Uploading & Ingesting...' : 'Upload & Ingest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur hover:bg-zinc-900/60 transition-colors">
    <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-3">
      {icon}
    </div>
    <h3 className="text-sm font-bold text-zinc-100 mb-1.5">{title}</h3>
    <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
  </div>
);

export default Landing;
