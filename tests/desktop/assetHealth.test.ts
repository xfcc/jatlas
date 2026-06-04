import {
  assetHealthLabel,
  getAssetHealthStatus,
  sortActresses,
} from '../../apps/desktop/renderer/src/assetHealth';
import type { DesktopActress } from '../../apps/desktop/core/desktopDataService';

function actress(input: Partial<DesktopActress> & Pick<DesktopActress, 'name'>): DesktopActress {
  return {
    id: 1,
    name: input.name,
    tierId: 1,
    tierName: 'S',
    video_count: input.video_count ?? 0,
    embyIds: [],
    updated_at: input.updated_at ?? '2026-06-01T00:00:00.000Z',
  };
}

describe('asset health helpers', () => {
  it('labels healthy, warning, and overloaded asset states from tier limits', () => {
    expect(assetHealthLabel(getAssetHealthStatus(12, null))).toBe('健康');
    expect(assetHealthLabel(getAssetHealthStatus(79, 100))).toBe('健康');
    expect(assetHealthLabel(getAssetHealthStatus(80, 100))).toBe('预警');
    expect(assetHealthLabel(getAssetHealthStatus(101, 100))).toBe('超额');
  });

  it('sorts actresses by video count and update time', () => {
    const rows = [
      actress({ name: 'Beta', video_count: 12, updated_at: '2026-06-02T00:00:00.000Z' }),
      actress({ name: 'Alpha', video_count: 20, updated_at: '2026-06-01T00:00:00.000Z' }),
    ];

    expect(sortActresses(rows, 'video_count', 'desc').map((row) => row.name)).toEqual(['Alpha', 'Beta']);
    expect(sortActresses(rows, 'updated_at', 'desc').map((row) => row.name)).toEqual(['Beta', 'Alpha']);
  });
});
