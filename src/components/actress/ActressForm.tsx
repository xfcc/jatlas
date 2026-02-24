'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Actress, Status, Tier } from '@/types';

interface ActressFormProps {
  actress?: Actress;
  onSave: () => void;
}

const activeTiers = [Tier.Infinite, Tier.Premium, Tier.Impression];
const retiredTiers = [Tier.Honor, Tier.Fame, Tier.Classic, Tier.Archive, Tier.Opus];

export function ActressForm({ actress, onSave }: ActressFormProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>(Status.Active);
  const [tier, setTier] = useState<Tier>(Tier.Impression);
  const [videoCount, setVideoCount] = useState(0);
  const [externalId, setExternalId] = useState('');
  const [tierOptions, setTierOptions] = useState(activeTiers);

  useEffect(() => {
    if (actress) {
      setName(actress.name);
      setStatus(actress.status);
      setTier(actress.tier);
      setVideoCount(actress.video_count);
      setExternalId(actress.external_id || '');
    }
  }, [actress]);

  useEffect(() => {
    if (status === Status.Active) {
      setTierOptions(activeTiers);
      if (!activeTiers.includes(tier)) {
        setTier(activeTiers[0]);
      }
    } else {
      setTierOptions(retiredTiers);
      if (!retiredTiers.includes(tier)) {
        setTier(retiredTiers[0]);
      }
    }
  }, [status, tier]);

  const handleSubmit = async () => {
    const data = { name, status, tier, video_count: videoCount, external_id: externalId };
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

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="status" className="text-right">Status</Label>
        <Select onValueChange={(value) => setStatus(value as Status)} value={status}>
          <SelectTrigger className="col-span-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(Status).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="tier" className="text-right">Tier</Label>
        <Select onValueChange={(value) => setTier(value as Tier)} value={tier}>
          <SelectTrigger className="col-span-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tierOptions.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
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
