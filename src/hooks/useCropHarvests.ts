import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';

export interface CropHarvest {
  id: string;
  crop_id: string;
  farm_id: string | null;
  harvest_date: string;
  quantity: number;
  unit: string | null;
  quality_grade: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

/**
 * Harvest events for the active farm (optionally narrowed to a single crop).
 * Multiple picks per crop are supported — totals are summed by crop.
 */
export function useCropHarvests(cropId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarm } = useFarm();

  const { data: harvests = [], isLoading, refetch } = useQuery({
    queryKey: ['crop_harvests', activeFarm?.id, cropId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('crop_harvests' as any)
        .select('*')
        .order('harvest_date', { ascending: false });
      if (activeFarm?.id) query = query.eq('farm_id', activeFarm.id);
      if (cropId) query = query.eq('crop_id', cropId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CropHarvest[];
    },
    enabled: !!activeFarm,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['crop_harvests'] });
    queryClient.invalidateQueries({ queryKey: ['crops'] });
  };

  const addHarvest = useMutation({
    mutationFn: async (payload: {
      crop_id: string;
      harvest_date: string;
      quantity: number;
      unit?: string | null;
      quality_grade?: string | null;
      notes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('crop_harvests' as any)
        .insert({ ...payload, created_by: user.id, farm_id: activeFarm?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Harvest recorded', description: 'The harvest event has been saved.' });
    },
    onError: (error: any) =>
      toast({ variant: 'destructive', title: 'Error recording harvest', description: error.message }),
  });

  const updateHarvest = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CropHarvest> }) => {
      const { error } = await supabase.from('crop_harvests' as any).update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Harvest updated' });
    },
    onError: (error: any) =>
      toast({ variant: 'destructive', title: 'Error updating harvest', description: error.message }),
  });

  const deleteHarvest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crop_harvests' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Harvest deleted' });
    },
    onError: (error: any) =>
      toast({ variant: 'destructive', title: 'Error deleting harvest', description: error.message }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`crop-harvests-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crop_harvests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['crop_harvests'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    harvests,
    isLoading,
    refetch,
    addHarvest: addHarvest.mutate,
    updateHarvest: updateHarvest.mutate,
    deleteHarvest: deleteHarvest.mutate,
    isSaving: addHarvest.isPending || updateHarvest.isPending,
  };
}

/** Sum harvest quantities per crop id. */
export function totalsByCrop(harvests: CropHarvest[]) {
  const map = new Map<string, { qty: number; unit: string; events: number }>();
  for (const h of harvests) {
    const entry = map.get(h.crop_id) || { qty: 0, unit: h.unit || '', events: 0 };
    entry.qty += Number(h.quantity) || 0;
    entry.events += 1;
    if (!entry.unit && h.unit) entry.unit = h.unit;
    map.set(h.crop_id, entry);
  }
  return map;
}
