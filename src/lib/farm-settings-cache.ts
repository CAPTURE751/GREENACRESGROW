import { supabase } from '@/integrations/supabase/client';

export interface FarmSettingsCache {
  farm_name: string;
  location: string;
  slogan: string;
  logo_url: string | null;
}

let cachedSettings: FarmSettingsCache | null = null;

export async function getFarmSettings(): Promise<FarmSettingsCache | null> {
  if (cachedSettings) return cachedSettings;

  // Read from farms table (the active source of truth)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('farms')
    .select('name, location, slogan, logo_url')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (data) {
    cachedSettings = {
      farm_name: data.name,
      location: data.location,
      slogan: data.slogan,
      logo_url: data.logo_url,
    };
  }
  return cachedSettings;
}

export function clearFarmSettingsCache() {
  cachedSettings = null;
}
