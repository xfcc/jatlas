'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { type Tier } from '@prisma/client';
import { Ghost, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { ActressForm } from './ActressForm';
import { cn } from '@/lib/utils';
import { useOptimisticActresses, type OptimisticActress } from '@/hooks/useOptimisticActresses';
import RiskProgressBar from './RiskProgressBar';
import { syncActressVideoCount } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useConsole } from '@/app/console/ConsoleState';

interface ActressTableProps {
  actresses: OptimisticActress[];
  tiers: Tier[];
}

export function ActressTable({ actresses: initialActresses, tiers }: ActressTableProps) {
  const { optimisticActresses, handleCreateActress, handleUpdateActress, handleDeleteActress } = useOptimisticActresses(initialActresses, tiers);
  const { toast } = useToast();
  const { isFormOpen, setIsFormOpen, selectedActress, setSelectedActress } = useConsole();
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const tierMap = new Map(tiers.map((t) => [t.id, t]));

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams);
    const currentSortBy = params.get('sortBy');
    const currentSortOrder = params.get('sortOrder');

    if (currentSortBy === column) {
      params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', column);
      params.set('sortOrder', 'asc');
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const renderSortIcon = (column: string) => {
    const currentSortBy = searchParams.get('sortBy');
    const currentSortOrder = searchParams.get('sortOrder');

    if (currentSortBy !== column) return null;

    if (currentSortOrder === 'asc') {
      return <ArrowUp className="w-3 h-3 ml-1" />;
    }
    return <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const handleSync = async (actress: OptimisticActress) => {
    if (!actress.emby_id) {
      toast({
        title: '无法同步',
        description: '该演员未绑定 Emby ID。',
        variant: 'destructive',
      });
      return;
    }

    setSyncingId(actress.id);
    try {
      const result = await syncActressVideoCount(actress.id, actress.emby_id);
      if (result.success && result.data) {
        toast({
          title: '对账完成',
          description: `${result.data.name} 数量已更新为 ${result.data.video_count}。`,
        });
      } else {
        throw new Error(result.message || '未知错误');
      }
    } catch (error) {
      toast({
        title: '对账失败',
        description: error instanceof Error ? error.message : '发生了未知错误。',
        variant: 'destructive',
      });
    } finally {
      setSyncingId(null);
    }
  };
  
  const handleEditClick = (actress: OptimisticActress) => {
    setSelectedActress(actress);
    setIsFormOpen(true);
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl overflow-hidden backdrop-blur-sm">
      <Table className="w-full text-sm text-left text-zinc-400">
        <TableHeader className="text-xs text-zinc-500 uppercase bg-zinc-900/80 border-b border-zinc-800/80">
          <TableRow>
            <TableHead scope="col" className="px-6 py-4 font-medium tracking-wider">演员名称 (Name)</TableHead>
            <TableHead scope="col" className="px-6 py-4 font-medium tracking-wider">状态 (Status)</TableHead>
            <TableHead scope="col" className="px-6 py-4 font-medium tracking-wider">层级 (Tier)</TableHead>
            <TableHead scope="col" className="px-6 py-4 font-medium tracking-wider w-1/3">
              <button onClick={() => handleSort('video_count')} className="flex items-center gap-1 hover:text-zinc-200 transition-colors">
                库存风险管理 (Inventory Risk)
                {renderSortIcon('video_count')}
              </button>
            </TableHead>
            <TableHead scope="col" className="px-6 py-4 font-medium tracking-wider">
              <button onClick={() => handleSort('updated_at')} className="flex items-center gap-1 hover:text-zinc-200 transition-colors">
                更新时间
                {renderSortIcon('updated_at')}
              </button>
            </TableHead>
            <TableHead scope="col" className="px-6 py-4 font-medium tracking-wider text-right">操作 (Action)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-zinc-800/50">
          {optimisticActresses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <Ghost className="h-8 w-8" />
                  <span className="text-sm">未检索到相关资产记录</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            optimisticActresses.map((actress) => (
              <TableRow key={actress.id} className="bg-zinc-900/20 hover:bg-zinc-900/60 transition-colors cursor-default group">
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-500">{actress.name.substring(0, 2)}</div>
                      <span className="text-zinc-200 font-medium font-sans text-[15px]">{actress.name}</span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${actress.tier?.status === 'active' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                      {actress.tier?.status === 'active' ? <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg> : <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 8 8"><path d="M3 3h2v2H3V3z"/></svg>}
                      {actress.tier?.status === 'active' ? '现役女优' : '引退女优'}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                        <span className="text-zinc-100 font-semibold">{tierMap.get(actress.tierId)?.name ?? 'N/A'}</span>
                        <span className="text-xs text-zinc-500 font-mono mt-0.5">ID: T-{String(actress.tierId).padStart(3, '0')}</span>
                    </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <RiskProgressBar video_count={actress.video_count} recommended_count={tierMap.get(actress.tierId)?.video_limit ?? null} />
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-zinc-500 text-xs font-mono">
                  {formatDateTime(actress.updated_at)}
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className={cn(
                          'text-zinc-400 hover:text-green-400 p-2 rounded hover:bg-zinc-800 transition-colors',
                          {
                            'opacity-50 cursor-not-allowed': !actress.emby_id,
                            'pointer-events-none': syncingId !== null
                          }
                        )}
                        title={actress.emby_id ? '同步 (Sync from Emby)' : '未绑定 Emby ID'}
                        onClick={() => handleSync(actress)}
                        disabled={!actress.emby_id || syncingId !== null}
                      >
                          <RefreshCw className={cn('w-4 h-4', { 'animate-spin': syncingId === actress.id })} />
                      </button>
                      <button className="text-zinc-400 hover:text-blue-400 p-2 rounded hover:bg-zinc-800 transition-colors" title="编辑 (Edit)" onClick={() => handleEditClick(actress)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      </button>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <button className="text-zinc-400 hover:text-red-500 p-2 rounded hover:bg-zinc-800 transition-colors" title="删除 (Delete)">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the actress.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteActress(actress.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            )))
          }
        </TableBody>
      </Table>
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedActress ? 'Edit Actress' : 'Add Actress'}</DialogTitle>
              <DialogDescription>
                {selectedActress ? 'Update the details of the actress.' : 'Add a new actress to your collection.'}
              </DialogDescription>
            </DialogHeader>
            <ActressForm 
              actress={selectedActress} 
              tiers={tiers}
              onSave={() => setIsFormOpen(false)}
              onCreate={handleCreateActress}
              onUpdate={handleUpdateActress} 
            />
          </DialogContent>
        </Dialog>
    </div>
  );
}
