import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';

export interface LivestockBirth {
  id: string;
  mother_id: string;
  birth_date: string;
  newborn_count: number;
  notes: string | null;
  farm_id: string | null;
  created_by: string;
  created_at: string;
}

export function useLivestockBirths(motherId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarm } = useFarm();

  const { data: births = [], isLoading } = useQuery({
    queryKey: ['livestock_births', activeFarm?.id, motherId || 'all'],
    queryFn: async () => {
      let q = (supabase as any).from('livestock_births').select('*').order('birth_date', { ascending: false });
      if (activeFarm?.id) q = q.eq('farm_id', activeFarm.id);
      if (motherId) q = q.eq('mother_id', motherId);
      const { data, error } = await q;
      if (error) throw error;
      return data as LivestockBirth[];
    },
    enabled: !!activeFarm,
  });

  const recordBirth = useMutation({
    mutationFn: async (input: {
      mother_id: string;
      birth_date: string;
      newborn_count: number;
      notes?: string | null;
      mother_type: string;
      mother_breed?: string | null;
      farm_location: string;
      tag_prefix?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert birth event
      const { data: birth, error: bErr } = await (supabase as any)
        .from('livestock_births').insert({
          mother_id: input.mother_id,
          birth_date: input.birth_date,
          newborn_count: input.newborn_count,
          notes: input.notes ?? null,
          farm_id: activeFarm?.id,
          created_by: user.id,
        }).select().single();
      if (bErr) throw bErr;

      // Auto-create newborn livestock records
      const rows = Array.from({ length: input.newborn_count }).map((_, i) => ({
        type: input.mother_type,
        breed: input.mother_breed ?? null,
        farm_location: input.farm_location,
        date_of_birth_on_farm: input.birth_date,
        date_of_birth: input.birth_date,
        health_status: 'healthy',
        mother_id: input.mother_id,
        tag_number: input.tag_prefix
          ? `${input.tag_prefix}-${input.birth_date.replace(/-/g, '')}-${i + 1}`
          : null,
        notes: `Born on farm to mother (birth event ${birth.id})`,
        farm_id: activeFarm?.id,
        created_by: user.id,
      }));
      const { error: lErr } = await supabase.from('livestock').insert(rows as any);
      if (lErr) throw lErr;
      return birth;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock_births'] });
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
      toast({ title: 'Birth recorded', description: 'Newborns added to total animals.' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const deleteBirth = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('livestock_births').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock_births'] });
      toast({ title: 'Birth record deleted' });
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`births-${Date.now()}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livestock_births' }, () => {
        queryClient.invalidateQueries({ queryKey: ['livestock_births'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  return {
    births, isLoading,
    recordBirth: recordBirth.mutate, isRecording: recordBirth.isPending,
    deleteBirth: deleteBirth.mutate,
  };
}
