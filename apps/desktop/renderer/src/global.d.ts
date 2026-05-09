import type { DesktopBootstrapState } from '../../core/bootstrapService';
import type {
  DesktopActress,
  DesktopActressInput,
  DesktopAssetLogChartRow,
  DesktopDashboardStats,
  DesktopStorageBatchImportResult,
  DesktopTier,
  DesktopTierInput,
} from '../../core/desktopDataService';
import type { DesktopHealthSnapshot } from '../../core/desktopProbeService';
import type { DesktopRuntimeConfig } from '../../core/configService';
import type { TaskState } from '../../core/desktopTaskStore';

declare global {
  interface Window {
    desktopApi: {
      getHealthSnapshot: () => Promise<DesktopHealthSnapshot>;
      getBootstrapState: () => Promise<DesktopBootstrapState>;
      saveConfigAndInit: (config: DesktopRuntimeConfig) => Promise<DesktopBootstrapState>;
      getAuthState: () => Promise<{ authenticated: boolean }>;
      login: (password: string) => Promise<{ authenticated: boolean; message?: string }>;
      logout: () => Promise<{ authenticated: boolean }>;
      listTiers: () => Promise<DesktopTier[]>;
      listActresses: (query?: string) => Promise<DesktopActress[]>;
      createActress: (input: DesktopActressInput) => Promise<DesktopActress>;
      updateActress: (id: number, input: DesktopActressInput) => Promise<DesktopActress>;
      deleteActress: (id: number) => Promise<{ success: true }>;
      createTier: (input: DesktopTierInput) => Promise<DesktopTier>;
      updateTier: (id: number, input: Partial<DesktopTierInput>) => Promise<DesktopTier>;
      deleteTier: (id: number) => Promise<{ success: true }>;
      getDashboard: () => Promise<DesktopDashboardStats>;
      getAssetLogChart: () => Promise<DesktopAssetLogChartRow[]>;
      startSyncEmbyIds: (ids: number[]) => Promise<{ taskId: string }>;
      startSyncMovieCounts: (ids: number[]) => Promise<{ taskId: string }>;
      startTierVideoSync: (tierId: number) => Promise<{ taskId: string }>;
      getSyncTask: (taskId: string) => Promise<TaskState | null>;
      cancelSyncTask: (taskId: string) => Promise<{ ok: true }>;
      scanStorage: (tierId: number, path: string) => Promise<{ resolvedPath: string; folders: string[] }>;
      batchImportStorageFolders: (tierId: number, folderNames: string[]) => Promise<DesktopStorageBatchImportResult>;
      openUserDataFolder: () => Promise<{ ok: true }>;
    };
  }
}

export {};
