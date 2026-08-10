import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';

export interface InventoryMovement {
  id: string;
  inventory_id: string;
  farm_id: string | null;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  movement_date: string;
  source: string | null;
  destination: string | null;
  purpose: string | null;
  reason: string | null;
  batch_id: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  linked_module: 'crop' | 'livestock' | 'sale' | 'purchase' | 'equipment' | 'manual' | null;
  linked_record_id: string | null;
  linked_record_name: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface InventoryBatch {
  id: string;
  inventory_id: string;
  farm_id: string | null;
  batch_number: string | null;
  source: string | null;
  expiry_date: string | null;
  received_date: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export function useInventoryMovements(inventoryId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarm } = useFarm();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['inventory_movements', activeFarm?.id, inventoryId],
    queryFn: async () => {
      let q = (supabase as any)
        .from('inventory_movements')
        .select('*')
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (activeFarm?.id) q = q.eq('farm_id', activeFarm.id);
      if (inventoryId) q = q.eq('inventory_id', inventoryId);
      const { data, error } = await q;
      if (error) throw error;
      return data as InventoryMovement[];
    },
    enabled: !!activeFarm,
  });

  const createMovement = useMutation({
    mutationFn: async (m: Partial<InventoryMovement>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const payload: any = {
        ...m,
        created_by: user.id,
        farm_id: activeFarm?.id,
      };
      // Strip nullish unit/total cost for FIFO calc
      const { data, error } = await (supabase as any)
        .from('inventory_movements')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_batches'] });
      toast({ title: 'Movement recorded' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  useEffect(() => {
    const ch = supabase
      .channel(`inv-mov-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_movements' }, () => {
        queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  return {
    movements,
    isLoading,
    createMovement: createMovement.mutate,
    isCreating: createMovement.isPending,
  };
}

export function useInventoryBatches(inventoryId?: string) {
  const { activeFarm } = useFarm();
  return useQuery({
    queryKey: ['inventory_batches', activeFarm?.id, inventoryId],
    queryFn: async () => {
      let q = (supabase as any)
        .from('inventory_batches')
        .select('*')
        .order('received_date', { ascending: true });
      if (activeFarm?.id) q = q.eq('farm_id', activeFarm.id);
      if (inventoryId) q = q.eq('inventory_id', inventoryId);
      const { data, error } = await q;
      if (error) throw error;
      return data as InventoryBatch[];
    },
    enabled: !!activeFarm,
  });
}
