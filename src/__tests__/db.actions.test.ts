import { backupDatabase, restoreDatabase, listDatabaseBackups, deleteDatabaseBackup } from '@/app/actions';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock child_process
jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  exec: jest.fn((command, callback) => {
    // Simulate file creation for backup
    if (command.includes('pg_dump')) {
        const filePath = command.split(' > ')[1].replace(/"/g, '');
        require('fs').writeFileSync(filePath, 'dummy content');
    }
    callback(null, { stdout: '', stderr: '' })
  }),
}));

const mockedExec = exec as jest.Mock;

describe('Database Backup and Restore', () => {
  const backupDir = path.join(process.cwd(), 'backups');

  beforeEach(async () => {
    // Ensure the backup directory exists and is empty
    await fs.rm(backupDir, { recursive: true, force: true });
    await fs.mkdir(backupDir, { recursive: true });
    mockedExec.mockClear();
    (require('next/cache').revalidatePath as jest.Mock).mockClear();
  });

  it('should create a new database backup', async () => {
    const result = await backupDatabase();
    expect(result.success).toBe(true);
    expect(result.message).toContain('成功创建备份');

    const files = await fs.readdir(backupDir);
    const backups = files.filter(file => file.endsWith('.sql'));
    expect(backups).toHaveLength(1);
    expect(mockedExec).toHaveBeenCalledTimes(1);
  });

  it('should restore the database from a backup', async () => {
    const dummyBackupName = 'dummy-backup.sql';
    await fs.writeFile(path.join(backupDir, dummyBackupName), 'SELECT 1;');

    const result = await restoreDatabase(dummyBackupName);
    expect(result.success).toBe(true);
    expect(result.message).toContain(`成功从 ${dummyBackupName} 恢复数据库`);
    // a backup is created before restoring, so exec is called twice
    expect(mockedExec).toHaveBeenCalledTimes(2);
    expect(require('next/cache').revalidatePath).toHaveBeenCalledWith('/');
  });

  it('should delete a database backup', async () => {
    const dummyBackupName = 'dummy-backup-to-delete.sql';
    const backupFilePath = path.join(backupDir, dummyBackupName);
    await fs.writeFile(backupFilePath, 'SELECT 1;');

    let backups = await listDatabaseBackups();
    expect(backups.data).toHaveLength(1);

    const result = await deleteDatabaseBackup(dummyBackupName);
    expect(result.success).toBe(true);
    expect(result.message).toContain(`成功删除备份 ${dummyBackupName}`);

    backups = await listDatabaseBackups();
    expect(backups.data).toHaveLength(0);
  });
});
