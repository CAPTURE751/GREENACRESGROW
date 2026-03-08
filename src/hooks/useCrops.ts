import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';
import type { Database } from '@/integrations/supabase/types';

type Crop = Database['public']['Tables']['crops']['Row'];
type CropInsert = Database['public']['Tables']['crops']['Insert'];
type CropUpdate = Database['public']['Tables']['crops']['Update'];

export function useCrops() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarm } = useFarm();

  const {
    data: crops = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['crops', activeFarm?.id],
    queryFn: async () => {
      let query = supabase.from('crops').select('*').order('created_at', { ascending: false });
      if (activeFarm?.id) query = query.eq('farm_id', activeFarm.id);
      const { data, error } = await query;
      if (error) throw error;
      return data as Crop[];
    },
    enabled: !!activeFarm,
  });

  const createCrop = useMutation({
    mutationFn: async (cropData: Omit<CropInsert, 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('crops')
        .insert({ ...cropData, created_by: user.id, farm_id: activeFarm?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      toast({ title: "Crop created", description: "New crop has been added successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error creating crop", description: error.message });
    },
  });

  const updateCrop = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CropUpdate }) => {
      const { data, error } = await supabase.from('crops').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      toast({ title: "Crop updated", description: "Crop has been updated successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error updating crop", description: error.message });
    },
  });

  const deleteCrop = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crops').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      toast({ title: "Crop deleted", description: "Crop has been deleted successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error deleting crop", description: error.message });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('crops-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crops' }, () => {
        queryClient.invalidateQueries({ queryKey: ['crops'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    crops, isLoading, error, refetch,
    createCrop: createCrop.mutate, updateCrop: updateCrop.mutate, deleteCrop: deleteCrop.mutate,
    isCreating: createCrop.isPending, isUpdating: updateCrop.isPending, isDeleting: deleteCrop.isPending,
  };
}

export function useCrop(id: string) {
  return useQuery({
    queryKey: ['crop', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('crops').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Crop;
    },
    enabled: !!id,
  });
}
