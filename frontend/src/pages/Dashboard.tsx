import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { FolderGit2, Play, Plus } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-8">
      <PageHeader title="Dashboard" description="Overview of your migration projects" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
          <h3 className="text-zinc-400 text-sm font-medium">Total Projects</h3>
          <p className="text-3xl font-bold text-zinc-100 mt-2">3</p>
        </div>
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
          <h3 className="text-zinc-400 text-sm font-medium">Active Migrations</h3>
          <p className="text-3xl font-bold text-zinc-100 mt-2">1</p>
        </div>
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
          <h3 className="text-zinc-400 text-sm font-medium">Completed</h3>
          <p className="text-3xl font-bold text-emerald-400 mt-2">2</p>
        </div>
      </div>

      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-medium transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </button>
        <button
          onClick={() => navigate('/projects/demo/archaeologist')}
          className="flex items-center px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 rounded-md font-medium transition-colors"
        >
          <Play className="w-4 h-4 mr-2" />
          Run Demo
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 text-zinc-100">Recent Projects</h2>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-colors flex items-center justify-between cursor-pointer" onClick={() => navigate(`/projects/demo-${i}/archaeologist`)}>
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-zinc-800 rounded-md">
                  <FolderGit2 className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <h4 className="text-zinc-100 font-medium">Legacy Monolith {i}</h4>
                  <p className="text-sm text-zinc-500">Node.js Express to Go Microservices</p>
                </div>
              </div>
              <div className="text-sm text-zinc-400">
                Updated 2 days ago
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
