'use client';

import { useConsole } from '@/app/console/ConsoleState';
import { Plus } from 'lucide-react';

const Header = () => {
  const { setIsFormOpen, setSelectedActress, setIsBatchFormOpen } = useConsole();

  const handleNewClick = () => {
    setSelectedActress(undefined);
    setIsFormOpen(true);
  };

  const handleBatchNewClick = () => {
    setIsBatchFormOpen(true);
  };

  return (
    <header className="h-16 flex-shrink-0 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 px-8 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">演员管理大盘 (Dashboard)</h1>

      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-400 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          PostgreSQL Connected
        </span>
        <button 
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold px-4 py-2 rounded-md transition-colors shadow-sm flex items-center gap-2"
          onClick={handleBatchNewClick}
        >
          <Plus className="w-4 h-4" />
          批量新增
        </button>
        <button 
          className="bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-semibold px-4 py-2 rounded-md transition-colors shadow-sm flex items-center gap-2"
          onClick={handleNewClick}
        >
          <Plus className="w-4 h-4" />
          新增女优
        </button>
      </div>
    </header>
  );
};

export default Header;
