'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Tier } from '@prisma/client';
import { type OptimisticActress } from '@/hooks/useOptimisticActresses';
import { getEmbyIdsByName } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';

interface ActressFormProps {
  actress?: OptimisticActress;
  tiers: Tier[];
  onSave: () => void;
  onCreate: (data: { name: string; video_count: number; tierId: number; emby_id?: string[] }) => Promise<void>;
  onUpdate: (data: { id: number; video_count?: number; tierId?: number; emby_id?: string[] }) => Promise<void>;
}

export function ActressForm({ actress, tiers, onSave, onCreate, onUpdate }: ActressFormProps) {
  const [name, setName] = useState('');
  const [tierId, setTierId] = useState<number | undefined>(undefined);
  const [videoCount, setVideoCount] = useState(0);
  const [embyIds, setEmbyIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (actress) {
      setName(actress.name);
      setTierId(actress.tierId);
      setVideoCount(actress.video_count);
      if (Array.isArray(actress.emby_id)) {
        setEmbyIds(actress.emby_id);
      } else {
        setEmbyIds([]);
      }
    } else {
      // Set default tier when adding a new actress
      if (tiers.length > 0) {
        setTierId(tiers[0].id);
      }
    }
  }, [actress, tiers]);

  const handleSearchEmbyIds = async () => {
    if (!name) {
        toast({ title: '请输入演员姓名', variant: 'destructive' });
        return;
    }
    setIsSearching(true);
    const result = await getEmbyIdsByName(name);
    if (result.success && result.data) {
        if (result.data.length > 0) {
            setEmbyIds(result.data);
            toast({ title: '成功', description: `找到 ${result.data.length} 个 Emby ID。` });
        } else {
            toast({ title: '未找到', description: '在 Emby 中未找到匹配的演员。' });
        }
    } else {
        toast({ title: '错误', description: result.message, variant: 'destructive' });
    }
    setIsSearching(false);
  };

  const handleSubmit = async () => {
    const data = { 
        video_count: videoCount, 
        tierId: tierId!, 
        emby_id: embyIds 
    };
    if (actress) {
      await onUpdate({ id: actress.id, ...data });
    } else {
      await onCreate({ name, ...data });
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
        <div className="col-span-3 flex items-center gap-2">
            <Input id="emby-id" value={embyIds.join(', ')} onChange={(e) => setEmbyIds(e.target.value.split(',').map(s => s.trim()))} className="font-mono" />
            <Button onClick={handleSearchEmbyIds} disabled={isSearching || !name} size="icon" variant="outline">
                <Search className={`h-4 w-4 ${isSearching ? 'animate-spin' : ''}`} />
            </Button>
        </div>
      </div>
      <Button onClick={handleSubmit}>Save</Button>
    </div>
  );
}
