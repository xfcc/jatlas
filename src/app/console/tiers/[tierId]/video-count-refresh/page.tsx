import { notFound } from 'next/navigation';
import { getTierWithActressCount } from '@/app/actions';
import { TierVideoRefreshClient } from '@/components/tier/TierVideoRefreshClient';

export default async function TierVideoCountRefreshPage({
  params,
}: {
  params: { tierId: string };
}) {
  const tierId = parseInt(params.tierId, 10);
  if (!Number.isFinite(tierId) || tierId < 1) {
    notFound();
  }

  const row = await getTierWithActressCount(tierId);
  if (!row) {
    notFound();
  }

  return (
    <TierVideoRefreshClient
      tier={{
        id: row.id,
        name: row.name,
        video_limit: row.video_limit,
        status: row.status,
        actressCount: row._count.actresses,
      }}
    />
  );
}
