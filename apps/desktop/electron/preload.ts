import { contextBridge, ipcRenderer } from 'electron';
import type { IpcInvokeMap } from '../shared/ipc';

const IPC_CHANNELS = {
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

type DesktopApi = {
  getHealthSnapshot: () => Promise<IpcInvokeMap[typeof IPC_CHANNELS.HEALTH_SNAPSHOT]['result']>;
  getBootstrapState: () => Promise<IpcInvokeMap[typeof IPC_CHANNELS.GET_BOOTSTRAP_STATE]['result']>;
  saveConfigAndInit: (
    config: IpcInvokeMap[typeof IPC_CHANNELS.SAVE_CONFIG_AND_INIT]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.SAVE_CONFIG_AND_INIT]['result']>;
  getAuthState: () => Promise<IpcInvokeMap[typeof IPC_CHANNELS.GET_AUTH_STATE]['result']>;
  login: (
    password: IpcInvokeMap[typeof IPC_CHANNELS.LOGIN]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.LOGIN]['result']>;
  logout: () => Promise<IpcInvokeMap[typeof IPC_CHANNELS.LOGOUT]['result']>;
  listTiers: () => Promise<IpcInvokeMap[typeof IPC_CHANNELS.LIST_TIERS]['result']>;
  listActresses: (
    query?: IpcInvokeMap[typeof IPC_CHANNELS.LIST_ACTRESSES]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.LIST_ACTRESSES]['result']>;
  createActress: (
    input: IpcInvokeMap[typeof IPC_CHANNELS.CREATE_ACTRESS]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.CREATE_ACTRESS]['result']>;
  updateActress: (
    id: IpcInvokeMap[typeof IPC_CHANNELS.UPDATE_ACTRESS]['args'][0],
    input: IpcInvokeMap[typeof IPC_CHANNELS.UPDATE_ACTRESS]['args'][1],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.UPDATE_ACTRESS]['result']>;
  deleteActress: (
    id: IpcInvokeMap[typeof IPC_CHANNELS.DELETE_ACTRESS]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.DELETE_ACTRESS]['result']>;
  createTier: (
    input: IpcInvokeMap[typeof IPC_CHANNELS.CREATE_TIER]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.CREATE_TIER]['result']>;
  updateTier: (
    id: IpcInvokeMap[typeof IPC_CHANNELS.UPDATE_TIER]['args'][0],
    input: IpcInvokeMap[typeof IPC_CHANNELS.UPDATE_TIER]['args'][1],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.UPDATE_TIER]['result']>;
  deleteTier: (
    id: IpcInvokeMap[typeof IPC_CHANNELS.DELETE_TIER]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.DELETE_TIER]['result']>;
  getDashboard: () => Promise<IpcInvokeMap[typeof IPC_CHANNELS.GET_DASHBOARD]['result']>;
  getAssetLogChart: () => Promise<IpcInvokeMap[typeof IPC_CHANNELS.GET_ASSET_LOG_CHART]['result']>;
  startSyncEmbyIds: (
    ids: IpcInvokeMap[typeof IPC_CHANNELS.START_SYNC_EMBY_IDS]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.START_SYNC_EMBY_IDS]['result']>;
  startSyncMovieCounts: (
    ids: IpcInvokeMap[typeof IPC_CHANNELS.START_SYNC_MOVIE_COUNTS]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.START_SYNC_MOVIE_COUNTS]['result']>;
  startTierVideoSync: (
    tierId: IpcInvokeMap[typeof IPC_CHANNELS.START_TIER_VIDEO_SYNC]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.START_TIER_VIDEO_SYNC]['result']>;
  getSyncTask: (
    taskId: IpcInvokeMap[typeof IPC_CHANNELS.GET_SYNC_TASK]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.GET_SYNC_TASK]['result']>;
  cancelSyncTask: (
    taskId: IpcInvokeMap[typeof IPC_CHANNELS.CANCEL_SYNC_TASK]['args'][0],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.CANCEL_SYNC_TASK]['result']>;
  scanStorage: (
    tierId: IpcInvokeMap[typeof IPC_CHANNELS.SCAN_STORAGE]['args'][0],
    path: IpcInvokeMap[typeof IPC_CHANNELS.SCAN_STORAGE]['args'][1],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.SCAN_STORAGE]['result']>;
  batchImportStorageFolders: (
    tierId: IpcInvokeMap[typeof IPC_CHANNELS.BATCH_IMPORT_STORAGE_FOLDERS]['args'][0],
    folderNames: IpcInvokeMap[typeof IPC_CHANNELS.BATCH_IMPORT_STORAGE_FOLDERS]['args'][1],
  ) => Promise<IpcInvokeMap[typeof IPC_CHANNELS.BATCH_IMPORT_STORAGE_FOLDERS]['result']>;
  selectDatabaseFile: () => Promise<IpcInvokeMap[typeof IPC_CHANNELS.SELECT_DATABASE_FILE]['result']>;
  openUserDataFolder: () => Promise<IpcInvokeMap[typeof IPC_CHANNELS.OPEN_USER_DATA_FOLDER]['result']>;
};

const desktopApi: DesktopApi = {
  getHealthSnapshot: () => ipcRenderer.invoke(IPC_CHANNELS.HEALTH_SNAPSHOT),
  getBootstrapState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_BOOTSTRAP_STATE),
  saveConfigAndInit: (config) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONFIG_AND_INIT, config),
  getAuthState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_AUTH_STATE),
  login: (password) => ipcRenderer.invoke(IPC_CHANNELS.LOGIN, password),
  logout: () => ipcRenderer.invoke(IPC_CHANNELS.LOGOUT),
  listTiers: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_TIERS),
  listActresses: (query) => ipcRenderer.invoke(IPC_CHANNELS.LIST_ACTRESSES, query),
  createActress: (input) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_ACTRESS, input),
  updateActress: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ACTRESS, id, input),
  deleteActress: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_ACTRESS, id),
  createTier: (input) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_TIER, input),
  updateTier: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_TIER, id, input),
  deleteTier: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_TIER, id),
  getDashboard: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DASHBOARD),
  getAssetLogChart: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ASSET_LOG_CHART),
  startSyncEmbyIds: (ids) => ipcRenderer.invoke(IPC_CHANNELS.START_SYNC_EMBY_IDS, ids),
  startSyncMovieCounts: (ids) => ipcRenderer.invoke(IPC_CHANNELS.START_SYNC_MOVIE_COUNTS, ids),
  startTierVideoSync: (tierId) => ipcRenderer.invoke(IPC_CHANNELS.START_TIER_VIDEO_SYNC, tierId),
  getSyncTask: (taskId) => ipcRenderer.invoke(IPC_CHANNELS.GET_SYNC_TASK, taskId),
  cancelSyncTask: (taskId) => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_SYNC_TASK, taskId),
  scanStorage: (tierId, path) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_STORAGE, tierId, path),
  batchImportStorageFolders: (tierId, folderNames) =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_IMPORT_STORAGE_FOLDERS, tierId, folderNames),
  selectDatabaseFile: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_DATABASE_FILE),
  openUserDataFolder: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_USER_DATA_FOLDER),
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);
