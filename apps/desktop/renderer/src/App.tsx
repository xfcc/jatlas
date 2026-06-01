import { type CSSProperties, type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import type { DesktopBootstrapState } from '../../core/bootstrapService';
import type {
  DesktopActress,
  DesktopActressInput,
  DesktopAssetLogChartRow,
  DesktopDashboardStats,
  DesktopTier,
  DesktopTierInput,
} from '../../core/desktopDataService';
import type { DesktopRuntimeConfig } from '../../core/configService';
import type { TaskActivityEvent, TaskState } from '../../core/desktopTaskStore';
import {
  formatActressCreatedSummaryText,
  formatActressDeletedSummaryText,
  formatActressUpdatedSummaryText,
  formatEmbyIdSyncSummaryText,
  formatRuntimeSettingsSummaryText,
  formatStorageImportSummaryText,
  formatTierCreatedSummaryText,
  formatTierDeletedSummaryText,
  formatTierUpdatedSummaryText,
  formatVideoCountSyncSummaryText,
  getActressCreatedSnapshot,
  getActressDeletedSnapshot,
  getActressUpdateChanges,
  getEmbyIdSyncEventGroups,
  getRuntimeSettingsChanges,
  getTierCreatedSnapshot,
  getTierDeletedSnapshot,
  getTierUpdateChanges,
  getVideoCountSyncEventGroups,
  type ActressLogEntry,
  type RuntimeSettingChange,
  type TierLogEntry,
} from './activityLogFormatting';
import { clampLogPaneHeight, defaultLogPaneHeight } from './splitPaneState';

type WorkspaceTab = 'intro' | 'actresses' | 'tiers' | 'settings';
type EditorView =
  | { kind: 'actress'; id: number | null }
  | { kind: 'tier'; id: number | null }
  | { kind: 'tier-detail'; id: number }
  | null;

type ActivitySnapshot = {
  activityId: string;
  kind?: TaskState['kind'];
  title: string;
  scope?: string;
  status: string;
  progress: number;
  total: number;
  summaryText?: string;
  events: TaskActivityEvent[];
  startedAt?: string;
  finishedAt?: string;
};

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

function compactTierStoragePaths(paths: Record<string, string>) {
  const clean = Object.fromEntries(
    Object.entries(paths)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value.length > 0),
  );
  return Object.keys(clean).length > 0 ? clean : undefined;
}

function isTaskTerminal(t: TaskState) {
  return t.status.startsWith('completed') || t.status.startsWith('error:') || t.status === 'error:tier_not_found';
}

function resultLabel(result: TaskActivityEvent['result']) {
  if (result === 'created') return '新增';
  if (result === 'updated') return '更新';
  if (result === 'unchanged') return '无变化';
  if (result === 'skipped') return '跳过';
  if (result === 'error') return '失败';
  return '完成';
}

function eventResultText(event: TaskActivityEvent) {
  if (event.action === '存在于其他分级') return '其他分级';
  if (event.action === '写入失败') return '失败';
  return resultLabel(event.result);
}

function activityStatusText(activity: ActivitySnapshot) {
  if (activity.status === 'processing') return '执行中';
  if (activity.status === 'starting') return '准备中';
  if (activity.status === 'completed') return activity.events.some((event) => event.result === 'error') ? '存在失败' : '已完成';
  if (activity.status === 'completed:cancelled') return '已取消';
  if (activity.status.startsWith('error:')) return '失败';
  return activity.status;
}

function normalizeTaskEvent(event: NonNullable<TaskState['events']>[number], fallbackIndex: number): TaskActivityEvent {
  return {
    id: event.id ?? `${event.action ?? 'event'}-${fallbackIndex}`,
    index: event.index ?? fallbackIndex,
    timestamp: event.timestamp ?? new Date().toISOString(),
    subjectName: event.subjectName ?? event.name ?? `#${fallbackIndex}`,
    subjectId: event.subjectId ?? event.actressId,
    actressId: event.actressId,
    name: event.name,
    action: event.action ?? '处理',
    result: event.result === 'success' ? 'success' : event.result,
    before: event.before ?? event.oldCount,
    after: event.after ?? event.newCount,
    oldCount: event.oldCount,
    newCount: event.newCount,
    delta: event.delta,
    detail: event.detail,
    retryable: event.retryable,
  };
}

