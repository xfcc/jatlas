import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { fetchActressCountFromEmby } from '@/lib/emby';
import { tasks } from '@/lib/tasks';

export async function POST(request: Request) {
  const { actressIds } = await request.json();

  if (!actressIds || !Array.isArray(actressIds)) {
    return NextResponse.json({ error: 'Invalid actressIds' }, { status: 400 });
  }

  const taskId = Math.random().toString(36).substring(2, 11);
  tasks.set(taskId, { progress: 0, total: actressIds.length, status: 'processing' });

  void (async () => {
    let successful_count = 0;
    for (let i = 0; i < actressIds.length; i++) {
      const actressId = parseInt(actressIds[i] as string, 10);
      try {
        const actress = await prisma.actress.findUnique({ where: { id: actressId } });

        if (!actress) {
          tasks.set(taskId, {
            progress: i + 1,
            total: actressIds.length,
            status: `processing (${successful_count} successful)`,
            lastProcessedItem: {
              name: `ID: ${actressId}`,
              result: 'error',
              detail: '演员不存在',
            },
          });
          continue;
        }

        if (!actress.emby_id || actress.emby_id.length === 0) {
          tasks.set(taskId, {
            progress: i + 1,
            total: actressIds.length,
            status: `processing (${successful_count} successful)`,
            lastProcessedItem: {
              name: actress.name,
              result: 'skipped',
              detail: '未关联 Emby ID，已跳过',
            },
          });
          continue;
        }

        const uniqueEmbyPersonIds = Array.from(new Set(actress.emby_id));
        const newCount = await fetchActressCountFromEmby(uniqueEmbyPersonIds);
        const videoDelta = newCount - actress.video_count;

        if (videoDelta === 0) {
          successful_count++;
          tasks.set(taskId, {
            progress: i + 1,
            total: actressIds.length,
            status: `processing (${successful_count} successful)`,
            lastProcessedItem: {
              name: actress.name,
              result: 'success',
              detail: '库存无变化',
            },
          });
        } else {
          await prisma.actress.update({
            where: { id: actressId },
            data: { video_count: newCount },
          });
          await prisma.assetLog.create({
            data: {
              actress_id: actressId,
              actress_name: actress.name,
              action_type: 'UPDATE',
              video_delta: videoDelta,
            },
          });
          successful_count++;
          tasks.set(taskId, {
            progress: i + 1,
            total: actressIds.length,
            status: `processing (${successful_count} successful)`,
            lastProcessedItem: {
              name: actress.name,
              result: 'success',
              detail: `已同步为 ${newCount} 部`,
            },
          });
        }
      } catch (e) {
        console.error(`Failed to sync movie count for actress ${actressId}`, e);
        const detail =
          e instanceof Error ? e.message : typeof e === 'string' ? e : '同步失败';
        tasks.set(taskId, {
          progress: i + 1,
          total: actressIds.length,
          status: `processing (${successful_count} successful)`,
          lastProcessedItem: {
            name: `ID: ${actressId}`,
            result: 'error',
            detail,
          },
        });
      }
    }

    tasks.set(taskId, {
      progress: actressIds.length,
      total: actressIds.length,
      status: `completed (${successful_count} successful)`,
    });
    revalidatePath('/console');
    revalidatePath('/');
  })();

  return NextResponse.json({ taskId });
}
