'use client';

import { useCallback, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { type Actress, Status, type Tier } from '@/types';
import { ArrowUpDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { ActressForm } from './ActressForm';
import { cn } from '@/lib/utils';

export function ActressTable() {
  const [actresses, setActresses] = useState<Actress[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedActress, setSelectedActress] = useState<Actress | undefined>(undefined);

  const tierMap = new Map(tiers.map((t) => [t.id, t]));

  const fetchActressesAndTiers = useCallback(async () => {
    const tierPromise = fetch('/api/tiers').then(res => res.json());
    
    const actressParams = new URLSearchParams();
    if (statusFilter !== 'all') actressParams.append('status', statusFilter);
    if (tierFilter !== 'all') actressParams.append('tierId', tierFilter);
    actressParams.append('sortBy', sortBy);
    actressParams.append('order', sortOrder);
    const actressPromise = fetch(`/api/actresses?${actressParams.toString()}`).then(res => res.json());

    const [tiersData, actressesData] = await Promise.all([tierPromise, actressPromise]);
    setTiers(tiersData);
    setActresses(actressesData);

  }, [statusFilter, tierFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchActressesAndTiers();
  }, [fetchActressesAndTiers]);

  const isOverloaded = (tierId: number, videoCount: number) => {
    const tier = tierMap.get(tierId);
    if (!tier || tier.video_limit === null) return false;
    return videoCount > tier.video_limit;
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  const filteredActresses = actresses.filter(actress => 
    actress.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    setIsFormOpen(false);
    fetchActressesAndTiers();
  };

  const handleDelete = async (id: number) => {
    const response = await fetch(`/api/actresses/${id}`, { method: 'DELETE' });
    if (response.ok) {
      fetchActressesAndTiers();
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center">
          <Input
            placeholder="Filter by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select onValueChange={(value) => setStatusFilter(value as Status | 'all')} value={statusFilter}>
            <SelectTrigger className="w-[180px] ml-4">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.values(Status).map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => setTierFilter(value as string | 'all')} value={tierFilter}>
            <SelectTrigger className="w-[180px] ml-4">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {tiers.map((tier) => (
                <SelectItem key={tier.id} value={tier.id.toString()}>{tier.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedActress(undefined)}>
              <Plus className="mr-2 h-4 w-4" /> Add Actress
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedActress ? 'Edit Actress' : 'Add Actress'}</DialogTitle>
              <DialogDescription>
                {selectedActress ? 'Update the details of the actress.' : 'Add a new actress to your collection.'}
              </DialogDescription>
            </DialogHeader>
            <ActressForm actress={selectedActress} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Button variant="ghost" onClick={() => handleSort('name')}>Name<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => handleSort('status')}>Status<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => handleSort('tierId')}>Tier<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => handleSort('video_count')}>Video Count<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => handleSort('updated_at')}>Updated At<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredActresses.map((actress) => (
              <TableRow key={actress.id} className={cn(isOverloaded(actress.tierId, actress.video_count) && 'bg-red-100 dark:bg-red-900')}>
                <TableCell>{actress.name}</TableCell>
                <TableCell>{actress.status}</TableCell>
                <TableCell>{tierMap.get(actress.tierId)?.name ?? 'N/A'}</TableCell>
                <TableCell className={cn(isOverloaded(actress.tierId, actress.video_count) && 'text-red-500 font-bold')}>{actress.video_count}</TableCell>
                <TableCell>{new Date(actress.updated_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedActress(actress); setIsFormOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the actress.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(actress.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
