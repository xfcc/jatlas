import 'dotenv/config';
import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';

type PgTierRow = {
  id: number;
  name: string;
  video_limit: number | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type PgActressRow = {
  id: number;
  name: string;
  tierId: number;
  video_count: number;
  emby_id: string[] | null;
  created_at: Date;
  updated_at: Date;
};

type PgAssetLogRow = {
  id: number;
  actress_id: number;
  actress_name: string;
  action_type: 'CREATE' | 'DELETE' | 'UPDATE';
  video_delta: number;
  created_at: Date;
  updated_at: Date;
};

async function main() {
  const sourceDatabaseUrl = process.env.SOURCE_DATABASE_URL;
  if (!sourceDatabaseUrl) {
    throw new Error('Missing SOURCE_DATABASE_URL');
  }
  if (!process.env.DATABASE_URL?.startsWith('file:')) {
    throw new Error('DATABASE_URL must be sqlite file:... before migration');
  }

  const pg = new Client({ connectionString: sourceDatabaseUrl });
  const prisma = new PrismaClient();
  await pg.connect();

  const tiers = (await pg.query<PgTierRow>('SELECT * FROM "Tier" ORDER BY id ASC')).rows;
  const actresses = (await pg.query<PgActressRow>('SELECT * FROM "Actress" ORDER BY id ASC')).rows;
  const logs = (await pg.query<PgAssetLogRow>('SELECT * FROM "AssetLog" ORDER BY id ASC')).rows;

  await prisma.$transaction(async (tx) => {
    await tx.assetLog.deleteMany();
    await tx.actress.deleteMany();
    await tx.tier.deleteMany();

    for (const row of tiers) {
      await tx.tier.create({
        data: {
          id: row.id,
          name: row.name,
          video_limit: row.video_limit,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      });
    }

    for (const row of actresses) {
      await tx.actress.create({
        data: {
          id: row.id,
          name: row.name,
          tierId: row.tierId,
          video_count: row.video_count,
          emby_id: JSON.stringify(row.emby_id ?? []),
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      });
    }

    for (const row of logs) {
      await tx.assetLog.create({
        data: {
          id: row.id,
          actress_id: row.actress_id,
          actress_name: row.actress_name,
          action_type: row.action_type,
          video_delta: row.video_delta,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      });
    }
  });

  await pg.end();
  await prisma.$disconnect();
  console.log(
    `Migration completed: tiers=${tiers.length}, actresses=${actresses.length}, assetLogs=${logs.length}`,
  );
}

void main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
