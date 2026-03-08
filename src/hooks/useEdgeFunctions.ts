import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useInventoryAlerts() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('inventory-alerts');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.alert_summary.total_low_stock > 0) {
        toast({
          title: "Inventory Alert",
          description: `Found ${data.alert_summary.total_low_stock} low stock items (${data.alert_summary.critical_items} critical).`,
          variant: data.alert_summary.critical_items > 0 ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Inventory Check Complete",
          description: "All inventory levels are good.",
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error checking inventory",
        description: error.message,
      });
    },
  });
}

export function useBulkInventoryUpdate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Array<{
      id: string;
      quantity?: number;
      unit_cost?: number;
      min_threshold?: number;
      location?: string;
      supplier?: string;
    }>) => {
      const { data, error } = await supabase.functions.invoke('bulk-inventory-update', {
        body: { updates },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Update Complete",
        description: `Updated ${data.results.successful_updates} items successfully.`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error in bulk update",
        description: error.message,
      });
    },
  });
}

export function useProfitLossCalculation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      start_date,
      end_date,
      category,
    }: {
      start_date?: string;
      end_date?: string;
      category?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('calculate-profit-loss', {
        body: {
          start_date,
          end_date,
          category,
          user_id: user?.id,
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "P&L Report Generated",
        description: "Profit and loss calculation completed successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error generating P&L report",
        description: error.message,
      });
    },
  });
}

export function useGenerateFarmReport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      report_type,
      start_date,
      end_date,
      include_charts,
    }: {
      report_type: string;
      start_date?: string;
      end_date?: string;
      include_charts?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('generate-farm-report', {
        body: {
          report_type,
          start_date,
          end_date,
          include_charts: include_charts || false,
          user_id: user?.id,
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Report Generated",
        description: "Farm report has been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error generating report",
        description: error.message,
      });
    },
  });
}