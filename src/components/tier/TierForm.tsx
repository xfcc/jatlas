'use client';

import { useState, useEffect } from 'react';
import { type Tier } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
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
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="tier-name" className="text-right text-zinc-400">
            梯队名称
          </Label>
          <Input
            id="tier-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-3 border-zinc-800 bg-zinc-900/50 text-zinc-200"
            placeholder="例如：T1 核心"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="tier-video-limit" className="text-right text-zinc-400">
            影片上限
          </Label>
          <Input
            id="tier-video-limit"
            type="number"
            min={0}
            value={videoLimit}
            onChange={(e) => setVideoLimit(e.target.value)}
            className="col-span-3 border-zinc-800 bg-zinc-900/50 font-mono text-zinc-200"
            placeholder="留空表示无上限"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="tier-status" className="text-right text-zinc-400">
            通道
          </Label>
          <Select onValueChange={setStatus} value={status}>
            <SelectTrigger id="tier-status" className="col-span-3 border-zinc-800 bg-zinc-900/50 text-zinc-200">
              <SelectValue placeholder="选择通道" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">现役</SelectItem>
              <SelectItem value="retired">引退</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <DialogClose asChild>
          <Button type="button" variant="outline" className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
            取消
          </Button>
        </DialogClose>
        <Button type="submit" className="bg-zinc-100 text-zinc-950 hover:bg-white">
          保存
        </Button>
      </DialogFooter>
    </form>
  );
}
