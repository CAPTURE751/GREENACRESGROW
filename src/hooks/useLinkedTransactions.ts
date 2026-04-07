import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFarm } from '@/contexts/FarmContext';

export interface LinkedTransaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  status: string;
  category: string;
  originalData: any;
}

export function useLinkedTransactions(module: 'crop' | 'livestock', recordId: string | null) {
  const { activeFarm } = useFarm();

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['linked-sales', module, recordId, activeFarm?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('sales')
        .select('*') as any)
        .eq('linked_module', module)
        .eq('linked_record_id', recordId!)
        .order('sale_date', { ascending: false })
        .eq('farm_id', activeFarm?.id || '');
      if (error) throw error;
      return data || [];
    },
    enabled: !!recordId && !!activeFarm,
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ['linked-purchases', module, recordId, activeFarm?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('purchases')
        .select('*') as any)
        .eq('linked_module', module)
        .eq('linked_record_id', recordId!)
        .order('purchase_date', { ascending: false })
        .eq('farm_id', activeFarm?.id || '');
      if (error) throw error;
      return data || [];
    },
    enabled: !!recordId && !!activeFarm,
  });

  const transactions: LinkedTransaction[] = [
    ...sales.map((s: any) => ({
      id: s.id,
      type: 'income' as const,
      description: `${s.product_name} - ${s.buyer}`,
      amount: s.total_amount || 0,
      date: s.sale_date,
      status: s.payment_status || 'pending',
      category: s.product_type,
      originalData: s,
    })),
    ...purchases.map((p: any) => ({
      id: p.id,
      type: 'expense' as const,
      description: `${p.item_name} - ${p.supplier}`,
      amount: p.total_cost || 0,
      date: p.purchase_date,
      status: p.payment_status || 'pending',
      category: p.category,
      originalData: p,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalIncome = sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
  const totalExpenses = purchases.reduce((sum: number, p: any) => sum + (p.total_cost || 0), 0);
  const netProfitLoss = totalIncome - totalExpenses;

  return {
    transactions,
    totalIncome,
    totalExpenses,
    netProfitLoss,
    isLoading: salesLoading || purchasesLoading,
    sales,
    purchases,
  };
}
