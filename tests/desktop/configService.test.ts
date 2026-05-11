import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { DesktopRuntimeConfig } from '../../apps/desktop/core/configService';
import { loadDesktopRuntimeConfig, saveDesktopRuntimeConfig } from '../../apps/desktop/core/configService';

describe('desktop runtime config', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jatlas-desktop-config-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('persists storage paths per category id', async () => {
    const config: DesktopRuntimeConfig = {
      dbMode: 'sqlite',
      databaseUrl: 'file:/tmp/jatlas.db',
      tierStoragePaths: {
        '1': '/Volumes/JAV_output/S',
        '2': '/Volumes/JAV_output/A',
      },
    };

    await saveDesktopRuntimeConfig(tempDir, config);

    await expect(loadDesktopRuntimeConfig(tempDir)).resolves.toEqual(config);
  });
});
