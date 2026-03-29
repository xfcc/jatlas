'use client';

import { type ReactNode, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FolderSearch, Loader2 } from 'lucide-react';
import { batchCreateActresses, type ActressImportCompareRow } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  tierId: number;
  tierName: string;
  initialActresses: ActressImportCompareRow[];
};

export function ImportActressesClient({ tierId, tierName, initialActresses }: Props) {
  const router = useRouter();
  const [actresses, setActresses] = useState<ActressImportCompareRow[]>(initialActresses);
  const [storagePath, setStoragePath] = useState('');
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedNew, setSelectedNew] = useState<Set<string>>(new Set());
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActresses(initialActresses);
  }, [initialActresses]);

  const groups = useMemo(() => {
    const map = new Map(actresses.map((a) => [a.name, a]));
    const inCurrentTier: string[] = [];
    const wrongTier: { name: string; currentTierName: string }[] = [];
    const notInSystem: string[] = [];

    for (const folder of folders) {
      const row = map.get(folder);
      if (!row) {
        notInSystem.push(folder);
      } else if (row.tierId === tierId) {
        inCurrentTier.push(folder);
      } else {
        wrongTier.push({ name: folder, currentTierName: row.tier.name });
      }
    }

    return { inCurrentTier, wrongTier, notInSystem };
  }, [actresses, folders, tierId]);

  const handleScan = async () => {
    setScanError(null);
    setImportMsg(null);
    setScanning(true);
    setFolders([]);
    setResolvedPath(null);
    setSelectedNew(new Set());
    try {
      const res = await fetch(`/api/tiers/${tierId}/scan-storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: storagePath }),
      });
      const json = (await res.json()) as {
        error?: string;
        resolvedPath?: string;
        folders?: string[];
      };
      if (!res.ok) {
        setScanError(json.error ?? '扫描失败');
        return;
      }
      setResolvedPath(json.resolvedPath ?? null);
      setFolders(json.folders ?? []);
    } catch {
      setScanError('网络或服务器错误');
    } finally {
      setScanning(false);
    }
  };

  const toggleOne = (name: string, checked: boolean) => {
    setSelectedNew((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const toggleAllNew = (checked: boolean) => {
    if (checked) {
      setSelectedNew(new Set(groups.notInSystem));
    } else {
      setSelectedNew(new Set());
    }
  };

  const handleImport = () => {
    if (selectedNew.size === 0) return;
    setImportMsg(null);
    startTransition(async () => {
      const result = await batchCreateActresses({
        tierId,
        names: Array.from(selectedNew),
      });
      if (!result.success) {
        setImportMsg(result.message ?? '导入失败');
        return;
      }
      const created = result.data?.createdCount ?? 0;
      const skipped = result.data?.skippedCount ?? 0;
      setImportMsg(`已新增 ${created} 名，跳过（已存在）${skipped} 名。`);
      setSelectedNew(new Set());
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/console/tiers"
            className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-teal-400"
          >
            <ArrowLeft className="h-4 w-4" />
            返回梯队字典
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            从存储导入演员
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            当前梯队：
            <span className="font-medium text-zinc-300">{tierName}</span>
            。填写 NAS（AFP）或本地挂载路径，扫描演员文件夹后与系统比对。
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 backdrop-blur-sm">
        <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
          存储路径
        </span>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={storagePath}
            onChange={(e) => setStoragePath(e.target.value)}
            placeholder="afp://... 或 /Volumes/Share/..."
            className="border-zinc-700 bg-zinc-950/80 font-mono text-sm text-zinc-200"
          />
          <Button
            type="button"
            onClick={handleScan}
            disabled={scanning || !storagePath.trim()}
            className="shrink-0 gap-2 bg-teal-600 text-white hover:bg-teal-500"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderSearch className="h-4 w-4" />
            )}
            扫描文件夹
          </Button>
        </div>
        {resolvedPath ? (
          <p className="mt-3 font-mono text-xs text-zinc-500">
            解析为：{resolvedPath} · 共 {folders.length} 个演员目录
          </p>
        ) : null}
        {scanError ? (
          <p className="mt-3 text-sm text-red-400/90">{scanError}</p>
        ) : null}
      </div>

      {folders.length > 0 ? (
        <>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
              比对结果
            </h2>

            <GroupBlock
              title="已在本梯队"
              description="文件夹名与系统中演员一致，且属于当前梯队"
              variant="ok"
              rows={groups.inCurrentTier.map((name) => (
                <div
                  key={name}
                  className="flex items-center border-b border-zinc-800/40 py-2 text-sm text-zinc-300 last:border-0"
                >
                  {name}
                </div>
              ))}
              empty="（无）"
            />

            <GroupBlock
              title="已在系统，梯队不符"
              description="演员存在但不在当前梯队，请在演员管理中调整"
              variant="warn"
              rows={groups.wrongTier.map(({ name, currentTierName }) => (
                <div
                  key={name}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/40 py-2 text-sm last:border-0"
                >
                  <span className="text-zinc-200">{name}</span>
                  <span className="text-xs text-amber-400/90">
                    当前梯队：{currentTierName}
                  </span>
                </div>
              ))}
              empty="（无）"
            />

            <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30">
              <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-3">
                <h3 className="text-sm font-medium text-zinc-200">系统不存在（可导入）</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  勾选后一键录入到「{tierName}」，初始影片数为 0。
                </p>
              </div>
              {groups.notInSystem.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">（无）</p>
              ) : (
                <>
                  <div className="flex items-center gap-3 border-b border-zinc-800/40 px-4 py-2">
                    <Checkbox
                      id="select-all-new"
                      checked={
                        groups.notInSystem.length > 0 &&
                        groups.notInSystem.every((n) => selectedNew.has(n))
                      }
                      onCheckedChange={(v) => toggleAllNew(v === true)}
                    />
                    <label htmlFor="select-all-new" className="text-xs text-zinc-400">
                      全选 {groups.notInSystem.length} 项
                    </label>
                  </div>
                  <div className="max-h-72 overflow-y-auto px-2">
                    {groups.notInSystem.map((name) => (
                      <label
                        key={name}
                        className="flex cursor-pointer items-center gap-3 px-2 py-2 hover:bg-zinc-800/30"
                      >
                        <Checkbox
                          checked={selectedNew.has(name)}
                          onCheckedChange={(v) => toggleOne(name, v === true)}
                        />
                        <span className="text-sm text-zinc-200">{name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-t border-zinc-800/60 p-4">
                    <Button
                      type="button"
                      disabled={selectedNew.size === 0 || isPending}
                      onClick={handleImport}
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          导入中…
                        </>
                      ) : (
                        `导入选中（${selectedNew.size}）`
                      )}
                    </Button>
                    {importMsg ? (
                      <p className="mt-3 text-sm text-zinc-400">{importMsg}</p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function GroupBlock({
  title,
  description,
  variant,
  rows,
  empty,
}: {
  title: string;
  description: string;
  variant: 'ok' | 'warn';
  rows: ReactNode[];
  empty: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border',
        variant === 'ok' && 'border-emerald-900/50 bg-emerald-950/20',
        variant === 'warn' && 'border-amber-900/50 bg-amber-950/20',
      )}
    >
      <div className="border-b border-zinc-800/40 px-4 py-3">
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
      <div className="px-4 py-2">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">{empty}</p>
        ) : (
          rows
        )}
      </div>
    </div>
  );
}
