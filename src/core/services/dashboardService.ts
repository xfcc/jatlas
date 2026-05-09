import prisma from '@/lib/db';
import { normalizeEmbyIdList } from '@/core/utils/embyIdJson';

export async function getAssetLogsCore() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const logs = await prisma.assetLog.findMany({
    where: {
      created_at: {
        gte: sixMonthsAgo,
      },
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  const data: { name: string; '资产入库': number; '资产出库': number; '收录扩张': number }[] = [];
  const monthMap: { [key: string]: (typeof data)[number] } = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthName = d.toLocaleString('zh-CN', { month: 'short' });
    const year = d.getFullYear();
    const key = `${monthName} ${year}`;
    if (!monthMap[key]) {
      const newEntry = { name: monthName.replace('月', ''), '资产入库': 0, '资产出库': 0, '收录扩张': 0 };
      monthMap[key] = newEntry;
      data.push(newEntry);
    }
  }

  logs.forEach((log: { created_at: Date; action_type: 'CREATE' | 'UPDATE' | 'DELETE'; video_delta: number }) => {
    const monthName = log.created_at.toLocaleString('zh-CN', { month: 'short' });
    const year = log.created_at.getFullYear();
    const key = `${monthName} ${year}`;
    const entry = monthMap[key];

    if (entry) {
      if (log.action_type === 'CREATE') {
        entry['收录扩张'] += 1;
      } else if (log.action_type === 'UPDATE') {
        if (log.video_delta > 0) {
          entry['资产入库'] += log.video_delta;
        } else {
          entry['资产出库'] += Math.abs(log.video_delta);
        }
      }
    }
  });

  return data;
}

export async function getDashboardStatsCore() {
  const actresses = await prisma.actress.findMany({
    select: {
      video_count: true,
      emby_id: true,
      updated_at: true,
      tier: {
        select: {
          id: true,
          status: true,
          video_limit: true,
          name: true,
        },
      },
    },
  });

  const totalCount = actresses.length;
  const activeCount = actresses.filter((a) => a.tier.status === 'active').length;
  const retiredCount = totalCount - activeCount;
  const totalAssets = actresses.reduce((sum, a) => sum + a.video_count, 0);

  const overloadedAssets = actresses
    .filter((a) => a.tier.video_limit !== null && a.video_count > a.tier.video_limit)
    .reduce((sum, a) => sum + (a.video_count - (a.tier.video_limit ?? 0)), 0);

  const pendingEmbyLink = actresses.filter((a) => normalizeEmbyIdList(a.emby_id).length === 0).length;
  const pendingManagement = actresses.filter(
    (a) => a.tier.video_limit !== null && a.video_count > a.tier.video_limit,
  ).length;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const pendingUpdate = actresses.filter((a) => a.tier.status === 'active' && new Date(a.updated_at) < thirtyDaysAgo).length;

  const tierDistribution = actresses.reduce(
    (acc, actress) => {
      const tierName = actress.tier.name;
      const tierId = actress.tier.id;
      if (!acc[tierName]) {
        acc[tierName] = { id: tierId, count: 0, total_video_count: 0 };
      }
      acc[tierName].count++;
      acc[tierName].total_video_count += actress.video_count;
      return acc;
    },
    {} as Record<string, { id: number; count: number; total_video_count: number }>,
  );

  const tierStats = Object.entries(tierDistribution)
    .map(([name, data]) => ({
      name,
      id: data.id,
      count: data.count,
      total_video_count: data.total_video_count,
      percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    m1: {
      totalCount,
      activeCount,
      retiredCount,
      totalAssets,
      overloadedAssets,
    },
    m2: {
      pendingEmbyLink,
      pendingManagement,
      pendingUpdate,
    },
    m3: tierStats,
  };
}
