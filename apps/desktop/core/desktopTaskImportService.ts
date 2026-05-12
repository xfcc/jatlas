import { prisma } from './prismaClient';
import {
  clearDesktopTaskCancel,
  createDesktopTaskId,
  desktopTasks,
  isDesktopTaskCancelRequested,
  type StorageImportSummary,
  type TaskActivityEvent,
} from './desktopTaskStore';

function normalizeComparableName(name: string) {
  return name.normalize('NFC').toLocaleLowerCase();
}

function createImportEvent(
  taskId: string,
  index: number,
  subjectName: string,
  result: TaskActivityEvent['result'],
  detail: string,
  subjectId?: number,
): TaskActivityEvent {
  return {
    id: `${taskId}-${index}`,
    index,
    timestamp: new Date().toISOString(),
    subjectName,
    subjectId,
    actressId: subjectId,
    name: subjectName,
    action: '导入演员',
    result,
    detail,
    retryable: result === 'error',
  };
}

function buildStorageImportSummary(events: TaskActivityEvent[]): StorageImportSummary {
  let created = 0;
  let skippedExisting = 0;
  let skippedEmpty = 0;
  let skippedDuplicate = 0;
  let error = 0;

  for (const event of events) {
    if (event.result === 'created') {
      created++;
    } else if (event.result === 'error') {
      error++;
    } else if (event.detail === '已存在同名演员') {
      skippedExisting++;
    } else if (event.detail === '文件夹名称为空') {
      skippedEmpty++;
    } else if (event.detail === '扫描结果重复，已跳过') {
      skippedDuplicate++;
    }
  }

  return {
    total: events.length,
    created,
    skippedExisting,
    skippedEmpty,
    skippedDuplicate,
    error,
  };
}

export function startDesktopStorageImportTask(tierId: number, folderNames: string[], opts?: { onCompleted?: () => void }) {
  const taskId = createDesktopTaskId();
  const startedAt = new Date().toISOString();
  desktopTasks.set(taskId, {
    taskId,
    kind: 'storage-import',
    title: '批量导入演员',
    progress: 0,
    total: folderNames.length,
    status: 'starting',
    startedAt,
    events: [],
  });

  void (async () => {
    try {
      const tier = await prisma.tier.findUnique({ where: { id: tierId } });
      if (!tier) {
        desktopTasks.set(taskId, {
          taskId,
          kind: 'storage-import',
          title: '批量导入演员',
          progress: 0,
          total: folderNames.length,
          status: 'error:tier_not_found',
          startedAt,
          finishedAt: new Date().toISOString(),
          events: [],
        });
        return;
      }

      const scope = `${tier.name} 分级`;
      const candidateNames = folderNames.map((name) => name.trim()).filter((name) => name.length > 0);
      const existingRows =
        candidateNames.length > 0
          ? await prisma.actress.findMany({
              where: {
                name: {
                  in: candidateNames,
                },
              },
              select: { name: true },
            })
          : [];
      const existingNames = new Set(existingRows.map((row) => normalizeComparableName(row.name)));
      const seenNames = new Set<string>();
      const events: TaskActivityEvent[] = [];

      const flush = (done: number, last: TaskActivityEvent) => {
        desktopTasks.set(taskId, {
          taskId,
          kind: 'storage-import',
          title: '批量导入演员',
          scope,
          progress: done,
          total: folderNames.length,
          status: 'processing',
          startedAt,
          currentItem: last.subjectName,
          lastProcessedItem: {
            name: last.subjectName,
            result: last.result === 'error' ? 'error' : last.result === 'skipped' ? 'skipped' : 'success',
            detail: last.detail,
          },
          events: [...events],
          summary: buildStorageImportSummary(events),
        });
      };

      desktopTasks.set(taskId, {
        taskId,
        kind: 'storage-import',
        title: '批量导入演员',
        scope,
        progress: 0,
        total: folderNames.length,
        status: 'processing',
        startedAt,
        events: [],
        summary: buildStorageImportSummary([]),
      });

      for (let i = 0; i < folderNames.length; i++) {
        if (isDesktopTaskCancelRequested(taskId)) {
          desktopTasks.set(taskId, {
            taskId,
            kind: 'storage-import',
            title: '批量导入演员',
            scope,
            progress: i,
            total: folderNames.length,
            status: 'completed:cancelled',
            startedAt,
            finishedAt: new Date().toISOString(),
            events: [...events],
            summary: buildStorageImportSummary(events),
          });
          return;
        }

        const rawName = folderNames[i];
        const name = rawName.trim();
        const index = i + 1;
        if (!name) {
          const event = createImportEvent(taskId, index, '未命名文件夹', 'skipped', '文件夹名称为空');
          events.push(event);
          flush(index, event);
          continue;
        }

        const normalized = normalizeComparableName(name);
        if (seenNames.has(normalized)) {
          const event = createImportEvent(taskId, index, name, 'skipped', '扫描结果重复，已跳过');
          events.push(event);
          flush(index, event);
          continue;
        }
        seenNames.add(normalized);

        if (existingNames.has(normalized)) {
          const event = createImportEvent(taskId, index, name, 'skipped', '已存在同名演员');
          events.push(event);
          flush(index, event);
          continue;
        }

        try {
          const created = await prisma.$transaction(async (tx) => {
            const row = await tx.actress.create({
              data: {
                name,
                tierId,
                video_count: 0,
                emby_id: '[]',
              },
            });
            await tx.assetLog.create({
              data: {
                actress_id: row.id,
                actress_name: row.name,
                action_type: 'CREATE',
                video_delta: 0,
              },
            });
            return row;
          });
          existingNames.add(normalized);
          const event = createImportEvent(
            taskId,
            index,
            name,
            'created',
            `创建演员 #${created.id}，归入 ${tier.name} 分级`,
            created.id,
          );
          events.push(event);
          flush(index, event);
        } catch (e) {
          const event = createImportEvent(
            taskId,
            index,
            name,
            'error',
            e instanceof Error ? e.message : '数据库写入失败',
          );
          events.push(event);
          flush(index, event);
        }
      }

      desktopTasks.set(taskId, {
        taskId,
        kind: 'storage-import',
        title: '批量导入演员',
        scope,
        progress: folderNames.length,
        total: folderNames.length,
        status: 'completed',
        startedAt,
        finishedAt: new Date().toISOString(),
        events,
        summary: buildStorageImportSummary(events),
      });
      opts?.onCompleted?.();
    } finally {
      clearDesktopTaskCancel(taskId);
    }
  })();

  return { taskId };
}
