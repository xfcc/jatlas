export const dynamic = 'force-dynamic';

import { getActresses, getTiers } from '@/app/actions';
import { ActressTable } from '@/components/actress/ActressTable';
import FilterToolbar from '@/components/layout/FilterToolbar';

export default async function ConsolePage({ searchParams }: { searchParams?: { query?: string; status?: string; tierId?: string } }) {
  const [actresses, tiers] = await Promise.all([getActresses(searchParams), getTiers()]);

  return (
    <>
      <FilterToolbar tiers={tiers} />
      <ActressTable actresses={actresses} tiers={tiers} />
    </>
  );
}
