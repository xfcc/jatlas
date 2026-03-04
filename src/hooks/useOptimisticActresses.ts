'use client';

import { useOptimistic } from 'react';
import { type Actress, type Tier } from '@prisma/client';
import { createActress, updateActress, deleteActress } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

// Define a more specific type for our optimistic updates
export type OptimisticActress = Actress & { pending?: boolean; tier?: Tier };

type Action =
  | { type: 'add'; actress: OptimisticActress }
  | { type: 'update'; actress: Partial<OptimisticActress> & { id: number } }
  | { type: 'delete'; id: number };

export function useOptimisticActresses(actresses: OptimisticActress[], tiers: Tier[]) {
  const { toast } = useToast();
  const [optimisticActresses, setOptimisticActresses] = useOptimistic<OptimisticActress[], Action>(
    actresses,
    (state, action) => {
      switch (action.type) {
        case 'add':
          // Add the new actress to the list with a pending flag
          return [...state, { ...action.actress, pending: true }];
        case 'update':
          // Find and update the actress in the list
          return state.map(a =>
            a.id === action.actress.id ? { ...a, ...action.actress, pending: true } : a
          );
        case 'delete':
          // Filter out the deleted actress
          return state.filter(a => a.id !== action.id);
        default:
          return state;
      }
    }
  );

  const handleCreateActress = async (data: { name: string; video_count: number; tierId: number }) => {
    const tier = tiers.find(t => t.id === data.tierId);
    const newActress: OptimisticActress = {
      id: Math.random(), // Temporary ID for the key
      name: data.name,
      video_count: data.video_count,
      tierId: data.tierId,
      external_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      pending: true,
      tier,
    };
    setOptimisticActresses({ type: 'add', actress: newActress });
    try {
      await createActress(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: '数据同步失败，状态已回滚',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateActress = async (data: { id: number; video_count?: number; tierId?: number }) => {
    setOptimisticActresses({ type: 'update', actress: data });
    try {
      await updateActress(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: '数据同步失败，状态已回滚',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteActress = async (id: number) => {
    setOptimisticActresses({ type: 'delete', id });
    try {
      await deleteActress(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: '数据同步失败，状态已回滚',
        variant: 'destructive',
      });
    }
  };

  return { optimisticActresses, handleCreateActress, handleUpdateActress, handleDeleteActress };
}
