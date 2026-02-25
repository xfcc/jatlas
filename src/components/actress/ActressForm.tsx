'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Actress, type Tier as TierType } from '@/types';

interface ActressFormProps {
  actress?: Actress;
  onSave: () => void;
}

export function ActressForm({ actress, onSave }: ActressFormProps) {
  const [name, setName] = useState('');

  const [tierId, setTierId] = useState<number | undefined>(undefined);
  const [videoCount, setVideoCount] = useState(0);
  const [externalId, setExternalId] = useState('');
  const [availableTiers, setAvailableTiers] = useState<TierType[]>([]);

  useEffect(() => {
    const fetchTiers = async () => {
      const response = await fetch('/api/tiers');
      const allTiers: TierType[] = await response.json();
      setAvailableTiers(allTiers);

      if (actress) {
        if (allTiers.some(t => t.id === actress.tierId)) {
          setTierId(actress.tierId);
        } else {
          setTierId(allTiers[0]?.id);
        }
      } else {
        setTierId(allTiers[0]?.id);
      }
    };

    fetchTiers();
  }, [actress]);

  useEffect(() => {
    if (actress) {
      setName(actress.name);
      setTierId(actress.tierId);
      setVideoCount(actress.video_count);
      setExternalId(actress.external_id || '');
    }
  }, [actress]);

  const handleSubmit = async () => {
    const data = { name, tierId, video_count: videoCount, external_id: externalId };
    const url = actress ? `/api/actresses/${actress.id}` : '/api/actresses';
    const method = actress ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      onSave();
    }
  };

  if (availableTiers.length === 0) {
    return (
      <div className="text-center py-4">
        <p>No tiers available. Please create a tier before adding an actress.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="tier" className="text-right">Tier</Label>
        <Select onValueChange={(value) => setTierId(Number(value))} value={tierId?.toString()}>
          <SelectTrigger className="col-span-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableTiers.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="video-count" className="text-right">Video Count</Label>
        <Input id="video-count" type="number" value={videoCount} onChange={(e) => setVideoCount(parseInt(e.target.value, 10))} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="external-id" className="text-right">External ID</Label>
        <Input id="external-id" value={externalId} onChange={(e) => setExternalId(e.target.value)} className="col-span-3" />
      </div>
      <Button onClick={handleSubmit}>Save</Button>
    </div>
  );
}
