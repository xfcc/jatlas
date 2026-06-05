import { execFile } from 'child_process';
import { PrismaClient } from '@prisma/client';
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

async function hasActressColumn(databaseUrl: string, columnName: string): Promise<boolean> {
  if (!(await hasExistingDatabase(databaseUrl))) return false;
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    const rows = await client.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Actress")`);
    return rows.some((row) => row.name === columnName);
  } catch {
    return false;
  } finally {
    await client.$disconnect();
  }
}

async function runPrismaDbPush(databaseUrl: string, cwd: string) {
  const baseEnv = { ...process.env };
  delete baseEnv.ELECTRON_RUN_AS_NODE;
  delete baseEnv.NODE_OPTIONS;
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
    DATABASE_URL: databaseUrl,
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

async function backfillTierTotalVideoLimits(databaseUrl: string) {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await client.$executeRawUnsafe(`
      UPDATE "Tier"
      SET "total_video_limit" = (
        SELECT COUNT(*)
        FROM "Actress"
        WHERE "Actress"."tierId" = "Tier"."id"
      ) * COALESCE("Tier"."video_limit", 100)
      WHERE "total_video_limit" IS NULL
    `);
  } finally {
    await client.$disconnect();
  }
}

async function backfillActressStatuses(databaseUrl: string) {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await client.$executeRawUnsafe(`
      UPDATE "Actress"
      SET "status" = 'active'
      WHERE "status" IS NULL OR TRIM("status") = ''
    `);
  } finally {
    await client.$disconnect();
  }
}

async function backfillActressProfileFields(databaseUrl: string) {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await client.$executeRawUnsafe(`
      UPDATE "Actress"
      SET
        "birthday" = CASE WHEN TRIM("birthday") = '' THEN "birth_date" ELSE "birthday" END,
        "cup" = CASE WHEN TRIM("cup") = '' THEN "cup_size" ELSE "cup" END,
        "bust" = CASE
          WHEN TRIM("bust") = '' AND INSTR("measurements", '/') > 0
          THEN SUBSTR("measurements", 1, INSTR("measurements", '/') - 1)
          ELSE "bust"
        END,
        "waist" = CASE
          WHEN TRIM("waist") = '' AND INSTR(SUBSTR("measurements", INSTR("measurements", '/') + 1), '/') > 0
          THEN SUBSTR(
            SUBSTR("measurements", INSTR("measurements", '/') + 1),
            1,
            INSTR(SUBSTR("measurements", INSTR("measurements", '/') + 1), '/') - 1
          )
          ELSE "waist"
        END,
        "hip" = CASE
          WHEN TRIM("hip") = '' AND INSTR(SUBSTR("measurements", INSTR("measurements", '/') + 1), '/') > 0
          THEN SUBSTR(
            SUBSTR("measurements", INSTR("measurements", '/') + 1),
            INSTR(SUBSTR("measurements", INSTR("measurements", '/') + 1), '/') + 1
          )
          ELSE "hip"
        END,
        "career_from" = CASE
          WHEN TRIM("career_from") = '' AND INSTR("career_period", '~') > 0
          THEN SUBSTR("career_period", 1, INSTR("career_period", '~') - 1)
          ELSE "career_from"
        END,
        "career_to" = CASE
          WHEN TRIM("career_to") = '' AND INSTR("career_period", '~') > 0
          THEN SUBSTR("career_period", INSTR("career_period", '~') + 1)
          ELSE "career_to"
        END
    `);
  } finally {
    await client.$disconnect();
  }
}

async function backfillActressAssetUpdatedAt(databaseUrl: string) {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await client.$executeRawUnsafe(`
      UPDATE "Actress"
      SET "asset_updated_at" = "updated_at"
    `);
  } finally {
    await client.$disconnect();
  }
}

export async function initializeDatabaseForDesktop(config: DesktopRuntimeConfig, cwd: string) {
  await hasExistingDatabase(config.databaseUrl);
  const hadAssetUpdatedAt = await hasActressColumn(config.databaseUrl, 'asset_updated_at');
  await runPrismaDbPush(config.databaseUrl, cwd);
  await backfillTierTotalVideoLimits(config.databaseUrl);
  await backfillActressStatuses(config.databaseUrl);
  await backfillActressProfileFields(config.databaseUrl);
  if (!hadAssetUpdatedAt) {
    await backfillActressAssetUpdatedAt(config.databaseUrl);
  }
}
