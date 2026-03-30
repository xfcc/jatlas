
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tier } from '@prisma/client';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from '@/hooks/use-toast';
import { syncEmbyIds, syncMovieCounts } from '@/lib/actions';
import { cn } from '@/lib/utils';

const FilterToolbar = ({ tiers, actressIds }: { tiers: Tier[], actressIds: number[] }) => {
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
    params.delete('page');
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleTierChange = (tierId: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (tierId) {
      params.set('tierId', tierId);
    } else {
      params.delete('tierId');
    }
    params.delete('page');
    replace(`${pathname}?${params.toString()}`);
  };

  const handleSyncEmbyIds = async () => {
    const { dismiss, update, id: toastId } = toast({ 
      title: '正在获取 Emby ID...', 
      description: '请稍候，正在为您准备任务...', 
      duration: Infinity 
    });

    try {
      const { taskId } = await syncEmbyIds(actressIds.map(String));

      const interval = setInterval(async () => {
        const response = await fetch(`/api/actresses/sync-emby-ids/${taskId}`);
        const task = await response.json();

        if (response.ok) {
          const description = task.lastProcessedItem
            ? `${task.lastProcessedItem.result === 'success' ? '✅' : task.lastProcessedItem.result === 'skipped' ? '⏭️' : '❌'} [${task.lastProcessedItem.name}] - ${task.lastProcessedItem.detail}`
            : '正在准备任务，请稍候...';

          update({ 
            id: toastId,
            title: `正在获取 Emby ID... (${task.progress}/${task.total})`,
            description: description
          });

          if (task.status.startsWith('completed')) {
            clearInterval(interval);
            update({ id: toastId, title: '成功', description: `Emby ID 获取任务已完成。${task.status}` });
          }
        } else {
          clearInterval(interval);
          update({ id: toastId, title: '错误', description: task.error, variant: 'destructive' });
        }
      }, 2000);

    } catch (error) {
      dismiss();
      toast({ title: '错误', description: '启动 Emby ID 获取任务失败，请查看控制台日志。', variant: 'destructive' });
      console.error(error);
    }
  };

  const handleSyncMovieCounts = async () => {
    const { dismiss, update, id: toastId } = toast({ 
      title: '正在更新影片数量...', 
      description: '请稍候，正在为您准备任务...', 
      duration: Infinity 
    });

    try {
      const { taskId } = await syncMovieCounts(actressIds.map(String));

      const interval = setInterval(async () => {
        const response = await fetch(`/api/actresses/sync-movie-counts/${taskId}`);
        const task = await response.json();

        if (response.ok) {
          const description = task.lastProcessedItem
            ? `${task.lastProcessedItem.result === 'success' ? '✅' : task.lastProcessedItem.result === 'skipped' ? '⏭️' : '❌'} [${task.lastProcessedItem.name}] - ${task.lastProcessedItem.detail}`
            : '正在准备任务，请稍候...';

          update({ 
            id: toastId,
            title: `正在更新影片数量... (${task.progress}/${task.total})`,
            description: description
          });

          if (task.status.startsWith('completed')) {
            clearInterval(interval);
            update({ id: toastId, title: '成功', description: `影片数量更新任务已完成。${task.status}` });
          }
        } else {
          clearInterval(interval);
          update({ id: toastId, title: '错误', description: task.error, variant: 'destructive' });
        }
      }, 2000);

    } catch (error) {
      dismiss();
      toast({ title: '错误', description: '启动影片数量更新任务失败，请查看控制台日志。', variant: 'destructive' });
      console.error(error);
    }
  };

  const activeTierId = searchParams.get('tierId') ?? '';

  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="group relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <input
            type="text"
            placeholder="按名称搜索..."
            className="block w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5 pl-10 text-sm text-zinc-300 placeholder-zinc-600 transition-all duration-200 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
            onChange={(e) => handleSearch(e.target.value)}
            defaultValue={searchParams.get('query')?.toString()}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            梯队
          </span>
          <button
            type="button"
            onClick={() => handleTierChange(null)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
              activeTierId === ''
                ? 'border-teal-500/50 bg-teal-950/40 text-teal-200 shadow-[0_0_0_1px_rgba(20,184,166,0.2)]'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
            )}
          >
            全部
          </button>
          {tiers.map((tier) => {
            const idStr = tier.id.toString();
            const selected = activeTierId === idStr;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleTierChange(idStr)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
                  selected
                    ? 'border-teal-500/50 bg-teal-950/40 text-teal-200 shadow-[0_0_0_1px_rgba(20,184,166,0.2)]'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
                )}
              >
                {tier.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-zinc-800 lg:border-l lg:pl-4">
        <button 
          onClick={handleSyncEmbyIds} 
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all duration-200 tooltip-trigger disabled:opacity-50 disabled:cursor-not-allowed"
          title="获取 Emby ID"
          disabled={actressIds.length === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-fingerprint w-4 h-4"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5A8.5 8.5 0 0 1 12 13a8.5 8.5 0 0 1 7 6.5"/><path d="M12 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/><path d="M6 12a6 6 0 0 1 6-6"/></svg>
        </button>
        <button 
          onClick={handleSyncMovieCounts} 
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="更新影片数量"
          disabled={actressIds.length === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-film w-4 h-4"><path d="M4.5 4.5h15c.6 0 1 .4 1 1v13c0 .6-.4 1-1 1h-15c-.6 0-1-.4-1-1v-13c0-.6.4-1 1-1z"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M3 7h18"/><path d="M3 12h18"/><path d="M3 17h18"/></svg>
        </button>
      </div>
    </div>
  );
};

export default FilterToolbar;
