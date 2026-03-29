'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startTierVideoCountSync } from '@/lib/actions';
import { cn } from '@/lib/utils';

type TierSyncTaskResponse = {
  progress: number;
  total: number;
  status: string;
  events?: TierSyncLogEvent[];
  summary?: TierSyncSummary;
};

type TierSyncLogEvent = {
  actressId: number;
  name: string;
  result: 'success' | 'skipped' | 'error';
  oldCount: number | null;
  newCount: number | null;
  delta: number | null;
  detail: string;
};

type TierSyncSummary = {
  total: number;
  success: number;
  skipped: number;
  error: number;
  netDelta: number;
  increasedTotal: number;
  decreasedAbsTotal: number;
  changedCount: number;
  unchangedCount: number;
};

export type TierVideoRefreshTier = {
  id: number;
  name: string;
  video_limit: number | null;
  status: string;
  actressCount: number;
};

function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  if (delta === 0) return '0';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function EventLine({ ev }: { ev: TierSyncLogEvent }) {
  const countStr =
    ev.result === 'skipped'
      ? `${ev.oldCount ?? '—'} → —`
      : ev.result === 'error'
        ? `${ev.oldCount ?? '—'} → 失败`
        : `${ev.oldCount ?? '—'} → ${ev.newCount ?? '—'}`;

  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-zinc-800/40 py-2.5 text-sm font-mono last:border-0',
        ev.result === 'success' && 'text-zinc-300',
        ev.result === 'skipped' && 'text-zinc-500',
        ev.result === 'error' && 'text-red-400/90',
      )}
    >
      <span className="min-w-[8rem] font-medium text-zinc-200">{ev.name}</span>
      <span className="text-zinc-500">{countStr}</span>
      <span className="text-zinc-500">Δ {formatDelta(ev.delta)}</span>
      <span className="w-full text-xs text-zinc-500 sm:w-auto sm:pl-2">{ev.detail}</span>
    </div>
  );
}

export function TierVideoRefreshClient({ tier }: { tier: TierVideoRefreshTier }) {
  const [task, setTask] = useState<TierSyncTaskResponse | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  const pollTask = useCallback(async (id: string) => {
    const res = await fetch(`/api/tiers/sync-video-counts/${id}`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error((body as { error?: string })?.error ?? '无法获取任务状态');
    }
    return (await res.json()) as TierSyncTaskResponse;
  }, []);

  useEffect(() => {
    if (!taskId || !running) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const t = await pollTask(taskId);
        if (cancelled) return;
        setTask(t);
        if (t.status === 'completed' || t.status.startsWith('error:')) {
          setRunning(false);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '轮询失败');
        setRunning(false);
      }
    };

    void tick();
    const interval = setInterval(() => void tick(), 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [taskId, running, pollTask]);

  useEffect(() => {
    if (!autoScroll || !logEndRef.current) return;
    logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [task?.events?.length, autoScroll]);

  const handleStart = async () => {
    setError(null);
    setTask(null);
    setTaskId(null);
    try {
      const { taskId: id } = await startTierVideoCountSync(tier.id);
      setTaskId(id);
      setRunning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '启动失败');
    }
  };

  const displayProgress =
    task ?? (running ? { progress: 0, total: tier.actressCount, status: 'starting' } : null);

  const pct =
    displayProgress && displayProgress.total > 0
      ? Math.round((100 * displayProgress.progress) / displayProgress.total)
      : displayProgress?.status === 'completed'
        ? 100
        : running
          ? 6
          : 0;

  const showSummary = task?.status === 'completed' && task.summary;
  const isErrorState = task?.status?.startsWith('error:');

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="border-b border-zinc-800/50 pb-6">
        <Link
          href="/console/tiers"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          返回层级字典
        </Link>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-100">梯队影片数批量刷新</h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-zinc-400">
          <span>
            当前梯队：<span className="font-medium text-zinc-200">{tier.name}</span>
          </span>
          {tier.video_limit != null && (
            <span className="font-mono text-zinc-500">影片上限 {tier.video_limit}</span>
          )}
          <span className="text-zinc-500">· 共 {tier.actressCount} 名演员</span>
          {tier.status === 'active' ? (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
              现役
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-zinc-400 ring-1 ring-inset ring-zinc-600/40">
              引退
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-500">
          将从 Emby 拉取每名演员的影片数并写回数据库；无 Emby ID 的条目将跳过。
        </div>
        <Button
          type="button"
          onClick={handleStart}
          disabled={running || tier.actressCount === 0}
          className="shrink-0 bg-zinc-100 text-zinc-950 hover:bg-white"
        >
          <RefreshCw className={cn('h-4 w-4', running && 'animate-spin')} />
          {running ? '刷新进行中…' : task?.status === 'completed' ? '再次刷新' : '开始刷新'}
        </Button>
      </div>

      {tier.actressCount === 0 && (
        <p className="rounded-lg border border-zinc-800/60 bg-zinc-900/20 px-4 py-3 text-sm text-zinc-500">
          该梯队下暂无演员，无法执行批量刷新。
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {isErrorState && (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          任务异常：{task?.status}
        </p>
      )}

      {displayProgress && (running || task?.status === 'completed' || isErrorState) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              进度 {displayProgress.progress} / {displayProgress.total}
              {displayProgress.total > 0 && `（${pct}%）`}
            </span>
            <span className="truncate pl-4 text-xs text-zinc-500">{displayProgress.status}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500/80 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {showSummary && task.summary && (
        <div className="grid gap-3 rounded-xl border border-emerald-900/30 bg-emerald-950/15 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCell label="处理人数" value={String(task.summary.total)} />
          <SummaryCell label="成功" value={String(task.summary.success)} />
          <SummaryCell label="跳过（无 Emby ID）" value={String(task.summary.skipped)} />
          <SummaryCell label="失败" value={String(task.summary.error)} />
          <SummaryCell label="影片数净变化" value={formatDelta(task.summary.netDelta)} highlight />
          <SummaryCell label="有变化人数" value={String(task.summary.changedCount)} />
          <SummaryCell label="无变化人数" value={String(task.summary.unchangedCount)} />
          <SummaryCell label="累计增加（部）" value={String(task.summary.increasedTotal)} />
          <SummaryCell label="累计减少（部）" value={String(task.summary.decreasedAbsTotal)} />
        </div>
      )}

      {showSummary && task.summary && (
        <p className="text-center text-sm text-zinc-400">
          已完成：共处理 <span className="font-medium text-zinc-200">{task.summary.total}</span> 名演员，其中{' '}
          <span className="font-medium text-zinc-200">{task.summary.changedCount}</span> 人影片数有变化；净变化{' '}
          <span className="font-mono text-zinc-200">{formatDelta(task.summary.netDelta)}</span> 部。
        </p>
      )}

      {(task?.events?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">实时日志</h3>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-900"
              />
              自动滚到底部
            </label>
          </div>
          <div className="max-h-[min(28rem,50vh)] overflow-y-auto rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-4 py-2">
            {task?.events?.map((ev, i) => (
              <EventLine key={`${ev.actressId}-${i}`} ev={ev} />
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800/40 bg-zinc-900/40 px-3 py-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={cn('mt-0.5 font-mono text-lg text-zinc-100', highlight && 'text-emerald-300')}>{value}</div>
    </div>
  );
}
