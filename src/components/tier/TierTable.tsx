'use client';

import { useState } from 'react';
import Link from 'next/link';
import { type Tier } from '@prisma/client';
import { TierForm } from './TierForm';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FolderInput, Plus, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { deleteTier } from '@/app/actions';
import { cn } from '@/lib/utils';

interface TierTableProps {
  tiers: Tier[];
}

const tierAccentPalette = [
  'bg-zinc-100',
  'bg-zinc-400',
  'bg-zinc-600',
  'bg-zinc-300',
  'bg-zinc-500',
] as const;

const tierAccentClass = (tierId: number) =>
  tierAccentPalette[(tierId - 1) % tierAccentPalette.length] ?? 'bg-zinc-500';

export function TierTable({ tiers }: TierTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

  const handleEdit = (tier: Tier) => {
    setSelectedTier(tier);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteTier(id);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedTier(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">梯队字典维护</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
            配置各梯队影片上限与生命周期通道，数据将同步用于演员分级与库存风控阈值。
          </p>
        </div>
        <Dialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setSelectedTier(null);
          }}
        >
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={() => setSelectedTier(null)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-white"
            >
              <Plus className="h-4 w-4" />
              新增梯队
            </button>
          </DialogTrigger>
          <DialogContent className="border-zinc-800 bg-zinc-950/95 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">{selectedTier ? '编辑梯队' : '新增梯队'}</DialogTitle>
              <DialogDescription className="text-zinc-500">
                {selectedTier ? '修改名称、影片上限或通道后，将影响关联演员的风控计算。' : '创建后将可在演员管理中为女优指定该梯队。'}
              </DialogDescription>
            </DialogHeader>
            <TierForm tier={selectedTier} onClose={handleFormClose} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm">
        <Table className="w-full text-left text-sm text-zinc-400">
          <TableHeader className="border-b border-zinc-800/80 bg-zinc-900/80 text-xs uppercase text-zinc-500">
            <TableRow className="border-zinc-800/80 hover:bg-transparent">
              <TableHead scope="col" className="px-6 py-4 font-medium tracking-wider">
                梯队名称 (Name)
              </TableHead>
              <TableHead scope="col" className="px-6 py-4 font-medium tracking-wider">
                影片上限 (Video cap)
              </TableHead>
              <TableHead scope="col" className="px-6 py-4 font-medium tracking-wider">
                通道 (Channel)
              </TableHead>
              <TableHead scope="col" className="px-6 py-4 text-right font-medium tracking-wider">
                操作 (Actions)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-800/50">
            {tiers.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={4} className="px-6 py-16 text-center text-zinc-500">
                  暂无梯队，请点击右上角「新增梯队」创建第一条字典记录。
                </TableCell>
              </TableRow>
            ) : (
              tiers.map((tier) => (
                <TableRow key={tier.id} className="border-zinc-800/50 transition-colors hover:bg-zinc-800/30">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn('h-8 w-1 shrink-0 rounded-full', tierAccentClass(tier.id))}
                        aria-hidden
                      />
                      <span className="font-medium text-zinc-200">{tier.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {tier.video_limit == null ? (
                      <span className="font-mono text-zinc-500">无上限</span>
                    ) : (
                      <span className="font-mono text-zinc-300">{tier.video_limit}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {tier.status === 'active' ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/25 bg-emerald-500/10">
                        现役
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-zinc-400 ring-1 ring-inset ring-zinc-600/40 bg-zinc-500/10">
                        引退
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-zinc-400 hover:bg-zinc-800 hover:text-teal-300"
                        asChild
                      >
                        <Link href={`/console/tiers/${tier.id}/video-count-refresh`} title="刷新本层影片数">
                          <RefreshCw className="h-4 w-4" />
                          <span className="sr-only">刷新本层影片数</span>
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-zinc-400 hover:bg-zinc-800 hover:text-sky-300"
                        asChild
                      >
                        <Link
                          href={`/console/tiers/${tier.id}/import-actresses`}
                          title="从存储导入演员"
                        >
                          <FolderInput className="h-4 w-4" />
                          <span className="sr-only">从存储导入演员</span>
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        onClick={() => handleEdit(tier)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">编辑</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-zinc-400 hover:bg-red-950/40 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">删除</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-zinc-800 bg-zinc-950">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-zinc-100">确认删除该梯队？</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-500">
                              若仍有演员绑定此梯队，删除可能失败或产生数据不一致。请先迁移相关演员后再删除。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800">
                              取消
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 text-white hover:bg-red-700"
                              onClick={() => handleDelete(tier.id)}
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
