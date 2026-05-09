import prisma from '@/lib/db';
import { fetchActressCountFromEmby, fetchEmbyIdsByName } from '@/lib/emby';
import { normalizeEmbyIdList } from '@/core/utils/embyIdJson';

export async function getEmbyIdsByNameCore(actressName: string) {
  const ids = await fetchEmbyIdsByName(actressName);
  return { success: true, data: ids } as const;
}

export async function syncActressVideoCountCore(actressId: number, embyPersonIds: string[]) {
  const actressBeforeSync = await prisma.actress.findUnique({
    where: { id: actressId },
    include: { tier: true },
  });

  if (!actressBeforeSync) {
    return { success: false, message: '女优不存在，无法对账。' } as const;
  }

  const uniqueEmbyPersonIds = Array.from(new Set(embyPersonIds));
  const newCount = await fetchActressCountFromEmby(uniqueEmbyPersonIds);
  const videoDelta = newCount - actressBeforeSync.video_count;

  if (videoDelta === 0) {
    return {
      success: true,
      data: {
        ...actressBeforeSync,
        emby_id: normalizeEmbyIdList(actressBeforeSync.emby_id),
      },
      message: '库存无变化。',
    } as const;
  }

  const updatedActress = await prisma.actress.update({
    where: { id: actressId },
    data: { video_count: newCount },
    include: { tier: true },
  });

  await prisma.assetLog.create({
    data: {
      actress_id: actressId,
      actress_name: updatedActress.name,
      action_type: 'UPDATE',
      video_delta: videoDelta,
    },
  });

  return {
    success: true,
    data: {
      ...updatedActress,
      emby_id: normalizeEmbyIdList(updatedActress.emby_id),
    },
  } as const;
}
