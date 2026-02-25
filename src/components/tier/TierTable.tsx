'use client';

import { useEffect, useState } from 'react';
import { Tier, Status } from '@/types';
import { TierForm } from './TierForm';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

export function TierTable() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

  const fetchTiers = async () => {
    const response = await fetch('/api/tiers');
    const data = await response.json();
    setTiers(data);
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const handleAdd = () => {
    setSelectedTier(null);
    setIsFormOpen(true);
  };

  const handleEdit = (tier: Tier) => {
    setSelectedTier(tier);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this tier?')) {
      await fetch(`/api/tiers/${id}`, { method: 'DELETE' });
      fetchTiers();
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    fetchTiers();
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Tiers</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedTier(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTier ? 'Edit Tier' : 'Add Tier'}</DialogTitle>
              <DialogDescription>
                {selectedTier ? 'Update the details of this tier.' : 'Add a new tier to the system.'}
              </DialogDescription>
            </DialogHeader>
            <TierForm tier={selectedTier} onClose={handleFormClose} />
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Video Limit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((tier) => (
            <TableRow key={tier.id}>
              <TableCell>{tier.name}</TableCell>
              <TableCell>{tier.video_limit ?? 'N/A'}</TableCell>
              <TableCell>{tier.status}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(tier)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(tier.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {isFormOpen && (
        <TierForm tier={selectedTier} onClose={handleFormClose} />
      )}
    </div>
  );
}
