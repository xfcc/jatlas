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
    status: input.status ?? 'active',
    embyIds: [],
    roman: '',
    aliases: [],
    birthday: '',
    cup: input.cup ?? '',
    bust: '',
    waist: '',
    hip: '',
    career_from: '',
    career_to: '',
    minnano_url: '',
    tags: [],
    updated_at: input.updated_at ?? '2026-06-01T00:00:00.000Z',
  };
}

describe('asset health helpers', () => {
  it('labels healthy, warning, and overloaded asset states from tier limits', () => {
    expect(assetHealthLabel(getAssetHealthStatus(12, null))).toBe('健康');
    expect(assetHealthLabel(getAssetHealthStatus(100, 100))).toBe('健康');
    expect(assetHealthLabel(getAssetHealthStatus(101, 100))).toBe('预警');
    expect(assetHealthLabel(getAssetHealthStatus(120, 100))).toBe('预警');
    expect(assetHealthLabel(getAssetHealthStatus(121, 100))).toBe('超额');
  });

  it('sorts actresses by video count and update time', () => {
    const rows = [
      actress({ name: 'Beta', video_count: 12, updated_at: '2026-06-02T00:00:00.000Z' }),
      actress({ name: 'Alpha', video_count: 20, updated_at: '2026-06-01T00:00:00.000Z' }),
    ];

    expect(sortActresses(rows, 'video_count', 'desc').map((row) => row.name)).toEqual(['Alpha', 'Beta']);
    expect(sortActresses(rows, 'updated_at', 'desc').map((row) => row.name)).toEqual(['Beta', 'Alpha']);
  });

  it('sorts actresses by cup size and keeps empty cups last in ascending order', () => {
    const rows = [
      actress({ name: 'No Cup', cup: '' }),
      actress({ name: 'H Cup', cup: 'H' }),
      actress({ name: 'A Cup', cup: 'A' }),
    ];

    expect(sortActresses(rows, 'cup', 'asc').map((row) => row.name)).toEqual(['A Cup', 'H Cup', 'No Cup']);
    expect(sortActresses(rows, 'cup', 'desc').map((row) => row.name)).toEqual(['H Cup', 'A Cup', 'No Cup']);
  });
});
