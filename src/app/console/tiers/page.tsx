import { getTiers } from '@/app/actions';
import { TierTable } from '@/components/tier/TierTable';

export default async function TiersPage() {
  const tiers = await getTiers();

  return (
    <>
      <TierTable tiers={tiers} />
    </>
  );
}