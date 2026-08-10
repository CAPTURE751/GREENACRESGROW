import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';

export interface NotebookNote {
  id: string;
  farm_id: string | null;
  crop_id: string | null;
  title: string;
  content: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SeasonChallenge {
  id: string;
  farm_id: string | null;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'in_progress' | 'resolved';
  season: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useNotebookNotes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeFarm } = useFarm();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notebook_notes', activeFarm?.id],
    queryFn: async () => {
      let q = supabase.from('notebook_notes' as any).select('*').order('updated_at', { ascending: false });
      if (activeFarm?.id) q = q.eq('farm_id', activeFarm.id);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as NotebookNote[];
    },
    enabled: !!activeFarm,
  });

  const create = useMutation({
    mutationFn: async (input: { title: string; content?: string; crop_id?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('notebook_notes' as any).insert({
        ...input, created_by: user.id, farm_id: activeFarm?.id,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notebook_notes'] }); toast({ title: 'Note saved' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NotebookNote> }) => {
      const { error } = await supabase.from('notebook_notes' as any).update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notebook_notes'] }); toast({ title: 'Note updated' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notebook_notes' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notebook_notes'] }); toast({ title: 'Note deleted' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  useEffect(() => {
    const ch = supabase.channel(`notebook-notes-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notebook_notes' },
        () => qc.invalidateQueries({ queryKey: ['notebook_notes'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return { notes, isLoading, create: create.mutateAsync, update: update.mutateAsync, remove: remove.mutateAsync };
}

export function useSeasonChallenges() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeFarm } = useFarm();

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['season_challenges', activeFarm?.id],
    queryFn: async () => {
      let q = supabase.from('season_challenges' as any).select('*').order('created_at', { ascending: false });
      if (activeFarm?.id) q = q.eq('farm_id', activeFarm.id);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as SeasonChallenge[];
    },
    enabled: !!activeFarm,
  });

  const create = useMutation({
    mutationFn: async (input: Partial<SeasonChallenge>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('season_challenges' as any).insert({
        ...input, created_by: user.id, farm_id: activeFarm?.id,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['season_challenges'] }); toast({ title: 'Challenge reported' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SeasonChallenge> }) => {
      const { error } = await supabase.from('season_challenges' as any).update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['season_challenges'] }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('season_challenges' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['season_challenges'] }); toast({ title: 'Deleted' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  useEffect(() => {
    const ch = supabase.channel(`season-challenges-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'season_challenges' },
        () => qc.invalidateQueries({ queryKey: ['season_challenges'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return { challenges, isLoading, create: create.mutateAsync, update: update.mutateAsync, remove: remove.mutateAsync };
}
