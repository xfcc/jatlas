import {
  createTierCore,
  deleteTierCore,
  getTiersCore,
  updateTierCore,
} from '@/core/services/tierService';
import { prismaMock } from '../../jest.setup';

describe('tierService', () => {
  it('creates a tier', async () => {
    const tierData = { name: 'Test Tier', video_limit: 10, status: 'active' };
    const expectedTier = { id: 1, ...tierData, created_at: new Date(), updated_at: new Date() };

    prismaMock.tier.create.mockResolvedValue(expectedTier);

    const result = await createTierCore(tierData);

    expect(prismaMock.tier.create).toHaveBeenCalledWith({ data: tierData });
    expect(result).toEqual(expectedTier);
  });

  it('lists tiers', async () => {
    const tiers = [
      { id: 1, name: 'Test Tier 1', video_limit: 10, status: 'active', created_at: new Date(), updated_at: new Date() },
      { id: 2, name: 'Test Tier 2', video_limit: 20, status: 'active', created_at: new Date(), updated_at: new Date() },
    ];
    prismaMock.tier.findMany.mockResolvedValue(tiers);

    const result = await getTiersCore();

    expect(prismaMock.tier.findMany).toHaveBeenCalled();
    expect(result).toEqual(tiers);
  });

  it('updates a tier', async () => {
    const tierData = { id: 1, name: 'Updated Tier', video_limit: 15, status: 'active' };
    const { id, ...rest } = tierData;
    const expectedTier = { ...tierData, created_at: new Date(), updated_at: new Date() };

    prismaMock.tier.update.mockResolvedValue(expectedTier);

    const result = await updateTierCore(tierData);

    expect(prismaMock.tier.update).toHaveBeenCalledWith({ where: { id }, data: rest });
    expect(result).toEqual(expectedTier);
  });

  it('deletes a tier', async () => {
    const tierId = 1;
    const expectedTier = {
      id: tierId,
      name: 'deleted',
      video_limit: 0,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };
    prismaMock.tier.delete.mockResolvedValue(expectedTier);

    await deleteTierCore(tierId);

    expect(prismaMock.tier.delete).toHaveBeenCalledWith({ where: { id: tierId } });
  });
});
