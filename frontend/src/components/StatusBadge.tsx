import React from 'react';
import clsx from 'clsx';
import { ProjectStatus } from '../types';

interface StatusBadgeProps {
  status: ProjectStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isRunning = ['analyzing', 'planning', 'migrating', 'verifying', 'modernizing'].includes(status);
  const isSuccess = ['analyzed', 'planned', 'migrated', 'verified', 'completed'].includes(status);
  const isError = status === 'failed';
  const isWarning = status === 'warning';
  
  const bgColors = {
    running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    default: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };

  const getStyle = () => {
    if (isRunning) return bgColors.running;
    if (isSuccess) return bgColors.success;
    if (isError) return bgColors.error;
    if (isWarning) return bgColors.warning;
    return bgColors.default;
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border font-medium capitalize',
        sizes[size],
        getStyle()
      )}
    >
      {isRunning && (
        <span className="mr-1.5 flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
      )}
      {status}
    </span>
  );
};
