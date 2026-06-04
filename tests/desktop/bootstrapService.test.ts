import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { initializeDatabaseForDesktop } from '../../apps/desktop/core/bootstrapService';

const mockExecuteRawUnsafe = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('child_process', () => ({
  execFile: jest.fn((_file, _args, _options, callback) => {
    callback(null, { stdout: '', stderr: '' });
  }),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $executeRawUnsafe: mockExecuteRawUnsafe,
    $disconnect: mockDisconnect,
  })),
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

  it('runs Prisma schema sync and total limit backfill when the SQLite database already exists', async () => {
    const dbPath = path.join(tempDir, 'jatlas.db');
    await fs.writeFile(dbPath, 'sqlite-bytes');

    await initializeDatabaseForDesktop({ dbMode: 'sqlite', databaseUrl: `file:${dbPath}` }, process.cwd());

    expect(execFile).toHaveBeenCalledTimes(1);
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('total_video_limit'));
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('runs Prisma schema sync with a timeout when the SQLite database is empty', async () => {
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
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('COALESCE("Tier"."video_limit", 100)'));
  });
});
