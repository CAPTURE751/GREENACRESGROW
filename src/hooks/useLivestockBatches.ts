import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';

export interface LivestockBatch {
  id: string;
  batch_id: string;
  animal_type: string;
  breed: string | null;
  initial_quantity: number;
  current_quantity: number;
  mortality_count: number;
  feed_consumed: number;
  feed_unit: string | null;
  arrival_date: string;
  source: string | null;
  notes: string | null;
  farm_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useLivestockBatches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarm } = useFarm();

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['livestock_batches', activeFarm?.id],
    queryFn: async () => {
      let q = (supabase as any).from('livestock_batches').select('*').order('arrival_date', { ascending: false });
      if (activeFarm?.id) q = q.eq('farm_id', activeFarm.id);
      const { data, error } = await q;
      if (error) throw error;
      return data as LivestockBatch[];
    },
    enabled: !!activeFarm,
  });

  const createBatch = useMutation({
    mutationFn: async (b: Partial<LivestockBatch>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const payload: any = {
        ...b,
        current_quantity: b.current_quantity ?? b.initial_quantity ?? 0,
        mortality_count: b.mortality_count ?? 0,
        created_by: user.id,
        farm_id: activeFarm?.id,
      };
      const { data, error } = await (supabase as any).from('livestock_batches').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock_batches'] });
      toast({ title: 'Batch added' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const recordMortality = useMutation({
    mutationFn: async ({ id, count }: { id: string; count: number }) => {
      const batch = batches.find((b) => b.id === id);
      if (!batch) throw new Error('Batch not found');
      const newMortality = (batch.mortality_count || 0) + count;
      const newCurrent = Math.max((batch.current_quantity || 0) - count, 0);
      const { error } = await (supabase as any).from('livestock_batches')
        .update({ mortality_count: newMortality, current_quantity: newCurrent, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock_batches'] });
      toast({ title: 'Mortality recorded' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const recordFeed = useMutation({
    mutationFn: async ({ id, amount, unit }: { id: string; amount: number; unit?: string }) => {
      const batch = batches.find((b) => b.id === id);
      if (!batch) throw new Error('Batch not found');
      const newTotal = (batch.feed_consumed || 0) + amount;
      const { error } = await (supabase as any).from('livestock_batches')
        .update({ feed_consumed: newTotal, feed_unit: unit || batch.feed_unit || 'kg', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock_batches'] });
      toast({ title: 'Feed recorded' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const updateBatch = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LivestockBatch> }) => {
      const { error } = await (supabase as any).from('livestock_batches')
        .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock_batches'] });
      toast({ title: 'Batch updated' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const deleteBatch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('livestock_batches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock_batches'] });
      toast({ title: 'Batch deleted' });
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`ls-batches-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livestock_batches' }, () => {
        queryClient.invalidateQueries({ queryKey: ['livestock_batches'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  return {
    batches, isLoading,
    createBatch: createBatch.mutate, isCreating: createBatch.isPending,
    updateBatch: updateBatch.mutate, isUpdating: updateBatch.isPending,
    recordMortality: recordMortality.mutate,
    recordFeed: recordFeed.mutate,
    deleteBatch: deleteBatch.mutate,
  };
}
