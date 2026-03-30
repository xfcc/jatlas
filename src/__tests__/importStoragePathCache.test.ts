import {
  getImportStoragePathForTier,
  setImportStoragePathForTier,
} from '@/lib/importStoragePathCache';

const memory: Record<string, string> = {};

describe('importStoragePathCache', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => (Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null),
        setItem: (key: string, value: string) => {
          memory[key] = value;
        },
        removeItem: (key: string) => {
          delete memory[key];
        },
        clear: () => {
          for (const k of Object.keys(memory)) delete memory[k];
        },
      },
      configurable: true,
    });
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips path per tier', () => {
    setImportStoragePathForTier(1, 'afp://nas/share/a');
    setImportStoragePathForTier(2, '/Volumes/Share/b');
    expect(getImportStoragePathForTier(1)).toBe('afp://nas/share/a');
    expect(getImportStoragePathForTier(2)).toBe('/Volumes/Share/b');
  });

  it('overwrites with last value for same tier', () => {
    setImportStoragePathForTier(3, 'first');
    setImportStoragePathForTier(3, 'second');
    expect(getImportStoragePathForTier(3)).toBe('second');
  });

  it('clears tier entry when path is empty after trim', () => {
    setImportStoragePathForTier(4, 'x');
    setImportStoragePathForTier(4, '  ');
    expect(getImportStoragePathForTier(4)).toBeNull();
  });
});
