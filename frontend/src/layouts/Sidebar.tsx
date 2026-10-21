import React from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  Flame, LayoutDashboard, FolderGit2, Network,
  Code2, MessageSquare, ShieldAlert,
  ArrowRightLeft, CheckCircle2, FileDown,
  ArrowLeft
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const projectLinksIntelligence = [
    { name: 'Overview', path: `/projects/${id}`, icon: LayoutDashboard, exact: true },
    { name: 'Architecture Explorer', path: `/projects/${id}/architecture`, icon: Network },
    { name: 'Code Explorer', path: `/projects/${id}/code`, icon: Code2 },
    { name: 'Codebase Chat', path: `/projects/${id}/chat`, icon: MessageSquare },
    { name: 'Impact Analysis', path: `/projects/${id}/impact`, icon: ShieldAlert },
  ];

  const projectLinksMigration = [
    { name: 'Migration Workspace', path: `/projects/${id}/migration`, icon: ArrowRightLeft },
    { name: 'Verification Center', path: `/projects/${id}/verification`, icon: CheckCircle2 },
    { name: 'Reports & Export', path: `/projects/${id}/report`, icon: FileDown },
  ];

  const NavItem = ({ name, path, icon: Icon, exact }: any) => (
    <NavLink
      to={path}
      end={exact}
      className={({ isActive }) =>
        clsx(
          'flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-xs font-medium',
          isActive
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
        )
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{name}</span>
    </NavLink>
  );

  return (
    <div className="w-64 flex-shrink-0 border-r border-zinc-800/80 bg-zinc-950 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div 
        onClick={() => navigate('/projects')}
        className="h-16 flex items-center px-5 border-b border-zinc-800/80 cursor-pointer hover:bg-zinc-900/40 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mr-3">
          <Flame className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <div className="font-bold text-base text-zinc-100 tracking-tight flex items-center gap-1.5">
            ReForge <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-full font-mono font-medium">v2.0</span>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">Any &rarr; Any Migration</p>
        </div>
      </div>

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        <div>
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center space-x-2 px-3 py-2 w-full rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
          >
            <FolderGit2 className="w-4 h-4 text-zinc-500" />
            <span>All Projects</span>
          </button>
        </div>

        {id && (
          <>
            <div>
              <div className="px-3 mb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                Codebase Intelligence
              </div>
              <div className="space-y-1">
                {projectLinksIntelligence.map((link) => <NavItem key={link.name} {...link} />)}
              </div>
            </div>

            <div>
              <div className="px-3 mb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                Software Migration
              </div>
              <div className="space-y-1">
                {projectLinksMigration.map((link) => <NavItem key={link.name} {...link} />)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60">
        <div className="text-[11px] text-zinc-500 flex items-center justify-between">
          <span className="font-mono">Engine: Active</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>
    </div>
  );
};
