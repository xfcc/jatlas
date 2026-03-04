'use client';

import { useConsole } from '@/app/console/ConsoleState';

const Header = () => {
  const { setIsFormOpen, setSelectedActress } = useConsole();

  const handleNewClick = () => {
    setSelectedActress(undefined);
    setIsFormOpen(true);
  };

  return (
    <header className="h-16 flex-shrink-0 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 px-8 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">演员管理大盘 (Dashboard)</h1>
        <div className="text-xs text-zinc-500 font-mono mt-1">Total Records: 1,248 | Active Risks: 32</div>
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
          className="bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-semibold px-4 py-2 rounded-md transition-colors shadow-sm flex items-center gap-2"
          onClick={handleNewClick}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          新增女优 (New)
        </button>
      </div>
    </header>
  );
};

export default Header;