function formatNumberValue(value: number | string | null | undefined) {
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

function formatDelta(delta: number | null | undefined) {
  if (delta === null || delta === undefined) return '';
  return delta > 0 ? `+${delta}` : String(delta);
}

function taskSummaryText(task: TaskState) {
  const summary = task.summary;
  if (!summary) return undefined;
  if (task.kind === 'storage-import') {
    return formatStorageImportSummaryText(summary, task.total);
  }
  if (task.kind === 'video-count-sync') {
    return formatVideoCountSyncSummaryText(summary, task.total);
  }
  if (task.kind === 'emby-id-sync') {
    return formatEmbyIdSyncSummaryText(summary, task.total);
  }
  return `已处理 ${task.progress} / ${task.total}。`;
}

function taskToActivitySnapshot(task: TaskState, fallbackId: string): ActivitySnapshot {
  return {
    activityId: task.taskId ?? fallbackId,
    kind: task.kind,
    title: task.title ?? '后台操作',
    scope: task.scope,
    status: task.status,
    progress: task.progress,
    total: task.total,
    summaryText: taskSummaryText(task),
    events: (task.events ?? []).map((event, index) => normalizeTaskEvent(event, index + 1)),
    startedAt: task.startedAt,
    finishedAt: task.finishedAt,
  };
}

function renderActivityEvent(event: TaskActivityEvent) {
  return (
    <li className={`activity-event result-${event.result}`} key={event.id}>
      <span className="activity-event-index">{String(event.index).padStart(3, '0')}</span>
      <span className="activity-event-result">{eventResultText(event)}</span>
      <span className="activity-event-name">{event.subjectName}</span>
      <span className="activity-event-change">
        {event.before !== undefined || event.after !== undefined
          ? `${formatNumberValue(event.before)} -> ${formatNumberValue(event.after)}`
          : ''}
        {event.delta !== undefined && event.delta !== null ? ` ${formatDelta(event.delta)}` : ''}
      </span>
      <span className="activity-event-detail">{event.detail}</span>
    </li>
  );
}

function renderActivityEvents(events: TaskActivityEvent[]) {
  return <ol className="activity-events">{events.map((event) => renderActivityEvent(event))}</ol>;
}

function renderCompactVideoCountEvent(event: TaskActivityEvent, displayIndex: number) {
  const changeText =
    event.before !== undefined || event.after !== undefined
      ? `${formatNumberValue(event.before)} -> ${formatNumberValue(event.after)}${
          event.delta !== undefined && event.delta !== null ? ` ${formatDelta(event.delta)}` : ''
        }`
      : '';
  return (
    <li className={`activity-event activity-event-compact result-${event.result}`} key={event.id}>
      <span className="activity-event-index">{String(displayIndex).padStart(3, '0')}</span>
      <span className="activity-event-name">{event.subjectName}</span>
      {event.result === 'error' ? (
        <span className="activity-event-detail">{event.detail}</span>
      ) : (
        <span className="activity-event-change">{changeText}</span>
      )}
    </li>
  );
}

function renderCompactVideoCountEvents(events: TaskActivityEvent[]) {
  return (
    <ol className="activity-events">
      {events.map((event, index) => renderCompactVideoCountEvent(event, index + 1))}
    </ol>
  );
}

function renderCompactDetailEvent(event: TaskActivityEvent, displayIndex: number) {
  return (
    <li className={`activity-event activity-event-compact result-${event.result}`} key={event.id}>
      <span className="activity-event-index">{String(displayIndex).padStart(3, '0')}</span>
      <span className="activity-event-name">{event.subjectName}</span>
      <span className="activity-event-detail">{event.detail}</span>
    </li>
  );
}

function renderCompactDetailEvents(events: TaskActivityEvent[]) {
  return (
    <ol className="activity-events">
      {events.map((event, index) => renderCompactDetailEvent(event, index + 1))}
    </ol>
  );
}

function renderActivityEventGroup(title: string, events: TaskActivityEvent[]) {
  if (events.length === 0) return null;
  return (
    <section className="activity-event-group" key={title}>
      <h4>{title}</h4>
      {renderActivityEvents(events)}
    </section>
  );
}

function renderCompactActivityEventGroup(title: string, events: TaskActivityEvent[]) {
  if (events.length === 0) return null;
  return (
    <section className="activity-event-group" key={title}>
      <h4>{title}</h4>
      {renderCompactVideoCountEvents(events)}
    </section>
  );
}

function renderCompactDetailActivityEventGroup(title: string, events: TaskActivityEvent[]) {
  if (events.length === 0) return null;
  return (
    <section className="activity-event-group" key={title}>
      <h4>{title}</h4>
      {renderCompactDetailEvents(events)}
    </section>
  );
}

function renderStorageImportEvents(events: TaskActivityEvent[]) {
  const created = events.filter((event) => event.result === 'created');
  const existingOther = events.filter((event) => event.action === '存在于其他分级');
  const failed = events.filter((event) => event.result === 'error');

  return (
    <div className="activity-event-groups">
      {renderActivityEventGroup('新增演员', created)}
      {renderActivityEventGroup('存在于其他分级', existingOther)}
      {renderActivityEventGroup('写入失败', failed)}
    </div>
  );
}

function renderVideoCountSyncEvents(events: TaskActivityEvent[]) {
  const groups = getVideoCountSyncEventGroups(events);
  const hasVisibleEvents = groups.increased.length > 0 || groups.decreased.length > 0 || groups.failed.length > 0;
  if (!hasVisibleEvents) return null;

  return (
    <div className="activity-event-groups">
      {renderCompactActivityEventGroup('影片数量提升', groups.increased)}
      {renderCompactActivityEventGroup('影片数量减少', groups.decreased)}
      {renderCompactActivityEventGroup('同步失败', groups.failed)}
    </div>
  );
}

function renderEmbyIdSyncEvents(events: TaskActivityEvent[]) {
  const groups = getEmbyIdSyncEventGroups(events);
  const hasVisibleEvents = groups.bound.length > 0 || groups.notFound.length > 0 || groups.failed.length > 0;
  if (!hasVisibleEvents) return null;

  return (
    <div className="activity-event-groups">
      {renderCompactDetailActivityEventGroup('新增绑定', groups.bound)}
      {renderCompactDetailActivityEventGroup('Emby 未找到', groups.notFound)}
      {renderCompactDetailActivityEventGroup('同步失败', groups.failed)}
    </div>
  );
}

function renderDatabaseChangeEvents(events: TaskActivityEvent[]) {
  const changes = events.filter((event) => event.action === '配置变更');
  const infoChanges = events.filter((event) => event.action === '信息变更');
  const initialInfo = events.filter((event) => event.action === '初始信息');
  const deleteSnapshot = events.filter((event) => event.action === '删除快照');
  const failures = events.filter((event) => event.action === '失败原因' || event.result === 'error');
  const hasVisibleEvents =
    changes.length > 0 ||
    infoChanges.length > 0 ||
    initialInfo.length > 0 ||
    deleteSnapshot.length > 0 ||
    failures.length > 0;
  if (!hasVisibleEvents) return null;

  return (
    <div className="activity-event-groups">
      {renderCompactDetailActivityEventGroup('配置变更', changes)}
      {renderCompactDetailActivityEventGroup('信息变更', infoChanges)}
      {renderCompactDetailActivityEventGroup('初始信息', initialInfo)}
      {renderCompactDetailActivityEventGroup('删除快照', deleteSnapshot)}
      {renderCompactDetailActivityEventGroup('失败原因', failures)}
    </div>
  );
}

function renderActivityEventList(activity: ActivitySnapshot) {
  if (activity.kind === 'storage-import') {
    return renderStorageImportEvents(activity.events);
  }
  if (activity.kind === 'video-count-sync') {
    return renderVideoCountSyncEvents(activity.events);
  }
  if (activity.kind === 'emby-id-sync') {
    return renderEmbyIdSyncEvents(activity.events);
  }
  if (activity.kind === 'database-change') {
    return renderDatabaseChangeEvents(activity.events);
  }
  return renderActivityEvents(activity.events);
}

function createSimpleActivity(
  title: string,
  detail: string,
  result: TaskActivityEvent['result'] = 'success',
  scope?: string,
): ActivitySnapshot {
  const timestamp = new Date().toISOString();
  const event: TaskActivityEvent = {
    id: `local-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
    index: 1,
    timestamp,
    subjectName: scope ?? title,
    action: title,
    result,
    detail,
  };
  return {
    activityId: event.id,
    title,
    scope,
    status: result === 'error' ? 'error:operation' : 'completed',
    progress: 1,
    total: 1,
    summaryText: detail,
    events: [event],
    startedAt: timestamp,
    finishedAt: timestamp,
  };
}

function createRuntimeSettingsActivity(changes: RuntimeSettingChange[]): ActivitySnapshot {
  const timestamp = new Date().toISOString();
  const events: TaskActivityEvent[] = changes.map((change, index) => ({
    id: `settings-${timestamp}-${index + 1}`,
    index: index + 1,
    timestamp,
    subjectName: change.label,
    action: '配置变更',
    result: 'updated',
    detail: change.detail,
  }));
  return {
    activityId: `settings-${timestamp}`,
    kind: 'database-change',
    title: '保存设置',
    scope: '全局操作',
    status: 'completed',
    progress: changes.length,
    total: changes.length,
    summaryText: formatRuntimeSettingsSummaryText(changes.length),
    events,
    startedAt: timestamp,
    finishedAt: timestamp,
  };
}

function createRuntimeSettingsFailureActivity(detail: string): ActivitySnapshot {
  const timestamp = new Date().toISOString();
  const event: TaskActivityEvent = {
    id: `settings-error-${timestamp}`,
    index: 1,
    timestamp,
    subjectName: '写入配置文件失败',
    action: '失败原因',
    result: 'error',
    detail,
  };
  return {
    activityId: event.id,
    kind: 'database-change',
    title: '保存设置',
    scope: '全局操作',
    status: 'error:operation',
    progress: 1,
    total: 1,
    summaryText: '运行配置保存失败。',
    events: [event],
    startedAt: timestamp,
    finishedAt: timestamp,
  };
}

function createActressMaintenanceActivity(
  title: string,
  scope: string,
  summaryText: string,
  groupTitle: '信息变更' | '初始信息' | '删除快照',
  entries: ActressLogEntry[],
  result: TaskActivityEvent['result'],
): ActivitySnapshot {
  const timestamp = new Date().toISOString();
  const events: TaskActivityEvent[] = entries.map((entry, index) => ({
    id: `actress-${timestamp}-${index + 1}`,
    index: index + 1,
    timestamp,
    subjectName: entry.label,
    action: groupTitle,
    result,
    detail: entry.detail,
  }));
  return {
    activityId: `actress-${timestamp}`,
    kind: 'database-change',
    title,
    scope,
    status: 'completed',
    progress: entries.length,
    total: entries.length,
    summaryText,
    events,
    startedAt: timestamp,
    finishedAt: timestamp,
  };
}

function createTierMaintenanceActivity(
  title: string,
  scope: string,
  summaryText: string,
  groupTitle: '信息变更' | '初始信息' | '删除快照',
  entries: TierLogEntry[],
  result: TaskActivityEvent['result'],
): ActivitySnapshot {
  const timestamp = new Date().toISOString();
  const events: TaskActivityEvent[] = entries.map((entry, index) => ({
    id: `tier-${timestamp}-${index + 1}`,
    index: index + 1,
    timestamp,
    subjectName: entry.label,
    action: groupTitle,
    result,
    detail: entry.detail,
  }));
  return {
    activityId: `tier-${timestamp}`,
    kind: 'database-change',
    title,
    scope,
    status: 'completed',
    progress: entries.length,
    total: entries.length,
    summaryText,
    events,
    startedAt: timestamp,
    finishedAt: timestamp,
  };
}

function createTierFailureActivity(
  title: string,
  scope: string,
  summaryText: string,
  subjectName: string,
  detail: string,
): ActivitySnapshot {
  const timestamp = new Date().toISOString();
  const event: TaskActivityEvent = {
    id: `tier-error-${timestamp}`,
    index: 1,
    timestamp,
    subjectName,
    action: '失败原因',
    result: 'error',
    detail,
  };
  return {
    activityId: event.id,
    kind: 'database-change',
    title,
    scope,
    status: 'error:operation',
    progress: 1,
    total: 1,
    summaryText,
    events: [event],
    startedAt: timestamp,
    finishedAt: timestamp,
  };
}

export function App() {
  const [bootstrap, setBootstrap] = useState<DesktopBootstrapState | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [databaseUrl, setDatabaseUrl] = useState(initialDatabaseUrl);
  const [selectedDatabasePath, setSelectedDatabasePath] = useState('');
  const [embyServerUrl, setEmbyServerUrl] = useState('');
  const [embyApiKey, setEmbyApiKey] = useState('');
  const [storageRootPath, setStorageRootPath] = useState('');
  const [tierStoragePaths, setTierStoragePaths] = useState<Record<string, string>>({});
  const [runtimeConfigBaseline, setRuntimeConfigBaseline] = useState<DesktopRuntimeConfig | null>(null);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [tierDetailMessage, setTierDetailMessage] = useState('');
  const [tiers, setTiers] = useState<DesktopTier[]>([]);
  const [actresses, setActresses] = useState<DesktopActress[]>([]);
  const [query, setQuery] = useState('');
  const [actressTierFilterId, setActressTierFilterId] = useState<number | 'all'>('all');

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

  const [syncTaskState, setSyncTaskState] = useState<TaskState | null>(null);
  const pollRef = useRef<number | null>(null);
  const [activePollingTaskId, setActivePollingTaskId] = useState<string | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivitySnapshot[]>([]);
  const archivedTaskIdsRef = useRef<Set<string>>(new Set());
  const [logPaneHeight, setLogPaneHeight] = useState(() =>
    defaultLogPaneHeight({ viewportHeight: typeof window === 'undefined' ? 900 : window.innerHeight }),
  );

  const [storagePathInput, setStoragePathInput] = useState('');
  const [storageResolved, setStorageResolved] = useState<string | null>(null);
  const [storageFolders, setStorageFolders] = useState<string[] | null>(null);
  const tempIdRef = useRef(-1);

  const stopPoll = () => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPoll(), []);

  useEffect(() => {
    const onResize = () => {
      setLogPaneHeight((height) => clampLogPaneHeight(height, { viewportHeight: window.innerHeight }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const nextTempId = () => {
    tempIdRef.current -= 1;
    return tempIdRef.current;
  };

  const appendActivity = (activity: ActivitySnapshot) => {
    setActivityHistory((prev) => [activity, ...prev.filter((item) => item.activityId !== activity.activityId)].slice(0, 30));
  };

  const archiveTaskActivity = (task: TaskState, fallbackId: string) => {
    const id = task.taskId ?? fallbackId;
    if (archivedTaskIdsRef.current.has(id)) return;
    archivedTaskIdsRef.current.add(id);
    appendActivity(taskToActivitySnapshot(task, id));
  };

  const matchesCurrentQuery = (value: string) => {
    const q = query.trim();
    if (!q) return true;
    return value.toLocaleLowerCase().includes(q.toLocaleLowerCase());
  };

  const matchesCurrentTierFilter = (row: DesktopActress) =>
    actressTierFilterId === 'all' || row.tierId === actressTierFilterId;

  useEffect(() => {
    if (tiers.length === 0) return;
    const first = tiers[0].id;
    setTierId((id) => (tiers.some((t) => t.id === id) ? id : first));
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
          setTierStoragePaths(config.tierStoragePaths ?? {});
          setRuntimeConfigBaseline(config);
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
        } else if (tab === 'tiers') {
          await loadTiersOnly();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载数据失败');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap?.configured, bootstrap?.initialized, authenticated, tab]);

  const beginPollTask = (taskId: string) => {
    stopPoll();
    setActivePollingTaskId(taskId);
    archivedTaskIdsRef.current.delete(taskId);
    setSyncTaskState({
      taskId,
      title: '后台操作',
      progress: 0,
      total: 0,
      status: 'starting',
      startedAt: new Date().toISOString(),
      events: [],
    });
    const tick = async () => {
      try {
        const t = await window.desktopApi.getSyncTask(taskId);
        setSyncTaskState(t);
        if (!t) return;
        if (isTaskTerminal(t)) {
          stopPoll();
          setActivePollingTaskId(null);
          archiveTaskActivity(t, taskId);
          const reloadActresses =
            editorView?.kind === 'tier-detail'
              ? window.desktopApi.listActresses().then((rows) => setActresses(rows))
              : loadWorkspaceData(query);
          await Promise.all([reloadActresses, loadDashboardData(), loadTiersOnly()]);
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
      .map((e) => e.actressId)
      .filter((id): id is number => typeof id === 'number');
    if (ids.length === 0) return;
    setError(null);
    try {
      const { taskId } =
        syncTaskState?.kind === 'emby-id-sync'
          ? await window.desktopApi.startSyncEmbyIds(ids)
          : await window.desktopApi.startSyncMovieCounts(ids);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '重试失败');
    }
  };

  const getCachedTierStoragePath = (id: number) => tierStoragePaths[String(id)] ?? storageRootPath;

  const runtimeConfigWithPaths = (paths: Record<string, string>): DesktopRuntimeConfig => ({
    dbMode: 'sqlite',
    databaseUrl,
    embyServerUrl: embyServerUrl.trim() || undefined,
    embyApiKey: embyApiKey.trim() || undefined,
    tierStoragePaths: compactTierStoragePaths(paths),
    storageRootPath: storageRootPath.trim() || undefined,
  });

  const getActressIdsForTier = async (id: number) => {
    const rows = await window.desktopApi.listActresses();
    setActresses(rows);
    return rows.filter((row) => row.tierId === id).map((row) => row.id);
  };

  const onTierSyncEmbyIds = async (id: number) => {
    setError(null);
    try {
      const ids = await getActressIdsForTier(id);
      if (ids.length === 0) {
        setError('当前分级下没有演员。');
        return;
      }
      const { taskId } = await window.desktopApi.startSyncEmbyIds(ids);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '同步 Emby ID 失败');
    }
  };

  const onTierBulkVideoSync = async (id: number) => {
    setError(null);
    try {
      const { taskId } = await window.desktopApi.startTierVideoSync(id);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '分级同步失败');
    }
  };

  const onSaveTierStoragePath = async (id: number) => {
    setSaving(true);
    setError(null);
    setTierDetailMessage('');
    try {
      const nextPaths = { ...tierStoragePaths };
      const value = storagePathInput.trim();
      if (value) {
        nextPaths[String(id)] = value;
      } else {
        delete nextPaths[String(id)];
      }
      const saved = await window.desktopApi.saveRuntimeConfig(runtimeConfigWithPaths(nextPaths));
      const savedPaths = saved.tierStoragePaths ?? {};
      setTierStoragePaths(savedPaths);
      setStoragePathInput(savedPaths[String(id)] ?? '');
      setTierDetailMessage(value ? '分级存储地址已保存。' : '分级存储地址已清空。');
      appendActivity(
        createSimpleActivity(
          '保存分级存储地址',
          value ? `已保存存储地址：${value}` : '已清空该分级的存储地址。',
          'success',
          activeTierDetail ? `${activeTierDetail.name} 分级` : undefined,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存分级存储地址失败');
      appendActivity(createSimpleActivity('保存分级存储地址', e instanceof Error ? e.message : '保存失败', 'error'));
    } finally {
      setSaving(false);
    }
  };

  const onScanStorage = async (id: number) => {
    if (!storagePathInput.trim()) {
      setError('请输入存储目录路径。');
      return;
    }
    setLoading(true);
    setError(null);
    setStorageFolders(null);
    setStorageResolved(null);
    setTierDetailMessage('');
    try {
      const result = await window.desktopApi.scanStorage(id, storagePathInput);
      setStorageResolved(result.resolvedPath);
      setStorageFolders(result.folders);
      appendActivity(
        createSimpleActivity(
          '扫描存储地址',
          `扫描到 ${result.folders.length} 个一级文件夹。`,
          'success',
          activeTierDetail ? `${activeTierDetail.name} 分级` : undefined,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '扫描失败');
      appendActivity(createSimpleActivity('扫描存储地址', e instanceof Error ? e.message : '扫描失败', 'error'));
    } finally {
      setLoading(false);
    }
  };

  const onBatchImportStorageFolders = async (id: number) => {
    if (!storageFolders || storageFolders.length === 0) {
      setError('请先扫描文件夹，再执行导入。');
      return;
    }
    setError(null);
    try {
      const { taskId } = await window.desktopApi.startStorageImport(id, storageFolders);
      setTierDetailMessage('导入任务已开始，可在下方操作日志中查看进度。');
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '批量导入失败');
      appendActivity(createSimpleActivity('批量导入演员', e instanceof Error ? e.message : '批量导入失败', 'error'));
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
    setStoragePathInput(result.folderPath);
  };

  const onSaveRuntimeSettings = async () => {
    setSaving(true);
    setError(null);
    setSettingsMessage('');
    try {
      const nextConfig = runtimeConfigWithPaths(tierStoragePaths);
      const saved = await window.desktopApi.saveRuntimeConfig(nextConfig);
      setEmbyServerUrl(saved.embyServerUrl ?? '');
      setEmbyApiKey(saved.embyApiKey ?? '');
      setStorageRootPath(saved.storageRootPath ?? '');
      setTierStoragePaths(saved.tierStoragePaths ?? {});
      setRuntimeConfigBaseline(saved);
      setSettingsMessage('设置已保存。');
      appendActivity(createRuntimeSettingsActivity(getRuntimeSettingsChanges(runtimeConfigBaseline, saved)));
    } catch (e) {
      const detail = e instanceof Error ? e.message : '保存设置失败';
      setError(detail);
      appendActivity(createRuntimeSettingsFailureActivity(detail));
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

  const onOpenTierDetail = async (row: DesktopTier) => {
    setEditorView({ kind: 'tier-detail', id: row.id });
    setStoragePathInput(getCachedTierStoragePath(row.id));
    setStorageResolved(null);
    setStorageFolders(null);
    setTierDetailMessage('');
    setError(null);
    try {
      setActresses(await window.desktopApi.listActresses());
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载分级演员失败');
    }
  };

  const onSubmitTier = async () => {
    const name = tierName.trim();
    if (!name) {
      setError('请填写分级名称。');
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
    const editingTierId = tierEditingId;
    const originalTier = editingTierId === null ? null : previousTiers.find((row) => row.id === editingTierId);
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
        appendActivity(
          createTierMaintenanceActivity(
            '新增分级',
            `${created.name} 分级`,
            formatTierCreatedSummaryText(),
            '初始信息',
            getTierCreatedSnapshot(created),
            'created',
          ),
        );
      } else {
        const updated = await window.desktopApi.updateTier(tierEditingId, input);
        setTiers((prev) => prev.map((row) => (row.id === tierEditingId ? updated : row)));
        setActresses((prev) =>
          prev.map((row) => (row.tierId === tierEditingId ? { ...row, tierName: updated.name } : row)),
        );
        const changes = originalTier ? getTierUpdateChanges(originalTier, updated) : [];
        appendActivity(
          createTierMaintenanceActivity(
            '编辑分级',
            `${updated.name} 分级`,
            formatTierUpdatedSummaryText(changes.length),
            '信息变更',
            changes,
            'updated',
          ),
        );
      }
      await Promise.all([loadTiersOnly(), loadDashboardData()]);
      resetTierForm();
      setEditorView(null);
    } catch (e) {
      setTiers(previousTiers);
      setActresses(previousActresses);
      const detail = e instanceof Error ? e.message : '保存分级失败';
      setError(detail);
      appendActivity(
        createTierFailureActivity(
          '保存分级',
          `${input.name} 分级`,
          '分级保存失败。',
          '保存失败',
          detail,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteTier = async (id: number) => {
    if (!window.confirm('确认删除这个分级？请先移走该分级下的演员。')) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const previousTiers = tiers;
    const targetTier = tiers.find((row) => row.id === id);
    try {
      setTiers((prev) => prev.filter((row) => row.id !== id));
      await window.desktopApi.deleteTier(id);
      await Promise.all([loadTiersOnly(), loadDashboardData(), tab === 'actresses' ? loadWorkspaceData(query) : Promise.resolve()]);
      appendActivity(
        targetTier
          ? createTierMaintenanceActivity(
              '删除分级',
              `${targetTier.name} 分级`,
              formatTierDeletedSummaryText(),
              '删除快照',
              getTierDeletedSnapshot(targetTier),
              'success',
            )
          : createSimpleActivity('删除分级', `已删除分级 #${id}。`, 'success', `分级 #${id}`),
      );
      if (tierEditingId === id) {
        resetTierForm();
      }
    } catch (e) {
      setTiers(previousTiers);
      const detail = e instanceof Error ? e.message : '删除分级失败';
      setError(detail);
      appendActivity(
        createTierFailureActivity(
          '删除分级',
          targetTier ? `${targetTier.name} 分级` : `分级 #${id}`,
          '分级删除失败。',
          '删除失败',
          detail,
        ),
      );
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

    const tierNameForInput = tiers.find((t) => t.id === input.tierId)?.name ?? `分级 #${input.tierId}`;
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
          ? matchesCurrentQuery(optimisticRow.name) && matchesCurrentTierFilter(optimisticRow)
            ? [...prev, optimisticRow]
            : prev
          : prev
              .map((row) => (row.id === editingId ? optimisticRow : row))
              .filter((row) => row.id !== optimisticRow.id || (matchesCurrentQuery(row.name) && matchesCurrentTierFilter(row)));
      return next.sort((a, b) => a.id - b.id);
    });

    try {
      if (editingId === null) {
        const created = await window.desktopApi.createActress(input);
        setActresses((prev) => {
          const replaced = prev.map((row) => (row.id === optimisticRow.id ? created : row));
          if (!replaced.some((row) => row.id === created.id) && matchesCurrentQuery(created.name) && matchesCurrentTierFilter(created)) {
            replaced.push(created);
          }
          return replaced.sort((a, b) => a.id - b.id);
        });
        appendActivity(
          createActressMaintenanceActivity(
            '新增演员',
            created.name,
            formatActressCreatedSummaryText(created.tierName),
            '初始信息',
            getActressCreatedSnapshot(created),
            'created',
          ),
        );
      } else {
        const before = previousActresses.find((row) => row.id === editingId);
        const updated = await window.desktopApi.updateActress(editingId, input);
        setActresses((prev) =>
          prev
            .map((row) => (row.id === editingId ? updated : row))
            .filter((row) => row.id !== updated.id || (matchesCurrentQuery(row.name) && matchesCurrentTierFilter(row)))
            .sort((a, b) => a.id - b.id),
        );
        const changes = before ? getActressUpdateChanges(before, updated) : getActressCreatedSnapshot(updated);
        appendActivity(
          createActressMaintenanceActivity(
            '编辑演员',
            updated.name,
            formatActressUpdatedSummaryText(changes.length),
            '信息变更',
            changes,
            'updated',
          ),
        );
      }
      await Promise.all([loadTiersOnly(), loadDashboardData()]);
      resetForm();
      setEditorView(null);
    } catch (e) {
      setActresses(previousActresses);
      setError(e instanceof Error ? e.message : '保存演员失败');
      appendActivity(createSimpleActivity('保存演员', e instanceof Error ? e.message : '保存演员失败', 'error', input.name));
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
    const target = actresses.find((row) => row.id === id);
    try {
      setActresses((prev) => prev.filter((row) => row.id !== id));
      await window.desktopApi.deleteActress(id);
      await Promise.all([loadTiersOnly(), loadDashboardData()]);
      appendActivity(
        target
          ? createActressMaintenanceActivity(
              '删除演员',
              target.name,
              formatActressDeletedSummaryText(),
              '删除快照',
              getActressDeletedSnapshot(target),
              'success',
            )
          : createSimpleActivity('删除演员', `已删除演员 #${id}。`, 'success', `演员 #${id}`),
      );
      if (editingId === id) {
        resetForm();
      }
    } catch (e) {
      setActresses(previousActresses);
      setError(e instanceof Error ? e.message : '删除演员失败');
      appendActivity(createSimpleActivity('删除演员', e instanceof Error ? e.message : '删除演员失败', 'error', target?.name ?? `演员 #${id}`));
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

  const onStartLogPaneResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = logPaneHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const nextHeight = startHeight + startY - moveEvent.clientY;
      setLogPaneHeight(clampLogPaneHeight(nextHeight, { viewportHeight: window.innerHeight }));
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const visibleActresses = actresses.filter(matchesCurrentTierFilter);
  const activeTierDetail = editorView?.kind === 'tier-detail' ? tiers.find((row) => row.id === editorView.id) ?? null : null;
  const activeTierActresses = activeTierDetail ? actresses.filter((row) => row.tierId === activeTierDetail.id) : [];
  const activeActivity =
    syncTaskState && !isTaskTerminal(syncTaskState)
      ? taskToActivitySnapshot(syncTaskState, activePollingTaskId ?? syncTaskState.taskId ?? 'active-task')
      : null;
  const visibleActivities = activeActivity ? [activeActivity, ...activityHistory] : activityHistory;
  const hasRunningActivity = Boolean(activeActivity);
  const hasFailedActivity = visibleActivities.some(
    (activity) => activity.status.startsWith('error:') || activity.events.some((event) => event.result === 'error'),
  );

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
    <main className="app-shell workspace-shell" style={{ fontFamily: 'sans-serif' }}>
      <nav className="workspace-nav" aria-label="功能导航">
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
                ? '分级'
                : key === 'actresses'
                  ? '演员'
                  : '设置'}
          </button>
        ))}
      </nav>

      <div className="workspace-main" style={{ '--log-pane-height': `${logPaneHeight}px` } as CSSProperties}>
        <section className="operation-pane" aria-label="操作区">
          <header className="workspace-header">
            <h1>JATLAS 资产控制台</h1>
            <p>演员分级台账、Emby 对账与 NAS 存储扫描。</p>
          </header>
          <div className="operation-pane-body">

      {editorView?.kind === 'tier' ? (
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <button type="button" onClick={() => setEditorView(null)} style={{ marginBottom: 12 }}>
            返回分级列表
          </button>
          <h2 style={{ marginTop: 0 }}>{editorView.id === null ? '新增分级' : `编辑分级 #${editorView.id}`}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 8 }}>
            <input placeholder="分级名称" value={tierName} onChange={(e) => setTierName(e.target.value)} />
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
              {submitting ? '保存中...' : '保存分级'}
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

      {activeTierDetail ? (
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <button type="button" onClick={() => setEditorView(null)} style={{ marginBottom: 12 }}>
            返回分级列表
          </button>
          <h2 style={{ marginTop: 0 }}>{activeTierDetail.name}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>影片上限</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{activeTierDetail.video_limit === null ? '不限' : activeTierDetail.video_limit}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>状态</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{tierStatusText(activeTierDetail.status)}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>演员数</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{activeTierDetail.actressCount}</div>
            </div>
          </div>

          <h3 style={{ marginTop: 0 }}>分级批量同步</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={() => void onTierSyncEmbyIds(activeTierDetail.id)} disabled={Boolean(activePollingTaskId)}>
              批量补全 Emby ID
            </button>
            <button type="button" onClick={() => void onTierBulkVideoSync(activeTierDetail.id)} disabled={Boolean(activePollingTaskId)}>
              批量刷新影片数量
            </button>
          </div>

          <h3>分级存储地址</h3>
          <div style={{ display: 'grid', gap: 10, maxWidth: 820 }}>
            <label>
              存储目录
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  style={{ width: '100%' }}
                  placeholder="例如 /Volumes/JAV_output/S"
                  value={storagePathInput}
                  onChange={(e) => setStoragePathInput(e.target.value)}
                />
                <button type="button" onClick={() => void onSelectStorageFolder()} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  选择目录
                </button>
              </div>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button type="button" onClick={() => void onSaveTierStoragePath(activeTierDetail.id)} disabled={saving}>
                {saving ? '保存中...' : '保存地址'}
              </button>
              <button type="button" onClick={() => void onScanStorage(activeTierDetail.id)} disabled={loading}>
                {loading ? '扫描中...' : '扫描文件夹'}
              </button>
              <button
                type="button"
                onClick={() => void onBatchImportStorageFolders(activeTierDetail.id)}
                disabled={Boolean(activePollingTaskId) || !storageFolders || storageFolders.length === 0}
              >
                {activePollingTaskId ? '任务执行中...' : '批量导入为演员'}
              </button>
              {tierDetailMessage ? <span style={{ color: '#16a34a' }}>{tierDetailMessage}</span> : null}
            </div>
          </div>
          {storageResolved ? (
            <p style={{ marginTop: 12, marginBottom: 0 }}>
              <strong>实际路径：</strong> <code>{storageResolved}</code>
            </p>
          ) : null}
          {storageFolders && storageFolders.length > 0 ? (
            <ul style={{ marginTop: 8, maxHeight: 240, overflow: 'auto', paddingLeft: 20 }}>
              {storageFolders.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : storageFolders && storageFolders.length === 0 ? (
            <p style={{ marginTop: 8, color: '#6b7280' }}>没有找到一级子文件夹，或该路径不是目录。</p>
          ) : null}

          <h3>当前分级演员</h3>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>名称</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>影片</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Emby ID</th>
                </tr>
              </thead>
              <tbody>
                {activeTierActresses.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.id}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.name}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.video_count}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{row.embyIds.join(', ') || '-'}</td>
                  </tr>
                ))}
                {activeTierActresses.length === 0 ? (
                  <tr>
                    <td style={{ padding: 10 }} colSpan={4}>
                      当前分级下没有演员。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
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

      {activePollingTaskId && syncTaskState && !isTaskTerminal(syncTaskState) ? (
        <section className="activity-inline-hint">
          <span>
            {syncTaskState.title ?? '后台任务'}正在执行
            {syncTaskState.total > 0 ? `，${syncTaskState.progress}/${syncTaskState.total}` : ''}。可在下方操作日志中查看明细。
          </span>
          <button type="button" onClick={() => void onCancelSyncTask()}>
            取消任务
          </button>
        </section>
      ) : null}

      {syncTaskState &&
      isTaskTerminal(syncTaskState) &&
      (syncTaskState.summary?.error ?? 0) > 0 &&
      (syncTaskState.events?.length ?? 0) > 0 ? (
        <section className="activity-inline-hint">
          <span>{syncTaskState.title ?? '后台任务'}存在失败项，可在下方操作日志中查看明细。</span>
          <button type="button" onClick={() => void onRetryFailedTierSync()}>
            重试失败项 ({syncTaskState.summary?.error})
          </button>
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

          <h3>分级分布</h3>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
	                  <th style={{ textAlign: 'left', padding: 8 }}>分级</th>
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
            <h2 style={{ margin: 0 }}>分级</h2>
            <button type="button" onClick={onCreateTier}>
              新增分级
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
	                  <th style={{ textAlign: 'left', padding: 8 }}>存储地址</th>
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
	                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{tierStoragePaths[String(row.id)] || '未设置'}</td>
	                    <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>
	                      <button type="button" onClick={() => void onOpenTierDetail(row)} style={{ marginRight: 8 }}>
	                        详情
	                      </button>
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
            <select
              value={actressTierFilterId}
              onChange={(e) => setActressTierFilterId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{ minWidth: 180 }}
            >
              <option value="all">全部分级</option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
            </select>
            <button onClick={onSearch} disabled={loading}>
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>名称</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>分级</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>影片</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Emby ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleActresses.map((row) => (
                  <tr key={row.id}>
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
                {visibleActresses.length === 0 ? (
                  <tr>
                    <td style={{ padding: 10 }} colSpan={6}>
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
                placeholder="例如 http://emby.local:8096"
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
          </div>
        </section>

        <div
          className="workspace-splitter"
          role="separator"
          aria-label="调整操作区和日志区高度"
          aria-orientation="horizontal"
          onMouseDown={onStartLogPaneResize}
        >
          <span />
        </div>

        <aside
          className={`activity-log-pane ${hasRunningActivity ? 'is-running' : ''} ${hasFailedActivity ? 'has-failure' : ''}`}
          aria-label="操作日志"
        >
          <header className="activity-panel-header activity-log-header">
            <div>
              <h2>操作日志</h2>
              <p>
                {hasRunningActivity
                  ? '有任务正在执行'
                  : hasFailedActivity
                    ? '最近操作中存在失败项'
                    : '最近的数据库操作与批量任务'}
              </p>
            </div>
          </header>
          <div className="activity-panel-body activity-log-body">
            {visibleActivities.length === 0 ? (
              <div className="activity-empty">暂无操作日志。</div>
            ) : (
              visibleActivities.map((activity) => (
                <article className="activity-card" key={activity.activityId}>
                  <div className="activity-card-top">
                    <div>
                      <h3>{activity.title}</h3>
                      <p>{activity.scope ?? '全局操作'}</p>
                    </div>
                    <span className={`activity-status ${activity.status.startsWith('error:') ? 'is-error' : ''}`}>
                      {activityStatusText(activity)}
                    </span>
                  </div>
                  {activity.total > 0 ? (
                    <div className="activity-progress" aria-label={`进度 ${activity.progress} / ${activity.total}`}>
                      <span style={{ width: `${Math.min(100, Math.round((activity.progress / activity.total) * 100))}%` }} />
                    </div>
                  ) : null}
                  <div className="activity-meta">
                    {activity.total > 0 ? <span>{activity.progress} / {activity.total}</span> : null}
                    {activity.finishedAt ? <span>{new Date(activity.finishedAt).toLocaleTimeString('zh-CN')}</span> : null}
                  </div>
                  {activity.summaryText ? <p className="activity-summary">{activity.summaryText}</p> : null}
                  {activity.events.length > 0 ? renderActivityEventList(activity) : null}
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
