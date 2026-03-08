import { supabase } from '@/integrations/supabase/client';
import type { FarmSettings } from '@/hooks/useFarmSettings';

let cachedSettings: FarmSettings | null = null;

export async function getFarmSettings(): Promise<FarmSettings | null> {
  if (cachedSettings) return cachedSettings;
  const { data } = await supabase
    .from('farm_settings' as any)
    .select('*')
    .limit(1)
    .single();
  if (data) cachedSettings = data as unknown as FarmSettings;
  return cachedSettings;
}

export function clearFarmSettingsCache() {
  cachedSettings = null;
}
