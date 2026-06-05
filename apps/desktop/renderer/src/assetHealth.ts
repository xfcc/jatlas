import type { DesktopActress } from '../../core/desktopDataService';

export type AssetHealthStatus = 'healthy' | 'warning' | 'overloaded';
export type ActressSortKey = 'video_count' | 'cup' | 'updated_at';
export type SortDirection = 'asc' | 'desc';

export function getAssetHealthStatus(videoCount: number, videoLimit: number | null): AssetHealthStatus {
  if (videoLimit === null) return 'healthy';
  if (videoLimit <= 0) return videoCount > 0 ? 'overloaded' : 'healthy';
  const usageRatio = videoCount / videoLimit;
  if (usageRatio > 1.2) return 'overloaded';
  if (usageRatio > 1) return 'warning';
  return 'healthy';
}

export function assetHealthLabel(status: AssetHealthStatus) {
  if (status === 'overloaded') return '超额';
  if (status === 'warning') return '预警';
  return '健康';
}

function sortableTime(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortableCup(value: string) {
  const cup = value.trim().toUpperCase();
  if (!cup) return Number.POSITIVE_INFINITY;
  const match = /^[A-Z]+/.exec(cup);
  if (!match) return Number.POSITIVE_INFINITY;
  return match[0].split('').reduce((rank, char) => rank * 26 + (char.charCodeAt(0) - 64), 0);
}

export function sortActresses(
  rows: DesktopActress[],
  sortKey: ActressSortKey,
  direction: SortDirection,
): DesktopActress[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let result: number;
    if (sortKey === 'video_count') {
      result = a.video_count - b.video_count;
    } else if (sortKey === 'cup') {
      const aCup = sortableCup(a.cup);
      const bCup = sortableCup(b.cup);
      if (!Number.isFinite(aCup) && !Number.isFinite(bCup)) {
        result = 0;
      } else if (!Number.isFinite(aCup)) {
        return 1;
      } else if (!Number.isFinite(bCup)) {
        return -1;
      } else {
        result = aCup - bCup;
      }
    } else {
      result = sortableTime(a.updated_at) - sortableTime(b.updated_at);
    }
    return result === 0 ? a.name.localeCompare(b.name, 'zh-CN') : result * multiplier;
  });
}
