import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { normalizeComparableName } from '@/lib/textNormalize';
import { normalizeEmbyIdList, toEmbyIdJson } from '@/core/utils/embyIdJson';

export type GetActressesParams = {
  query?: string;
  tierId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export async function getActressesCore(params?: GetActressesParams) {
  const { query, tierId, sortBy, sortOrder, page = 1, pageSize = 20 } = params || {};
  const where: Prisma.ActressWhereInput = {};

  if (query) {
    // SQLite string filters do not support Prisma's insensitive mode.
    where.name = { contains: query };
  }
  if (tierId) {
    where.tierId = parseInt(tierId, 10);
  }

  const orderBy: Prisma.ActressOrderByWithRelationInput =
    sortBy && sortOrder ? { [sortBy]: sortOrder } : { id: 'asc' };

  const total = await prisma.actress.count({ where });
  const actressesRaw = await prisma.actress.findMany({
    where,
    include: { tier: true },
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const actresses = actressesRaw.map((a) => ({
    ...a,
    emby_id: normalizeEmbyIdList(a.emby_id),
  }));

  return { data: actresses, total };
}

export async function updateActressCore(data: {
  id: number;
  video_count?: number;
  tierId?: number;
  emby_id?: string[];
}) {
  const { id, video_count, ...rest } = data;
  const actressBeforeUpdate = await prisma.actress.findUnique({ where: { id } });
  if (!actressBeforeUpdate) {
    return { success: false, message: '女优不存在，无法更新。' } as const;
  }

  const updatedActress = await prisma.actress.update({
    where: { id },
    data: {
      ...rest,
      video_count,
      emby_id: data.emby_id ? toEmbyIdJson(data.emby_id) : undefined,
      updated_at: new Date(),
    },
    include: { tier: true },
  });

  if (video_count !== undefined) {
    const videoDelta = video_count - actressBeforeUpdate.video_count;
    if (videoDelta !== 0) {
      await prisma.assetLog.create({
        data: {
          actress_id: id,
          actress_name: updatedActress.name,
          action_type: 'UPDATE',
          video_delta: videoDelta,
        },
      });
    }
  }

  return {
    success: true,
    data: {
      ...updatedActress,
      emby_id: normalizeEmbyIdList(updatedActress.emby_id),
    },
  } as const;
}

export async function createActressCore(data: {
  name: string;
  video_count: number;
  tierId: number;
  emby_id?: string[];
}) {
  const newActress = await prisma.actress.create({
    data: {
      ...data,
      emby_id: toEmbyIdJson(data.emby_id),
    },
    include: { tier: true },
  });

  await prisma.assetLog.create({
    data: {
      actress_id: newActress.id,
      actress_name: newActress.name,
      action_type: 'CREATE',
      video_delta: newActress.video_count,
    },
  });

  return {
    success: true,
    data: {
      ...newActress,
      emby_id: normalizeEmbyIdList(newActress.emby_id),
    },
  } as const;
}

export async function deleteActressCore(id: number) {
  const actressToDelete = await prisma.actress.findUnique({ where: { id } });
  if (!actressToDelete) {
    return { success: false, message: '女优不存在，无法删除。' } as const;
  }

  await prisma.actress.delete({ where: { id } });
  await prisma.assetLog.create({
    data: {
      actress_id: id,
      actress_name: actressToDelete.name,
      action_type: 'DELETE',
      video_delta: -actressToDelete.video_count,
    },
  });

  return { success: true } as const;
}

export async function batchCreateActressesCore(data: { tierId: number; names: string | string[] }) {
  const { tierId, names } = data;
  const rawList = Array.isArray(names)
    ? names.map((n) => n.trim()).filter(Boolean)
    : names.split('\n').map((name) => name.trim()).filter(Boolean);

  const nameList = Array.from(new Set(rawList.map((n) => normalizeComparableName(n)).filter(Boolean)));
  if (nameList.length === 0) {
    return { success: false, message: '姓名列表不能为空。' } as const;
  }

  const allExisting = await prisma.actress.findMany({ select: { name: true } });
  const existingNorm = new Set(allExisting.map((a) => normalizeComparableName(a.name)));

  const newNames = nameList.filter((name) => !existingNorm.has(name));
  const skippedNorm = nameList.filter((name) => existingNorm.has(name));

  if (newNames.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const name of newNames) {
        const created = await tx.actress.create({
          data: {
            name,
            tierId,
            video_count: 0,
            emby_id: toEmbyIdJson([]),
          },
        });
        await tx.assetLog.create({
          data: {
            actress_id: created.id,
            actress_name: created.name,
            action_type: 'CREATE',
            video_delta: 0,
          },
        });
      }
    });
  }

  return {
    success: true,
    data: {
      createdCount: newNames.length,
      skippedCount: skippedNorm.length,
      skippedNames: skippedNorm,
    },
  } as const;
}
