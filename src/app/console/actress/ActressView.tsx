'use client';

import { useState } from 'react';
import { Tier, Actress } from '@prisma/client';
import FilterToolbar from '@/components/layout/FilterToolbar';
import { ActressTable } from '@/components/actress/ActressTable';

interface ActressViewProps {
  actresses: (Actress & { tier: Tier })[];
  tiers: Tier[];
  total: number;
  page: number;
  pageSize: number;
}

export default function ActressView({ actresses, tiers, total, page, pageSize }: ActressViewProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleSelectionChange = (ids: number[]) => {
    setSelectedIds(ids);
  };

  return (
    <>
      <FilterToolbar tiers={tiers} actressIds={selectedIds} />
      <ActressTable 
        actresses={actresses} 
        tiers={tiers} 
        total={total} 
        page={page} 
        pageSize={pageSize} 
        onSelectionChange={handleSelectionChange}
        selectedIds={selectedIds}
      />
    </>
  );
}
