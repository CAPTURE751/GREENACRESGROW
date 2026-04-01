import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/contexts/FarmContext';
import type { Database } from '@/integrations/supabase/types';

type Sale = Database['public']['Tables']['sales']['Row'];
type SaleInsert = Database['public']['Tables']['sales']['Insert'];
type SaleUpdate = Database['public']['Tables']['sales']['Update'];

export function useSales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarm } = useFarm();

  const { data: sales = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sales', activeFarm?.id],
    queryFn: async () => {
      let query = supabase.from('sales').select('*').order('sale_date', { ascending: false });
      if (activeFarm?.id) query = query.eq('farm_id', activeFarm.id);
      const { data, error } = await query;
      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!activeFarm,
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['sales', 'analytics', activeFarm?.id],
    queryFn: async () => {
      let query = supabase.from('sales').select('total_amount, sale_date, product_type, payment_status');
      if (activeFarm?.id) query = query.eq('farm_id', activeFarm.id);
      const { data, error } = await query;
      if (error) throw error;
      const totalRevenue = data.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      const pendingPayments = data.filter(sale => sale.payment_status === 'pending').length;
      const completedSales = data.filter(sale => sale.payment_status === 'paid').length;
      return { totalRevenue, pendingPayments, completedSales, totalSales: data.length };
    },
    enabled: !!activeFarm,
  });

  const createSale = useMutation({
    mutationFn: async (saleData: Omit<SaleInsert, 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { total_amount, ...rest } = saleData as any;
      const { data, error } = await supabase
        .from('sales')
        .insert({ ...rest, created_by: user.id, farm_id: activeFarm?.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: "Sale recorded", description: "New sale has been recorded successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error recording sale", description: error.message });
    },
  });

  const updateSale = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SaleUpdate }) => {
      const { data, error } = await supabase
        .from('sales')
        .update({ ...updates, total_amount: updates.quantity && updates.unit_price ? updates.quantity * updates.unit_price : undefined })
        .eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: "Sale updated", description: "Sale has been updated successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error updating sale", description: error.message });
    },
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: "Sale deleted", description: "Sale has been deleted successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error deleting sale", description: error.message });
    },
  });

  useEffect(() => {
    const channelName = `sales-changes-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        queryClient.invalidateQueries({ queryKey: ['sales'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    sales, analytics, isLoading, isLoadingAnalytics, error, refetch,
    createSale: createSale.mutate, updateSale: updateSale.mutate, deleteSale: deleteSale.mutate,
    isCreating: createSale.isPending, isUpdating: updateSale.isPending, isDeleting: deleteSale.isPending,
  };
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Sale;
    },
    enabled: !!id,
  });
}
