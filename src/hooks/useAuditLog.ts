import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFarm } from '@/contexts/FarmContext';

export interface AuditEntry {
  id: string;
  farm_id: string | null;
  table_name: string;
  record_id: string | null;
  action: 'insert' | 'update' | 'delete';
  actor_id: string | null;
  actor_name: string | null;
  changed_fields: string[] | null;
  old_data: any;
  new_data: any;
  created_at: string;
}

/** Audit trail for a single record. */
export function useRecordAudit(tableName: string, recordId: string | null | undefined) {
  return useQuery({
    queryKey: ['audit-log', tableName, recordId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('audit_logs' as any).select('*') as any)
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AuditEntry[];
    },
    enabled: !!recordId,
  });
}

/** Recent farm-wide activity. */
export function useFarmAudit(limit = 20) {
  const { activeFarm } = useFarm();
  return useQuery({
    queryKey: ['audit-log', 'farm', activeFarm?.id, limit],
    queryFn: async () => {
      const { data, error } = await (supabase.from('audit_logs' as any).select('*') as any)
        .eq('farm_id', activeFarm!.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as AuditEntry[];
    },
    enabled: !!activeFarm?.id,
  });
}

const HIDDEN_FIELDS = new Set(['id', 'created_at', 'updated_at', 'created_by', 'farm_id']);

export function describeChanges(entry: AuditEntry): { field: string; from: any; to: any }[] {
  if (entry.action !== 'update' || !entry.changed_fields) return [];
  return entry.changed_fields
    .filter((f) => !HIDDEN_FIELDS.has(f))
    .map((f) => ({ field: f, from: entry.old_data?.[f], to: entry.new_data?.[f] }));
}
