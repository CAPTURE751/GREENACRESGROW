import { supabase } from '@/integrations/supabase/client';

const TABLES = [
  'crops', 'livestock', 'livestock_batches', 'livestock_births',
  'inventory', 'inventory_batches', 'inventory_movements',
  'purchases', 'sales', 'equipment', 'equipment_maintenance',
  'tasks', 'notebook_notes', 'capital_injections',
  'season_challenges', 'venture_budgets',
] as const;

export interface FarmBackup {
  version: 1;
  exported_at: string;
  farm_id: string;
  farm: any;
  data: Record<string, any[]>;
}

export async function exportFarmData(farmId: string): Promise<FarmBackup> {
  const { data: farm } = await (supabase as any).from('farms').select('*').eq('id', farmId).single();
  const data: Record<string, any[]> = {};
  for (const t of TABLES) {
    const { data: rows, error } = await (supabase as any).from(t).select('*').eq('farm_id', farmId);
    if (error) {
      console.warn(`Skip ${t}:`, error.message);
      data[t] = [];
    } else {
      data[t] = rows || [];
    }
  }
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    farm_id: farmId,
    farm,
    data,
  };
}

export function downloadBackup(backup: FarmBackup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `farm-backup-${backup.farm?.name || 'farm'}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFarmData(file: File, targetFarmId: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON');
  }

  // Lenient: accept { version, data: {...} }, { data: {...} }, or a flat object of table arrays
  let data: Record<string, any[]> | null = null;
  if (parsed?.data && typeof parsed.data === 'object') {
    data = parsed.data;
  } else if (parsed && typeof parsed === 'object') {
    const maybe: Record<string, any[]> = {};
    for (const t of TABLES) if (Array.isArray(parsed[t])) maybe[t] = parsed[t];
    if (Object.keys(maybe).length > 0) data = maybe;
  }
  if (!data) throw new Error('Unrecognized backup format. Expected a JSON file exported from Farm Backup.');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let imported = 0; let skipped = 0; const errors: string[] = [];

  const sanitize = (row: any) => {
    const { created_at, updated_at, last_updated, total_amount, total_cost, ...rest } = row;
    return { ...rest, farm_id: targetFarmId, created_by: user.id };
  };

  for (const table of TABLES) {
    const rows = Array.isArray(data[table]) ? data[table] : [];
    if (rows.length === 0) continue;
    const payload = rows.map(sanitize);
    // Upsert so duplicates (same id) are skipped, not overwritten
    const { error } = await (supabase as any)
      .from(table)
      .upsert(payload, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      // Fallback: drop ids and insert fresh copies so the rest still imports
      const stripped = payload.map(({ id, ...r }: any) => r);
      const ins = await (supabase as any).from(table).insert(stripped);
      if (ins.error) {
        errors.push(`${table}: ${ins.error.message}`);
        skipped += rows.length;
      } else {
        imported += rows.length;
      }
    } else {
      imported += rows.length;
    }
  }

  return { imported, skipped, errors };
}
