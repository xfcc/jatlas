import {
  createActressCore,
  deleteActressCore,
  getActressesCore,
  updateActressCore,
} from '@/core/services/actressService';
import { prismaMock } from '../../jest.setup';

describe('actressService', () => {
  it('creates an actress', async () => {
    const actressData = { name: 'Test Actress', video_count: 10, tierId: 1 };
    const expectedActress = {
      id: 1,
      ...actressData,
      emby_id: '[]',
      created_at: new Date(),
      updated_at: new Date(),
      tier: { id: 1, name: 'Test Tier', video_limit: 10, created_at: new Date(), updated_at: new Date() },
    };

    prismaMock.actress.create.mockResolvedValue(expectedActress);
    prismaMock.assetLog.create.mockResolvedValue({} as never);

    const result = await createActressCore(actressData);

    expect(prismaMock.actress.create).toHaveBeenCalledWith({
      data: { ...actressData, emby_id: '[]' },
      include: { tier: true },
    });
    expect(result).toEqual({
      success: true,
      data: { ...expectedActress, emby_id: [] },
    });
  });

  it('lists actresses with pagination', async () => {
    const rows = [
      {
        id: 1,
        name: 'Test Actress 1',
        video_count: 10,
        tierId: 1,
        emby_id: '[]',
        created_at: new Date(),
        updated_at: new Date(),
        tier: {
          id: 1,
          name: 'Test Tier',
          video_limit: 10,
          created_at: new Date(),
          updated_at: new Date(),
          status: 'active',
        },
      },
      {
        id: 2,
        name: 'Test Actress 2',
        video_count: 20,
        tierId: 2,
        emby_id: '[]',
        created_at: new Date(),
        updated_at: new Date(),
        tier: {
          id: 2,
          name: 'Test Tier 2',
          video_limit: 20,
          created_at: new Date(),
          updated_at: new Date(),
          status: 'active',
        },
      },
    ];
    prismaMock.actress.count.mockResolvedValue(2);
    prismaMock.actress.findMany.mockResolvedValue(rows);

    const result = await getActressesCore();

    expect(prismaMock.actress.findMany).toHaveBeenCalledWith({
      include: { tier: true },
      where: {},
      orderBy: { id: 'asc' },
      skip: 0,
      take: 20,
    });
    expect(result).toEqual({
      data: rows.map((r) => ({ ...r, emby_id: [] })),
      total: 2,
    });
  });

  it('updates an actress', async () => {
    const actressData = { id: 1, video_count: 15 };
    const { id, ...rest } = actressData;
    const beforeUpdate = {
      id: 1,
      name: 'Test Actress',
      video_count: 10,
      tierId: 1,
      emby_id: '[]',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const expectedActress = {
      id: 1,
      name: 'Test Actress',
      ...rest,
      tierId: 1,
      emby_id: '[]',
      created_at: new Date(),
      updated_at: new Date(),
      tier: {
        id: 1,
        name: 'Test Tier',
        video_limit: 10,
        created_at: new Date(),
        updated_at: new Date(),
        status: 'active',
      },
    };

    prismaMock.actress.findUnique.mockResolvedValue(beforeUpdate);
    prismaMock.actress.update.mockResolvedValue(expectedActress);
    prismaMock.assetLog.create.mockResolvedValue({} as never);

    const result = await updateActressCore(actressData);

    expect(prismaMock.actress.update).toHaveBeenCalledWith({
      where: { id },
      data: {
        ...rest,
        video_count: 15,
        emby_id: undefined,
        updated_at: expect.any(Date),
      },
      include: { tier: true },
    });
    expect(result).toEqual({
      success: true,
      data: { ...expectedActress, emby_id: [] },
    });
  });

  it('deletes an actress', async () => {
    const actressId = 1;
    const row = {
      id: actressId,
      name: 'deleted',
      video_count: 0,
      tierId: 1,
      emby_id: '[]',
      created_at: new Date(),
      updated_at: new Date(),
    };
    prismaMock.actress.findUnique.mockResolvedValue(row);
    prismaMock.actress.delete.mockResolvedValue(row);
    prismaMock.assetLog.create.mockResolvedValue({} as never);

    const result = await deleteActressCore(actressId);

    expect(prismaMock.actress.delete).toHaveBeenCalledWith({ where: { id: actressId } });
    expect(result).toEqual({ success: true });
  });
});
