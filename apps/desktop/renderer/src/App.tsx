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
import {
  assetHealthLabel,
  getAssetHealthStatus,
  sortActresses,
  type ActressSortKey,
  type SortDirection,
} from './assetHealth';
import { clampFunctionPaneWidth, defaultFunctionPaneWidth } from './splitPaneState';
import { terminalProgressBar, terminalStatusCode, type TerminalStatusTone } from './terminalDesign';
import { buildAssetCategoryCards, workspaceTabs, type WorkspaceTab } from './workspaceNavigation';

type EditorView =
  | { kind: 'actress'; id: number | null; returnTierId?: number }
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

function activityStatusTone(activity: ActivitySnapshot): TerminalStatusTone {
  if (activity.status === 'processing' || activity.status === 'starting') return 'running';
  if (activity.status.startsWith('error:')) return 'error';
  if (activity.status === 'completed' && activity.events.some((event) => event.result === 'error')) return 'error';
  if (activity.status === 'completed' || activity.status === 'completed:cancelled') return 'ok';
  return 'muted';
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

function formatDisplayDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sortIndicator(isActive: boolean, direction: SortDirection) {
  if (!isActive) return '↕';
  return direction === 'asc' ? '↑' : '↓';
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
  const [defaultDatabasePath, setDefaultDatabasePath] = useState('');
  const [defaultDatabaseUrl, setDefaultDatabaseUrl] = useState('');
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

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [tierId, setTierId] = useState<number>(1);
  const [videoCount, setVideoCount] = useState<number>(0);
  const [embyIdsInput, setEmbyIdsInput] = useState('');

  const [tab, setTab] = useState<WorkspaceTab>('assets');
  const [editorView, setEditorView] = useState<EditorView>(null);
  const [dashboardStats, setDashboardStats] = useState<DesktopDashboardStats | null>(null);
  const [assetChart, setAssetChart] = useState<DesktopAssetLogChartRow[] | null>(null);

  const [tierEditingId, setTierEditingId] = useState<number | null>(null);
  const [tierName, setTierName] = useState('');
  const [tierLimitRaw, setTierLimitRaw] = useState('');
  const [tierTotalLimitRaw, setTierTotalLimitRaw] = useState('');
  const [tierStatus, setTierStatus] = useState('active');

  const [syncTaskState, setSyncTaskState] = useState<TaskState | null>(null);
  const pollRef = useRef<number | null>(null);
  const [activePollingTaskId, setActivePollingTaskId] = useState<string | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivitySnapshot[]>([]);
  const archivedTaskIdsRef = useRef<Set<string>>(new Set());
  const [isLogPaneOpen, setIsLogPaneOpen] = useState(false);
  const [functionPaneWidth, setFunctionPaneWidth] = useState(() =>
    defaultFunctionPaneWidth({ viewportWidth: typeof window === 'undefined' ? 1280 : window.innerWidth }),
  );

  const [storagePathInput, setStoragePathInput] = useState('');
  const [storageResolved, setStorageResolved] = useState<string | null>(null);
  const [storageFolders, setStorageFolders] = useState<string[] | null>(null);
  const [tierActressSortKey, setTierActressSortKey] = useState<ActressSortKey>('video_count');
  const [tierActressSortDirection, setTierActressSortDirection] = useState<SortDirection>('desc');
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
      setFunctionPaneWidth((width) => clampFunctionPaneWidth(width, { viewportWidth: window.innerWidth }));
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
        const defaultFile = await window.desktopApi.getDefaultDatabaseFile().catch(() => null);
        const defaultUrl = defaultFile?.databaseUrl ?? defaultDatabaseUrlFromConfigPath(state.configPath);
        const defaultPath = defaultFile?.filePath ?? databasePathFromUrl(defaultUrl);
        setDefaultDatabaseUrl(defaultUrl);
        setDefaultDatabasePath(defaultPath);
        setDatabaseUrl((current) => current === initialDatabaseUrl ? defaultUrl : current);
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
        if (tab === 'assets') {
          await Promise.all([loadWorkspaceData(), loadDashboardData()]);
        } else if (tab === 'config') {
          await loadTiersOnly();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载数据失败');
      }
    })();
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
        setError('当前分类下没有演员。');
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
      setError(e instanceof Error ? e.message : '分类同步失败');
    }
  };

  const onRefreshActressVideoCount = async (id: number) => {
    setError(null);
    try {
      const { taskId } = await window.desktopApi.startSyncMovieCounts([id]);
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '刷新影片数量失败');
    }
  };

  const persistTierStoragePath = async (id: number, rawValue: string) => {
    const nextPaths = { ...tierStoragePaths };
    const value = rawValue.trim();
    if (value) {
      nextPaths[String(id)] = value;
    } else {
      delete nextPaths[String(id)];
    }
    const saved = await window.desktopApi.saveRuntimeConfig(runtimeConfigWithPaths(nextPaths));
    const savedPaths = saved.tierStoragePaths ?? {};
    setTierStoragePaths(savedPaths);
    setRuntimeConfigBaseline(saved);
    return savedPaths;
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
          activeTierDetail ? `${activeTierDetail.name} 分类` : undefined,
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
      setTierDetailMessage('导入任务已开始，可在右侧操作日志中查看进度。');
      beginPollTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '批量导入失败');
      appendActivity(createSimpleActivity('批量导入演员', e instanceof Error ? e.message : '批量导入失败', 'error'));
    }
  };

  const initializeWithDatabaseUrl = async (nextDatabaseUrl: string) => {
    setSaving(true);
    setError(null);
    try {
      const config: DesktopRuntimeConfig = {
        dbMode: 'sqlite',
        databaseUrl: nextDatabaseUrl,
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

  const onSaveConfig = async () => {
    await initializeWithDatabaseUrl(databaseUrl);
  };

  const onCreateDefaultDatabase = async () => {
    const nextUrl = defaultDatabaseUrl || initialDatabaseUrl;
    const nextPath = defaultDatabasePath || databasePathFromUrl(nextUrl);
    setDatabaseUrl(nextUrl);
    setSelectedDatabasePath(nextPath);
    await initializeWithDatabaseUrl(nextUrl);
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
    setTierTotalLimitRaw('');
    setTierStatus('active');
  };

  const onEditTier = (row: DesktopTier) => {
    setTierEditingId(row.id);
    setTierName(row.name);
    setTierLimitRaw(row.video_limit === null ? '' : String(row.video_limit));
    setTierTotalLimitRaw(row.total_video_limit === null ? '' : String(row.total_video_limit));
    setTierStatus(row.status);
    setStoragePathInput(tierStoragePaths[String(row.id)] ?? '');
    setEditorView({ kind: 'tier', id: row.id });
  };

  const onOpenTierDetail = async (row: DesktopTier) => {
    setEditorView({ kind: 'tier-detail', id: row.id });
    setStoragePathInput(getCachedTierStoragePath(row.id));
    setStorageResolved(null);
    setStorageFolders(null);
    setTierDetailMessage('');
    setError(null);
    setQuery('');
    try {
      setActresses(await window.desktopApi.listActresses());
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载分类演员失败');
    }
  };

  const onSubmitTier = async () => {
    const name = tierName.trim();
    if (!name) {
      setError('请填写分类名称。');
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
    const totalLimitTrim = tierTotalLimitRaw.trim();
    const currentTierActressCount =
      tierEditingId === null ? 0 : (tiers.find((row) => row.id === tierEditingId)?.actressCount ?? 0);
    let total_video_limit: number | null = currentTierActressCount * (video_limit ?? 100);
    if (totalLimitTrim !== '') {
      const n = Number(totalLimitTrim);
      if (!Number.isFinite(n) || n < 0) {
        setError('分类总数量必须是非负数字；留空会按演员数和影片上限自动计算。');
        return;
      }
      total_video_limit = Math.floor(n);
    }
    setSubmitting(true);
    setError(null);
    const input: DesktopTierInput = { name, video_limit, total_video_limit, status: tierStatus || 'active' };
    const previousTiers = tiers;
    const previousActresses = actresses;
    const editingTierId = tierEditingId;
    const originalTier = editingTierId === null ? null : previousTiers.find((row) => row.id === editingTierId);
    const tierStoragePathValue = storagePathInput.trim();
    const tempId = tierEditingId === null ? nextTempId() : null;
    const optimisticTier: DesktopTier = {
      id: tierEditingId ?? tempId ?? nextTempId(),
      name: input.name,
      video_limit: input.video_limit,
      total_video_limit: input.total_video_limit,
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
        if (tierStoragePathValue) {
          await persistTierStoragePath(created.id, tierStoragePathValue);
        }
        setTiers((prev) =>
          prev
            .map((row) => (row.id === optimisticTier.id ? created : row))
            .sort((a, b) => a.id - b.id),
        );
        appendActivity(
          createTierMaintenanceActivity(
            '新增分类',
            `${created.name} 分类`,
            formatTierCreatedSummaryText(),
            '初始信息',
            getTierCreatedSnapshot(created),
            'created',
          ),
        );
      } else {
        const updated = await window.desktopApi.updateTier(tierEditingId, input);
        await persistTierStoragePath(updated.id, tierStoragePathValue);
        setTiers((prev) => prev.map((row) => (row.id === tierEditingId ? updated : row)));
        setActresses((prev) =>
          prev.map((row) => (row.tierId === tierEditingId ? { ...row, tierName: updated.name } : row)),
        );
        const changes = originalTier ? getTierUpdateChanges(originalTier, updated) : [];
        appendActivity(
          createTierMaintenanceActivity(
            '编辑分类',
            `${updated.name} 分类`,
            formatTierUpdatedSummaryText(changes.length),
            '信息变更',
            changes,
            'updated',
          ),
        );
      }
      await Promise.all([loadWorkspaceData(), loadDashboardData()]);
      resetTierForm();
      setStoragePathInput('');
      setEditorView(null);
    } catch (e) {
      setTiers(previousTiers);
      setActresses(previousActresses);
      const detail = e instanceof Error ? e.message : '保存分类失败';
      setError(detail);
      appendActivity(
        createTierFailureActivity(
          '保存分类',
          `${input.name} 分类`,
          '分类保存失败。',
          '保存失败',
          detail,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteTier = async (id: number) => {
    if (!window.confirm('确认删除这个分类？请先移走该分类下的演员。')) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const previousTiers = tiers;
    const targetTier = tiers.find((row) => row.id === id);
    try {
      setTiers((prev) => prev.filter((row) => row.id !== id));
      await window.desktopApi.deleteTier(id);
      try {
        await persistTierStoragePath(id, '');
      } catch {
        /* Storage path cleanup is secondary to the confirmed category deletion. */
      }
      await Promise.all([loadTiersOnly(), loadDashboardData(), tab === 'assets' ? loadWorkspaceData() : Promise.resolve()]);
      appendActivity(
        targetTier
          ? createTierMaintenanceActivity(
              '删除分类',
              `${targetTier.name} 分类`,
              formatTierDeletedSummaryText(),
              '删除快照',
              getTierDeletedSnapshot(targetTier),
              'success',
            )
          : createSimpleActivity('删除分类', `已删除分类 #${id}。`, 'success', `分类 #${id}`),
      );
      if (tierEditingId === id) {
        resetTierForm();
      }
    } catch (e) {
      setTiers(previousTiers);
      const detail = e instanceof Error ? e.message : '删除分类失败';
      setError(detail);
      appendActivity(
        createTierFailureActivity(
          '删除分类',
          targetTier ? `${targetTier.name} 分类` : `分类 #${id}`,
          '分类删除失败。',
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
    const returnTierId = editorView?.kind === 'actress' ? editorView.returnTierId : undefined;

    const tierNameForInput = tiers.find((t) => t.id === input.tierId)?.name ?? `分类 #${input.tierId}`;
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
          ? [...prev, optimisticRow]
          : prev
              .map((row) => (row.id === editingId ? optimisticRow : row));
      return next.sort((a, b) => a.id - b.id);
    });

    try {
      if (editingId === null) {
        const created = await window.desktopApi.createActress(input);
        setActresses((prev) => {
          const replaced = prev.map((row) => (row.id === optimisticRow.id ? created : row));
          if (!replaced.some((row) => row.id === created.id)) {
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
      await Promise.all([loadWorkspaceData(), loadDashboardData()]);
      resetForm();
      setEditorView(returnTierId ? { kind: 'tier-detail', id: returnTierId } : null);
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
    setEditorView({ kind: 'actress', id: row.id, returnTierId: row.tierId });
  };

  const onCreateActress = (returnTierId?: number) => {
    resetForm();
    if (returnTierId !== undefined) {
      setTierId(returnTierId);
    }
    setEditorView({ kind: 'actress', id: null, returnTierId });
  };

  const onCreateTier = () => {
    resetTierForm();
    setStoragePathInput('');
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

  const onStartWorkspaceResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = functionPaneWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = startWidth + moveEvent.clientX - startX;
      setFunctionPaneWidth(clampFunctionPaneWidth(nextWidth, { viewportWidth: window.innerWidth }));
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const activeTierDetail = editorView?.kind === 'tier-detail' ? tiers.find((row) => row.id === editorView.id) ?? null : null;
  const activeTierActresses = activeTierDetail
    ? sortActresses(
        actresses.filter((row) => row.tierId === activeTierDetail.id && matchesCurrentQuery(row.name)),
        tierActressSortKey,
        tierActressSortDirection,
      )
    : [];
  const missingTierStoragePath = !storagePathInput.trim();
  const scanStorageDisabledReason = missingTierStoragePath
    ? '请先在配置中设置该分类的存储目录。'
    : loading
      ? '正在扫描文件夹。'
      : undefined;
  const importStorageDisabledReason = activePollingTaskId
    ? '已有任务正在执行。'
    : !storageFolders
      ? '请先扫描文件夹。'
      : storageFolders.length === 0
        ? '没有可导入的一级子文件夹。'
        : undefined;
  const onSortTierActresses = (key: ActressSortKey) => {
    if (tierActressSortKey === key) {
      setTierActressSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setTierActressSortKey(key);
    setTierActressSortDirection('desc');
  };
  const assetCategoryCards = buildAssetCategoryCards({
    tiers,
    distribution: dashboardStats?.m3 ?? [],
  });
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
      <main className="app-shell setup-shell desktop-surface" style={{ padding: 24, maxWidth: 960 }}>
        <h1 style={{ marginTop: 0 }}>JATLAS 初始设置</h1>
        <p>
          第一次使用可以直接开启新的数据，JATLAS 会自动创建本地数据库。已有旧数据时，也可以关联之前的 .db / .sqlite / .sqlite3 文件。
        </p>
        <div className="setup-choice-grid">
          <section className="setup-choice-card is-primary">
            <span className="setup-choice-kicker">推荐 / New Database</span>
            <h2>开启新的数据</h2>
            <p>适合第一次使用。应用会在本机应用数据目录内创建新的 JATLAS 数据库，并自动完成表结构初始化。</p>
            <code>{defaultDatabasePath || selectedDatabasePath || '正在读取默认数据库位置...'}</code>
            <button type="button" onClick={() => void onCreateDefaultDatabase()} disabled={saving || !defaultDatabaseUrl.trim()}>
              {saving ? '正在创建...' : '开启新的数据'}
            </button>
          </section>

          <section className="setup-choice-card">
            <span className="setup-choice-kicker">迁移 / Existing Database</span>
            <h2>关联已有数据</h2>
            <p>适合已经有 JATLAS 旧数据库文件，或需要继续使用之前的本地数据。</p>
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
                  选择文件
                </button>
              </div>
            </label>
            <button onClick={() => void onSaveConfig()} disabled={saving || !selectedDatabasePath.trim()} style={{ padding: '8px 12px' }}>
              {saving ? '正在关联...' : '关联并进入'}
            </button>
          </section>
          {error ? <p style={{ color: 'var(--red)' }}>{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main
      className="app-shell workspace-shell"
      style={
        {
          '--function-pane-width': isLogPaneOpen ? `${functionPaneWidth}px` : '1fr',
          '--workspace-splitter-width': isLogPaneOpen ? '8px' : '0px',
          '--log-pane-width': isLogPaneOpen ? 'minmax(320px, 1fr)' : '0px',
        } as CSSProperties
      }
    >
      <section className="function-pane" aria-label="功能区">
        <header className="workspace-header">
          <div className="terminal-title-block">
            <span className="terminal-kicker">本机@JATLAS:~/资产</span>
            <h1>JATLAS 资产控制台</h1>
          </div>
          <button
            type="button"
            className="activity-log-title-toggle"
            onClick={() => setIsLogPaneOpen((open) => !open)}
            aria-expanded={isLogPaneOpen}
            aria-label={isLogPaneOpen ? '折叠操作日志' : '展开操作日志'}
          >
            {isLogPaneOpen ? '<' : '>'}
          </button>
        </header>

        <nav className="workspace-tabs" aria-label="功能切换">
          {workspaceTabs.map(({ key, label, englishLabel }) => (
            <button
              key={key}
              className={!editorView && tab === key ? 'workspace-tab active' : 'workspace-tab'}
              onClick={() => {
                setEditorView(null);
                setTab(key);
              }}
            >
              {label} / {englishLabel}
            </button>
          ))}
        </nav>

        <div className="operation-pane-body">

      {editorView?.kind === 'tier' ? (
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
          <button type="button" onClick={() => setEditorView(null)} style={{ marginBottom: 12 }}>
            返回配置
          </button>
          <h2 style={{ marginTop: 0 }}>{editorView.id === null ? '新建分类' : `编辑分类 #${editorView.id}`}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px', gap: 8 }}>
            <input placeholder="分类名称" value={tierName} onChange={(e) => setTierName(e.target.value)} />
            <input
              placeholder="影片上限（空=不限）"
              value={tierLimitRaw}
              onChange={(e) => setTierLimitRaw(e.target.value)}
            />
            <input
              placeholder="分类总数量（空=自动）"
              value={tierTotalLimitRaw}
              onChange={(e) => setTierTotalLimitRaw(e.target.value)}
            />
            <select value={tierStatus} onChange={(e) => setTierStatus(e.target.value)}>
              <option value="active">现役</option>
              <option value="retired">引退</option>
            </select>
          </div>
          <label style={{ marginTop: 10 }}>
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
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => void onSubmitTier()} disabled={submitting}>
              {submitting ? '保存中...' : '保存分类'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetTierForm();
                setStoragePathInput('');
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
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
          <button type="button" onClick={() => setEditorView(null)} style={{ marginBottom: 12 }}>
            返回资产
          </button>
          <h2 style={{ marginTop: 0 }}>{activeTierDetail.name} 分类</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>影片上限</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{activeTierDetail.video_limit === null ? '不限' : activeTierDetail.video_limit}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>分类总数量</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{activeTierDetail.total_video_limit ?? '未设置'}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>状态</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{tierStatusText(activeTierDetail.status)}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>演员数</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{activeTierDetail.actressCount}</div>
            </div>
          </div>

          <h3 style={{ marginTop: 0 }}>分类批量管理</h3>
          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            {storagePathInput.trim() ? (
              <p style={{ margin: 0 }}>
                <strong>存储目录：</strong> <code>{storagePathInput.trim()}</code>
              </p>
            ) : null}
            {storageResolved ? (
              <p style={{ margin: 0 }}>
                <strong>实际路径：</strong> <code>{storageResolved}</code>
              </p>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span className="disabled-action-tip" title={scanStorageDisabledReason}>
                <button
                  type="button"
                  onClick={() => void onScanStorage(activeTierDetail.id)}
                  disabled={Boolean(scanStorageDisabledReason)}
                >
                  {loading ? '扫描中...' : '扫描文件夹'}
                </button>
              </span>
              <span className="disabled-action-tip" title={importStorageDisabledReason}>
                <button
                  type="button"
                  onClick={() => void onBatchImportStorageFolders(activeTierDetail.id)}
                  disabled={Boolean(importStorageDisabledReason)}
                >
                  {activePollingTaskId ? '任务执行中...' : '导入演员'}
                </button>
              </span>
              <button type="button" onClick={() => void onTierSyncEmbyIds(activeTierDetail.id)} disabled={Boolean(activePollingTaskId)}>
                批量补全 Emby ID
              </button>
              <button type="button" onClick={() => void onTierBulkVideoSync(activeTierDetail.id)} disabled={Boolean(activePollingTaskId)}>
                批量刷新影片数量
              </button>
              {tierDetailMessage ? <span style={{ color: 'var(--emerald)' }}>{tierDetailMessage}</span> : null}
            </div>
          </div>
          {storageFolders && storageFolders.length > 0 ? (
            <ul style={{ marginTop: 8, maxHeight: 240, overflow: 'auto', paddingLeft: 20 }}>
              {storageFolders.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : storageFolders && storageFolders.length === 0 ? (
            <p style={{ marginTop: 8, color: 'var(--muted)' }}>没有找到一级子文件夹，或该路径不是目录。</p>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>当前分类演员</h3>
            <button type="button" onClick={() => onCreateActress(activeTierDetail.id)}>
              新增演员
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="在当前分类内搜索演员"
              style={{ minWidth: 260 }}
            />
          </div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>名称</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>
                    <button type="button" className="table-sort-button" onClick={() => onSortTierActresses('video_count')}>
                      影片 {sortIndicator(tierActressSortKey === 'video_count', tierActressSortDirection)}
                    </button>
                  </th>
                  <th style={{ textAlign: 'left', padding: 8 }}>最近资产状态</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>
                    <button type="button" className="table-sort-button" onClick={() => onSortTierActresses('updated_at')}>
                      数据变动时间 {sortIndicator(tierActressSortKey === 'updated_at', tierActressSortDirection)}
                    </button>
                  </th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Emby ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {activeTierActresses.map((row) => {
                  const health = getAssetHealthStatus(row.video_count, activeTierDetail.video_limit);
                  return (
                    <tr key={row.id}>
                      <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{row.name}</td>
                      <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{row.video_count}</td>
                      <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>
                        <span className={`asset-health-badge is-${health}`}>{assetHealthLabel(health)}</span>
                      </td>
                      <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{formatDisplayDateTime(row.updated_at)}</td>
                      <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{row.embyIds.join(', ') || '-'}</td>
                      <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>
                        <button onClick={() => onEdit(row)} style={{ marginRight: 8 }}>
                          编辑
                        </button>
                        <button
                          onClick={() => void onRefreshActressVideoCount(row.id)}
                          disabled={Boolean(activePollingTaskId)}
                          style={{ marginRight: 8 }}
                        >
                          刷新数量
                        </button>
                        <button onClick={() => void onDelete(row.id)} disabled={submitting}>
                          删除
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {activeTierActresses.length === 0 ? (
                  <tr>
                    <td style={{ padding: 10 }} colSpan={6}>
                      当前分类下没有演员。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {editorView?.kind === 'actress' ? (
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
          <button
            type="button"
            onClick={() =>
              setEditorView(
                editorView.returnTierId ? { kind: 'tier-detail', id: editorView.returnTierId } : null,
              )
            }
            style={{ marginBottom: 12 }}
          >
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
                setEditorView(
                  editorView.returnTierId ? { kind: 'tier-detail', id: editorView.returnTierId } : null,
                );
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
            {syncTaskState.total > 0 ? `，${syncTaskState.progress}/${syncTaskState.total}` : ''}。可在右侧操作日志中查看明细。
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
          <span>{syncTaskState.title ?? '后台任务'}存在失败项，可在右侧操作日志中查看明细。</span>
          <button type="button" onClick={() => void onRetryFailedTierSync()}>
            重试失败项 ({syncTaskState.summary?.error})
          </button>
        </section>
      ) : null}

      {!editorView && tab === 'intro' ? (
        <div className="intro-terminal">
          <div className="intro-bootline">&gt; 正在加载本地资产治理协议...</div>

          <section className="intro-hero">
            <div>
              <h2>让不断膨胀的收藏重新可控</h2>
              <p>
                JATLAS 是面向 NAS + Emby 本地收藏结构的资产台账。它解决的不是“如何下载更多内容”，
                而是当文件越存越多、硬盘空间持续被占用、Emby 条目和真实文件逐渐脱节时，如何把收藏重新纳入可查、可控、可维护的状态。
              </p>
            </div>
            <div className="intro-status-list" aria-label="产品边界">
              <span>[本地优先] SQLite 数据保存在本机</span>
              <span>[治理层] 不替代 NAS，也不替代 Emby</span>
              <span>[隐私场景] 不提供在线账号体系</span>
              <span>[项目边界] 不提供内容下载或公开分发</span>
            </div>
          </section>

          <section className="intro-terminal-section">
            <h3>&gt; cat ./问题来源</h3>
            <div className="intro-problem-grid">
              <article>
                <strong>收藏会自然膨胀</strong>
                <p>没有规则时，收藏很容易变成“先存下来再说”。清理只能靠印象，硬盘报警往往才是第一次真正介入。</p>
              </article>
              <article>
                <strong>空间成本会持续增加</strong>
                <p>NAS 容量看起来很大，但高质量影片会快速吞掉空间。只靠扩容，维护成本会越来越高。</p>
              </article>
              <article>
                <strong>Emby 不负责治理</strong>
                <p>Emby 适合识别与播放，但它不会判断某个演员是否超量，也不会告诉你哪个分类需要收缩。</p>
              </article>
            </div>
          </section>

          <section className="intro-terminal-section">
            <h3>&gt; ls ./治理机制</h3>
            <div className="intro-module-list">
              <article>
                <span>01</span>
                <div>
                  <strong>用分类替代模糊喜好</strong>
                  <p>每个演员归入明确分类，每个分类设置影片上限。核心收藏可以更宽松，边缘兴趣不再无限增长。</p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <strong>用风险状态暴露失控点</strong>
                  <p>当数量接近或超过上限，JATLAS 会把压力变成可见队列。你不需要靠记忆判断哪里该整理。</p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <strong>和 Emby 对账</strong>
                  <p>Emby 提供人物 ID 和影片数量，JATLAS 把这些事实写入台账，再根据规则给出治理判断。</p>
                </div>
              </article>
              <article>
                <span>04</span>
                <div>
                  <strong>扫描 NAS 路径</strong>
                  <p>为分类绑定存储目录后，可以扫描演员文件夹，把已有收藏逐步纳入台账，而不是从零手动录入。</p>
                </div>
              </article>
              <article>
                <span>05</span>
                <div>
                  <strong>用日志理解变化</strong>
                  <p>创建、导入、补全、刷新和失败都会进入右侧日志。长期来看，日志比一次性清理更重要。</p>
                </div>
              </article>
            </div>
          </section>

          <section className="intro-terminal-section">
            <h3>&gt; ./开始使用 --路径</h3>
            <ol className="intro-flow">
              <li>
                <span>配置</span>
                <p>选择 SQLite 数据库文件，填写 Emby 服务地址和 API Key，创建分类，并设置每个分类的存储目录和影片上限。</p>
              </li>
              <li>
                <span>进入资产</span>
                <p>查看总体看板和分类卡片。日常不从全局演员大列表开始，而是先选择要管理的分类。</p>
              </li>
              <li>
                <span>管理分类</span>
                <p>在分类内扫描文件夹、导入演员、补全 Emby ID、刷新影片数量，并维护这个分类下的演员列表。</p>
              </li>
              <li>
                <span>查看日志</span>
                <p>右侧操作日志会保留任务进度和失败原因。修正目录、Emby 配置或演员信息后，再对失败项重试。</p>
              </li>
            </ol>
          </section>

          <section className="intro-terminal-section intro-boundary">
            <h3>&gt; cat ./项目边界</h3>
            <p>
              JATLAS 是私人资产工作台，不是媒体播放器，也不是公开服务。它只关注一件事：
              帮助已经使用 NAS + Emby 管理本地收藏的人，把不断膨胀的影片资产重新纳入可理解、可控制、可持续维护的状态。
            </p>
          </section>
        </div>
      ) : null}

      {!editorView && tab === 'assets' && dashboardStats && assetChart ? (
        <div style={{ marginBottom: 24 }}>
          <h2>当前资产状态</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>演员总数</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboardStats.m1.totalCount}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>现役 / 引退</div>
              <div style={{ fontSize: 18 }}>
                {dashboardStats.m1.activeCount} / {dashboardStats.m1.retiredCount}
              </div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>影片总量</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboardStats.m1.totalAssets}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>超额资产</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m1.overloadedAssets}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>待绑定 Emby</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m2.pendingEmbyLink}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>待治理项</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m2.pendingManagement}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>30 天未更新</div>
              <div style={{ fontSize: 18 }}>{dashboardStats.m2.pendingUpdate}</div>
            </div>
          </div>

          <h2>分类</h2>
          {assetCategoryCards.length > 0 ? (
            <div className="asset-category-grid">
              {assetCategoryCards.map((card) => (
                <button
                  type="button"
                  className="asset-category-card"
                  key={card.id}
                  onClick={() => {
                    const tier = tiers.find((row) => row.id === card.id);
                    if (tier) void onOpenTierDetail(tier);
                  }}
                >
                  <span className="asset-category-card-top">
                    <strong>{card.name}</strong>
                    <span>{card.statusText}</span>
                  </span>
                  <span className="asset-category-card-stats">
                    <span>
                      <small>演员</small>
                      <b>{card.actressCount}</b>
                    </span>
                    <span>
                      <small>影片</small>
                      <b>{card.totalVideoCount}</b>
                    </span>
                    <span>
                      <small>超额</small>
                      <b>{card.overloadedVideoCount}</b>
                    </span>
                  </span>
                  <span className="asset-category-progress">
                    {terminalProgressBar(card.totalVideoCount, card.healthyCapacity, 18)} {card.usageText}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <section style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
              <p style={{ margin: 0 }}>暂无分类。请先进入配置新建分类并设置存储目录。</p>
            </section>
          )}

          <h3>资产日志（近 6 个月）</h3>
          <section style={{ border: '1px solid var(--line)', borderRadius: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>月份</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>收录扩张</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>资产入库</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>资产出库</th>
                </tr>
              </thead>
              <tbody>
                {assetChart.map((row) => (
                  <tr key={row.name}>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{row.name}</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{row['收录扩张']}</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{row['资产入库']}</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{row['资产出库']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {!editorView && tab === 'assets' && (!dashboardStats || !assetChart) ? <p>正在加载资产...</p> : null}

      {!editorView && tab === 'config' ? (
        <>
        <section style={{ marginBottom: 16, padding: 12, border: '1px solid var(--line)', borderRadius: 0 }}>
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
              {settingsMessage ? <span style={{ color: 'var(--emerald)' }}>{settingsMessage}</span> : null}
            </div>
          </div>
        </section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>分类管理</h2>
            <button type="button" onClick={onCreateTier}>
              新建分类
            </button>
          </div>
          <section style={{ border: '1px solid var(--line)', borderRadius: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>名称</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>上限</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>总数量</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>状态</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>演员数</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>存储目录</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{row.id}</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{row.name}</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>
                      {row.video_limit === null ? '不限' : row.video_limit}
                    </td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>
                      {row.total_video_limit === null ? '未设置' : row.total_video_limit}
                    </td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{tierStatusText(row.status)}</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{row.actressCount}</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>{tierStoragePaths[String(row.id)] || '未设置'}</td>
                    <td style={{ padding: 8, borderTop: '1px solid var(--line-soft)' }}>
                      <button type="button" onClick={() => onEditTier(row)} style={{ marginRight: 8 }}>
                        编辑
                      </button>
                      <button type="button" onClick={() => void onDeleteTier(row.id)} disabled={submitting}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {tiers.length === 0 ? (
                  <tr>
                    <td style={{ padding: 10 }} colSpan={8}>
                      暂无分类。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

          {error ? <p style={{ color: 'var(--red)' }}>{error}</p> : null}
        </div>
      </section>

      <div
        className={`workspace-splitter ${isLogPaneOpen ? '' : 'is-disabled'}`}
        role="separator"
        aria-label="调整功能区和日志区宽度"
        aria-orientation="vertical"
        onMouseDown={isLogPaneOpen ? onStartWorkspaceResize : undefined}
      >
        <span />
      </div>

      <aside
        className={`activity-log-pane ${isLogPaneOpen ? 'is-open' : 'is-collapsed'} ${hasRunningActivity ? 'is-running' : ''} ${hasFailedActivity ? 'has-failure' : ''}`}
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
        {isLogPaneOpen ? (
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
                    <span className={`activity-status is-${activityStatusTone(activity)}`}>
                      {terminalStatusCode(activityStatusTone(activity))} {activityStatusText(activity)}
                    </span>
                  </div>
                  {activity.total > 0 ? (
                    <div className="activity-progress" aria-label={`进度 ${activity.progress} / ${activity.total}`}>
                      <span style={{ width: `${Math.min(100, Math.round((activity.progress / activity.total) * 100))}%` }} />
                    </div>
                  ) : null}
                  <div className="activity-meta">
                    {activity.total > 0 ? (
                      <span>
                        {terminalProgressBar(activity.progress, activity.total)} {activity.progress} / {activity.total}
                      </span>
                    ) : null}
                    {activity.finishedAt ? <span>{new Date(activity.finishedAt).toLocaleTimeString('zh-CN')}</span> : null}
                  </div>
                  {activity.summaryText ? <p className="activity-summary">{activity.summaryText}</p> : null}
                  {activity.events.length > 0 ? renderActivityEventList(activity) : null}
                </article>
              ))
            )}
          </div>
        ) : null}
      </aside>
    </main>
  );
}
