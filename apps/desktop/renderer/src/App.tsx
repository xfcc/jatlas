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

type WorkspaceTab = 'dashboard' | 'tiers' | 'actresses' | 'storage';

const initialDatabaseUrl = 'file:./jatlas-desktop.db';

function defaultDatabaseUrlFromConfigPath(configPath: string) {
  const normalized = configPath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash < 0) {
    return initialDatabaseUrl;
  }
  return `file:${normalized.slice(0, lastSlash)}/jatlas-desktop.db`;
}

export function App() {
  const [bootstrap, setBootstrap] = useState<DesktopBootstrapState | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [snapshot, setSnapshot] = useState<DesktopHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbMode, setDbMode] = useState<'sqlite' | 'postgres'>('sqlite');
  const [databaseUrl, setDatabaseUrl] = useState(initialDatabaseUrl);
  const [adminPassword, setAdminPassword] = useState('');
  const [embyServerUrl, setEmbyServerUrl] = useState('');
  const [embyApiKey, setEmbyApiKey] = useState('');
  const [tiers, setTiers] = useState<DesktopTier[]>([]);
  const [actresses, setActresses] = useState<DesktopActress[]>([]);
  const [query, setQuery] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [tierId, setTierId] = useState<number>(1);
  const [videoCount, setVideoCount] = useState<number>(0);
  const [embyIdsInput, setEmbyIdsInput] = useState('');

  const [tab, setTab] = useState<WorkspaceTab>('dashboard');
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
        setDatabaseUrl((current) => current === initialDatabaseUrl ? defaultDatabaseUrlFromConfigPath(state.configPath) : current);
      }
      if (state.configured && state.initialized) {
        const auth = await window.desktopApi.getAuthState();
        setAuthenticated(auth.authenticated);
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
        if (tab === 'dashboard') {
          await loadDashboardData();
        } else if (tab === 'actresses') {
          await loadWorkspaceData(query);
        } else if (tab === 'tiers' || tab === 'storage') {
          await loadTiersOnly();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap?.configured, bootstrap?.initialized, authenticated, tab]);

  const refreshCurrentTab = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'dashboard') {
        await loadDashboardData();
      } else if (tab === 'actresses') {
        await loadWorkspaceData(query);
      } else if (tab === 'storage') {
        await loadTiersOnly();
      } else {
        await loadTiersOnly();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  const isSyncTaskTerminal = (t: TaskState) =>
    t.status.startsWith('completed') || t.status.startsWith('error:') || t.status === 'error:tier_not_found';

  const beginPollTask = (taskId: string) => {
    stopPoll();
    setActivePollingTaskId(taskId);
    setSyncTaskState({ progress: 0, total: 0, status: 'starting…' });
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
      setError(e instanceof Error ? e.message : 'Cancel failed');
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
      setError(e instanceof Error ? e.message : 'Retry failed');
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
      setError('Select at least one actress.');
      return;
    }
    setError(null);
    try {
      const { taskId } = await window.desktopApi.startSyncEmbyIds(selectedActressIds);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    }
  };

  const onSyncMovieCounts = async () => {
    if (selectedActressIds.length === 0) {
      setError('Select at least one actress.');
      return;
    }
    setError(null);
    try {
      const { taskId } = await window.desktopApi.startSyncMovieCounts(selectedActressIds);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    }
  };

  const onTierBulkVideoSync = async () => {
    setError(null);
    try {
      const { taskId } = await window.desktopApi.startTierVideoSync(tierSyncId);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tier sync failed');
    }
  };

  const onScanStorage = async () => {
    if (!storagePathInput.trim()) {
      setError('Enter a storage path or AFP URL.');
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
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const onBatchImportStorageFolders = async () => {
    if (!storageFolders || storageFolders.length === 0) {
      setError('Scan folders first, then import.');
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
      setError(e instanceof Error ? e.message : 'Batch import failed');
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
      setError(e instanceof Error ? e.message : 'Failed to fetch desktop health snapshot');
    } finally {
      setLoading(false);
    }
  };

  const onSaveConfig = async () => {
    setSaving(true);
    setError(null);
    try {
      const config: DesktopRuntimeConfig = {
        dbMode,
        databaseUrl,
        adminPassword: adminPassword || undefined,
        embyServerUrl: embyServerUrl || undefined,
        embyApiKey: embyApiKey || undefined,
      };
      const result = await window.desktopApi.saveConfigAndInit(config);
      setBootstrap(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save desktop configuration');
    } finally {
      setSaving(false);
    }
  };

  const onLogin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await window.desktopApi.login(loginPassword);
      if (!result.authenticated) {
        setError(result.message ?? 'Login failed.');
        return;
      }
      setAuthenticated(true);
      setTab('dashboard');
      await loadDashboardData();
      await loadTiersOnly();
      setLoginPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const onLogout = async () => {
    await window.desktopApi.logout();
    setAuthenticated(false);
    setActresses([]);
    setTiers([]);
    setEditingId(null);
    setDashboardStats(null);
    setAssetChart(null);
    setTierEditingId(null);
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
  };

  const onSubmitTier = async () => {
    const name = tierName.trim();
    if (!name) {
      setError('Tier name is required.');
      return;
    }
    const limitTrim = tierLimitRaw.trim();
    let video_limit: number | null = null;
    if (limitTrim !== '') {
      const n = Number(limitTrim);
      if (!Number.isFinite(n) || n < 0) {
        setError('Video limit must be a non-negative number or empty for unlimited.');
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
    } catch (e) {
      setTiers(previousTiers);
      setActresses(previousActresses);
      setError(e instanceof Error ? e.message : 'Failed to save tier');
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteTier = async (id: number) => {
    if (!window.confirm('Delete this tier? Actresses must be moved first.')) {
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
      setError(e instanceof Error ? e.message : 'Failed to delete tier');
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
      setError('Name is required.');
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

    const tierNameForInput = tiers.find((t) => t.id === input.tierId)?.name ?? `Tier #${input.tierId}`;
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
    } catch (e) {
      setActresses(previousActresses);
      setError(e instanceof Error ? e.message : 'Failed to save actress');
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
      setError(e instanceof Error ? e.message : 'Failed to delete actress');
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
      setError(e instanceof Error ? e.message : 'Failed to load actresses');
    } finally {
      setLoading(false);
    }
  };

  if (!bootstrap || !bootstrap.configured || !bootstrap.initialized) {
    return (
      <main className="app-shell setup-shell desktop-surface" style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 780 }}>
        <h1 style={{ marginTop: 0 }}>JATLAS Desktop - First Run Setup</h1>
        <p style={{ color: '#4b5563' }}>
          {bootstrap?.message ?? 'Checking bootstrap state...'}
        </p>
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <label>
            DB Mode
            <select value={dbMode} onChange={(e) => setDbMode(e.target.value as 'sqlite' | 'postgres')}>
              <option value="sqlite">SQLite (recommended for desktop)</option>
              <option value="postgres">PostgreSQL</option>
            </select>
          </label>
          <label>
            Database URL
            <input
              style={{ width: '100%' }}
              value={databaseUrl}
              onChange={(e) => setDatabaseUrl(e.target.value)}
              placeholder="file:./jatlas-desktop.db"
            />
          </label>
          <label>
            Admin Password
            <input
              style={{ width: '100%' }}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="optional"
              type="password"
            />
          </label>
          <label>
            Emby Server URL (optional)
            <input style={{ width: '100%' }} value={embyServerUrl} onChange={(e) => setEmbyServerUrl(e.target.value)} />
          </label>
          <label>
            Emby API Key (optional)
            <input
              style={{ width: '100%' }}
              value={embyApiKey}
              onChange={(e) => setEmbyApiKey(e.target.value)}
              type="password"
            />
          </label>
          <button onClick={onSaveConfig} disabled={saving || !databaseUrl.trim()} style={{ padding: '8px 12px' }}>
            {saving ? 'Saving...' : 'Save Config & Initialize DB'}
          </button>
          {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="app-shell login-shell desktop-surface" style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 420 }}>
        <h1 style={{ marginTop: 0 }}>JATLAS Desktop Login</h1>
        <p style={{ color: '#4b5563' }}>{bootstrap.message}</p>
        <label>
          Admin Password
          <input
            style={{ width: '100%', marginTop: 8 }}
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void onLogin();
              }
            }}
          />
        </label>
        <button style={{ marginTop: 12, padding: '8px 12px' }} onClick={onLogin} disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
        {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="app-shell workspace-shell" style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>JATLAS Desktop Workspace</h1>
      <p style={{ color: '#4b5563' }}>{bootstrap.message}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        {(['dashboard', 'tiers', 'actresses', 'storage'] as const).map((key) => (
          <button
            key={key}
            className={tab === key ? 'workspace-tab active' : 'workspace-tab'}
            onClick={() => setTab(key)}
            style={{
              padding: '6px 12px',
              fontWeight: tab === key ? 700 : 400,
              border: tab === key ? '2px solid #111827' : '1px solid #d1d5db',
              background: tab === key ? '#f3f4f6' : '#fff',
            }}
          >
            {key === 'dashboard'
              ? 'Dashboard'
              : key === 'tiers'
                ? 'Tiers'
                : key === 'actresses'
                  ? 'Actresses'
                  : 'Storage'}
          </button>
        ))}
        <button className="workspace-tool" onClick={() => void refreshCurrentTab()} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        <button className="workspace-tool" onClick={() => void onFetchSnapshot()} disabled={loading}>
          Health
        </button>
        <button className="workspace-tool" onClick={() => void onLogout()}>Logout</button>
        <button className="workspace-tool" type="button" onClick={() => void window.desktopApi.openUserDataFolder()}>
          Open app data folder
        </button>
      </div>

      {syncTaskState ? (
        <section style={{ marginBottom: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <strong>Background task:</strong> {syncTaskState.status}{' '}
            {syncTaskState.total > 0 ? `(${syncTaskState.progress}/${syncTaskState.total})` : null}
            {activePollingTaskId && !isSyncTaskTerminal(syncTaskState) ? (
              <button type="button" onClick={() => void onCancelSyncTask()}>
                Cancel task
              </button>
            ) : null}
            {isSyncTaskTerminal(syncTaskState) &&
            (syncTaskState.summary?.error ?? 0) > 0 &&
            (syncTaskState.events?.length ?? 0) > 0 ? (
              <button type="button" onClick={() => void onRetryFailedTierSync()}>
                Retry failed ({syncTaskState.summary?.error})
              </button>
            ) : null}
          </div>
          {syncTaskState.lastProcessedItem ? (
            <div style={{ marginTop: 8, fontSize: 14 }}>
              Last: {syncTaskState.lastProcessedItem.name} — {syncTaskState.lastProcessedItem.detail}
            </div>
          ) : null}
          {syncTaskState.summary ? (
            <pre style={{ marginTop: 8, fontSize: 12, overflow: 'auto', maxHeight: 160 }}>
              {JSON.stringify(syncTaskState.summary, null, 2)}
            </pre>
          ) : null}
        </section>
      ) : null}

      {tab === 'dashboard' && dashboardStats && assetChart ? (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Total actresses</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboardStats.m1.totalCount}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Active / Retired</div>
              <div style={{ fontSize: 18 }}>
                {dashboardStats.m1.activeCount} / {dashboardStats.m1.retiredCount}
              </div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Total videos</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboardStats.m1.totalAssets}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Over capacity (units)</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m1.overloadedAssets}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Pending Emby link</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m2.pendingEmbyLink}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Pending management</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m2.pendingManagement}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Stale update (30d)</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m2.pendingUpdate}</div>
            </div>
          </div>

          <h3>Tier distribution</h3>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Tier</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Count</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Videos</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>%</th>
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

          <h3>Asset log (6 months)</h3>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Month</th>
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

      {tab === 'dashboard' && !dashboardStats ? <p>Loading dashboard...</p> : null}

      {tab === 'tiers' ? (
        <>
          <section style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>
              {tierEditingId === null ? 'Create tier' : `Edit tier #${tierEditingId}`}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', gap: 8 }}>
              <input placeholder="Name" value={tierName} onChange={(e) => setTierName(e.target.value)} />
              <input
                placeholder="Video limit (empty = ∞)"
                value={tierLimitRaw}
                onChange={(e) => setTierLimitRaw(e.target.value)}
              />
              <select value={tierStatus} onChange={(e) => setTierStatus(e.target.value)}>
                <option value="active">active</option>
                <option value="retired">retired</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => void onSubmitTier()} disabled={submitting}>
                {submitting ? 'Saving...' : tierEditingId === null ? 'Create' : 'Update'}
              </button>
              <button onClick={resetTierForm} disabled={submitting}>
                Reset
              </button>
            </div>
          </section>
          <section style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Emby: sync video counts for tier</h3>
            <p style={{ marginTop: 0, color: '#6b7280', fontSize: 14 }}>
              Uses EMBY_SERVER_URL / EMBY_API_KEY from your saved desktop config. Shows per-actress log when
              finished.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={tierSyncId} onChange={(e) => setTierSyncId(Number(e.target.value))}>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => void onTierBulkVideoSync()}>
                Start tier sync
              </button>
            </div>
          </section>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Limit</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Actresses</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
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
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.status}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.actressCount}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>
                      <button type="button" onClick={() => onEditTier(row)} style={{ marginRight: 8 }}>
                        Edit
                      </button>
                      <button type="button" onClick={() => void onDeleteTier(row.id)} disabled={submitting}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {tab === 'actresses' ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actress by name"
              style={{ minWidth: 260 }}
            />
            <button onClick={onSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
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
              Select all (visible)
            </button>
            <button type="button" onClick={() => setSelectedActressIds([])}>
              Clear selection
            </button>
            <span style={{ color: '#6b7280' }}>{selectedActressIds.length} selected</span>
            <button type="button" onClick={() => void onSyncEmbyIds()}>
              Sync Emby IDs
            </button>
            <button type="button" onClick={() => void onSyncMovieCounts()}>
              Sync video counts
            </button>
          </div>

          <section style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>{editingId === null ? 'Create Actress' : `Edit Actress #${editingId}`}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 160px', gap: 8, alignItems: 'center' }}>
              <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <select value={tierId} onChange={(e) => setTierId(Number(e.target.value))}>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Video Count"
                value={videoCount}
                onChange={(e) => setVideoCount(Number(e.target.value))}
              />
            </div>
            <input
              style={{ marginTop: 8, width: '100%' }}
              placeholder="Emby IDs (comma separated)"
              value={embyIdsInput}
              onChange={(e) => setEmbyIdsInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => void onSubmitActress()} disabled={submitting}>
                {submitting ? 'Saving...' : editingId === null ? 'Create' : 'Update'}
              </button>
              <button onClick={resetForm} disabled={submitting}>
                Reset
              </button>
            </div>
          </section>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: 8, width: 40 }} />
                  <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Tier</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Videos</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Emby IDs</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
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
                        Edit
                      </button>
                      <button onClick={() => void onDelete(row.id)} disabled={submitting}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {actresses.length === 0 ? (
                  <tr>
                    <td style={{ padding: 10 }} colSpan={7}>
                      No actresses found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {tab === 'storage' ? (
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Scan tier storage path</h3>
          <p style={{ marginTop: 0, color: '#6b7280', fontSize: 14 }}>
            Resolve AFP/SMB-style paths when possible and list first-level folder names for the selected tier.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Tier
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
            placeholder="Path or URL, e.g. /Volumes/share or afp://..."
            value={storagePathInput}
            onChange={(e) => setStoragePathInput(e.target.value)}
          />
          <button type="button" onClick={() => void onScanStorage()} disabled={loading}>
            {loading ? 'Scanning...' : 'Scan folders'}
          </button>
          <button
            type="button"
            onClick={() => void onBatchImportStorageFolders()}
            disabled={storageImporting || !storageFolders || storageFolders.length === 0}
            style={{ marginLeft: 8 }}
          >
            {storageImporting ? 'Importing...' : 'Batch import folders -> actresses'}
          </button>
          {storageResolved ? (
            <p style={{ marginTop: 12, marginBottom: 0 }}>
              <strong>Resolved:</strong> <code>{storageResolved}</code>
            </p>
          ) : null}
          {storageImportResult ? (
            <p style={{ marginTop: 8, color: '#374151' }}>
              Imported {storageImportResult.created.length}, skipped existing {storageImportResult.skippedExisting.length},
              skipped empty {storageImportResult.skippedEmpty}.
            </p>
          ) : null}
          {storageFolders && storageFolders.length > 0 ? (
            <ul style={{ marginTop: 8, maxHeight: 320, overflow: 'auto', paddingLeft: 20 }}>
              {storageFolders.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : storageFolders && storageFolders.length === 0 ? (
            <p style={{ marginTop: 8, color: '#6b7280' }}>No subfolders found (or path is not a directory).</p>
          ) : null}
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
