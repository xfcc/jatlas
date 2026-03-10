
import { cn } from '@/lib/utils';

interface RiskProgressBarProps {
  video_count: number;
  recommended_count: number | null;
}
/**
 * 【业务意图】库存风险可视化：根据“实际影片数”与“推荐影片数”的比例，动态渲染进度条的颜色和状态，向用户直观预警库存风险。
 */
const RiskProgressBar = ({ video_count, recommended_count }: RiskProgressBarProps) => {
  // 场景一：未设置库存上限（recommended_count 为 null）
  // 业务逻辑：对于没有明确配额的 Tier，风险恒为“安全”，仅作数量展示，不进行风险计算。
  if (recommended_count === null) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300"><span className="text-emerald-400 font-bold text-sm">{video_count}</span> / ∞ (No Limit)</span>
                <span className="text-zinc-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    Safe
                </span>
            </div>
            <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500/50 to-emerald-500 rounded-full" style={{width: '20%'}}></div>
            </div>
        </div>
    );
  }

  // 场景二：已设置库存上限
  // Step 1: 计算核心风控指标 - 库存占用率（Ratio）
  const ratio = video_count / recommended_count;
  const percentage = Math.min(ratio * 100, 100);

  // Step 2: 根据风控阈值，定义三种状态：安全、警告、危险
  let status: 'Safe' | 'Warning' | 'Danger';
  if (ratio > 1.2) {
    // 风控逻辑：当实际库存超过推荐值的 120% 时，定义为“危险”状态
    status = 'Danger';
  } else if (ratio > 1.0) {
    // 风控逻辑：当实际库存超过推荐值时，定义为“警告”状态
    status = 'Warning';
  } else {
    status = 'Safe';
  }

  // Step 3: 根据状态匹配不同的视觉样式，强化体感
  let colorClass = 'bg-emerald-500';
  let textColorClass = 'text-emerald-400';
  let statusTextColorClass = 'text-emerald-500';
  let glowClass = '';
  let pulseClass = '';

  if (status === 'Warning') {
    colorClass = 'bg-yellow-500';
    textColorClass = 'text-yellow-500';
    statusTextColorClass = 'text-yellow-500';
    pulseClass = 'animate-pulse';

  } else if (status === 'Danger') {
    colorClass = 'bg-red-600';
    textColorClass = 'text-red-500';
    statusTextColorClass = 'text-red-500 font-bold';
    glowClass = 'progress-danger-glow';
    pulseClass = 'animate-pulse';
  }

  return (
    <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono">
            <span className={cn("text-zinc-300", status === 'Danger' && 'font-black')}>
                <span className={cn(textColorClass, status === 'Danger' && 'text-lg')}>{video_count}</span> / {recommended_count} (Limit)
            </span>
            <span className={cn(statusTextColorClass, 'flex items-center gap-1', pulseClass)}>
                {/* 根据状态显示不同的 Icon 和文本，增强警示效果 */}
                {status === 'Safe' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                {status === 'Warning' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {status === 'Danger' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>}
                {status === 'Danger' ? 'DANGER (Overload)' : status}
            </span>
        </div>
        <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden relative">
            <div className={cn("h-full rounded-full", colorClass, glowClass)} style={{ width: `${percentage}%` }}></div>
            {status === 'Warning' && <div className="absolute top-0 right-0 h-full w-1 bg-yellow-300 animate-pulse"></div>}
        </div>
        {/* 当状态为“危险”时，追加明确的文字警告，提示需要立即处理 */}
        {status === 'Danger' && (
            <div className="text-xs text-red-400 mt-0.5">
                ※ 物理存储容量不足，请立即清理。(Storage Full)
            </div>
        )}
    </div>
  );
};

export default RiskProgressBar;
