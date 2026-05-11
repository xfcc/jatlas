import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import type { DesktopRuntimeConfig } from './configService';

const execFileAsync = promisify(execFile);
const PRISMA_DB_PUSH_TIMEOUT_MS = 30_000;

export type DesktopBootstrapState = {
  configured: boolean;
  initialized: boolean;
  configPath: string;
  message: string;
};

function sqlitePathFromDatabaseUrl(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('Only SQLite file: database URLs are supported.');
  }
  return databaseUrl.slice('file:'.length);
}

async function hasExistingDatabase(databaseUrl: string): Promise<boolean> {
  const dbPath = sqlitePathFromDatabaseUrl(databaseUrl);
  try {
    const stat = await fs.stat(dbPath);
    return stat.isFile() && stat.size > 0;
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : undefined;
    if (code === 'ENOENT') {
      return false;
    }
    throw e;
  }
}

export async function initializeDatabaseForDesktop(config: DesktopRuntimeConfig, cwd: string) {
  if (await hasExistingDatabase(config.databaseUrl)) {
    return;
  }

  const { ELECTRON_RUN_AS_NODE, NODE_OPTIONS, ...baseEnv } = process.env;
  const runtimeRoot = cwd.includes('app.asar') ? cwd.replace('app.asar', 'app.asar.unpacked') : cwd;
  const schemaEnginePath = path.join(
    runtimeRoot,
    'node_modules',
    '@prisma',
    'engines',
    process.platform === 'win32' ? 'schema-engine-windows.exe' : `schema-engine-${process.platform}-${process.arch}`,
  );
  const prismaCli = path.join(runtimeRoot, 'node_modules', 'prisma', 'build', 'index.js');
  const schemaPath = path.join(runtimeRoot, 'prisma', 'schema.prisma');

  await Promise.all([fs.access(schemaEnginePath), fs.access(prismaCli), fs.access(schemaPath)]);

  const env = {
    ...baseEnv,
    DATABASE_URL: config.databaseUrl,
    ELECTRON_RUN_AS_NODE: '1',
    RUST_LOG: 'info',
    PRISMA_SCHEMA_ENGINE_BINARY: schemaEnginePath,
  };
  await execFileAsync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate', '--schema', schemaPath], {
    cwd: runtimeRoot,
    env,
    timeout: PRISMA_DB_PUSH_TIMEOUT_MS,
    windowsHide: true,
  });
}
