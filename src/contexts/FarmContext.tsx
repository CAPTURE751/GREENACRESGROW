import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { clearFarmSettingsCache } from '@/lib/farm-settings-cache';

export interface Farm {
  id: string;
  name: string;
  location: string;
  slogan: string;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface FarmContextType {
  farms: Farm[];
  activeFarm: Farm | null;
  setActiveFarmId: (id: string) => void;
  loading: boolean;
  refetchFarms: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

const ACTIVE_FARM_KEY = 'active_farm_id';

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmIdState] = useState<string | null>(
    localStorage.getItem(ACTIVE_FARM_KEY)
  );
  const [loading, setLoading] = useState(true);

  const fetchFarms = async () => {
    if (!user) {
      setFarms([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('farms' as any)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching farms:', error);
      setLoading(false);
      return;
    }

    const farmList = (data || []) as unknown as Farm[];
    setFarms(farmList);

    // If no farms exist, create a default one
    if (farmList.length === 0 && user) {
      const { data: newFarm, error: createError } = await supabase
        .from('farms' as any)
        .insert({
          name: 'My Farm',
          location: '',
          slogan: '',
          owner_id: user.id,
        } as any)
        .select()
        .single();

      if (!createError && newFarm) {
        const farm = newFarm as unknown as Farm;
        setFarms([farm]);
        setActiveFarmIdState(farm.id);
        localStorage.setItem(ACTIVE_FARM_KEY, farm.id);
      }
    } else if (!activeFarmId || !farmList.find(f => f.id === activeFarmId)) {
      // Set first farm as active if current active is invalid
      if (farmList.length > 0) {
        setActiveFarmIdState(farmList[0].id);
        localStorage.setItem(ACTIVE_FARM_KEY, farmList[0].id);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFarms();
  }, [user]);

  const setActiveFarmId = (id: string) => {
    setActiveFarmIdState(id);
    localStorage.setItem(ACTIVE_FARM_KEY, id);
    clearFarmSettingsCache();
    // Invalidate all data queries when switching farms
    queryClient.invalidateQueries();
  };

  const activeFarm = farms.find(f => f.id === activeFarmId) || farms[0] || null;

  return (
    <FarmContext.Provider value={{
      farms,
      activeFarm,
      setActiveFarmId,
      loading,
      refetchFarms: fetchFarms,
    }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (context === undefined) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
}
