import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BulkUpdateItem {
  id?: string;
  quantity?: number;
  unit_cost?: number;
  min_threshold?: number;
  location?: string;
  supplier?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized', success: false }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the JWT token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized', success: false }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Use service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { updates } = await req.json();

    if (!updates || !Array.isArray(updates)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request: updates array is required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing bulk update for ${updates.length} items by user ${userId}`);

    // Check role from DB using authenticated user ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (profileError || !['admin', 'staff'].includes(profile?.role)) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient permissions for bulk updates',
        success: false 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process updates in batches
    const batchSize = 50;
    const results = [];
    const errors = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (update: BulkUpdateItem) => {
        try {
          const updateData = {
            ...update,
            last_updated: new Date().toISOString(),
          };
          delete updateData.id;

          const { data, error } = await supabase
            .from('inventory')
            .update(updateData)
            .eq('id', update.id)
            .select();

          if (error) throw error;
          return { success: true, id: update.id, data };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, id: update.id, error: errorMessage };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r.success));
      errors.push(...batchResults.filter(r => !r.success));
    }

    // Calculate business metrics after bulk update
    const { data: inventoryStats, error: statsError } = await supabase
      .from('inventory')
      .select('quantity, unit_cost, min_threshold')
      .not('quantity', 'is', null)
      .not('unit_cost', 'is', null);

    let totalValue = 0;
    let lowStockCount = 0;

    if (!statsError && inventoryStats) {
      totalValue = inventoryStats.reduce((sum, item) => 
        sum + (item.quantity * (item.unit_cost || 0)), 0
      );
      
      lowStockCount = inventoryStats.filter(item => 
        item.quantity <= (item.min_threshold || 0)
      ).length;
    }

    console.log(`Bulk update completed: ${results.length} successful, ${errors.length} failed`);

    return new Response(JSON.stringify({
      success: true,
      results: {
        successful_updates: results.length,
        failed_updates: errors.length,
        total_inventory_value: totalValue,
        low_stock_items: lowStockCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in bulk-inventory-update function:', error);
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
