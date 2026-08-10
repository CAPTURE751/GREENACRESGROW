import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';

export interface MaintenanceLog {
  id: string;
  equipment_id: string;
  farm_id: string | null;
  log_type: 'service' | 'fuel' | 'usage' | string;
  log_date: string;
  description: string | null;
  performed_by: string | null;
  cost: number | null;
  fuel_litres: number | null;
  hours_used: number | null;
  next_service_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export function useEquipmentMaintenance(equipmentId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarm } = useFarm();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['equipment_maintenance', activeFarm?.id, equipmentId],
    queryFn: async () => {
      let q = (supabase as any).from('equipment_maintenance').select('*').order('log_date', { ascending: false });
      if (activeFarm?.id) q = q.eq('farm_id', activeFarm.id);
      if (equipmentId) q = q.eq('equipment_id', equipmentId);
      const { data, error } = await q;
      if (error) throw error;
      return data as MaintenanceLog[];
    },
    enabled: !!activeFarm,
  });

  const createLog = useMutation({
    mutationFn: async (m: Partial<MaintenanceLog>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any).from('equipment_maintenance').insert({
        ...m,
        created_by: user.id,
        farm_id: activeFarm?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment_maintenance'] });
      toast({ title: 'Log added' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('equipment_maintenance').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment_maintenance'] });
      toast({ title: 'Log removed' });
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`equip-maint-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_maintenance' }, () => {
        queryClient.invalidateQueries({ queryKey: ['equipment_maintenance'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  return {
    logs, isLoading,
    createLog: createLog.mutate, isCreating: createLog.isPending,
    deleteLog: deleteLog.mutate,
  };
}
