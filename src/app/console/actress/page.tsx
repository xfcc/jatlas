import { getActresses, getTiers } from '@/app/actions';
import ActressView from './ActressView';

export default async function ConsolePage({ searchParams }: { 
  searchParams?: { 
    query?: string; 
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

  return <ActressView actresses={actresses} tiers={tiers} total={total} page={page} pageSize={pageSize} />;
}
