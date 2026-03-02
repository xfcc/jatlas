'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { type Tier } from '@prisma/client';
import { ArrowUpDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { ActressForm } from './ActressForm';
import { cn } from '@/lib/utils';
import { useOptimisticActresses, type OptimisticActress } from '@/hooks/useOptimisticActresses';

interface ActressTableProps {
  actresses: OptimisticActress[];
  tiers: Tier[];
}

export function ActressTable({ actresses: initialActresses, tiers }: ActressTableProps) {
  const { optimisticActresses, handleCreateActress, handleUpdateActress, handleDeleteActress } = useOptimisticActresses(initialActresses);

  const [tierFilter, setTierFilter] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedActress, setSelectedActress] = useState<OptimisticActress | undefined>(undefined);

  const tierMap = new Map(tiers.map((t) => [t.id, t]));

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
  
  const sortedAndFilteredActresses = optimisticActresses
    .filter(actress => 
        (tierFilter === 'all' || actress.tierId === Number(tierFilter)) &&
        actress.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
        const aValue = a[sortBy as keyof OptimisticActress];
        const bValue = b[sortBy as keyof OptimisticActress];
        
        if (aValue === bValue) return 0;
        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

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
            <ActressForm 
              actress={selectedActress} 
              tiers={tiers}
              onSave={() => setIsFormOpen(false)}
              onCreate={handleCreateActress}
              onUpdate={handleUpdateActress} 
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Button variant="ghost" onClick={() => handleSort('name')}>Name<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>

              <TableHead><Button variant="ghost" onClick={() => handleSort('tierId')}>Tier<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => handleSort('video_count')}>Video Count<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => handleSort('updated_at')}>Updated At<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredActresses.map((actress) => (
              <TableRow key={actress.id} className={cn(isOverloaded(actress.tierId, actress.video_count) && 'bg-red-100 dark:bg-red-900', actress.pending && 'opacity-50')}>
                <TableCell>{actress.name}</TableCell>

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
                        <AlertDialogAction onClick={() => handleDeleteActress(actress.id)}>Delete</AlertDialogAction>
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
