import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Search } from 'lucide-react';

const Archaeologist: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <PageHeader 
        title="Software Archaeologist" 
        description="Deep analysis of legacy source code, dependencies, and architecture."
      >
        <button className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-medium transition-colors">
          <Search className="w-4 h-4 mr-2" />
          Analyze Repository
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900/50 h-64 flex items-center justify-center">
          <p className="text-zinc-500">Language Distribution (Coming Phase 3)</p>
        </div>
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900/50 h-64 flex items-center justify-center">
          <p className="text-zinc-500">Frameworks Detected (Coming Phase 3)</p>
        </div>
      </div>
    </div>
  );
};

export default Archaeologist;
