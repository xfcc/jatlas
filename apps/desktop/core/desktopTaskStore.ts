export type TierSyncLogEvent = {
  id?: string;
  index?: number;
  timestamp?: string;
  actressId: number;
  subjectId?: number;
  subjectName?: string;
  name: string;
  action?: string;
  result: 'success' | 'skipped' | 'error';
  before?: number | string | null;
  after?: number | string | null;
  oldCount: number | null;
  newCount: number | null;
  delta: number | null;
  detail: string;
  retryable?: boolean;
};

export type TierSyncSummary = {
  total: number;
  success: number;
  skipped: number;
  error: number;
  netDelta: number;
  increasedTotal: number;
  decreasedAbsTotal: number;
  changedCount: number;
  unchangedCount: number;
};

export type StorageImportSummary = {
  total: number;
  created: number;
  skippedExisting: number;
  skippedEmpty: number;
  skippedDuplicate: number;
  error: number;
};

export type TaskSummary = Partial<TierSyncSummary & StorageImportSummary> & Record<string, number | undefined>;

export type TaskActivityEvent = {
  id: string;
  index: number;
  timestamp: string;
  subjectName: string;
  subjectId?: number;
  actressId?: number;
  name?: string;
  action: string;
  result: 'created' | 'updated' | 'unchanged' | 'success' | 'skipped' | 'error';
  before?: number | string | null;
  after?: number | string | null;
  oldCount?: number | null;
  newCount?: number | null;
  delta?: number | null;
  detail: string;
  retryable?: boolean;
};

export type TaskState = {
  taskId?: string;
  kind?: 'storage-import' | 'video-count-sync' | 'emby-id-sync' | 'database-change' | 'storage-scan';
  title?: string;
  scope?: string;
  progress: number;
  total: number;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  currentItem?: string;
  lastProcessedItem?: {
    name: string;
    result: 'success' | 'skipped' | 'error';
    detail: string;
  };
  events?: Array<TierSyncLogEvent | TaskActivityEvent>;
  summary?: TaskSummary;
};

const globalTasks = globalThis as typeof globalThis & {
  __JATLAS_DESKTOP_SYNC_TASKS__?: Map<string, TaskState>;
};

export const desktopTasks: Map<string, TaskState> =
  globalTasks.__JATLAS_DESKTOP_SYNC_TASKS__ ?? (globalTasks.__JATLAS_DESKTOP_SYNC_TASKS__ = new Map());

const cancelRequested = new Set<string>();

export function requestCancelDesktopTask(taskId: string) {
  cancelRequested.add(taskId);
}

export function isDesktopTaskCancelRequested(taskId: string) {
  return cancelRequested.has(taskId);
}

export function clearDesktopTaskCancel(taskId: string) {
  cancelRequested.delete(taskId);
}

export function createDesktopTaskId() {
  return Math.random().toString(36).substring(2, 11);
}

export function getDesktopTaskState(taskId: string) {
  return desktopTasks.get(taskId) ?? null;
}
