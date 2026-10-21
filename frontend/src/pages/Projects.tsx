import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getProjects, createDemoProject, createProject, 
  uploadProjectZip, analyzeProject, deleteProject 
} from '../services/api';
import type { Project } from '../types';
import { 
  Plus, FolderGit2, Trash2, ArrowRight, Layers, 
  RefreshCw, Zap, Upload, X, CheckCircle2, FileArchive,
  AlertTriangle, XCircle
} from 'lucide-react';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProjectsList();
  }, []);

  const loadProjectsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProjects();
      setProjects(res);
      setBackendOnline(true);
      if (res.length === 0) {
        const demo = await createDemoProject();
        setProjects([demo]);
      }
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setBackendOnline(false);
      const msg = err.response?.data?.detail || err.message || 'Connection failed';
      setError(`Cannot connect to backend server (${msg}). Please verify that backend is running at http://127.0.0.1:8000.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDemo = async () => {
    try {
      setLoading(true);
      setError(null);
      const proj = await createDemoProject();
      navigate(`/projects/${proj.id}`);
    } catch (err: any) {
      console.error('Error launching demo:', err);
      setBackendOnline(false);
      const msg = err.response?.data?.detail || err.message || 'Connection failed';
      setError(`Failed to launch demo project (${msg}). Make sure the backend server is running.`);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim() || !selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      // 1. Create project
      const proj = await createProject({
        name: uploadName.trim(),
        description: `Imported codebase from ${selectedFile.name}`,
        source: 'upload'
      });

      // 2. Upload ZIP
      await uploadProjectZip(proj.id, selectedFile);

      // 3. Trigger initial analysis
      await analyzeProject(proj.id);

      // 4. Navigate directly into project overview
      setShowUploadModal(false);
      navigate(`/projects/${proj.id}`);
    } catch (err: any) {
      console.error('Error uploading project zip:', err);
      const msg = err.response?.data?.detail || err.message || 'Upload failed';
      setError(`Project upload failed (${msg}). Check your backend connection.`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(`Failed to delete project: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-emerald-400" />
            Project Workspaces
          </h1>
          <p className="text-xs text-zinc-400">
            Select an existing workspace or upload a new codebase (.ZIP) in Python, Go, Java, or JavaScript.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-semibold border border-zinc-700 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            Upload Project (.ZIP)
          </button>

          <button
            onClick={handleCreateDemo}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02]"
          >
            <Zap className="w-4 h-4 fill-white" />
            Launch Golden Demo
          </button>
        </div>
      </div>

      {/* Offline / Error Banner */}
      {backendOnline === false && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-semibold">Backend server unreachable:</span> Ensure the backend is running on <code className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono text-[11px]">http://127.0.0.1:8000</code>.
              {error && <p className="mt-1 text-zinc-400 font-mono text-[10px]">{error}</p>}
            </div>
          </div>
          <button
            onClick={loadProjectsList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors text-xs whitespace-nowrap ml-4"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {error && backendOnline !== false && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs shadow-lg">
          <div className="flex items-center gap-2.5">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin mr-2 text-emerald-500" />
          Loading project workspaces...
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-zinc-800/80 rounded-2xl bg-zinc-900/20 p-8">
          <FolderGit2 className="w-10 h-10 text-zinc-600 mb-3" />
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">No Projects Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mb-6">
            {backendOnline === false 
              ? 'Could not load projects because backend is offline. Start the backend server and click Retry.'
              : 'Launch the Golden Demo or upload your custom project (.ZIP) to start analyzing code.'}
          </p>
          <div className="flex gap-3">
            {backendOnline === false ? (
              <button
                onClick={loadProjectsList}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
              >
                Retry Backend Connection
              </button>
            ) : (
              <>
                <button
                  onClick={handleCreateDemo}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Launch Golden Demo
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-700"
                >
                  Upload Project (.ZIP)
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            const isPython = p.source_stack?.toLowerCase().includes('python');
            const isGo = p.source_stack?.toLowerCase().includes('go');
            const isJava = p.source_stack?.toLowerCase().includes('java');
            let langColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            if (isPython) langColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            else if (isGo) langColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
            else if (isJava) langColor = 'bg-red-500/10 text-red-400 border-red-500/20';

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="group p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 cursor-pointer transition-all hover:border-zinc-700 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${langColor}`}>
                      {p.source_stack?.split('+')[0]?.trim() || 'Detected Stack'}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, p.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors mb-2">
                    {p.name}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                    {p.description || 'Codebase intelligence and universal migration workspace.'}
                  </p>

                  <div className="space-y-1.5 text-xs font-mono mb-4 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Source:</span>
                      <span className="text-amber-400 truncate max-w-[170px]">
                        {p.source_stack || 'Auto-Detecting...'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Target:</span>
                      <span className="text-emerald-400 truncate max-w-[170px]">
                        {p.target_stack || 'Java / Spring Boot'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                  <span className="font-mono text-[11px]">{p.id}</span>
                  <span className="text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold">
                    Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App Upload ZIP Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Upload New Project (.ZIP)</h3>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Upload any zip folder containing code in Python, JavaScript, TypeScript, Go, or Java. 
              The platform will automatically extract, scan imports, and construct the architecture graph.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Project Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. User Auth Microservice"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">ZIP Archive</label>
                <div className="p-4 border-2 border-dashed border-zinc-700 hover:border-emerald-500/60 rounded-xl bg-zinc-950/60 text-center transition-colors">
                  <input 
                    type="file"
                    accept=".zip"
                    required
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setSelectedFile(f);
                        if (!uploadName) {
                          setUploadName(f.name.replace('.zip', ''));
                        }
                      }
                    }}
                    className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                  />
                  {selectedFile && (
                    <div className="text-[11px] text-emerald-400 mt-2 font-mono flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile || !uploadName.trim()}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-950/40"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Analyzing Codebase...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Upload & Ingest
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
