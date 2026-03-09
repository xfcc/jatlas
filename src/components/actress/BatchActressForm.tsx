'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type Tier } from '@prisma/client';

interface BatchActressFormProps {
  tiers: Tier[];
  onSave: () => void;
  onBatchCreate: (data: { tierId: number; names: string }) => Promise<{ success: boolean; message?: string; data?: { createdCount: number; skippedCount: number; skippedNames: string[] } }>;
}

export function BatchActressForm({ tiers, onSave, onBatchCreate }: BatchActressFormProps) {
  const [tierId, setTierId] = useState<number | undefined>(tiers.length > 0 ? tiers[0].id : undefined);
  const [names, setNames] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!tierId) {
        // This case should ideally not happen if tiers exist
        alert('Please select a tier.');
        return;
    }
    setIsSaving(true);
    await onBatchCreate({ tierId, names });
    setIsSaving(false);
    onSave();
  };

  if (tiers.length === 0) {
    return (
      <div className="text-center py-4">
        <p>No tiers available. Please create a tier before adding actresses.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="tier" className="text-right">Tier</Label>
        <Select onValueChange={(value) => setTierId(Number(value))} value={tierId?.toString()}>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select a tier" />
          </SelectTrigger>
          <SelectContent>
            {tiers.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="names" className="text-right pt-2">Names</Label>
        <Textarea
          id="names"
          value={names}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNames(e.target.value)}
          className="col-span-3 font-mono"
          placeholder="One name per line..."
          rows={10}
        />
      </div>
      <Button onClick={handleSubmit} disabled={isSaving || !tierId || !names.trim()}>
        {isSaving ? 'Saving...' : 'Save Batch'}
      </Button>
    </div>
  );
}
