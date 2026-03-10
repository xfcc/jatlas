
import prisma from '@/lib/db';

export async function getDashboardStats() {
    const actresses = await prisma.actress.findMany({
        select: {
            video_count: true,
            emby_id: true,
            updated_at: true,
            tier: {
                select: {
                    status: true,
                    video_limit: true,
                    name: true,
                },
            },
        },
    });

    const totalCount = actresses.length;
    const activeCount = actresses.filter(a => a.tier.status === 'active').length;
    const retiredCount = totalCount - activeCount;
    const totalAssets = actresses.reduce((sum, a) => sum + a.video_count, 0);

    const overloadedAssets = actresses
        .filter(a => a.tier.video_limit !== null && a.video_count > a.tier.video_limit!)
        .reduce((sum, a) => sum + (a.video_count - a.tier.video_limit!), 0);


    const pendingEmbyLink = actresses.filter(a => a.emby_id.length === 0).length;
    const pendingManagement = actresses.filter(a => a.tier.video_limit !== null && a.video_count > a.tier.video_limit!).length;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const pendingUpdate = actresses.filter(a => a.tier.status === 'active' && new Date(a.updated_at) < thirtyDaysAgo).length;

    const tierDistribution = actresses.reduce((acc, actress) => {
        const tierName = actress.tier.name;
        if (!acc[tierName]) {
            acc[tierName] = { count: 0, total_video_count: 0 };
        }
        acc[tierName].count++;
        acc[tierName].total_video_count += actress.video_count;
        return acc;
    }, {} as Record<string, { count: number; total_video_count: number }>);

    const tierStats = Object.entries(tierDistribution).map(([name, data]) => ({
        name,
        ...data,
        percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0,
    })).sort((a, b) => b.count - a.count);

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
