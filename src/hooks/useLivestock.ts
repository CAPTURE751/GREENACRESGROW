import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';
import type { Database } from '@/integrations/supabase/types';

type Livestock = Database['public']['Tables']['livestock']['Row'];
type LivestockInsert = Database['public']['Tables']['livestock']['Insert'];
type LivestockUpdate = Database['public']['Tables']['livestock']['Update'];

export function useLivestock() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarm } = useFarm();

  const { data: livestock = [], isLoading, error, refetch } = useQuery({
    queryKey: ['livestock', activeFarm?.id],
    queryFn: async () => {
      let query = supabase.from('livestock').select('*').order('created_at', { ascending: false });
      if (activeFarm?.id) query = query.eq('farm_id', activeFarm.id);
      const { data, error } = await query;
      if (error) throw error;
      return data as Livestock[];
    },
    enabled: !!activeFarm,
  });

  const createLivestock = useMutation({
    mutationFn: async (livestockData: Omit<LivestockInsert, 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('livestock')
        .insert({ ...livestockData, created_by: user.id, farm_id: activeFarm?.id } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
      toast({ title: "Livestock created", description: "New livestock has been added successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error creating livestock", description: error.message });
    },
  });

  const updateLivestock = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LivestockUpdate }) => {
      const { data, error } = await supabase.from('livestock').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
      toast({ title: "Livestock updated", description: "Livestock has been updated successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error updating livestock", description: error.message });
    },
  });

  const deleteLivestock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('livestock').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
      toast({ title: "Livestock deleted", description: "Livestock has been deleted successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error deleting livestock", description: error.message });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('livestock-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livestock' }, () => {
        queryClient.invalidateQueries({ queryKey: ['livestock'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    livestock, isLoading, error, refetch,
    createLivestock: createLivestock.mutate, updateLivestock: updateLivestock.mutate, deleteLivestock: deleteLivestock.mutate,
    isCreating: createLivestock.isPending, isUpdating: updateLivestock.isPending, isDeleting: deleteLivestock.isPending,
  };
}

export function useLivestockItem(id: string) {
  return useQuery({
    queryKey: ['livestock', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('livestock').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Livestock;
    },
    enabled: !!id,
  });
}
