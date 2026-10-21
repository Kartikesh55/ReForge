import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Play } from 'lucide-react';

const Migration: React.FC = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-6">
      <PageHeader 
        title="Migration Workspace" 
        description="Autonomous code translation and architectural transformation."
      >
        <button className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-medium transition-colors shadow-lg shadow-emerald-900/20">
          <Play className="w-4 h-4 mr-2" />
          Start Migration Pipeline
        </button>
      </PageHeader>

      <div className="flex-1 flex gap-6">
        {/* Split View Placeholder */}
        <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Source (Legacy)</span>
            <span className="text-xs text-zinc-500">models/user.py</span>
          </div>
          <div className="flex-1 p-4 font-mono text-sm text-zinc-600">
            class User(models.Model):<br/>
            &nbsp;&nbsp;name = models.CharField(max_length=255)<br/>
            &nbsp;&nbsp;email = models.EmailField(unique=True)<br/>
            ...
          </div>
        </div>

        <div className="w-12 flex items-center justify-center">
          <div className="w-px h-full bg-zinc-800"></div>
        </div>

        <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
            <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Target (Modern)</span>
            <span className="text-xs text-zinc-500">internal/models/user.go</span>
          </div>
          <div className="flex-1 p-4 font-mono text-sm text-zinc-500 italic flex items-center justify-center">
            Awaiting migration generation...
          </div>
        </div>
      </div>

      <div className="h-48 mt-6 rounded-lg border border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-2 border-b border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-2">Agent Activity Console</span>
        </div>
        <div className="flex-1 p-4 font-mono text-xs text-zinc-400 overflow-y-auto space-y-2">
          <div className="text-emerald-500">&gt; System initialized. Ready to begin migration.</div>
        </div>
      </div>
    </div>
  );
};

export default Migration;
