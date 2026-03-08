import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking inventory for low stock items...');

    // Get all inventory items
    const { data: allItems, error: inventoryError } = await supabase
      .from('inventory')
      .select('*');

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError);
      throw inventoryError;
    }

    console.log(`Found ${lowStockItems?.length || 0} low stock items`);

    // Auto-flag items that are critically low (less than 25% of min threshold)
    const criticalItems = lowStockItems?.filter(item => 
      item.quantity < (item.min_threshold || 0) * 0.25
    ) || [];

    // Update critical items with alert status
    if (criticalItems.length > 0) {
      const updates = criticalItems.map(item => 
        supabase
          .from('inventory')
          .update({ 
            location: item.location + ' [CRITICAL]',
            last_updated: new Date().toISOString() 
          })
          .eq('id', item.id)
      );

      await Promise.all(updates);
      console.log(`Flagged ${criticalItems.length} critical items`);
    }

    // Generate alert summary
    const alertSummary = {
      timestamp: new Date().toISOString(),
      total_low_stock: lowStockItems?.length || 0,
      critical_items: criticalItems.length,
      low_stock_items: lowStockItems?.map(item => ({
        id: item.id,
        item_name: item.item_name,
        current_quantity: item.quantity,
        min_threshold: item.min_threshold,
        category: item.category,
        is_critical: item.quantity < (item.min_threshold || 0) * 0.25
      })) || [],
    };

    console.log('Inventory check completed successfully');

    return new Response(JSON.stringify({
      success: true,
      alert_summary: alertSummary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in inventory-alerts function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});