import { supabase } from '@/integrations/supabase/client';

export interface FarmSettingsCache {
  farm_name: string;
  location: string;
  slogan: string;
  logo_url: string | null;
}

let cachedSettings: FarmSettingsCache | null = null;
let cachedFarmId: string | null = null;

export async function getFarmSettings(): Promise<FarmSettingsCache | null> {
  // Get active farm ID from localStorage (set by FarmContext)
  const activeFarmId = localStorage.getItem('active_farm_id');

  // Return cache if it's for the same farm
  if (cachedSettings && cachedFarmId === activeFarmId) return cachedSettings;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from('farms')
    .select('id, name, location, slogan, logo_url');

  if (activeFarmId) {
    query = query.eq('id', activeFarmId);
  } else {
    query = query.order('created_at', { ascending: true }).limit(1);
  }

  const { data } = await query.single();

  if (data) {
    cachedFarmId = data.id;
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
  cachedFarmId = null;
}
