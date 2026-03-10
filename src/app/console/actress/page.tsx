export const dynamic = 'force-dynamic';

import { getActresses, getTiers } from '@/app/actions';
import { ActressTable } from '@/components/actress/ActressTable';
import FilterToolbar from '@/components/layout/FilterToolbar';

export default async function ConsolePage({ searchParams }: { 
  searchParams?: { 
    query?: string; 
    status?: string; 
    tierId?: string; 
    sortBy?: string; 
    sortOrder?: 'asc' | 'desc';
    page?: string; 
    pageSize?: string;
  } 
}) {
  const page = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 20;

  const { data: actresses, total } = await getActresses({ ...searchParams, page, pageSize });
  const tiers = await getTiers();

  return (
    <>
      <FilterToolbar tiers={tiers} />
      <ActressTable actresses={actresses} tiers={tiers} total={total} page={page} pageSize={pageSize} />
    </>
  );
}
