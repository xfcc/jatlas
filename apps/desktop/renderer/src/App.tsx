import { useEffect, useRef, useState } from 'react';
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

type WorkspaceTab = 'intro' | 'actresses' | 'tiers' | 'settings';
type EditorView = { kind: 'actress'; id: number | null } | { kind: 'tier'; id: number | null } | null;

const initialDatabaseUrl = 'file:./jatlas-desktop.db';

function defaultDatabaseUrlFromConfigPath(configPath: string) {
  const normalized = configPath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash < 0) {
    return initialDatabaseUrl;
  }
  return `file:${normalized.slice(0, lastSlash)}/jatlas-desktop.db`;
}

function databasePathFromUrl(databaseUrl: string) {
  return databaseUrl.startsWith('file:') ? databaseUrl.slice('file:'.length) : databaseUrl;
}

function tierStatusText(status: string) {
  return status === 'retired' ? '引退' : '现役';
}

export function App() {
  const [bootstrap, setBootstrap] = useState<DesktopBootstrapState | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [snapshot, setSnapshot] = useState<DesktopHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [databaseUrl, setDatabaseUrl] = useState(initialDatabaseUrl);
  const [selectedDatabasePath, setSelectedDatabasePath] = useState('');
  const [embyServerUrl, setEmbyServerUrl] = useState('');
  const [embyApiKey, setEmbyApiKey] = useState('');
  const [storageRootPath, setStorageRootPath] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [tiers, setTiers] = useState<DesktopTier[]>([]);
  const [actresses, setActresses] = useState<DesktopActress[]>([]);
  const [query, setQuery] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [tierId, setTierId] = useState<number>(1);
  const [videoCount, setVideoCount] = useState<number>(0);
  const [embyIdsInput, setEmbyIdsInput] = useState('');

  const [tab, setTab] = useState<WorkspaceTab>('intro');
  const [editorView, setEditorView] = useState<EditorView>(null);
  const [dashboardStats, setDashboardStats] = useState<DesktopDashboardStats | null>(null);
  const [assetChart, setAssetChart] = useState<DesktopAssetLogChartRow[] | null>(null);

  const [tierEditingId, setTierEditingId] = useState<number | null>(null);
  const [tierName, setTierName] = useState('');
  const [tierLimitRaw, setTierLimitRaw] = useState('');
  const [tierStatus, setTierStatus] = useState('active');

  const [selectedActressIds, setSelectedActressIds] = useState<number[]>([]);
  const [syncTaskState, setSyncTaskState] = useState<TaskState | null>(null);
  const pollRef = useRef<number | null>(null);
  const [activePollingTaskId, setActivePollingTaskId] = useState<string | null>(null);

  const [tierSyncId, setTierSyncId] = useState(1);
  const [storageTierId, setStorageTierId] = useState(1);
  const [storagePathInput, setStoragePathInput] = useState('');
  const [storageResolved, setStorageResolved] = useState<string | null>(null);
  const [storageFolders, setStorageFolders] = useState<string[] | null>(null);
  const [storageImporting, setStorageImporting] = useState(false);
  const [storageImportResult, setStorageImportResult] = useState<DesktopStorageBatchImportResult | null>(null);
  const tempIdRef = useRef(-1);

  const stopPoll = () => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPoll(), []);

  const nextTempId = () => {
    tempIdRef.current -= 1;
    return tempIdRef.current;
  };

  const matchesCurrentQuery = (value: string) => {
    const q = query.trim();
    if (!q) return true;
    return value.toLocaleLowerCase().includes(q.toLocaleLowerCase());
  };

  useEffect(() => {
    if (tiers.length === 0) return;
    const first = tiers[0].id;
    setTierId((id) => (tiers.some((t) => t.id === id) ? id : first));
    setTierSyncId((id) => (tiers.some((t) => t.id === id) ? id : first));
    setStorageTierId((id) => (tiers.some((t) => t.id === id) ? id : first));
  }, [tiers]);

  useEffect(() => {
    void (async () => {
      const state = await window.desktopApi.getBootstrapState();
      setBootstrap(state);
      if (!state.configured && state.configPath) {
        const defaultUrl = defaultDatabaseUrlFromConfigPath(state.configPath);
        setDatabaseUrl((current) => current === initialDatabaseUrl ? defaultUrl : current);
        setSelectedDatabasePath((current) => current || databasePathFromUrl(defaultUrl));
      }
      if (state.configured && state.initialized) {
        const auth = await window.desktopApi.getAuthState();
        setAuthenticated(auth.authenticated);
        const config = await window.desktopApi.getRuntimeConfig();
        if (config) {
          setDatabaseUrl(config.databaseUrl);
          setSelectedDatabasePath(databasePathFromUrl(config.databaseUrl));
          setEmbyServerUrl(config.embyServerUrl ?? '');
          setEmbyApiKey(config.embyApiKey ?? '');
          setStorageRootPath(config.storageRootPath ?? '');
          setStoragePathInput(config.storageRootPath ?? '');
        }
      }
    })();
  }, []);

  const loadWorkspaceData = async (q?: string) => {
    const [nextTiers, nextActresses] = await Promise.all([
      window.desktopApi.listTiers(),
      window.desktopApi.listActresses(q),
    ]);
    setTiers(nextTiers);
    setActresses(nextActresses);
    if (nextTiers.length > 0 && !nextTiers.find((t) => t.id === tierId)) {
      setTierId(nextTiers[0].id);
    }
  };

  const loadDashboardData = async () => {
    const [stats, chart] = await Promise.all([
      window.desktopApi.getDashboard(),
      window.desktopApi.getAssetLogChart(),
    ]);
    setDashboardStats(stats);
    setAssetChart(chart);
  };

  const loadTiersOnly = async () => {
    const nextTiers = await window.desktopApi.listTiers();
    setTiers(nextTiers);
    if (nextTiers.length > 0 && !nextTiers.find((t) => t.id === tierId)) {
      setTierId(nextTiers[0].id);
    }
  };

  useEffect(() => {
    if (!bootstrap?.configured || !bootstrap?.initialized || !authenticated) {
      return;
    }
    void (async () => {
      try {
        if (tab === 'intro') {
          await loadDashboardData();
        } else if (tab === 'actresses') {
          await loadWorkspaceData(query);
        } else if (tab === 'tiers' || tab === 'settings') {
          await loadTiersOnly();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载数据失败');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap?.configured, bootstrap?.initialized, authenticated, tab]);

  const refreshCurrentTab = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'intro') {
        await loadDashboardData();
      } else if (tab === 'actresses') {
        await loadWorkspaceData(query);
      } else if (tab === 'settings') {
        await loadTiersOnly();
      } else {
        await loadTiersOnly();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '刷新失败');
    } finally {
      setLoading(false);
    }
  };

  const isSyncTaskTerminal = (t: TaskState) =>
    t.status.startsWith('completed') || t.status.startsWith('error:') || t.status === 'error:tier_not_found';

  const beginPollTask = (taskId: string) => {
    stopPoll();
    setActivePollingTaskId(taskId);
    setSyncTaskState({ progress: 0, total: 0, status: '启动中...' });
    const tick = async () => {
      try {
        const t = await window.desktopApi.getSyncTask(taskId);
        setSyncTaskState(t);
        if (!t) return;
        if (isSyncTaskTerminal(t)) {
          stopPoll();
          setActivePollingTaskId(null);
          await Promise.all([loadWorkspaceData(query), loadDashboardData(), loadTiersOnly()]);
        }
      } catch {
        stopPoll();
        setActivePollingTaskId(null);
      }
    };
    void tick();
    pollRef.current = window.setInterval(() => void tick(), 450);
  };

  const onCancelSyncTask = async () => {
    const id = activePollingTaskId;
    if (!id) return;
    setError(null);
    try {
      await window.desktopApi.cancelSyncTask(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '取消失败');
    }
  };

  const onRetryFailedTierSync = async () => {
    const ids = (syncTaskState?.events ?? [])
      .filter((e) => e.result === 'error')
      .map((e) => e.actressId);
    if (ids.length === 0) return;
    setError(null);
    try {
      const { taskId } = await window.desktopApi.startSyncMovieCounts(ids);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '重试失败');
    }
  };

  useEffect(() => {
    setSelectedActressIds((prev) => prev.filter((id) => actresses.some((a) => a.id === id)));
  }, [actresses]);

  const toggleActressSelect = (id: number) => {
    setSelectedActressIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSyncEmbyIds = async () => {
    if (selectedActressIds.length === 0) {
      setError('请至少选择一位演员。');
      return;
    }
    setError(null);
    try {
      const { taskId } = await window.desktopApi.startSyncEmbyIds(selectedActressIds);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '同步失败');
    }
  };

  const onSyncMovieCounts = async () => {
    if (selectedActressIds.length === 0) {
      setError('请至少选择一位演员。');
      return;
    }
    setError(null);
    try {
      const { taskId } = await window.desktopApi.startSyncMovieCounts(selectedActressIds);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '同步失败');
    }
  };

  const onTierBulkVideoSync = async () => {
    setError(null);
    try {
      const { taskId } = await window.desktopApi.startTierVideoSync(tierSyncId);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '梯队同步失败');
    }
  };

  const onScanStorage = async () => {
    if (!storagePathInput.trim()) {
      setError('请输入存储目录路径。');
      return;
    }
    setLoading(true);
    setError(null);
    setStorageFolders(null);
    setStorageResolved(null);
    setStorageImportResult(null);
    try {
      const result = await window.desktopApi.scanStorage(storageTierId, storagePathInput);
      setStorageResolved(result.resolvedPath);
      setStorageFolders(result.folders);
    } catch (e) {
      setError(e instanceof Error ? e.message : '扫描失败');
    } finally {
      setLoading(false);
    }
  };

  const onBatchImportStorageFolders = async () => {
    if (!storageFolders || storageFolders.length === 0) {
      setError('请先扫描文件夹，再执行导入。');
      return;
    }
    setStorageImporting(true);
    setError(null);
    try {
      const result = await window.desktopApi.batchImportStorageFolders(storageTierId, storageFolders);
      setStorageImportResult(result);
      if (result.created.length > 0) {
        setActresses((prev) => {
          const existingIds = new Set(prev.map((row) => row.id));
          const merged = [...prev];
          for (const row of result.created) {
            if (!existingIds.has(row.id) && matchesCurrentQuery(row.name)) {
              merged.push(row);
            }
          }
          return merged.sort((a, b) => a.id - b.id);
        });
        await Promise.all([loadTiersOnly(), loadDashboardData()]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '批量导入失败');
    } finally {
      setStorageImporting(false);
    }
  };

  const onFetchSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.desktopApi.getHealthSnapshot();
      setSnapshot(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取桌面端诊断信息失败');
    } finally {
      setLoading(false);
    }
  };

  const onSaveConfig = async () => {
    setSaving(true);
    setError(null);
    try {
      const config: DesktopRuntimeConfig = {
        dbMode: 'sqlite',
        databaseUrl,
      };
      const result = await window.desktopApi.saveConfigAndInit(config);
      setBootstrap(result);
      setAuthenticated(result.initialized);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存桌面配置失败');
    } finally {
      setSaving(false);
    }
  };

  const onSelectDatabaseFile = async () => {
    setError(null);
    const result = await window.desktopApi.selectDatabaseFile();
    if (result.canceled) return;
    setDatabaseUrl(result.databaseUrl);
    setSelectedDatabasePath(result.filePath);
  };

  const onSelectStorageFolder = async () => {
    setError(null);
    const result = await window.desktopApi.selectStorageFolder();
    if (result.canceled) return;
    setStorageRootPath(result.folderPath);
    setStoragePathInput((current) => current || result.folderPath);
  };

  const onSaveRuntimeSettings = async () => {
    setSaving(true);
    setError(null);
    setSettingsMessage('');
    try {
      const config: DesktopRuntimeConfig = {
        dbMode: 'sqlite',
        databaseUrl,
        embyServerUrl: embyServerUrl.trim() || undefined,
        embyApiKey: embyApiKey.trim() || undefined,
        storageRootPath: storageRootPath.trim() || undefined,
      };
      const saved = await window.desktopApi.saveRuntimeConfig(config);
      setEmbyServerUrl(saved.embyServerUrl ?? '');
      setEmbyApiKey(saved.embyApiKey ?? '');
      setStorageRootPath(saved.storageRootPath ?? '');
      setStoragePathInput(saved.storageRootPath ?? storagePathInput);
      setSettingsMessage('设置已保存。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const resetTierForm = () => {
    setTierEditingId(null);
    setTierName('');
    setTierLimitRaw('');
    setTierStatus('active');
  };

  const onEditTier = (row: DesktopTier) => {
    setTierEditingId(row.id);
    setTierName(row.name);
    setTierLimitRaw(row.video_limit === null ? '' : String(row.video_limit));
    setTierStatus(row.status);
    setEditorView({ kind: 'tier', id: row.id });
  };

  const onSubmitTier = async () => {
    const name = tierName.trim();
    if (!name) {
      setError('请填写梯队名称。');
      return;
    }
    const limitTrim = tierLimitRaw.trim();
    let video_limit: number | null = null;
    if (limitTrim !== '') {
      const n = Number(limitTrim);
      if (!Number.isFinite(n) || n < 0) {
        setError('影片上限必须是非负数字；留空表示不限制。');
        return;
      }
      video_limit = Math.floor(n);
    }
    setSubmitting(true);
    setError(null);
    const input: DesktopTierInput = { name, video_limit, status: tierStatus || 'active' };
    const previousTiers = tiers;
    const previousActresses = actresses;
    const tempId = tierEditingId === null ? nextTempId() : null;
    const optimisticTier: DesktopTier = {
      id: tierEditingId ?? tempId ?? nextTempId(),
      name: input.name,
      video_limit: input.video_limit,
      status: input.status,
      actressCount:
        tierEditingId === null ? 0 : (tiers.find((row) => row.id === tierEditingId)?.actressCount ?? 0),
    };

    setTiers((prev) => {
      const next =
        tierEditingId === null
          ? [...prev, optimisticTier]
          : prev.map((row) => (row.id === tierEditingId ? { ...row, ...optimisticTier } : row));
      return next.sort((a, b) => a.id - b.id);
    });
    if (tierEditingId !== null) {
      setActresses((prev) =>
        prev.map((row) => (row.tierId === tierEditingId ? { ...row, tierName: optimisticTier.name } : row)),
      );
    }
    try {
      if (tierEditingId === null) {
        const created = await window.desktopApi.createTier(input);
        setTiers((prev) =>
          prev
            .map((row) => (row.id === optimisticTier.id ? created : row))
            .sort((a, b) => a.id - b.id),
        );
      } else {
        const updated = await window.desktopApi.updateTier(tierEditingId, input);
        setTiers((prev) => prev.map((row) => (row.id === tierEditingId ? updated : row)));
        setActresses((prev) =>
          prev.map((row) => (row.tierId === tierEditingId ? { ...row, tierName: updated.name } : row)),
        );
      }
      await Promise.all([loadTiersOnly(), loadDashboardData()]);
      resetTierForm();
      setEditorView(null);
    } catch (e) {
      setTiers(previousTiers);
      setActresses(previousActresses);
      setError(e instanceof Error ? e.message : '保存梯队失败');
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteTier = async (id: number) => {
    if (!window.confirm('确认删除这个梯队？请先移走该梯队下的演员。')) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const previousTiers = tiers;
    try {
      setTiers((prev) => prev.filter((row) => row.id !== id));
      await window.desktopApi.deleteTier(id);
      await Promise.all([loadTiersOnly(), loadDashboardData(), tab === 'actresses' ? loadWorkspaceData(query) : Promise.resolve()]);
      if (tierEditingId === id) {
        resetTierForm();
      }
    } catch (e) {
      setTiers(previousTiers);
      setError(e instanceof Error ? e.message : '删除梯队失败');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setVideoCount(0);
    setEmbyIdsInput('');
    if (tiers.length > 0) {
      setTierId(tiers[0].id);
    }
  };

  const onSubmitActress = async () => {
    if (!name.trim()) {
      setError('请填写演员名称。');
      return;
    }
    setSubmitting(true);
    setError(null);
    const input: DesktopActressInput = {
      name: name.trim(),
      tierId,
      video_count: Number(videoCount) || 0,
      embyIds: embyIdsInput
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    };

    const tierNameForInput = tiers.find((t) => t.id === input.tierId)?.name ?? `梯队 #${input.tierId}`;
    const previousActresses = actresses;
    const tempId = editingId === null ? nextTempId() : null;
    const optimisticRow: DesktopActress = {
      id: editingId ?? tempId ?? nextTempId(),
      name: input.name,
      tierId: input.tierId,
      tierName: tierNameForInput,
      video_count: input.video_count,
      embyIds: input.embyIds ?? [],
      updated_at: new Date().toISOString(),
    };
    setActresses((prev) => {
      const next =
        editingId === null
          ? matchesCurrentQuery(optimisticRow.name)
            ? [...prev, optimisticRow]
            : prev
          : prev
              .map((row) => (row.id === editingId ? optimisticRow : row))
              .filter((row) => row.id !== optimisticRow.id || matchesCurrentQuery(row.name));
      return next.sort((a, b) => a.id - b.id);
    });

    try {
      if (editingId === null) {
        const created = await window.desktopApi.createActress(input);
        setActresses((prev) => {
          const replaced = prev.map((row) => (row.id === optimisticRow.id ? created : row));
          if (!replaced.some((row) => row.id === created.id) && matchesCurrentQuery(created.name)) {
            replaced.push(created);
          }
          return replaced.sort((a, b) => a.id - b.id);
        });
      } else {
        const updated = await window.desktopApi.updateActress(editingId, input);
        setActresses((prev) =>
          prev
            .map((row) => (row.id === editingId ? updated : row))
            .filter((row) => row.id !== updated.id || matchesCurrentQuery(row.name))
            .sort((a, b) => a.id - b.id),
        );
      }
      await Promise.all([loadTiersOnly(), loadDashboardData()]);
      resetForm();
      setEditorView(null);
    } catch (e) {
      setActresses(previousActresses);
      setError(e instanceof Error ? e.message : '保存演员失败');
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = (row: DesktopActress) => {
    setEditingId(row.id);
    setName(row.name);
    setTierId(row.tierId);
    setVideoCount(row.video_count);
    setEmbyIdsInput(row.embyIds.join(', '));
    setEditorView({ kind: 'actress', id: row.id });
  };

  const onCreateActress = () => {
    resetForm();
    setEditorView({ kind: 'actress', id: null });
  };

  const onCreateTier = () => {
    resetTierForm();
    setEditorView({ kind: 'tier', id: null });
  };

  const onDelete = async (id: number) => {
    setSubmitting(true);
    setError(null);
    const previousActresses = actresses;
    try {
      setActresses((prev) => prev.filter((row) => row.id !== id));
      await window.desktopApi.deleteActress(id);
      await Promise.all([loadTiersOnly(), loadDashboardData()]);
      if (editingId === id) {
        resetForm();
      }
    } catch (e) {
      setActresses(previousActresses);
      setError(e instanceof Error ? e.message : '删除演员失败');
    } finally {
      setSubmitting(false);
    }
  };

  const onSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadWorkspaceData(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载演员失败');
    } finally {
      setLoading(false);
    }
  };

  if (!bootstrap || !bootstrap.configured || !bootstrap.initialized) {
    return (
      <main className="app-shell setup-shell desktop-surface" style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 780 }}>
        <h1 style={{ marginTop: 0 }}>JATLAS 初始设置</h1>
        <p style={{ color: '#4b5563' }}>
          请选择 JATLAS 使用的 SQLite 数据库文件。已有数据可以直接选择旧的 .db 文件；新建数据可以先选择准备好的空数据库文件。
        </p>
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <label>
            数据库文件
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                readOnly
                style={{ width: '100%' }}
                value={selectedDatabasePath}
                placeholder="请选择 .db / .sqlite / .sqlite3 文件"
              />
              <button type="button" onClick={onSelectDatabaseFile} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                选择数据库
              </button>
            </div>
          </label>
          <button onClick={onSaveConfig} disabled={saving || !selectedDatabasePath.trim()} style={{ padding: '8px 12px' }}>
            {saving ? '正在初始化...' : '进入 JATLAS'}
          </button>
          {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell workspace-shell" style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>JATLAS 资产控制台</h1>
      <p style={{ color: '#4b5563' }}>演员分级台账、Emby 对账与 NAS 存储扫描。</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        {(['intro', 'actresses', 'tiers', 'settings'] as const).map((key) => (
          <button
            key={key}
            className={!editorView && tab === key ? 'workspace-tab active' : 'workspace-tab'}
            onClick={() => {
              setEditorView(null);
              setTab(key);
            }}
            style={{
              padding: '6px 12px',
              fontWeight: !editorView && tab === key ? 700 : 400,
              border: !editorView && tab === key ? '2px solid #111827' : '1px solid #d1d5db',
              background: !editorView && tab === key ? '#f3f4f6' : '#fff',
            }}
          >
            {key === 'intro'
              ? '介绍'
              : key === 'tiers'
                ? '梯队'
                : key === 'actresses'
                  ? '演员'
                  : '设置'}
          </button>
        ))}
      </div>

      {editorView?.kind === 'tier' ? (
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <button type="button" onClick={() => setEditorView(null)} style={{ marginBottom: 12 }}>
            返回梯队列表
          </button>
          <h2 style={{ marginTop: 0 }}>{editorView.id === null ? '新增梯队' : `编辑梯队 #${editorView.id}`}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 8 }}>
            <input placeholder="梯队名称" value={tierName} onChange={(e) => setTierName(e.target.value)} />
            <input
              placeholder="影片上限（空=不限）"
              value={tierLimitRaw}
              onChange={(e) => setTierLimitRaw(e.target.value)}
            />
            <select value={tierStatus} onChange={(e) => setTierStatus(e.target.value)}>
              <option value="active">现役</option>
              <option value="retired">引退</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => void onSubmitTier()} disabled={submitting}>
              {submitting ? '保存中...' : '保存梯队'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetTierForm();
                setEditorView(null);
              }}
              disabled={submitting}
            >
              取消
            </button>
          </div>
        </section>
      ) : null}

      {editorView?.kind === 'actress' ? (
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <button type="button" onClick={() => setEditorView(null)} style={{ marginBottom: 12 }}>
            返回演员列表
          </button>
          <h2 style={{ marginTop: 0 }}>{editorView.id === null ? '新增演员' : `编辑演员 #${editorView.id}`}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 160px', gap: 8, alignItems: 'center' }}>
            <input placeholder="演员名称" value={name} onChange={(e) => setName(e.target.value)} />
            <select value={tierId} onChange={(e) => setTierId(Number(e.target.value))}>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="影片数量"
              value={videoCount}
              onChange={(e) => setVideoCount(Number(e.target.value))}
            />
          </div>
          <input
            style={{ marginTop: 8, width: '100%' }}
            placeholder="Emby ID（多个 ID 用英文逗号分隔）"
            value={embyIdsInput}
            onChange={(e) => setEmbyIdsInput(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => void onSubmitActress()} disabled={submitting}>
              {submitting ? '保存中...' : '保存演员'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditorView(null);
              }}
              disabled={submitting}
            >
              取消
            </button>
          </div>
        </section>
      ) : null}

      {!editorView && syncTaskState ? (
        <section style={{ marginBottom: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <strong>后台任务：</strong> {syncTaskState.status}{' '}
            {syncTaskState.total > 0 ? `(${syncTaskState.progress}/${syncTaskState.total})` : null}
            {activePollingTaskId && !isSyncTaskTerminal(syncTaskState) ? (
              <button type="button" onClick={() => void onCancelSyncTask()}>
                取消任务
              </button>
            ) : null}
            {isSyncTaskTerminal(syncTaskState) &&
            (syncTaskState.summary?.error ?? 0) > 0 &&
            (syncTaskState.events?.length ?? 0) > 0 ? (
              <button type="button" onClick={() => void onRetryFailedTierSync()}>
                重试失败项 ({syncTaskState.summary?.error})
              </button>
            ) : null}
          </div>
          {syncTaskState.lastProcessedItem ? (
            <div style={{ marginTop: 8, fontSize: 14 }}>
              最近处理：{syncTaskState.lastProcessedItem.name} - {syncTaskState.lastProcessedItem.detail}
            </div>
          ) : null}
          {syncTaskState.summary ? (
            <pre style={{ marginTop: 8, fontSize: 12, overflow: 'auto', maxHeight: 160 }}>
              {JSON.stringify(syncTaskState.summary, null, 2)}
            </pre>
          ) : null}
        </section>
      ) : null}

      {!editorView && tab === 'intro' && dashboardStats && assetChart ? (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>功能介绍</h2>
          <p>
            记忆不是可靠的介质，文件夹也不是长期秩序。JATLAS 面向 NAS + Emby 收藏结构，把演员、分级、存储和媒体库同步组织成可治理的本地台账。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>存储失控</h3>
              <p>当收藏不断膨胀，硬盘扩容会变成唯一答案。JATLAS 通过分级上限和风险状态，让空间压力提前暴露。</p>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>记忆混乱</h3>
              <p>演员、影片数量、Emby ID 和目录结构分散在不同地方。JATLAS 把它们收束为一份可维护台账。</p>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>同步滞后</h3>
              <p>Emby 负责识别与播放，JATLAS 负责对账与治理判断，避免媒体库事实和本地规则长期脱节。</p>
            </div>
          </div>
          <h2>当前资产状态</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>演员总数</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboardStats.m1.totalCount}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>现役 / 引退</div>
              <div style={{ fontSize: 18 }}>
                {dashboardStats.m1.activeCount} / {dashboardStats.m1.retiredCount}
              </div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>影片总量</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboardStats.m1.totalAssets}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>超额资产</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m1.overloadedAssets}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>待绑定 Emby</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m2.pendingEmbyLink}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>待治理项</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m2.pendingManagement}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>30 天未更新</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m2.pendingUpdate}</div>
            </div>
          </div>

          <h3>梯队分布</h3>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>梯队</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>人数</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>影片</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>占比</th>
                </tr>
              </thead>
              <tbody>
                {dashboardStats.m3.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.name}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.count}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.total_video_count}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <h3>资产日志（近 6 个月）</h3>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>月份</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>收录扩张</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>资产入库</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>资产出库</th>
                </tr>
              </thead>
              <tbody>
                {assetChart.map((row) => (
                  <tr key={row.name}>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.name}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row['收录扩张']}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row['资产入库']}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row['资产出库']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {!editorView && tab === 'intro' && !dashboardStats ? <p>正在加载介绍...</p> : null}

      {!editorView && tab === 'tiers' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>梯队</h2>
            <button type="button" onClick={onCreateTier}>
              新增梯队
            </button>
          </div>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>名称</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>上限</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>状态</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>演员数</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.id}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.name}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>
                      {row.video_limit === null ? '∞' : row.video_limit}
                    </td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{tierStatusText(row.status)}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.actressCount}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>
                      <button type="button" onClick={() => onEditTier(row)} style={{ marginRight: 8 }}>
                        编辑
                      </button>
                      <button type="button" onClick={() => void onDeleteTier(row.id)} disabled={submitting}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {!editorView && tab === 'actresses' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>演员</h2>
            <button type="button" onClick={onCreateActress}>
              新增演员
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="按演员名称搜索"
              style={{ minWidth: 260 }}
            />
            <button onClick={onSearch} disabled={loading}>
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 12,
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedActressIds(actresses.map((a) => a.id))}
              disabled={actresses.length === 0}
            >
              全选当前列表
            </button>
            <button type="button" onClick={() => setSelectedActressIds([])}>
              清空选择
            </button>
            <span style={{ color: '#6b7280' }}>已选 {selectedActressIds.length} 项</span>
            <button type="button" onClick={() => void onSyncEmbyIds()}>
              同步 Emby ID
            </button>
            <button type="button" onClick={() => void onSyncMovieCounts()}>
              同步影片数量
            </button>
          </div>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: 8, width: 40 }} />
                  <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>名称</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>梯队</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>影片</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Emby ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {actresses.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>
                      <input
                        type="checkbox"
                        checked={selectedActressIds.includes(row.id)}
                        onChange={() => toggleActressSelect(row.id)}
                      />
                    </td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.id}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.name}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.tierName}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.video_count}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.embyIds.join(', ') || '-'}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>
                      <button onClick={() => onEdit(row)} style={{ marginRight: 8 }}>
                        编辑
                      </button>
                      <button onClick={() => void onDelete(row.id)} disabled={submitting}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {actresses.length === 0 ? (
                  <tr>
                    <td style={{ padding: 10 }} colSpan={7}>
                      没有找到演员。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {!editorView && tab === 'settings' ? (
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>存储与工具</h3>
          <p style={{ marginTop: 0, color: '#6b7280', fontSize: 14 }}>
            读取指定目录下的一级文件夹名称，并将未入库的演员名称批量导入当前梯队。
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={() => void refreshCurrentTab()} disabled={loading}>
              {loading ? '刷新中...' : '刷新当前数据'}
            </button>
            <button type="button" onClick={() => void onFetchSnapshot()} disabled={loading}>
              运行诊断
            </button>
            <button type="button" onClick={() => void window.desktopApi.openUserDataFolder()}>
              打开数据目录
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              梯队
              <select value={storageTierId} onChange={(e) => setStorageTierId(Number(e.target.value))}>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input
            style={{ width: '100%', maxWidth: 560, marginBottom: 8, display: 'block' }}
            placeholder="目录路径，例如 /Volumes/share"
            value={storagePathInput}
            onChange={(e) => setStoragePathInput(e.target.value)}
          />
          <button type="button" onClick={() => void onScanStorage()} disabled={loading}>
            {loading ? '扫描中...' : '扫描文件夹'}
          </button>
          <button
            type="button"
            onClick={() => void onBatchImportStorageFolders()}
            disabled={storageImporting || !storageFolders || storageFolders.length === 0}
            style={{ marginLeft: 8 }}
          >
            {storageImporting ? '导入中...' : '批量导入为演员'}
          </button>
          {storageResolved ? (
            <p style={{ marginTop: 12, marginBottom: 0 }}>
              <strong>实际路径：</strong> <code>{storageResolved}</code>
            </p>
          ) : null}
          {storageImportResult ? (
            <p style={{ marginTop: 8, color: '#374151' }}>
              已导入 {storageImportResult.created.length} 项，跳过已有 {storageImportResult.skippedExisting.length} 项，跳过空名称 {storageImportResult.skippedEmpty} 项。
            </p>
          ) : null}
          {storageFolders && storageFolders.length > 0 ? (
            <ul style={{ marginTop: 8, maxHeight: 320, overflow: 'auto', paddingLeft: 20 }}>
              {storageFolders.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : storageFolders && storageFolders.length === 0 ? (
            <p style={{ marginTop: 8, color: '#6b7280' }}>没有找到一级子文件夹，或该路径不是目录。</p>
          ) : null}
        </section>
      ) : null}

      {!editorView && tab === 'settings' ? (
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>系统设置</h3>
          <div style={{ display: 'grid', gap: 12, maxWidth: 760 }}>
            <label>
              数据库文件
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input readOnly style={{ width: '100%' }} value={selectedDatabasePath || databasePathFromUrl(databaseUrl)} />
                <button type="button" onClick={onSelectDatabaseFile} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  重新选择
                </button>
              </div>
            </label>
            <label>
              Emby 服务地址
              <input
                style={{ width: '100%' }}
                value={embyServerUrl}
                onChange={(e) => setEmbyServerUrl(e.target.value)}
                placeholder="例如 http://192.168.1.10:8096"
              />
            </label>
            <label>
              Emby API Key
              <input
                style={{ width: '100%' }}
                value={embyApiKey}
                onChange={(e) => setEmbyApiKey(e.target.value)}
                type="password"
                placeholder="用于演员 ID 与影片数量同步"
              />
            </label>
            <label>
              默认存储目录
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  style={{ width: '100%' }}
                  value={storageRootPath}
                  onChange={(e) => setStorageRootPath(e.target.value)}
                  placeholder="例如 /Volumes/JAV_output"
                />
                <button type="button" onClick={() => void onSelectStorageFolder()} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  选择目录
                </button>
              </div>
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" onClick={() => void onSaveRuntimeSettings()} disabled={saving}>
                {saving ? '保存中...' : '保存设置'}
              </button>
              {settingsMessage ? <span style={{ color: '#16a34a' }}>{settingsMessage}</span> : null}
            </div>
          </div>
        </section>
      ) : null}

      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
      {snapshot ? (
        <pre style={{ marginTop: 16, padding: 12, background: '#111827', color: '#f9fafb', borderRadius: 8 }}>
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
