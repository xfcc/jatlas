'use client';

import { useState, useEffect } from 'react';
import { Tier } from '@/types';
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { 
      name, 
      video_limit: videoLimit === '' ? null : Number(videoLimit)

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
