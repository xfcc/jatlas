import type { DesktopHealthSnapshot } from '../core/desktopProbeService';
import type { DesktopBootstrapState } from '../core/bootstrapService';
import type { DesktopRuntimeConfig } from '../core/configService';
import type {
  DesktopActress,
  DesktopActressInput,
  DesktopAssetLogChartRow,
  DesktopDashboardStats,
  DesktopStorageBatchImportResult,
  DesktopTier,
  DesktopTierInput,
} from '../core/desktopDataService';
import type { TaskState } from '../core/desktopTaskStore';

export const IPC_CHANNELS = {
  HEALTH_SNAPSHOT: 'desktop:health-snapshot',
  GET_BOOTSTRAP_STATE: 'desktop:get-bootstrap-state',
  SAVE_CONFIG_AND_INIT: 'desktop:save-config-and-init',
  GET_AUTH_STATE: 'desktop:get-auth-state',
  LOGIN: 'desktop:login',
  LOGOUT: 'desktop:logout',
  LIST_TIERS: 'desktop:list-tiers',
  LIST_ACTRESSES: 'desktop:list-actresses',
  CREATE_ACTRESS: 'desktop:create-actress',
  UPDATE_ACTRESS: 'desktop:update-actress',
  DELETE_ACTRESS: 'desktop:delete-actress',
  CREATE_TIER: 'desktop:create-tier',
  UPDATE_TIER: 'desktop:update-tier',
  DELETE_TIER: 'desktop:delete-tier',
  GET_DASHBOARD: 'desktop:get-dashboard',
  GET_ASSET_LOG_CHART: 'desktop:get-asset-log-chart',
  START_SYNC_EMBY_IDS: 'desktop:start-sync-emby-ids',
  START_SYNC_MOVIE_COUNTS: 'desktop:start-sync-movie-counts',
  START_TIER_VIDEO_SYNC: 'desktop:start-tier-video-sync',
  GET_SYNC_TASK: 'desktop:get-sync-task',
  CANCEL_SYNC_TASK: 'desktop:cancel-sync-task',
  SCAN_STORAGE: 'desktop:scan-storage',
  BATCH_IMPORT_STORAGE_FOLDERS: 'desktop:batch-import-storage-folders',
  SELECT_DATABASE_FILE: 'desktop:select-database-file',
  OPEN_USER_DATA_FOLDER: 'desktop:open-user-data-folder',
} as const;

export type IpcInvokeMap = {
  [IPC_CHANNELS.HEALTH_SNAPSHOT]: {
    args: [];
    result: DesktopHealthSnapshot;
  };
  [IPC_CHANNELS.GET_BOOTSTRAP_STATE]: {
    args: [];
    result: DesktopBootstrapState;
  };
  [IPC_CHANNELS.SAVE_CONFIG_AND_INIT]: {
    args: [DesktopRuntimeConfig];
    result: DesktopBootstrapState;
  };
  [IPC_CHANNELS.GET_AUTH_STATE]: {
    args: [];
    result: { authenticated: boolean };
  };
  [IPC_CHANNELS.LOGIN]: {
    args: [string];
    result: { authenticated: boolean; message?: string };
  };
  [IPC_CHANNELS.LOGOUT]: {
    args: [];
    result: { authenticated: boolean };
  };
  [IPC_CHANNELS.LIST_TIERS]: {
    args: [];
    result: DesktopTier[];
  };
  [IPC_CHANNELS.LIST_ACTRESSES]: {
    args: [string?];
    result: DesktopActress[];
  };
  [IPC_CHANNELS.CREATE_ACTRESS]: {
    args: [DesktopActressInput];
    result: DesktopActress;
  };
  [IPC_CHANNELS.UPDATE_ACTRESS]: {
    args: [number, DesktopActressInput];
    result: DesktopActress;
  };
  [IPC_CHANNELS.DELETE_ACTRESS]: {
    args: [number];
    result: { success: true };
  };
  [IPC_CHANNELS.CREATE_TIER]: {
    args: [DesktopTierInput];
    result: DesktopTier;
  };
  [IPC_CHANNELS.UPDATE_TIER]: {
    args: [number, Partial<DesktopTierInput>];
    result: DesktopTier;
  };
  [IPC_CHANNELS.DELETE_TIER]: {
    args: [number];
    result: { success: true };
  };
  [IPC_CHANNELS.GET_DASHBOARD]: {
    args: [];
    result: DesktopDashboardStats;
  };
  [IPC_CHANNELS.GET_ASSET_LOG_CHART]: {
    args: [];
    result: DesktopAssetLogChartRow[];
  };
  [IPC_CHANNELS.START_SYNC_EMBY_IDS]: {
    args: [number[]];
    result: { taskId: string };
  };
  [IPC_CHANNELS.START_SYNC_MOVIE_COUNTS]: {
    args: [number[]];
    result: { taskId: string };
  };
  [IPC_CHANNELS.START_TIER_VIDEO_SYNC]: {
    args: [number];
    result: { taskId: string };
  };
  [IPC_CHANNELS.GET_SYNC_TASK]: {
    args: [string];
    result: TaskState | null;
  };
  [IPC_CHANNELS.CANCEL_SYNC_TASK]: {
    args: [string];
    result: { ok: true };
  };
  [IPC_CHANNELS.SCAN_STORAGE]: {
    args: [number, string];
    result: { resolvedPath: string; folders: string[] };
  };
  [IPC_CHANNELS.BATCH_IMPORT_STORAGE_FOLDERS]: {
    args: [number, string[]];
    result: DesktopStorageBatchImportResult;
  };
  [IPC_CHANNELS.SELECT_DATABASE_FILE]: {
    args: [];
    result: { canceled: true } | { canceled: false; filePath: string; databaseUrl: string };
  };
  [IPC_CHANNELS.OPEN_USER_DATA_FOLDER]: {
    args: [];
    result: { ok: true };
  };
};
