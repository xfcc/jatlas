import type { PrismaClient } from '@prisma/client';
import type { DeepMockProxy } from 'jest-mock-extended';

jest.mock('../../apps/desktop/core/prismaClient', () => {
  const { mockDeep } = jest.requireActual('jest-mock-extended') as typeof import('jest-mock-extended');
  return { prisma: mockDeep<PrismaClient>() };
});

import { prisma } from '../../apps/desktop/core/prismaClient';
import { updateDesktopActress, type DesktopActressInput } from '../../apps/desktop/core/desktopDataService';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

const tier = {
  id: 1,
  name: 'S',
  video_limit: null,
  total_video_limit: null,
  status: 'active',
  created_at: new Date('2026-06-01T00:00:00.000Z'),
  updated_at: new Date('2026-06-01T00:00:00.000Z'),
};

function actressRow(videoCount: number, assetUpdatedAt: Date) {
  return {
    id: 128,
    name: 'Mikami Yua',
    tierId: 1,
    tier,
    video_count: videoCount,
    status: 'active',
    emby_id: '[]',
    roman: '',
    aliases: '[]',
    birthday: '',
    cup: '',
    bust: '',
    waist: '',
    hip: '',
    career_from: '',
    career_to: '',
    minnano_url: '',
    avatar_path: '',
    measurements: '',
    birth_date: '',
    career_period: '',
    cup_size: '',
    height: '',
    tags: '[]',
    created_at: new Date('2026-06-01T00:00:00.000Z'),
    asset_updated_at: assetUpdatedAt,
    updated_at: new Date('2026-06-05T00:00:00.000Z'),
  };
}

function input(videoCount: number): DesktopActressInput {
  return {
    name: 'Mikami Yua',
    tierId: 1,
    video_count: videoCount,
    status: 'active',
    embyIds: [],
    aliases: [],
    avatar_path: '',
    minnano_url: '',
    tags: [],
  };
}

describe('desktop data service actress asset update time', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps asset update time when saving profile fields without video count changes', async () => {
    const assetUpdatedAt = new Date('2026-06-01T00:00:00.000Z');
    prismaMock.actress.findUnique.mockResolvedValue(actressRow(18, assetUpdatedAt) as never);
    prismaMock.actress.update.mockResolvedValue(actressRow(18, assetUpdatedAt) as never);

    const updated = await updateDesktopActress(128, input(18));

    expect(prismaMock.actress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ asset_updated_at: expect.any(Date) }),
      }),
    );
    expect(prismaMock.assetLog.create).not.toHaveBeenCalled();
    expect(updated.updated_at).toBe('2026-06-01T00:00:00.000Z');
  });

  it('updates asset update time when video count changes', async () => {
    const oldAssetUpdatedAt = new Date('2026-06-01T00:00:00.000Z');
    const newAssetUpdatedAt = new Date('2026-06-05T00:00:00.000Z');
    prismaMock.actress.findUnique.mockResolvedValue(actressRow(18, oldAssetUpdatedAt) as never);
    prismaMock.actress.update.mockResolvedValue(actressRow(21, newAssetUpdatedAt) as never);

    const updated = await updateDesktopActress(128, input(21));

    expect(prismaMock.actress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ asset_updated_at: expect.any(Date) }),
      }),
    );
    expect(prismaMock.assetLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ video_delta: 3 }),
      }),
    );
    expect(updated.updated_at).toBe('2026-06-05T00:00:00.000Z');
  });
});
