import { useState, useEffect } from 'react';
import { type Tier } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTier, updateTier } from '@/app/actions';

interface TierFormProps {
  tier: Tier | null;
  onClose: () => void;
}

export function TierForm({ tier, onClose }: TierFormProps) {
  const [name, setName] = useState('');
  const [videoLimit, setVideoLimit] = useState<number | string>('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (tier) {
      setName(tier.name);
      setVideoLimit(tier.video_limit ?? '');
      setStatus(tier.status);
    } else {
      setName('');
      setVideoLimit('');
      setStatus('active');
    }
  }, [tier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoLimitValue = videoLimit === '' ? null : Number(videoLimit);

    if (tier) {
      await updateTier({ id: tier.id, name, video_limit: videoLimitValue, status });
    } else {
      await createTier({ name, video_limit: videoLimitValue, status });
    }
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
              <Input id="video-limit" type="number" value={videoLimit} onChange={(e) => setVideoLimit(e.target.value)} className="col-span-3 font-mono" placeholder="Leave empty for unlimited" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select onValueChange={setStatus} value={status}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">现役</SelectItem>
                  <SelectItem value="retired">引退</SelectItem>
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
