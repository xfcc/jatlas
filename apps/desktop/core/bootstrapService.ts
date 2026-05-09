import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import type { DesktopRuntimeConfig } from './configService';

const execFileAsync = promisify(execFile);

export type DesktopBootstrapState = {
  configured: boolean;
  initialized: boolean;
  configPath: string;
  message: string;
};

export async function initializeDatabaseForDesktop(config: DesktopRuntimeConfig, cwd: string) {
  const { ELECTRON_RUN_AS_NODE, NODE_OPTIONS, ...baseEnv } = process.env;
  const runtimeRoot = cwd.includes('app.asar') ? cwd.replace('app.asar', 'app.asar.unpacked') : cwd;
  const env = {
    ...baseEnv,
    DATABASE_URL: config.databaseUrl,
    ELECTRON_RUN_AS_NODE: '1',
    RUST_LOG: 'info',
    PRISMA_SCHEMA_ENGINE_BINARY: path.join(
      runtimeRoot,
      'node_modules',
      '@prisma',
      'engines',
      process.platform === 'win32' ? 'schema-engine-windows.exe' : `schema-engine-${process.platform}-${process.arch}`,
    ),
  };
  const prismaCli = path.join(runtimeRoot, 'node_modules', 'prisma', 'build', 'index.js');
  const schemaPath = path.join(runtimeRoot, 'prisma', 'schema.prisma');
  await execFileAsync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate', '--schema', schemaPath], {
    cwd: runtimeRoot,
    env,
  });
}
