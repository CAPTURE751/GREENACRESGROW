import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TaskNotification {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export function useTaskNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["task-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as TaskNotification[];
    },
    enabled: !!user,
    refetchInterval: 60000, // Poll every minute
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("task_notifications")
        .update({ read: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-notifications"] }),
  });

  const unreadCount = (query.data || []).filter((n) => !n.read).length;

  return {
    notifications: query.data || [],
    loading: query.isLoading,
    unreadCount,
    markRead: markRead.mutateAsync,
    markAllRead: markAllRead.mutateAsync,
  };
}
