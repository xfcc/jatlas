'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Tier } from '@prisma/client';
import { type OptimisticActress } from '@/hooks/useOptimisticActresses';

interface ActressFormProps {
  actress?: OptimisticActress;
  tiers: Tier[];
  onSave: () => void;
  onCreate: (data: { name: string; video_count: number; tierId: number; emby_id?: string }) => Promise<void>;
  onUpdate: (data: { id: number; video_count?: number; tierId?: number; emby_id?: string }) => Promise<void>;
}

export function ActressForm({ actress, tiers, onSave, onCreate, onUpdate }: ActressFormProps) {
  const [name, setName] = useState('');
  const [tierId, setTierId] = useState<number | undefined>(undefined);
  const [videoCount, setVideoCount] = useState(0);
  const [emby_id, setEmbyId] = useState('');

  useEffect(() => {
    if (actress) {
      setName(actress.name);
      setTierId(actress.tierId);
      setVideoCount(actress.video_count);
      setEmbyId(actress.emby_id || '');
    } else {
      // Set default tier when adding a new actress
      if (tiers.length > 0) {
        setTierId(tiers[0].id);
      }
    }
  }, [actress, tiers]);

  const handleSubmit = async () => {
    if (actress) {
      await onUpdate({ id: actress.id, video_count: videoCount, tierId, emby_id });
    } else {
      await onCreate({ name, video_count: videoCount, tierId: tierId!, emby_id });
    }
    onSave();
  };

  if (tiers.length === 0) {
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
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" disabled={!!actress} />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="tier" className="text-right">Tier</Label>
        <Select onValueChange={(value) => setTierId(Number(value))} value={tierId?.toString()}>
          <SelectTrigger className="col-span-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tiers.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="video-count" className="text-right">Video Count</Label>
        <Input id="video-count" type="number" value={videoCount} onChange={(e) => setVideoCount(parseInt(e.target.value, 10))} className="col-span-3 font-mono" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="emby-id" className="text-right">演员ID</Label>
        <Input id="emby-id" value={emby_id} onChange={(e) => setEmbyId(e.target.value)} className="col-span-3 font-mono" />
      </div>
      <Button onClick={handleSubmit}>Save</Button>
    </div>
  );
}
