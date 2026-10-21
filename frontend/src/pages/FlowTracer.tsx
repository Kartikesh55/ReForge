import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { GitBranch } from 'lucide-react';

const FlowTracer: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <PageHeader 
        title="Flow Tracer" 
        description="Trace a specific feature or API request through the entire stack."
      />

      <div className="flex space-x-4 mb-6">
        <input 
          type="text" 
          placeholder="e.g. User Registration Flow" 
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-4 text-zinc-100 focus:outline-none focus:border-emerald-500"
        />
        <button className="flex items-center px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 rounded-md font-medium transition-colors">
          <GitBranch className="w-4 h-4 mr-2" />
          Trace
        </button>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 h-[500px] flex items-center justify-center">
        <p className="text-zinc-500">Flow visualization will appear here (Coming Phase 4)</p>
      </div>
    </div>
  );
};

export default FlowTracer;
