import type { DesktopActress } from '../../core/desktopDataService';

export type AssetHealthStatus = 'healthy' | 'warning' | 'overloaded';
export type ActressSortKey = 'video_count' | 'updated_at';
export type SortDirection = 'asc' | 'desc';

export function getAssetHealthStatus(videoCount: number, videoLimit: number | null): AssetHealthStatus {
  if (videoLimit === null) return 'healthy';
  if (videoCount > videoLimit) return 'overloaded';
  if (videoLimit <= 0) return videoCount > 0 ? 'overloaded' : 'healthy';
  return videoCount >= videoLimit * 0.8 ? 'warning' : 'healthy';
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

export function sortActresses(
  rows: DesktopActress[],
  sortKey: ActressSortKey,
  direction: SortDirection,
): DesktopActress[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const result =
      sortKey === 'video_count'
        ? a.video_count - b.video_count
        : sortableTime(a.updated_at) - sortableTime(b.updated_at);
    return result === 0 ? a.name.localeCompare(b.name, 'zh-CN') : result * multiplier;
  });
}
