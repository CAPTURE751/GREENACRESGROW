import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFarm } from "@/contexts/FarmContext";

export interface Task {
  id: string;
  title: string;
  description?: string;
  task_date: string;
  task_type: 'crop' | 'livestock' | 'maintenance' | 'harvest';
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useTasks = () => {
  const { toast } = useToast();
  const { activeFarm } = useFarm();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', activeFarm?.id],
    queryFn: async () => {
      let query = supabase.from('tasks').select('*').order('task_date', { ascending: true });
      if (activeFarm?.id) query = query.eq('farm_id', activeFarm.id);
      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!activeFarm,
  });

  return { tasks, isLoading, error };
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeFarm } = useFarm();

  return useMutation({
    mutationFn: async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, created_by: user.id, farm_id: activeFarm?.id } as any])
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Success", description: "Task created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create task: ${error.message}`, variant: "destructive" });
    }
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Success", description: "Task updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update task: ${error.message}`, variant: "destructive" });
    }
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Success", description: "Task deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete task: ${error.message}`, variant: "destructive" });
    }
  });
};
