'use client';

import { useState, useEffect } from 'react';
import { Tier, Status } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface TierFormProps {
  tier: Tier | null;
  onClose: () => void;
}

export function TierForm({ tier, onClose }: TierFormProps) {
  const [name, setName] = useState('');
  const [videoLimit, setVideoLimit] = useState<number | string>('');
  const [status, setStatus] = useState<Status>(Status.Active);

  useEffect(() => {
    if (tier) {
      setName(tier.name);
      setVideoLimit(tier.video_limit ?? '');
      setStatus(tier.status);
    } else {
      setName('');
      setVideoLimit('');
      setStatus(Status.Active);
    }
  }, [tier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { 
      name, 
      video_limit: videoLimit === '' ? null : Number(videoLimit), 
      status 
    };
    const url = tier ? `/api/tiers/${tier.id}` : '/api/tiers';
    const method = tier ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tier ? 'Edit Tier' : 'Add Tier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="video-limit" className="text-right">Video Limit</Label>
              <Input id="video-limit" type="number" value={videoLimit} onChange={(e) => setVideoLimit(e.target.value)} className="col-span-3" placeholder="Leave empty for unlimited" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select value={status} onValueChange={(value: Status) => setStatus(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Status).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
