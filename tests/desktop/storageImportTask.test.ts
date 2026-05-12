import type { PrismaClient } from '@prisma/client';
import type { DeepMockProxy } from 'jest-mock-extended';

jest.mock('../../apps/desktop/core/prismaClient', () => {
  const { mockDeep } = jest.requireActual('jest-mock-extended') as typeof import('jest-mock-extended');
  return { prisma: mockDeep<PrismaClient>() };
});

import { prisma } from '../../apps/desktop/core/prismaClient';
import { desktopTasks, getDesktopTaskState } from '../../apps/desktop/core/desktopTaskStore';
import { startDesktopStorageImportTask } from '../../apps/desktop/core/desktopTaskImportService';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

async function waitForTerminalTask(taskId: string) {
  for (let i = 0; i < 40; i++) {
    const state = getDesktopTaskState(taskId);
    if (state && (state.status === 'completed' || state.status === 'completed:cancelled' || state.status.startsWith('error:'))) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Task ${taskId} did not finish`);
}

describe('desktop storage import task', () => {
  beforeEach(() => {
    desktopTasks.clear();
    jest.clearAllMocks();
  });

  it('emits readable activity events for created, existing, empty, and duplicate folders', async () => {
    const now = new Date();
    prismaMock.tier.findUnique.mockResolvedValue({
      id: 1,
      name: 'S',
      video_limit: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    });
    prismaMock.actress.findMany.mockResolvedValue([
      {
        id: 9,
        name: 'Aoi Tsukasa',
        tierId: 1,
        video_count: 12,
        emby_id: '[]',
        created_at: now,
        updated_at: now,
      },
    ]);
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback: (client: PrismaClient) => unknown) =>
      callback(prismaMock as unknown as PrismaClient),
    );
    prismaMock.actress.create.mockResolvedValue({
      id: 128,
      name: 'Mikami Yua',
      tierId: 1,
      video_count: 0,
      emby_id: '[]',
      created_at: now,
      updated_at: now,
    });
    prismaMock.assetLog.create.mockResolvedValue({} as never);

    const { taskId } = startDesktopStorageImportTask(1, ['Mikami Yua', 'Aoi Tsukasa', '  ', 'mikami yua']);
    const state = await waitForTerminalTask(taskId);

    expect(state.kind).toBe('storage-import');
    expect(state.title).toBe('批量导入演员');
    expect(state.scope).toBe('S 分级');
    expect(state.progress).toBe(4);
    expect(state.total).toBe(4);
    expect(state.summary).toMatchObject({
      total: 4,
      created: 1,
      skippedExisting: 1,
      skippedEmpty: 1,
      skippedDuplicate: 1,
      error: 0,
    });
    expect(state.events).toEqual([
      expect.objectContaining({
        index: 1,
        subjectName: 'Mikami Yua',
        action: '导入演员',
        result: 'created',
        subjectId: 128,
        detail: '创建演员 #128，归入 S 分级',
      }),
      expect.objectContaining({
        index: 2,
        subjectName: 'Aoi Tsukasa',
        action: '导入演员',
        result: 'skipped',
        detail: '已存在同名演员',
      }),
      expect.objectContaining({
        index: 3,
        subjectName: '未命名文件夹',
        action: '导入演员',
        result: 'skipped',
        detail: '文件夹名称为空',
      }),
      expect.objectContaining({
        index: 4,
        subjectName: 'mikami yua',
        action: '导入演员',
        result: 'skipped',
        detail: '扫描结果重复，已跳过',
      }),
    ]);
  });
});
