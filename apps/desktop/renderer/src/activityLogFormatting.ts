import type { DesktopRuntimeConfig } from '../../core/configService';
import type { DesktopActress, DesktopTier } from '../../core/desktopDataService';
import type { TaskActivityEvent, TaskSummary } from '../../core/desktopTaskStore';

export type RuntimeSettingChange = {
  label: string;
  detail: string;
};

export type ActressLogEntry = {
  label: string;
  detail: string;
};

export type TierLogEntry = {
  label: string;
  detail: string;
};

export function formatStorageImportSummaryText(summary: TaskSummary, fallbackTotal: number) {
  const scanned = summary.scannedFolders ?? summary.total ?? fallbackTotal;
  const validNames = summary.validNames ?? scanned;
  const existingCurrent = summary.existingCurrent ?? 0;
  const created = summary.created ?? 0;
  const existingOther = summary.existingOther ?? 0;
  const error = summary.error ?? 0;
  const errorText = error > 0 ? `，写入失败 ${error} 人` : '';

  return `扫描 ${scanned} 个文件夹，识别 ${validNames} 个有效演员名。当前分级已存在 ${existingCurrent} 人，新增 ${created} 人，存在于其他分级 ${existingOther} 人${errorText}。`;
}

export function formatVideoCountSyncSummaryText(summary: TaskSummary, fallbackTotal: number) {
  const total = summary.total ?? fallbackTotal;
  const changed = summary.changedCount ?? 0;
  const unchanged = summary.unchangedCount ?? 0;
  const skipped = summary.skipped ?? 0;
  const error = summary.error ?? 0;
  const netDelta = summary.netDelta ?? 0;

  return `检查 ${total} 位演员，更新 ${changed} 人，无变化 ${unchanged} 人，未绑定 Emby ID ${skipped} 人，失败 ${error} 人。影片数量净增 ${netDelta} 部。`;
}

export function formatEmbyIdSyncSummaryText(summary: TaskSummary, fallbackTotal: number) {
  const total = summary.total ?? fallbackTotal;
  const existingEmbyId = summary.existingEmbyId ?? 0;
  const bound = summary.bound ?? 0;
  const notFound = summary.notFound ?? 0;
  const error = summary.error ?? 0;

  return `检查 ${total} 位演员，已有 Emby ID ${existingEmbyId} 人，新增绑定 ${bound} 人，Emby 未找到 ${notFound} 人，失败 ${error} 人。`;
}

export function getVideoCountSyncEventGroups(events: TaskActivityEvent[]) {
  return {
    increased: events.filter(
      (event) => event.result === 'success' && typeof event.delta === 'number' && event.delta > 0,
    ),
    decreased: events.filter(
      (event) => event.result === 'success' && typeof event.delta === 'number' && event.delta < 0,
    ),
    failed: events.filter((event) => event.result === 'error'),
  };
}

export function getEmbyIdSyncEventGroups(events: TaskActivityEvent[]) {
  return {
    bound: events.filter((event) => event.action === '新增绑定'),
    notFound: events.filter((event) => event.action === 'Emby 未找到'),
    failed: events.filter((event) => event.result === 'error'),
  };
}

function normalizeOptionalValue(value: string | undefined) {
  return value?.trim() ?? '';
}

function normalizeTierStoragePaths(paths: Record<string, string> | undefined) {
  const entries = Object.entries(paths ?? {})
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value.length > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(entries);
}

export function getRuntimeSettingsChanges(
  before: DesktopRuntimeConfig | null | undefined,
  after: DesktopRuntimeConfig,
): RuntimeSettingChange[] {
  const previous = before ?? { dbMode: after.dbMode, databaseUrl: '' };
  const fields = [
    {
      label: '数据库文件',
      before: normalizeOptionalValue(previous.databaseUrl),
      after: normalizeOptionalValue(after.databaseUrl),
    },
    {
      label: 'Emby 服务地址',
      before: normalizeOptionalValue(previous.embyServerUrl),
      after: normalizeOptionalValue(after.embyServerUrl),
    },
    {
      label: 'Emby API Key',
      before: normalizeOptionalValue(previous.embyApiKey),
      after: normalizeOptionalValue(after.embyApiKey),
    },
    {
      label: '默认存储根目录',
      before: normalizeOptionalValue(previous.storageRootPath),
      after: normalizeOptionalValue(after.storageRootPath),
    },
    {
      label: '分级存储地址',
      before: normalizeTierStoragePaths(previous.tierStoragePaths),
      after: normalizeTierStoragePaths(after.tierStoragePaths),
    },
  ];

  return fields
    .filter((field) => field.before !== field.after)
    .map((field) => ({
      label: field.label,
      detail: '已更新',
    }));
}

export function formatRuntimeSettingsSummaryText(changeCount: number) {
  if (changeCount === 0) return '运行配置已保存，无配置项变化。';
  return `运行配置已保存，更新 ${changeCount} 项。`;
}

