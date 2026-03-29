import { createActress, getActresses, updateActress, deleteActress } from '@/app/actions';
import { prismaMock } from '../../jest.setup';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Actress Actions', () => {
  it('should create a new actress', async () => {
    const actressData = { name: 'Test Actress', video_count: 10, tierId: 1 };
    const expectedActress = { id: 1, ...actressData, emby_id: [], created_at: new Date(), updated_at: new Date(), tier: { id: 1, name: 'Test Tier', video_limit: 10, created_at: new Date(), updated_at: new Date() } };

    prismaMock.actress.create.mockResolvedValue(expectedActress);

    const result = await createActress(actressData);

    expect(prismaMock.actress.create).toHaveBeenCalledWith({ data: { ...actressData, emby_id: [] }, include: { tier: true } });
    expect(require('next/cache').revalidatePath).toHaveBeenCalledWith('/');
    expect(result).toEqual({ success: true, data: expectedActress });
  });

  it('should get all actresses', async () => {
    const actresses = [
      { id: 1, name: 'Test Actress 1', video_count: 10, tierId: 1, emby_id: [], created_at: new Date(), updated_at: new Date(), tier: { id: 1, name: 'Test Tier', video_limit: 10, created_at: new Date(), updated_at: new Date(), status: 'active' } },
      { id: 2, name: 'Test Actress 2', video_count: 20, tierId: 2, emby_id: [], created_at: new Date(), updated_at: new Date(), tier: { id: 2, name: 'Test Tier 2', video_limit: 20, created_at: new Date(), updated_at: new Date(), status: 'active' } },
    ];
    prismaMock.actress.count.mockResolvedValue(2);
    prismaMock.actress.findMany.mockResolvedValue(actresses);

    const result = await getActresses();

    expect(prismaMock.actress.findMany).toHaveBeenCalledWith({ include: { tier: true }, where: {}, orderBy: { id: 'asc' }, skip: 0, take: 20 });
    expect(result).toEqual({ data: actresses, total: 2 });
  });

  it('should update an actress', async () => {
    const actressData = { id: 1, video_count: 15 };
    const { id, ...rest } = actressData;
    const beforeUpdate = {
      id: 1,
      name: 'Test Actress',
      video_count: 10,
      tierId: 1,
      emby_id: [] as string[],
      created_at: new Date(),
      updated_at: new Date(),
    };
    const expectedActress = {
      id: 1,
      name: 'Test Actress',
      ...rest,
      tierId: 1,
      emby_id: [] as string[],
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

    const result = await updateActress(actressData);

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
    expect(require('next/cache').revalidatePath).toHaveBeenCalledWith('/');
    expect(result).toEqual({ success: true, data: expectedActress });
  });

  it('should delete an actress', async () => {
    const actressId = 1;
    const expectedActress = { id: actressId, name: 'deleted', video_count: 0, tierId: 1, emby_id: [], created_at: new Date(), updated_at: new Date() };
    prismaMock.actress.findUnique.mockResolvedValue(expectedActress);
    prismaMock.actress.delete.mockResolvedValue(expectedActress);
    prismaMock.assetLog.create.mockResolvedValue({} as never);

    await deleteActress(actressId);

    expect(prismaMock.actress.delete).toHaveBeenCalledWith({ where: { id: actressId } });
    expect(require('next/cache').revalidatePath).toHaveBeenCalledWith('/');
  });
});
