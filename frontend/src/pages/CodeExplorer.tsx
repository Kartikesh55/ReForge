import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { getProjectFiles, getFileContent, getAnalysis } from '../services/api';
import { 
  FileCode, Folder, ChevronRight, ChevronDown, 
  Layers, Cpu, Database, CheckCircle2, ShieldAlert
} from 'lucide-react';

const CodeExplorer: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('routes/order.js');
  const [fileContent, setFileContent] = useState<string>('// Select a file to view code');
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadFiles();
    loadAnalysisData();
  }, [id]);

  useEffect(() => {
    if (selectedFile && id) {
      loadFile(selectedFile);
    }
  }, [selectedFile, id]);

  const loadFiles = async () => {
    try {
      const flist = await getProjectFiles(id!);
      setFiles(flist);
      if (flist.length > 0 && !flist.includes(selectedFile)) {
        const defaultF = flist.find(f => f.includes('order') || f.includes('server')) || flist[0];
        setSelectedFile(defaultF);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAnalysisData = async () => {
    try {
      const a = await getAnalysis(id!);
      setAnalysis(a);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFile = async (path: string) => {
    try {
      setLoading(true);
      const res = await getFileContent(id!, path);
      setFileContent(res.content);
    } catch (err) {
      console.error(err);
      setFileContent('// Error loading file content');
    } finally {
      setLoading(false);
    }
  };

  const getLanguage = (path: string) => {
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.java')) return 'java';
    if (path.endsWith('.go')) return 'go';
    if (path.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  // Extract symbols associated with selected file
  const activeSymbols = React.useMemo(() => {
    if (!analysis) return [];
    const syms = [];
    for (const r of analysis.api_routes || []) {
      if (r.file === selectedFile) syms.push({ name: `${r.method} ${r.path}`, type: 'Route Handler' });
    }
    for (const c of analysis.controllers || []) {
      if (c.file === selectedFile) syms.push({ name: c.name, type: 'Controller' });
    }
    for (const s of analysis.services || []) {
      if (s.file === selectedFile) syms.push({ name: s.name, type: 'Service' });
    }
    for (const m of analysis.models_found || []) {
      if (m.file === selectedFile) syms.push({ name: m.name, type: 'Mongoose Model' });
    }
    return syms;
  }, [selectedFile, analysis]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Breadcrumb Header */}
      <div className="h-12 border-b border-zinc-800/80 bg-zinc-950 px-6 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <Folder className="w-3.5 h-3.5 text-zinc-500" />
          <span>workspace</span>
          <span>/</span>
          <span className="text-emerald-400 font-semibold">{selectedFile}</span>
        </div>
        <div className="text-zinc-500 text-[11px]">
          Monaco Language: <span className="uppercase text-zinc-300">{getLanguage(selectedFile)}</span>
        </div>
      </div>

      {/* Main Split Body: Tree + Editor */}
      <div className="flex-1 flex min-h-0">
        {/* Left: File Tree Browser */}
        <div className="w-72 border-r border-zinc-800/80 bg-zinc-950/60 flex flex-col shrink-0">
          <div className="p-3 border-b border-zinc-800/80 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
            Repository Files ({files.length})
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {files.map((f) => {
              const isSelected = f === selectedFile;
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFile(f)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-mono transition-colors ${
                    isSelected 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <span className="truncate">{f}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center/Right: Monaco Editor & Bottom Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative bg-[#1e1e1e]">
            {loading ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
                Loading file content...
              </div>
            ) : (
              <Editor
                height="100%"
                language={getLanguage(selectedFile)}
                theme="vs-dark"
                value={fileContent}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 }
                }}
              />
            )}
          </div>

          {/* Bottom Relationships & Evidence Panel */}
          <div className="h-44 border-t border-zinc-800/80 bg-zinc-900/60 p-4 flex flex-col">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Symbol & Relationship Intelligence
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 block mb-1">Extracted Symbols</span>
                {activeSymbols.length > 0 ? (
                  <div className="space-y-1">
                    {activeSymbols.map((s, i) => (
                      <div key={i} className="text-zinc-300 flex justify-between">
                        <span className="text-emerald-400 truncate">{s.name}</span>
                        <span className="text-zinc-500 text-[10px]">{s.type}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-600 italic">No specific top-level symbols mapped</span>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 block mb-1">Direct Callers</span>
                <span className="text-zinc-400">Inbound dispatches from Express HTTP router</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 block mb-1">Target Transformation Target</span>
                <span className="text-blue-400">
                  {selectedFile.includes('order') ? 'Spring @RestController / OrderService.java' : 'Spring Components / Entity'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeExplorer;