function formatEmbyIdCount(ids: string[]) {
  return `${ids.length} 个`;
}

function normalizeEmbyIds(ids: string[]) {
  return [...ids].map((id) => id.trim()).filter(Boolean).sort();
}

function sameStringList(left: string[], right: string[]) {
  const normalizedLeft = normalizeEmbyIds(left);
  const normalizedRight = normalizeEmbyIds(right);
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  );
}

export function getActressUpdateChanges(before: DesktopActress, after: DesktopActress): ActressLogEntry[] {
  const changes: ActressLogEntry[] = [];

  if (before.name !== after.name) {
    changes.push({ label: '名称', detail: `${before.name} -> ${after.name}` });
  }
  if (before.tierId !== after.tierId || before.tierName !== after.tierName) {
    changes.push({ label: '分级', detail: `${before.tierName} -> ${after.tierName}` });
  }
  if (before.video_count !== after.video_count) {
    const delta = after.video_count - before.video_count;
    changes.push({
      label: '影片数量',
      detail: `${before.video_count} -> ${after.video_count}  ${delta > 0 ? `+${delta}` : String(delta)}`,
    });
  }
  if (!sameStringList(before.embyIds, after.embyIds)) {
    const beforeCount = formatEmbyIdCount(before.embyIds);
    const afterCount = formatEmbyIdCount(after.embyIds);
    changes.push({
      label: 'Emby ID',
      detail:
        before.embyIds.length === after.embyIds.length
          ? `${beforeCount} -> ${afterCount}（内容已更新）`
          : `${beforeCount} -> ${afterCount}`,
    });
  }

  return changes;
}

export function getActressCreatedSnapshot(row: DesktopActress): ActressLogEntry[] {
  return [
    { label: '演员 ID', detail: `#${row.id}` },
    { label: '分级', detail: row.tierName },
    { label: '影片数量', detail: String(row.video_count) },
    { label: 'Emby ID', detail: formatEmbyIdCount(row.embyIds) },
  ];
}

export function getActressDeletedSnapshot(row: DesktopActress): ActressLogEntry[] {
  return getActressCreatedSnapshot(row);
}

export function formatActressUpdatedSummaryText(changeCount: number) {
  if (changeCount === 0) return '演员信息已保存，无信息变化。';
  return `演员信息已更新，变更 ${changeCount} 项。`;
}

export function formatActressCreatedSummaryText(tierName: string) {
  return `演员已创建，归入 ${tierName} 分级。`;
}

export function formatActressDeletedSummaryText() {
  return '演员已删除。';
}

function formatTierLimit(limit: number | null) {
  return limit === null ? '不限' : String(limit);
}

function formatTierTotalLimit(limit: number | null) {
  return limit === null ? '未设置' : String(limit);
}

function formatTierStatus(status: string) {
  return status === 'retired' ? '引退' : '现役';
}

export function getTierUpdateChanges(before: DesktopTier, after: DesktopTier): TierLogEntry[] {
  const changes: TierLogEntry[] = [];

  if (before.name !== after.name) {
    changes.push({ label: '名称', detail: `${before.name} -> ${after.name}` });
  }
  if (before.video_limit !== after.video_limit) {
    changes.push({
      label: '影片上限',
      detail: `${formatTierLimit(before.video_limit)} -> ${formatTierLimit(after.video_limit)}`,
    });
  }
  if (before.total_video_limit !== after.total_video_limit) {
    changes.push({
      label: '分类总数量',
      detail: `${formatTierTotalLimit(before.total_video_limit)} -> ${formatTierTotalLimit(after.total_video_limit)}`,
    });
  }
  if (before.status !== after.status) {
    changes.push({ label: '状态', detail: `${formatTierStatus(before.status)} -> ${formatTierStatus(after.status)}` });
  }

  return changes;
}

export function getTierCreatedSnapshot(tier: DesktopTier): TierLogEntry[] {
  return [
    { label: '分级 ID', detail: `#${tier.id}` },
    { label: '影片上限', detail: formatTierLimit(tier.video_limit) },
    { label: '分类总数量', detail: formatTierTotalLimit(tier.total_video_limit) },
    { label: '状态', detail: formatTierStatus(tier.status) },
    { label: '演员数', detail: String(tier.actressCount) },
  ];
}

export function getTierDeletedSnapshot(tier: DesktopTier): TierLogEntry[] {
  return getTierCreatedSnapshot(tier);
}

export function formatTierUpdatedSummaryText(changeCount: number) {
  if (changeCount === 0) return '分级信息已保存，无信息变化。';
  return `分级信息已更新，变更 ${changeCount} 项。`;
}

export function formatTierCreatedSummaryText() {
  return '分级已创建。';
}

export function formatTierDeletedSummaryText() {
  return '分级已删除。';
}
