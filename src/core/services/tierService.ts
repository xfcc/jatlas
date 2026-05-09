import prisma from '@/lib/db';

export type ActressImportCompareRow = {
  id: number;
  name: string;
  tierId: number;
  tier: { id: number; name: string };
};

export async function getTiersCore() {
  return prisma.tier.findMany();
}

export async function getTierWithActressCountCore(id: number) {
  return prisma.tier.findUnique({
    where: { id },
    include: { _count: { select: { actresses: true } } },
  });
}

export async function getStorageImportPageDataCore(tierId: number) {
  const tier = await prisma.tier.findUnique({
    where: { id: tierId },
    include: { _count: { select: { actresses: true } } },
  });
  if (!tier) {
    return null;
  }

  const actresses: ActressImportCompareRow[] = await prisma.actress.findMany({
    select: {
      id: true,
      name: true,
      tierId: true,
      tier: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return { tier, actresses };
}

export async function createTierCore(data: { name: string; video_limit: number | null; status: string }) {
  return prisma.tier.create({ data });
}

export async function updateTierCore(data: {
  id: number;
  name?: string;
  video_limit?: number | null;
  status?: string;
}) {
  const { id, ...rest } = data;
  return prisma.tier.update({
    where: { id },
    data: rest,
  });
}

export async function deleteTierCore(id: number) {
  await prisma.tier.delete({ where: { id } });
}
