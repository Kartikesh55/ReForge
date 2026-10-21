import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { StatusBadge } from '../components/StatusBadge';
import { useWebSocket } from '../hooks/useWebSocket';

const MainLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isConnected } = useWebSocket(id);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between h-14 px-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-zinc-200">Project: {id}</span>
            <StatusBadge status="running" size="sm" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-zinc-400">Agent Status</span>
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-zinc-950/50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
