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

interface RecordBirthInput {
  mother_id: string;
  birth_date: string;
  males: number;
  females: number;
  notes?: string | null;
  mother_type: string;
  mother_breed?: string | null;
  farm_location: string;
  mother_tag?: string | null;
  tag_prefix?: string;
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
    mutationFn: async (input: RecordBirthInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const total = (input.males || 0) + (input.females || 0);
      if (total < 1) throw new Error('At least one newborn required');

      // Insert birth event
      const { data: birth, error: bErr } = await (supabase as any)
        .from('livestock_births').insert({
          mother_id: input.mother_id,
          birth_date: input.birth_date,
          newborn_count: total,
          notes: input.notes ?? null,
          farm_id: activeFarm?.id,
          created_by: user.id,
        }).select().single();
      if (bErr) throw bErr;

      // Tag base: prefer mother tag, then prefix, then NB
      const base = (input.mother_tag || input.tag_prefix || 'NB').trim();

      const buildRow = (gender: 'male' | 'female', idx: number) => ({
        type: input.mother_type,
        breed: input.mother_breed ?? null,
        farm_location: input.farm_location,
        date_of_birth_on_farm: input.birth_date,
        date_of_birth: input.birth_date,
        health_status: 'healthy',
        gender,
        mother_id: input.mother_id,
        tag_number: `${base}-${gender === 'male' ? 'M' : 'F'}-${idx}`,
        notes: `Born on farm to mother (birth event ${birth.id})`,
        farm_id: activeFarm?.id,
        created_by: user.id,
      });

      const rows = [
        ...Array.from({ length: input.males }).map((_, i) => buildRow('male', i + 1)),
        ...Array.from({ length: input.females }).map((_, i) => buildRow('female', i + 1)),
      ];
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

  const updateBirth = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<LivestockBirth, 'birth_date' | 'newborn_count' | 'notes'>> }) => {
      const { error } = await (supabase as any).from('livestock_births').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock_births'] });
      toast({ title: 'Birth updated' });
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
