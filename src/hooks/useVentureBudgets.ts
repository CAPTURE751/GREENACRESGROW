import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFarm } from "@/contexts/FarmContext";
import { useToast } from "@/hooks/use-toast";

export interface VentureBudget {
  id: string;
  name: string;
  venture_type: string;
  inputs: any;
  costs_total: number;
  revenue_total: number;
  profit: number;
  ai_advice: string | null;
  created_at: string;
  updated_at: string;
}

export function useVentureBudgets() {
  const { user } = useAuth();
  const { activeFarm } = useFarm();
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["venture-budgets", user?.id, activeFarm?.id],
    queryFn: async () => {
      let q = supabase
        .from("venture_budgets")
        .select("*")
        .order("updated_at", { ascending: false });
      if (activeFarm) q = q.eq("farm_id", activeFarm.id);
      const { data, error } = await q;
      if (error) throw error;
      return data as VentureBudget[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (budget: { id?: string; name: string; venture_type: string; inputs: any; costs_total: number; revenue_total: number; profit: number; ai_advice?: string | null }) => {
      if (budget.id) {
        const { error } = await supabase
          .from("venture_budgets")
          .update({
            name: budget.name,
            venture_type: budget.venture_type,
            inputs: budget.inputs,
            costs_total: budget.costs_total,
            revenue_total: budget.revenue_total,
            profit: budget.profit,
            ai_advice: budget.ai_advice || null,
          })
          .eq("id", budget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("venture_budgets")
          .insert({
            created_by: user!.id,
            farm_id: activeFarm?.id || null,
            name: budget.name,
            venture_type: budget.venture_type,
            inputs: budget.inputs,
            costs_total: budget.costs_total,
            revenue_total: budget.revenue_total,
            profit: budget.profit,
            ai_advice: budget.ai_advice || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venture-budgets"] });
      toast({ title: "Budget saved" });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("venture_budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venture-budgets"] });
      toast({ title: "Budget deleted" });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Delete failed", description: e.message });
    },
  });

  return {
    budgets: query.data || [],
    loading: query.isLoading,
    save: saveMutation.mutateAsync,
    saving: saveMutation.isPending,
    remove: deleteMutation.mutateAsync,
  };
}
