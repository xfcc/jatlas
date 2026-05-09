import fs from 'fs/promises';
import path from 'path';

const backupDir = path.join(process.cwd(), 'backups');

function getTimestamp() {
  const now = new Date();
  const beijingTimeOffset = 8 * 60 * 60 * 1000;
  const beijingDate = new Date(now.getTime() + beijingTimeOffset);
  return beijingDate.toISOString().replace(/:/g, '-').slice(0, 19);
}

function resolveSqliteDbFilePath(databaseUrl: string | undefined) {
  if (!databaseUrl || !databaseUrl.startsWith('file:')) {
    return null;
  }
  const raw = databaseUrl.replace(/^file:/, '');
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

export async function listDatabaseBackupsCore() {
  await fs.mkdir(backupDir, { recursive: true });
  const files = await fs.readdir(backupDir);
  const backups = files
    .filter((file) => file.endsWith('.sql') || file.endsWith('.sqlite'))
    .map((file) => {
      const match = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
      const createdAt = match
        ? new Date(match[0].slice(0, 11) + match[0].slice(11).replace(/-/g, ':')).toISOString()
        : new Date().toISOString();
      return { name: file, createdAt };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { success: true, data: backups } as const;
}

export async function backupDatabaseCore() {
  await fs.mkdir(backupDir, { recursive: true });
  const timestamp = getTimestamp();
  const sqliteDbPath = resolveSqliteDbFilePath(process.env.DATABASE_URL);

  if (!sqliteDbPath) {
    throw new Error('仅支持 SQLite 数据库备份');
  }

  const backupFileName = `backup-${timestamp}.sqlite`;
  const backupFilePath = path.join(backupDir, backupFileName);
  await fs.copyFile(sqliteDbPath, backupFilePath);
  return { success: true, message: `成功创建备份 ${backupFileName}` } as const;
}

export async function restoreDatabaseCore(fileName: string) {
  const backupFilePath = path.join(backupDir, fileName);
  await backupDatabaseCore();

  const sqliteDbPath = resolveSqliteDbFilePath(process.env.DATABASE_URL);
  if (!sqliteDbPath) {
    throw new Error('仅支持 SQLite 数据库恢复');
  }

  await fs.copyFile(backupFilePath, sqliteDbPath);
  return { success: true, message: `成功从 ${fileName} 恢复数据库。` } as const;
}

export async function deleteDatabaseBackupCore(fileName: string) {
  const backupFilePath = path.join(backupDir, fileName);
  await fs.unlink(backupFilePath);
  return { success: true, message: `成功删除备份 ${fileName}` } as const;
}
