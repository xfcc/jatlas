import prisma from '@/lib/db';
import { listChildDirectoryNames, resolveStoragePath } from '@/lib/storagePath';

export async function scanTierStorageCore(tierId: number, rawPath: string) {
  const tier = await prisma.tier.findUnique({ where: { id: tierId }, select: { id: true } });
  if (!tier) {
    return { success: false, error: '梯队不存在', status: 404 } as const;
  }

  const resolvedPath = resolveStoragePath(rawPath);
  const folders = await listChildDirectoryNames(resolvedPath);

  return {
    success: true,
    data: {
      resolvedPath,
      folders,
    },
  } as const;
}
