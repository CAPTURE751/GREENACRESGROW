import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Authenticate user with anon key
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use service role client for data operations (bypasses RLS)
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { reportType, periodStart, periodEnd } = await req.json();

    // Validate report type
    const validReportTypes = ['monthly', 'quarterly', 'annual', 'inventory_summary', 'sales_summary', 'livestock_status'];
    if (!validReportTypes.includes(reportType)) {
      return new Response(JSON.stringify({ error: 'Invalid report type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Generate report based on type
    let reportContent: any = {};
    let reportTitle = '';

    switch (reportType) {
      case 'inventory_summary':
        reportTitle = `Inventory Summary Report (${startDate.toDateString()} - ${endDate.toDateString()})`;
        
        // Get current inventory levels
        const { data: inventory } = await supabaseClient
          .from('inventory')
          .select('*')
          .order('category');

        // Get low stock items
        const lowStockItems = inventory?.filter(item => 
          item.quantity <= item.min_threshold
        ) || [];

        // Get recent purchases in period
        const { data: recentPurchases } = await supabaseClient
          .from('purchases')
          .select('*')
          .gte('purchase_date', periodStart)
          .lte('purchase_date', periodEnd)
          .order('purchase_date', { ascending: false });

        reportContent = {
          summary: {
            totalItems: inventory?.length || 0,
            lowStockItems: lowStockItems.length,
            totalInventoryValue: inventory?.reduce((sum, item) => 
              sum + (item.quantity * (item.unit_cost || 0)), 0
            ) || 0
          },
          lowStockAlert: lowStockItems,
          recentPurchases: recentPurchases || [],
          inventoryByCategory: inventory?.reduce((acc, item) => {
            if (!acc[item.category]) {
              acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
          }, {} as Record<string, any[]>) || {}
        };
        break;

      case 'sales_summary':
        reportTitle = `Sales Summary Report (${startDate.toDateString()} - ${endDate.toDateString()})`;
        
        // Get sales in period
        const { data: sales } = await supabaseClient
          .from('sales')
          .select('*')
          .gte('sale_date', periodStart)
          .lte('sale_date', periodEnd)
          .order('sale_date', { ascending: false });

        const totalRevenue = sales?.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0) || 0;
        const totalQuantitySold = sales?.reduce((sum, sale) => sum + parseFloat(sale.quantity), 0) || 0;

        reportContent = {
          summary: {
            totalSales: sales?.length || 0,
            totalRevenue,
            totalQuantitySold,
            averageSaleValue: sales?.length ? totalRevenue / sales.length : 0
          },
          salesByProduct: sales?.reduce((acc, sale) => {
            if (!acc[sale.product_name]) {
              acc[sale.product_name] = {
                quantity: 0,
                revenue: 0,
                sales: 0
              };
            }
            acc[sale.product_name].quantity += parseFloat(sale.quantity);
            acc[sale.product_name].revenue += parseFloat(sale.total_amount);
            acc[sale.product_name].sales += 1;
            return acc;
          }, {} as Record<string, any>) || {},
          recentSales: sales || []
        };
        break;

      case 'livestock_status':
        reportTitle = `Livestock Status Report (${startDate.toDateString()} - ${endDate.toDateString()})`;
        
        // Get all livestock
        const { data: livestock } = await supabaseClient
          .from('livestock')
          .select('*')
          .order('type');

        // Get livestock added in period
        const { data: newLivestock } = await supabaseClient
          .from('livestock')
          .select('*')
          .gte('created_at', periodStart)
          .lte('created_at', periodEnd);

        reportContent = {
          summary: {
            totalLivestock: livestock?.length || 0,
            newLivestockInPeriod: newLivestock?.length || 0,
            healthyCount: livestock?.filter(l => l.health_status === 'healthy').length || 0,
            sickCount: livestock?.filter(l => l.health_status === 'sick').length || 0
          },
          livestockByType: livestock?.reduce((acc, animal) => {
            if (!acc[animal.type]) {
              acc[animal.type] = [];
            }
            acc[animal.type].push(animal);
            return acc;
          }, {} as Record<string, any[]>) || {},
          healthStatus: livestock?.reduce((acc, animal) => {
            if (!acc[animal.health_status]) {
              acc[animal.health_status] = 0;
            }
            acc[animal.health_status]++;
            return acc;
          }, {} as Record<string, number>) || {},
          newLivestock: newLivestock || []
        };
        break;

      case 'monthly':
      case 'quarterly':
      case 'annual':
        reportTitle = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Farm Report (${startDate.toDateString()} - ${endDate.toDateString()})`;
        
        // Comprehensive report combining multiple aspects
        const [inventoryData, salesData, purchasesData, livestockData, cropsData] = await Promise.all([
          supabaseClient.from('inventory').select('*'),
          supabaseClient.from('sales').select('*').gte('sale_date', periodStart).lte('sale_date', periodEnd),
          supabaseClient.from('purchases').select('*').gte('purchase_date', periodStart).lte('purchase_date', periodEnd),
          supabaseClient.from('livestock').select('*'),
          supabaseClient.from('crops').select('*')
        ]);

        const salesRevenue = salesData.data?.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0) || 0;
        const purchasesCost = purchasesData.data?.reduce((sum, purchase) => sum + parseFloat(purchase.total_cost), 0) || 0;

        reportContent = {
          summary: {
            period: `${startDate.toDateString()} - ${endDate.toDateString()}`,
            revenue: salesRevenue,
            expenses: purchasesCost,
            profit: salesRevenue - purchasesCost,
            totalLivestock: livestockData.data?.length || 0,
            totalCrops: cropsData.data?.length || 0,
            inventoryItems: inventoryData.data?.length || 0
          },
          sales: {
            totalSales: salesData.data?.length || 0,
            revenue: salesRevenue,
            topProducts: salesData.data?.reduce((acc, sale) => {
              if (!acc[sale.product_name]) {
                acc[sale.product_name] = { quantity: 0, revenue: 0 };
              }
              acc[sale.product_name].quantity += parseFloat(sale.quantity);
              acc[sale.product_name].revenue += parseFloat(sale.total_amount);
              return acc;
            }, {} as Record<string, any>) || {}
          },
          purchases: {
            totalPurchases: purchasesData.data?.length || 0,
            totalCost: purchasesCost,
            byCategory: purchasesData.data?.reduce((acc, purchase) => {
              if (!acc[purchase.category]) {
                acc[purchase.category] = { count: 0, cost: 0 };
              }
              acc[purchase.category].count++;
              acc[purchase.category].cost += parseFloat(purchase.total_cost);
              return acc;
            }, {} as Record<string, any>) || {}
          },
          livestock: {
            total: livestockData.data?.length || 0,
            byType: livestockData.data?.reduce((acc, animal) => {
              acc[animal.type] = (acc[animal.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {},
            healthStatus: livestockData.data?.reduce((acc, animal) => {
              acc[animal.health_status] = (acc[animal.health_status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {}
          },
          crops: {
            total: cropsData.data?.length || 0,
            byType: cropsData.data?.reduce((acc, crop) => {
              acc[crop.type] = (acc[crop.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {},
            byStatus: cropsData.data?.reduce((acc, crop) => {
              acc[crop.status] = (acc[crop.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {}
          }
        };
        break;
    }

    // Save report to database
    const { data: report, error: saveError } = await supabaseClient
      .from('reports')
      .insert({
        report_type: reportType,
        title: reportTitle,
        content: reportContent,
        period_start: periodStart,
        period_end: periodEnd,
        created_by: user.id
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving report:', saveError);
      return new Response(JSON.stringify({ error: 'Failed to save report' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      report: report,
      message: `${reportTitle} generated successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating farm report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});