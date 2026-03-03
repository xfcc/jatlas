
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tier } from '@prisma/client';
import { useDebouncedCallback } from 'use-debounce';

const FilterToolbar = ({ tiers }: { tiers: Tier[] }) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const handleTierChange = (tierId: string) => {
    const params = new URLSearchParams(searchParams);
    if (tierId) {
      params.set('tierId', tierId);
    } else {
      params.delete('tierId');
    }
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <input
            type="text"
            placeholder="按名称搜索... (Search)"
            className="bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-sm rounded-lg focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 block w-64 pl-10 p-2.5 placeholder-zinc-600 transition-all"
            onChange={(e) => handleSearch(e.target.value)}
            defaultValue={searchParams.get('query')?.toString()}
          />
        </div>

        <select
          className="bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-sm rounded-lg focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 p-2.5 cursor-pointer transition-all hover:border-zinc-700"
          onChange={(e) => handleStatusChange(e.target.value)}
          defaultValue={searchParams.get('status')?.toString()}
        >
          <option value="">所有状态 (All Status)</option>
          <option value="active">活跃 (Active)</option>
          <option value="retired">已引退 (Retired)</option>
        </select>

        <select
          className="bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-sm rounded-lg focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 p-2.5 cursor-pointer transition-all hover:border-zinc-700"
          onChange={(e) => handleTierChange(e.target.value)}
          defaultValue={searchParams.get('tierId')?.toString()}
        >
          <option value="">所有层级 (All Tiers)</option>
          {tiers.map((tier) => (
            <option key={tier.id} value={tier.id.toString()}>
              {tier.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
        <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors tooltip-trigger" title="Refresh Data" onClick={() => replace(pathname)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
        <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
        </button>
      </div>
    </div>
  );
};

export default FilterToolbar;
