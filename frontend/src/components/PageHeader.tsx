import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, children }) => {
  return (
    <div className="flex items-center justify-between pb-6 border-b border-zinc-800 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">{title}</h1>
        {description && <p className="text-zinc-400 mt-1 text-sm">{description}</p>}
      </div>
      {children && <div className="flex items-center space-x-3">{children}</div>}
    </div>
  );
};
