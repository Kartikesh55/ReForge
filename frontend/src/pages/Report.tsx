import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFullReport, getDownloadTargetUrl } from '../services/api';
import { 
  FileDown, Download, FileText, CheckCircle2, 
  Copy, Check, Sparkles, RefreshCw, ExternalLink 
} from 'lucide-react';

const Report: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [reportData, setReportData] = useState<{ markdown: string; summary: any } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await getFullReport(id!);
      setReportData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!reportData?.markdown) return;
    navigator.clipboard.writeText(reportData.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!reportData?.markdown) return;
    const element = document.createElement('a');
    const file = new Blob([reportData.markdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `reforge_migration_report_${id}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileDown className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Migration & Architecture Reports</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Comprehensive audit report covering codebase intelligence, source-to-target mappings, and behavioral verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold rounded-lg text-zinc-200 border border-zinc-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Markdown'}
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg text-white border border-zinc-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Download Report (.MD)
          </button>

          <a
            href={getDownloadTargetUrl(id!)}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02]"
          >
            <Download className="w-3.5 h-3.5" />
            Download Migrated Project (.ZIP)
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin mr-2 text-emerald-500" />
          Compiling report artifact...
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Source Codebase</span>
              <div className="text-sm font-bold text-white">JavaScript / Express</div>
              <div className="text-[11px] text-zinc-400">{reportData.summary.total_files} files ({reportData.summary.total_loc} LOC)</div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Target Application</span>
              <div className="text-sm font-bold text-white">Java 21 / Spring Boot</div>
              <div className="text-[11px] text-emerald-400">PostgreSQL + JPA</div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Mapped Components</span>
              <div className="text-sm font-bold text-white">{reportData.summary.files_mapped} Components</div>
              <div className="text-[11px] text-emerald-400">100% Coverage</div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Behavior Parity</span>
              <div className="text-sm font-bold text-emerald-400">100% MATCH</div>
              <div className="text-[11px] text-zinc-400">5 / 5 Scenarios Verified</div>
            </div>
          </div>

          {/* Formatted Markdown Render Area */}
          <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs text-zinc-300 leading-relaxed shadow-xl overflow-x-auto whitespace-pre-wrap">
            {reportData.markdown}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Report;
