import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { fetchActressCountFromEmby } from '@/lib/emby';
import { tasks, type TierSyncLogEvent, type TierSyncSummary } from '@/lib/tasks';

function buildSummary(events: TierSyncLogEvent[]): TierSyncSummary {
  let success = 0;
  let skipped = 0;
  let error = 0;
  let netDelta = 0;
  let increasedTotal = 0;
  let decreasedAbsTotal = 0;
  let changedCount = 0;
  let unchangedCount = 0;

  for (const e of events) {
    if (e.result === 'skipped') skipped++;
    else if (e.result === 'error') error++;
    else if (e.result === 'success') {
      success++;
      if (e.delta === null) continue;
      netDelta += e.delta;
      if (e.delta > 0) increasedTotal += e.delta;
      if (e.delta < 0) decreasedAbsTotal += -e.delta;
      if (e.delta !== 0) changedCount++;
      else unchangedCount++;
    }
  }

  return {
    total: events.length,
    success,
    skipped,
    error,
    netDelta,
    increasedTotal,
    decreasedAbsTotal,
    changedCount,
    unchangedCount,
  };
}

export async function runTierVideoCountSyncTask(taskId: string, tierId: number) {
  const tier = await prisma.tier.findUnique({ where: { id: tierId } });
  if (!tier) {
    tasks.set(taskId, {
      progress: 0,
      total: 0,
      status: 'error:tier_not_found',
      events: [],
    });
    return;
  }

  const actresses = await prisma.actress.findMany({
    where: { tierId },
    orderBy: { id: 'asc' },
  });

  const events: TierSyncLogEvent[] = [];

  const flush = (
    done: number,
    last?: { name: string; result: 'success' | 'skipped' | 'error'; detail: string },
  ) => {
    tasks.set(taskId, {
      progress: done,
      total: actresses.length,
      status: 'processing',
      events: [...events],
      lastProcessedItem: last,
    });
  };

  tasks.set(taskId, { progress: 0, total: actresses.length, status: 'processing', events: [] });

  if (actresses.length === 0) {
    const summary = buildSummary(events);
    tasks.set(taskId, {
      progress: 0,
      total: 0,
      status: 'completed',
      events: [],
      summary,
    });
    revalidatePath('/console');
    revalidatePath('/console/tiers');
    revalidatePath('/');
    return;
  }

  for (let i = 0; i < actresses.length; i++) {
    const actress = actresses[i];
    try {
      if (!actress.emby_id || actress.emby_id.length === 0) {
        const ev: TierSyncLogEvent = {
          actressId: actress.id,
          name: actress.name,
          result: 'skipped',
          oldCount: actress.video_count,
          newCount: null,
          delta: null,
          detail: '未关联 Emby ID，已跳过',
        };
        events.push(ev);
        flush(i + 1, { name: actress.name, result: 'skipped', detail: ev.detail });
        continue;
      }

      const uniqueEmbyPersonIds = Array.from(new Set(actress.emby_id));
      const newCount = await fetchActressCountFromEmby(uniqueEmbyPersonIds);
      const videoDelta = newCount - actress.video_count;

      if (videoDelta === 0) {
        const ev: TierSyncLogEvent = {
          actressId: actress.id,
          name: actress.name,
          result: 'success',
          oldCount: actress.video_count,
          newCount,
          delta: 0,
          detail: '库存无变化',
        };
        events.push(ev);
        flush(i + 1, { name: actress.name, result: 'success', detail: ev.detail });
      } else {
        await prisma.actress.update({
          where: { id: actress.id },
          data: { video_count: newCount },
        });
        await prisma.assetLog.create({
          data: {
            actress_id: actress.id,
            actress_name: actress.name,
            action_type: 'UPDATE',
            video_delta: videoDelta,
          },
        });
        const ev: TierSyncLogEvent = {
          actressId: actress.id,
          name: actress.name,
          result: 'success',
          oldCount: actress.video_count,
          newCount,
          delta: videoDelta,
          detail: `已同步为 ${newCount} 部`,
        };
        events.push(ev);
        flush(i + 1, { name: actress.name, result: 'success', detail: ev.detail });
      }
    } catch (e) {
      console.error(`Tier sync: failed for actress ${actress.id}`, e);
      const detail =
        e instanceof Error ? e.message : typeof e === 'string' ? e : '同步失败';
      const ev: TierSyncLogEvent = {
        actressId: actress.id,
        name: actress.name,
        result: 'error',
        oldCount: actress.video_count,
        newCount: null,
        delta: null,
        detail,
      };
      events.push(ev);
      flush(i + 1, { name: actress.name, result: 'error', detail });
    }
  }

  const summary = buildSummary(events);
  tasks.set(taskId, {
    progress: actresses.length,
    total: actresses.length,
    status: 'completed',
    events,
    summary,
  });
  revalidatePath('/console');
  revalidatePath('/console/tiers');
  revalidatePath('/');
}
