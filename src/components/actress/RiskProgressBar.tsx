
import { cn } from '@/lib/utils';

interface RiskProgressBarProps {
  video_count: number;
  recommended_count: number | null;
}

const RiskProgressBar = ({ video_count, recommended_count }: RiskProgressBarProps) => {
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

  const ratio = video_count / recommended_count;
  const percentage = Math.min(ratio * 100, 100);

  let status: 'Safe' | 'Warning' | 'Danger';
  if (ratio > 1.2) {
    status = 'Danger';
  } else if (ratio > 1.0) {
    status = 'Warning';
  } else {
    status = 'Safe';
  }

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
        {status === 'Danger' && (
            <div className="text-xs text-red-400 mt-0.5">
                ※ 物理存储容量不足，请立即清理。(Storage Full)
            </div>
        )}
    </div>
  );
};

export default RiskProgressBar;
