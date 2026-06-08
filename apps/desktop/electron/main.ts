import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '../shared/ipc';
import { getDesktopHealthSnapshotCore } from '../core/desktopProbeService';
import {
  applyDesktopRuntimeEnv,
  getDesktopConfigPath,
  loadDesktopRuntimeConfig,
  saveDesktopRuntimeConfig,
  type DesktopRuntimeConfig,
} from '../core/configService';
import { initializeDatabaseForDesktop, type DesktopBootstrapState } from '../core/bootstrapService';
import {
  createDesktopActress,
  createDesktopTier,
  deleteDesktopActress,
  deleteDesktopTier,
  getDesktopActresses,
  getDesktopAssetLogChart,
  getDesktopDashboardStats,
  getDesktopTiers,
  importDesktopTierFoldersAsActresses,
  scanDesktopTierStorage,
  updateDesktopActress,
  updateDesktopTier,
} from '../core/desktopDataService';
import { startDesktopStorageImportTask } from '../core/desktopTaskImportService';
import { getDesktopTaskState, requestCancelDesktopTask } from '../core/desktopTaskStore';
import { resetDesktopPrismaClient } from '../core/prismaClient';
import { fetchMinnanoActressProfile } from '../core/minnanoProfileService';
import {
  startDesktopSyncEmbyIdsTask,
  startDesktopSyncMovieCountsTask,
  startDesktopTierVideoCountSyncTask,
} from '../core/desktopTaskSyncService';

let isDesktopAuthenticated = false;

function databaseUrlFromFilePath(filePath: string) {
  return `file:${filePath.replace(/\\/g, '/')}`;
}

function getDefaultDatabaseFile(userDataPath: string) {
  const filePath = path.join(userDataPath, 'jatlas-desktop.db');
  return {
    filePath,
    databaseUrl: databaseUrlFromFilePath(filePath),
  };
}

function ensureAuthenticated() {
  if (!isDesktopAuthenticated) {
    throw new Error('请先完成数据库选择。');
  }
}

function createMainWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const appIconPath = path.resolve(__dirname, '../../../icon.png');
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    icon: appIconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env.DESKTOP_RENDERER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.resolve(__dirname, '../../dist/renderer/index.html');
    void mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    const current = mainWindow.webContents.getURL();
    if (current && targetUrl !== current) {
      event.preventDefault();
    }
  });
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.HEALTH_SNAPSHOT, async () => getDesktopHealthSnapshotCore());
  ipcMain.handle(IPC_CHANNELS.GET_BOOTSTRAP_STATE, async (): Promise<DesktopBootstrapState> => {
    const userDataPath = app.getPath('userData');
    const configPath = getDesktopConfigPath(userDataPath);
    const config = await loadDesktopRuntimeConfig(userDataPath);
    if (!config) {
      return {
        configured: false,
        initialized: false,
        configPath,
        message: 'Desktop config not found. Please complete initial setup.',
      };
    }

    applyDesktopRuntimeEnv(config);
    try {
      const workspaceRoot = path.resolve(__dirname, '../../../..');
      await initializeDatabaseForDesktop(config, workspaceRoot);
      await resetDesktopPrismaClient();
      isDesktopAuthenticated = true;
      return {
        configured: true,
        initialized: true,
        configPath,
        message: 'Desktop config loaded.',
      };
    } catch (e) {
      isDesktopAuthenticated = false;
      return {
        configured: true,
        initialized: false,
        configPath,
        message: e instanceof Error ? e.message : '数据库初始化失败。',
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_DEFAULT_DATABASE_FILE, async () => getDefaultDatabaseFile(app.getPath('userData')));

  ipcMain.handle(
    IPC_CHANNELS.SAVE_CONFIG_AND_INIT,
    async (_event, config: DesktopRuntimeConfig): Promise<DesktopBootstrapState> => {
      const userDataPath = app.getPath('userData');
      const configPath = getDesktopConfigPath(userDataPath);
      applyDesktopRuntimeEnv(config);
      await resetDesktopPrismaClient();
      try {
        const workspaceRoot = path.resolve(__dirname, '../../../..');
        await initializeDatabaseForDesktop(config, workspaceRoot);
        await saveDesktopRuntimeConfig(userDataPath, config);
        isDesktopAuthenticated = true;
        return {
          configured: true,
          initialized: true,
          configPath,
          message: 'Config saved and database initialized.',
        };
      } catch (e) {
        return {
          configured: true,
          initialized: false,
          configPath,
          message: e instanceof Error ? e.message : '数据库初始化失败。',
        };
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.GET_RUNTIME_CONFIG, async () => {
    ensureAuthenticated();
    return loadDesktopRuntimeConfig(app.getPath('userData'));
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_RUNTIME_CONFIG, async (_event, config: DesktopRuntimeConfig) => {
    ensureAuthenticated();
    await saveDesktopRuntimeConfig(app.getPath('userData'), config);
    applyDesktopRuntimeEnv(config);
    await resetDesktopPrismaClient();
    return config;
  });

  ipcMain.handle(IPC_CHANNELS.GET_AUTH_STATE, async () => ({
    authenticated: isDesktopAuthenticated,
  }));

  ipcMain.handle(IPC_CHANNELS.LOGIN, async () => {
    isDesktopAuthenticated = true;
    return { authenticated: true };
  });

  ipcMain.handle(IPC_CHANNELS.LOGOUT, async () => {
    return { authenticated: true };
  });

  ipcMain.handle(IPC_CHANNELS.LIST_TIERS, async () => {
    ensureAuthenticated();
    return getDesktopTiers();
  });

  ipcMain.handle(IPC_CHANNELS.LIST_ACTRESSES, async (_event, query?: string) => {
    ensureAuthenticated();
    return getDesktopActresses(query);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_ACTRESS, async (_event, input) => {
    ensureAuthenticated();
    return createDesktopActress(input);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_ACTRESS, async (_event, id: number, input) => {
    ensureAuthenticated();
    return updateDesktopActress(id, input);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_ACTRESS, async (_event, id: number) => {
    ensureAuthenticated();
    await deleteDesktopActress(id);
    return { success: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.FETCH_MINNANO_PROFILE, async (_event, name: string, sourceUrl?: string) => {
    ensureAuthenticated();
    return fetchMinnanoActressProfile(name, sourceUrl);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_TIER, async (_event, input) => {
    ensureAuthenticated();
    return createDesktopTier(input);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_TIER, async (_event, id: number, input) => {
    ensureAuthenticated();
    return updateDesktopTier(id, input);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_TIER, async (_event, id: number) => {
    ensureAuthenticated();
    await deleteDesktopTier(id);
    return { success: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.GET_DASHBOARD, async () => {
    ensureAuthenticated();
    return getDesktopDashboardStats();
  });

  ipcMain.handle(IPC_CHANNELS.GET_ASSET_LOG_CHART, async () => {
    ensureAuthenticated();
    return getDesktopAssetLogChart();
  });

  ipcMain.handle(IPC_CHANNELS.START_SYNC_EMBY_IDS, async (_event, ids: number[]) => {
    ensureAuthenticated();
    return startDesktopSyncEmbyIdsTask(ids);
  });

  ipcMain.handle(IPC_CHANNELS.START_SYNC_MOVIE_COUNTS, async (_event, ids: number[]) => {
    ensureAuthenticated();
    return startDesktopSyncMovieCountsTask(ids);
  });

  ipcMain.handle(IPC_CHANNELS.START_TIER_VIDEO_SYNC, async (_event, tierId: number) => {
    ensureAuthenticated();
    return startDesktopTierVideoCountSyncTask(tierId);
  });

  ipcMain.handle(IPC_CHANNELS.START_STORAGE_IMPORT, async (_event, tierId: number, folderNames: string[]) => {
    ensureAuthenticated();
    return startDesktopStorageImportTask(tierId, folderNames);
  });

  ipcMain.handle(IPC_CHANNELS.GET_SYNC_TASK, async (_event, taskId: string) => {
    ensureAuthenticated();
    return getDesktopTaskState(taskId);
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_SYNC_TASK, async (_event, taskId: string) => {
    ensureAuthenticated();
    requestCancelDesktopTask(taskId);
    return { ok: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.SCAN_STORAGE, async (_event, tierId: number, rawPath: string) => {
    ensureAuthenticated();
    return scanDesktopTierStorage(tierId, rawPath);
  });

  ipcMain.handle(IPC_CHANNELS.BATCH_IMPORT_STORAGE_FOLDERS, async (_event, tierId: number, folderNames: string[]) => {
    ensureAuthenticated();
    return importDesktopTierFoldersAsActresses(tierId, folderNames);
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_DATABASE_FILE, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 JATLAS 数据库文件',
      properties: ['openFile'],
      filters: [
        { name: 'SQLite database', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    const filePath = result.filePaths[0];
    if (result.canceled || !filePath) {
      return { canceled: true as const };
    }
    return {
      canceled: false as const,
      filePath,
      databaseUrl: databaseUrlFromFilePath(filePath),
    };
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_STORAGE_FOLDER, async () => {
    ensureAuthenticated();
    const result = await dialog.showOpenDialog({
      title: '选择 NAS 或本机存储目录',
      properties: ['openDirectory', 'createDirectory'],
    });
    const folderPath = result.filePaths[0];
    if (result.canceled || !folderPath) {
      return { canceled: true as const };
    }
    return { canceled: false as const, folderPath };
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_USER_DATA_FOLDER, async () => {
    ensureAuthenticated();
    const dir = app.getPath('userData');
    await shell.openPath(dir);
    return { ok: true as const };
  });
}

function setupMainProcessDiagnostics() {
  const logPath = path.join(app.getPath('userData'), 'jatlas-main.log');
  const append = (line: string) => {
    try {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${line}\n`);
    } catch {
      /* ignore */
    }
  };
  process.on('uncaughtException', (err) => {
    append(`uncaughtException: ${err.stack ?? err.message}`);
  });
  process.on('unhandledRejection', (reason) => {
    append(`unhandledRejection: ${String(reason)}`);
  });
}

app.whenReady().then(() => {
  setupMainProcessDiagnostics();
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
