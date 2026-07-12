import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/contexts/FarmContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Disbursement {
  id: string;
  farm_id: string;
  created_by: string;
  source_kind: string;
  source_id: string | null;
  source_name: string;
  category: string;
  recipient: string;
  amount: number;
  disbursed_on: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NewDisbursement = Omit<
  Disbursement,
  "id" | "created_at" | "updated_at" | "farm_id" | "created_by"
>;

export function useDisbursements() {
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!activeFarm) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profit_disbursements" as any)
      .select("*")
      .eq("farm_id", activeFarm.id)
      .order("disbursed_on", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Load failed", description: error.message });
    } else {
      setItems((data || []) as unknown as Disbursement[]);
    }
    setLoading(false);
  }, [activeFarm, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const create = async (payload: NewDisbursement) => {
    if (!activeFarm || !user) {
      toast({ variant: "destructive", title: "No active farm" });
      return null;
    }
    const { data, error } = await supabase
      .from("profit_disbursements" as any)
      .insert([{ ...payload, farm_id: activeFarm.id, created_by: user.id }])
      .select()
      .single();
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
      return null;
    }
    toast({ title: "Disbursement recorded", description: `${payload.recipient} · ${payload.category}` });
    await fetchItems();
    return data as unknown as Disbursement;
  };

  const update = async (id: string, payload: Partial<NewDisbursement>) => {
    const { data, error } = await supabase
      .from("profit_disbursements" as any)
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
      return null;
    }
    toast({ title: "Disbursement updated" });
    await fetchItems();
    return data as unknown as Disbursement;
  };

  const createMany = async (payloads: NewDisbursement[]) => {
    if (!activeFarm || !user) {
      toast({ variant: "destructive", title: "No active farm" });
      return null;
    }
    if (payloads.length === 0) return [];
    const rows = payloads.map((p) => ({ ...p, farm_id: activeFarm.id, created_by: user.id }));
    const { data, error } = await supabase
      .from("profit_disbursements" as any)
      .insert(rows)
      .select();
    if (error) {
      toast({ variant: "destructive", title: "Bulk disbursement failed", description: error.message });
      return null;
    }
    toast({ title: "Bulk disbursement recorded", description: `${payloads.length} record(s) created` });
    await fetchItems();
    return data as unknown as Disbursement[];
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("profit_disbursements" as any).delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
      return;
    }
    toast({ title: "Disbursement removed" });
    await fetchItems();
  };

  return { items, loading, create, createMany, update, remove, refetch: fetchItems };
}
