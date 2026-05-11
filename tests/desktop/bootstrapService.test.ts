import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { initializeDatabaseForDesktop } from '../../apps/desktop/core/bootstrapService';

jest.mock('child_process', () => ({
  execFile: jest.fn((_file, _args, _options, callback) => {
    callback(null, { stdout: '', stderr: '' });
  }),
}));

describe('initializeDatabaseForDesktop', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jatlas-desktop-bootstrap-'));
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('skips Prisma initialization when the SQLite database already exists', async () => {
    const dbPath = path.join(tempDir, 'jatlas.db');
    await fs.writeFile(dbPath, 'sqlite-bytes');

    await initializeDatabaseForDesktop({ dbMode: 'sqlite', databaseUrl: `file:${dbPath}` }, process.cwd());

    expect(execFile).not.toHaveBeenCalled();
  });

  it('runs Prisma initialization with a timeout when the SQLite database is empty', async () => {
    const dbPath = path.join(tempDir, 'jatlas.db');
    await fs.writeFile(dbPath, '');

    await initializeDatabaseForDesktop({ dbMode: 'sqlite', databaseUrl: `file:${dbPath}` }, process.cwd());

    expect(execFile).toHaveBeenCalledTimes(1);
    expect(execFile).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(['db', 'push', '--skip-generate']),
      expect.objectContaining({
        timeout: 30_000,
        windowsHide: true,
      }),
      expect.any(Function),
    );
  });
});
