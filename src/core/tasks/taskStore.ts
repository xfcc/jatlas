export type TierSyncLogEvent = {
  actressId: number;
  name: string;
  result: 'success' | 'skipped' | 'error';
  oldCount: number | null;
  newCount: number | null;
  delta: number | null;
  detail: string;
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

export type TaskState = {
  progress: number;
  total: number;
  status: string;
  lastProcessedItem?: {
    name: string;
    result: 'success' | 'skipped' | 'error';
    detail: string;
  };
  events?: TierSyncLogEvent[];
  summary?: TierSyncSummary;
};

const globalTasks = globalThis as typeof globalThis & {
  __JATLAS_SYNC_TASKS__?: Map<string, TaskState>;
};

export const tasks: Map<string, TaskState> =
  globalTasks.__JATLAS_SYNC_TASKS__ ?? (globalTasks.__JATLAS_SYNC_TASKS__ = new Map<string, TaskState>());

export function createTaskId() {
  return Math.random().toString(36).substring(2, 11);
}

export function getTaskState(taskId: string) {
  return tasks.get(taskId);
}
