import { notFound } from 'next/navigation';
import { getStorageImportPageData } from '@/app/actions';
import { ImportActressesClient } from './ImportActressesClient';

export default async function TierImportActressesPage({
  params,
}: {
  params: { tierId: string };
}) {
  const tierId = parseInt(params.tierId, 10);
  if (!Number.isFinite(tierId) || tierId < 1) {
    notFound();
  }

  const data = await getStorageImportPageData(tierId);
  if (!data) {
    notFound();
  }

  return (
    <ImportActressesClient
      tierId={data.tier.id}
      tierName={data.tier.name}
      initialActresses={data.actresses}
    />
  );
}
