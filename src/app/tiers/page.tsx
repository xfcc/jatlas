import { getTiers } from '@/app/actions';
import { TierTable } from '@/components/tier/TierTable';

export default async function TiersPage() {
  const tiers = await getTiers();

  return (
    <main className="container mx-auto py-10">
      <TierTable tiers={tiers} />
    </main>
  );
}
