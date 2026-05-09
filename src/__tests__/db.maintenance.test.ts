import {
  backupDatabaseCore,
  deleteDatabaseBackupCore,
  listDatabaseBackupsCore,
  restoreDatabaseCore,
} from '@/core/services/systemMaintenanceService';
import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  exec: jest.fn((command, callback) => {
    if (command.includes('pg_dump')) {
      const filePath = command.split(' > ')[1].replace(/"/g, '');
      fsSync.writeFileSync(filePath, 'dummy content');
    }
    callback(null, { stdout: '', stderr: '' });
  }),
}));

const mockedExec = exec as unknown as jest.Mock;

describe('systemMaintenanceService (database backup)', () => {
  const backupDir = path.join(process.cwd(), 'backups');

  beforeEach(async () => {
    await fs.rm(backupDir, { recursive: true, force: true });
    await fs.mkdir(backupDir, { recursive: true });
    process.env.DATABASE_URL = 'file:./test-jatlas.db';
    await fs.writeFile(path.join(process.cwd(), 'test-jatlas.db'), 'sqlite-bytes');
    mockedExec.mockClear();
  });

  it('creates a SQLite backup without pg_dump', async () => {
    const result = await backupDatabaseCore();
    expect(result.success).toBe(true);
    expect(result.message).toContain('成功创建备份');

    const files = await fs.readdir(backupDir);
    const backups = files.filter((file) => file.endsWith('.sqlite'));
    expect(backups).toHaveLength(1);
    expect(mockedExec).toHaveBeenCalledTimes(0);
  });

  it('restores from a backup file', async () => {
    const dummyBackupName = 'dummy-backup.sqlite';
    await fs.writeFile(path.join(backupDir, dummyBackupName), 'sqlite-backup');

    const result = await restoreDatabaseCore(dummyBackupName);
    expect(result.success).toBe(true);
    expect(result.message).toContain(`成功从 ${dummyBackupName} 恢复数据库`);
    expect(mockedExec).toHaveBeenCalledTimes(0);
  });

  it('deletes a backup file', async () => {
    const dummyBackupName = 'dummy-backup-to-delete.sql';
    const backupFilePath = path.join(backupDir, dummyBackupName);
    await fs.writeFile(backupFilePath, 'SELECT 1;');

    let backups = await listDatabaseBackupsCore();
    expect(backups.data).toHaveLength(1);

    const result = await deleteDatabaseBackupCore(dummyBackupName);
    expect(result.success).toBe(true);
    expect(result.message).toContain(`成功删除备份 ${dummyBackupName}`);

    backups = await listDatabaseBackupsCore();
    expect(backups.data).toHaveLength(0);
  });
});
