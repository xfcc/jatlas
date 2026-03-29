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

/**
 * Next.js may instantiate a route module more than once across API bundles,
 * so a module-level `new Map()` is not a reliable singleton. Store on globalThis.
 */
const globalTasks = globalThis as typeof globalThis & {
  __JATLAS_SYNC_TASKS__?: Map<string, TaskState>;
};

export const tasks: Map<string, TaskState> =
  globalTasks.__JATLAS_SYNC_TASKS__ ??
  (globalTasks.__JATLAS_SYNC_TASKS__ = new Map<string, TaskState>());
