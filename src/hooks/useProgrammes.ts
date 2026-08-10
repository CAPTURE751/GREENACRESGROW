import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';

export interface ProgrammeTemplate {
  id: string;
  name: string;
  description: string | null;
  crop_type: string | null;
  next_crop_family: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface TemplateStage {
  id: string;
  template_id: string;
  name: string;
  day_offset: number;
  task_type: string | null;
  priority: string | null;
  notes: string | null;
  sort_order: number;
}
export interface CropProgramme {
  id: string;
  farm_id: string;
  crop_id: string | null;
  template_id: string | null;
  name: string;
  anchor_stage: string;
  anchor_date: string;
  next_crop_family: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface ProgrammeActivity {
  id: string;
  programme_id: string;
  name: string;
  day_offset: number;
  scheduled_date: string;
  task_type: string | null;
  priority: string | null;
  notes: string | null;
  completed: boolean;
  completed_at: string | null;
  task_id: string | null;
  sort_order: number;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------- TEMPLATES ----------
export function useProgrammeTemplates() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['programme_templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programme_templates' as any)
        .select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ProgrammeTemplate[];
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['template_stages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('template_stages' as any)
        .select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return data as unknown as TemplateStage[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (input: { template: Partial<ProgrammeTemplate>; stages: Partial<TemplateStage>[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: tpl, error } = await supabase.from('programme_templates' as any)
        .insert({ ...input.template, created_by: user.id } as any).select().single();
      if (error) throw error;
      if (input.stages.length) {
        const rows = input.stages.map((s, i) => ({ ...s, template_id: (tpl as any).id, sort_order: i }));
        const { error: e2 } = await supabase.from('template_stages' as any).insert(rows as any);
        if (e2) throw e2;
      }
      return tpl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programme_templates'] });
      qc.invalidateQueries({ queryKey: ['template_stages'] });
      toast({ title: 'Template saved' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates, stages }: { id: string; updates: Partial<ProgrammeTemplate>; stages?: Partial<TemplateStage>[] }) => {
      const { error } = await supabase.from('programme_templates' as any).update(updates as any).eq('id', id);
      if (error) throw error;
      if (stages) {
        await supabase.from('template_stages' as any).delete().eq('template_id', id);
        if (stages.length) {
          const rows = stages.map((s, i) => ({ ...s, template_id: id, sort_order: i }));
          const { error: e2 } = await supabase.from('template_stages' as any).insert(rows as any);
          if (e2) throw e2;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programme_templates'] });
      qc.invalidateQueries({ queryKey: ['template_stages'] });
      toast({ title: 'Template updated' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const removeTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programme_templates' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programme_templates'] });
      toast({ title: 'Template deleted' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  return {
    templates,
    stages,
    isLoading,
    createTemplate: createTemplate.mutateAsync,
    updateTemplate: updateTemplate.mutateAsync,
    removeTemplate: removeTemplate.mutateAsync,
  };
}

// ---------- PROGRAMMES ----------
export function useProgrammes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeFarm } = useFarm();

  const { data: programmes = [], isLoading } = useQuery({
    queryKey: ['crop_programmes', activeFarm?.id],
    queryFn: async () => {
      let q = supabase.from('crop_programmes' as any).select('*').order('created_at', { ascending: false });
      if (activeFarm?.id) q = q.eq('farm_id', activeFarm.id);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as CropProgramme[];
    },
    enabled: !!activeFarm,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['programme_activities', activeFarm?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('programme_activities' as any)
        .select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return data as unknown as ProgrammeActivity[];
    },
    enabled: !!activeFarm,
  });

  // Create programme + auto-create activities + linked tasks
  const createProgramme = useMutation({
    mutationFn: async (input: {
      programme: Partial<CropProgramme>;
      activities: { name: string; day_offset: number; task_type?: string; priority?: string; notes?: string }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!activeFarm?.id) throw new Error('No active farm');

      const { data: prog, error } = await supabase.from('crop_programmes' as any).insert({
        ...input.programme,
        farm_id: activeFarm.id,
        created_by: user.id,
      } as any).select().single();
      if (error) throw error;
      const programme = prog as any as CropProgramme;

      // Create tasks for each activity
      const tasksToInsert = input.activities.map(a => ({
        title: `${programme.name} – ${a.name}`,
        description: a.notes || null,
        task_date: addDays(programme.anchor_date, a.day_offset),
        task_type: a.task_type || 'general',
        priority: a.priority || 'medium',
        farm_id: activeFarm.id,
        created_by: user.id,
        completed: false,
      }));
      let createdTasks: any[] = [];
      if (tasksToInsert.length) {
        const { data: tsk, error: te } = await supabase.from('tasks').insert(tasksToInsert).select();
        if (te) throw te;
        createdTasks = tsk || [];
      }

      // Insert activities with task linkage
      const actRows = input.activities.map((a, i) => ({
        programme_id: programme.id,
        name: a.name,
        day_offset: a.day_offset,
        scheduled_date: addDays(programme.anchor_date, a.day_offset),
        task_type: a.task_type || 'general',
        priority: a.priority || 'medium',
        notes: a.notes || null,
        task_id: createdTasks[i]?.id || null,
        sort_order: i,
      }));
      if (actRows.length) {
        const { error: ae } = await supabase.from('programme_activities' as any).insert(actRows as any);
        if (ae) throw ae;
      }
      return programme;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crop_programmes'] });
      qc.invalidateQueries({ queryKey: ['programme_activities'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Programme created', description: 'Activities and tasks scheduled' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  // Update programme metadata (and optionally regenerate dates from new anchor_date)
  const updateProgramme = useMutation({
    mutationFn: async ({ id, updates, regenerate }: { id: string; updates: Partial<CropProgramme>; regenerate?: boolean }) => {
      const { error } = await supabase.from('crop_programmes' as any).update(updates as any).eq('id', id);
      if (error) throw error;

      if (regenerate && updates.anchor_date) {
        const { data: acts } = await supabase.from('programme_activities' as any)
          .select('*').eq('programme_id', id);
        for (const a of (acts as any as ProgrammeActivity[]) || []) {
          const newDate = addDays(updates.anchor_date as string, a.day_offset);
          await supabase.from('programme_activities' as any)
            .update({ scheduled_date: newDate } as any).eq('id', a.id);
          if (a.task_id) {
            await supabase.from('tasks').update({ task_date: newDate }).eq('id', a.task_id);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crop_programmes'] });
      qc.invalidateQueries({ queryKey: ['programme_activities'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Programme updated' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const removeProgramme = useMutation({
    mutationFn: async (id: string) => {
      // Optionally clean up linked tasks
      const { data: acts } = await supabase.from('programme_activities' as any)
        .select('task_id').eq('programme_id', id);
      const taskIds = ((acts as any[]) || []).map(a => a.task_id).filter(Boolean);
      if (taskIds.length) await supabase.from('tasks').delete().in('id', taskIds);
      const { error } = await supabase.from('crop_programmes' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crop_programmes'] });
      qc.invalidateQueries({ queryKey: ['programme_activities'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Programme deleted' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  // Toggle activity completion (also updates linked task)
  const toggleActivity = useMutation({
    mutationFn: async ({ activity, completed }: { activity: ProgrammeActivity; completed: boolean }) => {
      const { error } = await supabase.from('programme_activities' as any).update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      } as any).eq('id', activity.id);
      if (error) throw error;
      if (activity.task_id) {
        await supabase.from('tasks').update({
          completed,
          status: completed ? 'completed' : 'planned',
        }).eq('id', activity.task_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programme_activities'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  useEffect(() => {
    const ch = supabase.channel(`programmes-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crop_programmes' },
        () => qc.invalidateQueries({ queryKey: ['crop_programmes'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programme_activities' },
        () => qc.invalidateQueries({ queryKey: ['programme_activities'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return {
    programmes,
    activities,
    isLoading,
    createProgramme: createProgramme.mutateAsync,
    updateProgramme: updateProgramme.mutateAsync,
    removeProgramme: removeProgramme.mutateAsync,
    toggleActivity: toggleActivity.mutateAsync,
  };
}
