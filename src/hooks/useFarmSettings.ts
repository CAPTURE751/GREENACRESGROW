import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FarmSettings {
  id: string;
  farm_name: string;
  owner_name: string;
  location: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useFarmSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['farm-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farm_settings' as any)
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as FarmSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Pick<FarmSettings, 'farm_name' | 'owner_name' | 'location' | 'logo_url'>>) => {
      const { data, error } = await supabase
        .from('farm_settings' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', query.data?.id as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FarmSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-settings'] });
      toast({ title: 'Settings saved', description: 'Farm settings updated successfully.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  const uploadLogo = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `logo.${ext}`;

    // Remove old logo if exists
    await supabase.storage.from('farm-logo').remove([path]);

    const { error } = await supabase.storage.from('farm-logo').upload(path, file, { upsert: true });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from('farm-logo').getPublicUrl(path);
    return urlData.publicUrl;
  };

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings,
    uploadLogo,
  };
}
