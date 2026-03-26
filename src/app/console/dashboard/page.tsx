import { getAssetLogs, getDashboardStats } from "@/lib/dashboard";
import Link from "next/link";
import { LogChart } from "./_components/log-chart";

export default async function DashboardPage() {
    const [stats, assetLogs] = await Promise.all([
    getDashboardStats(),
    getAssetLogs(),
  ]);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  /** 按 Tier 主键稳定映射配色，与梯队显示名解耦 */
  const tierDistributionPalette = [
    'bg-zinc-100',
    'bg-zinc-400',
    'bg-zinc-600',
    'bg-zinc-300',
    'bg-zinc-500',
  ] as const;
  const tierBarClass = (tierId: number) =>
    tierDistributionPalette[(tierId - 1) % tierDistributionPalette.length] ?? 'bg-zinc-500';

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Dashboard</h2>
          <p className="text-base text-zinc-400 mt-2">全局资产俯视与行动中枢</p>
        </div>
      </div>

      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">资产基本面</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between">
            <div className="text-base font-medium text-zinc-400">收录女优</div>
            <div className="mt-6 text-5xl font-bold text-zinc-100 tracking-tight">{formatNumber(stats.m1.totalCount)}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between">
            <div className="text-base font-medium text-zinc-400">现役 <span className="text-zinc-600 mx-1">/</span> 引退</div>
            <div className="mt-6 flex items-baseline gap-2 tracking-tight">
              <span className="text-5xl font-bold text-zinc-100">{formatNumber(stats.m1.activeCount)}</span>
              <span className="text-4xl font-light text-zinc-600">/ {formatNumber(stats.m1.retiredCount)}</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between">
            <div className="text-base font-medium text-zinc-400">收录资产 <span className="text-zinc-600 mx-1">/</span> <span className="text-red-500/70">爆仓</span></div>
            <div className="mt-6 flex items-baseline gap-2 tracking-tight">
              <span className="text-5xl font-bold text-zinc-100">{formatNumber(stats.m1.totalAssets)}</span>
              <span className="text-4xl font-light text-red-500/70">/ {formatNumber(stats.m1.overloadedAssets)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">管理待办</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <Link href="/console?filter=no-emby" className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-500 transition-all duration-300 rounded-2xl p-6 md:p-8 cursor-pointer flex justify-between items-center">
            <div>
              <div className="text-base font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">待入库女优</div>
              <div className="text-sm text-zinc-500 mt-1">缺失 Emby ID 绑定</div>
            </div>
            <div className="text-3xl font-bold text-zinc-100">{stats.m2.pendingEmbyLink}</div>
            <div className="absolute right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-zinc-400">→</div>
          </Link>

          <Link href="/console?filter=overloaded" className="group relative bg-red-950/10 border border-red-900/40 hover:border-red-500/60 hover:bg-red-950/20 transition-all duration-300 rounded-2xl p-6 md:p-8 cursor-pointer flex justify-between items-center">
            <div>
              <div className="text-base font-medium text-red-400/90 group-hover:text-red-400 transition-colors">待管理女优</div>
              <div className="text-sm text-red-500/60 mt-1">影片数突破 Tier 阈值</div>
            </div>
            <div className="text-3xl font-bold text-red-400">{stats.m2.pendingManagement}</div>
            <div className="absolute right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-red-400">→</div>
          </Link>

          <Link href="/console?filter=stale" className="group relative bg-amber-950/10 border border-amber-900/40 hover:border-amber-500/60 hover:bg-amber-950/20 transition-all duration-300 rounded-2xl p-6 md:p-8 cursor-pointer flex justify-between items-center">
            <div>
              <div className="text-base font-medium text-amber-400/90 group-hover:text-amber-400 transition-colors">待更新女优</div>
              <div className="text-sm text-amber-500/60 mt-1">刮削停滞超 30 天</div>
            </div>
            <div className="text-3xl font-bold text-amber-400">{stats.m2.pendingUpdate}</div>
            <div className="absolute right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-amber-400">→</div>
          </Link>
        </div>
      </div>

      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">生态分布</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-sm space-y-8">
            <h4 className="text-base font-medium text-zinc-300">各梯队人数</h4>
            <div className="space-y-5">
              {stats.m3.map(tier => (
                <div className="space-y-2" key={tier.id}>
                  <div className="flex justify-between text-sm text-zinc-400">
                    <span>{tier.name}</span>
                    <span className="font-medium text-zinc-300">{tier.count} 人 ({tier.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                    <div className={`h-full ${tierBarClass(tier.id)}`} style={{ width: `${tier.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-sm space-y-8">
            <h4 className="text-base font-medium text-zinc-300">各梯队资产 (影片数)</h4>
            <div className="space-y-5">
              {stats.m3.map(tier => (
                <div className="space-y-2" key={`asset-${tier.id}`}>
                  <div className="flex justify-between text-sm text-zinc-400">
                    <span>{tier.name}</span>
                    <span className="font-medium text-zinc-300">
                      {formatNumber(tier.total_video_count)} 部 (
                      {(stats.m1.totalAssets > 0 ? (tier.total_video_count / stats.m1.totalAssets) * 100 : 0).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${tierBarClass(tier.id)}`}
                      style={{
                        width: `${stats.m1.totalAssets > 0 ? (tier.total_video_count / stats.m1.totalAssets) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 pt-4 pb-12">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">系统流水记录 (近 6 个月)</h3>
        <LogChart data={assetLogs} />
      </div>
    </div>
  );
}
