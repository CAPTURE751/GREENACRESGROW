import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';

export interface CapitalInjection {
  id: string;
  amount: number;
  injection_date: string;
  source: string;
  description: string | null;
  notes: string | null;
  created_by: string;
  farm_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CapitalInjectionInsert {
  amount: number;
  injection_date: string;
  source: string;
  description?: string;
  notes?: string;
}

export interface CapitalInjectionUpdate {
  amount?: number;
  injection_date?: string;
  source?: string;
  description?: string;
  notes?: string;
}

export function useCapitalInjections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarm } = useFarm();

  const { data: capitalInjections = [], isLoading, error, refetch } = useQuery({
    queryKey: ['capital_injections', activeFarm?.id],
    queryFn: async () => {
      let query = supabase
        .from('capital_injections' as any)
        .select('*')
        .order('injection_date', { ascending: false });
      if (activeFarm?.id) query = query.eq('farm_id', activeFarm.id);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CapitalInjection[];
    },
    enabled: !!activeFarm,
  });

  const totalCapital = capitalInjections.reduce((sum, ci) => sum + (ci.amount || 0), 0);

  const createInjection = useMutation({
    mutationFn: async (injectionData: CapitalInjectionInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('capital_injections' as any)
        .insert({
          ...injectionData,
          created_by: user.id,
          farm_id: activeFarm?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capital_injections'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-capital'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: "Capital injection recorded", description: "Owner funds have been added to the business." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error recording capital injection", description: error.message });
    },
  });

  const updateInjection = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CapitalInjectionUpdate }) => {
      const { data, error } = await supabase
        .from('capital_injections' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capital_injections'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-capital'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: "Capital injection updated", description: "Record has been updated." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error updating capital injection", description: error.message });
    },
  });

  const deleteInjection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('capital_injections' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capital_injections'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-capital'] });
      toast({ title: "Capital injection deleted", description: "Record has been removed." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error deleting capital injection", description: error.message });
    },
  });

  useEffect(() => {
    const channelName = `capital-injections-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capital_injections' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capital_injections'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    capitalInjections,
    totalCapital,
    isLoading,
    error,
    refetch,
    createInjection: createInjection.mutate,
    updateInjection: updateInjection.mutate,
    deleteInjection: deleteInjection.mutate,
    isCreating: createInjection.isPending,
    isUpdating: updateInjection.isPending,
    isDeleting: deleteInjection.isPending,
  };
}
