import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';
import type { Database } from '@/integrations/supabase/types';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type EquipmentInsert = Database['public']['Tables']['equipment']['Insert'];
type EquipmentUpdate = Database['public']['Tables']['equipment']['Update'];

export function useEquipment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarm } = useFarm();

  const { data: equipment = [], isLoading, error, refetch } = useQuery({
    queryKey: ['equipment', activeFarm?.id],
    queryFn: async () => {
      let query = supabase.from('equipment').select('*').order('created_at', { ascending: false });
      if (activeFarm?.id) query = query.eq('farm_id', activeFarm.id);
      const { data, error } = await query;
      if (error) throw error;
      return data as Equipment[];
    },
    enabled: !!activeFarm,
  });

  const createEquipment = useMutation({
    mutationFn: async (eqData: Omit<EquipmentInsert, 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('equipment')
        .insert({ ...eqData, created_by: user.id, farm_id: activeFarm?.id } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast({ title: "Equipment added", description: "New equipment has been added successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error adding equipment", description: error.message });
    },
  });

  const updateEquipment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EquipmentUpdate }) => {
      const { data, error } = await supabase.from('equipment').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast({ title: "Equipment updated", description: "Equipment has been updated successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error updating equipment", description: error.message });
    },
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast({ title: "Equipment deleted", description: "Equipment has been deleted successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error deleting equipment", description: error.message });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('equipment-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, () => {
        queryClient.invalidateQueries({ queryKey: ['equipment'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    equipment, isLoading, error, refetch,
    createEquipment: createEquipment.mutate, updateEquipment: updateEquipment.mutate, deleteEquipment: deleteEquipment.mutate,
    isCreating: createEquipment.isPending, isUpdating: updateEquipment.isPending, isDeleting: deleteEquipment.isPending,
  };
}
