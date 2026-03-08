import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', success: false }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { start_date, end_date, category } = await req.json();

    if (start_date && isNaN(Date.parse(start_date))) {
      return new Response(JSON.stringify({ error: 'Invalid start_date format', success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (end_date && isNaN(Date.parse(end_date))) {
      return new Response(JSON.stringify({ error: 'Invalid end_date format', success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Calculating P&L from ${start_date} to ${end_date}${category ? ` for category: ${category}` : ''} by user ${userId}`);

    // Get sales data
    let salesQuery = supabase
      .from('sales')
      .select('total_amount, unit_price, quantity, product_type, product_name, sale_date, payment_status');
    if (category) salesQuery = salesQuery.eq('product_type', category);
    if (start_date) salesQuery = salesQuery.gte('sale_date', start_date);
    if (end_date) salesQuery = salesQuery.lte('sale_date', end_date);
    const { data: sales, error: salesError } = await salesQuery;
    if (salesError) throw salesError;

    // Get purchases data
    let purchasesQuery = supabase
      .from('purchases')
      .select('total_cost, unit_cost, quantity, category, item_name, purchase_date, payment_status');
    if (category) purchasesQuery = purchasesQuery.eq('category', category);
    if (start_date) purchasesQuery = purchasesQuery.gte('purchase_date', start_date);
    if (end_date) purchasesQuery = purchasesQuery.lte('purchase_date', end_date);
    const { data: purchases, error: purchasesError } = await purchasesQuery;
    if (purchasesError) throw purchasesError;

    // Calculate revenue
    const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const paidRevenue = sales?.filter(s => s.payment_status === 'paid')
      .reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

    // Calculate costs
    const totalCosts = purchases?.reduce((sum, p) => sum + (p.total_cost || 0), 0) || 0;
    const paidCosts = purchases?.filter(p => p.payment_status === 'paid')
      .reduce((sum, p) => sum + (p.total_cost || 0), 0) || 0;

    const grossProfit = totalRevenue - totalCosts;
    const netProfit = paidRevenue - paidCosts;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Detailed sales breakdown by product_type and product_name
    const salesByType = new Map<string, { total: number; items: Map<string, number> }>();
    sales?.forEach(sale => {
      const type = sale.product_type || 'Other';
      if (!salesByType.has(type)) salesByType.set(type, { total: 0, items: new Map() });
      const entry = salesByType.get(type)!;
      entry.total += sale.total_amount || 0;
      const name = sale.product_name || 'Unknown';
      entry.items.set(name, (entry.items.get(name) || 0) + (sale.total_amount || 0));
    });

    const salesBreakdown: Record<string, { total: number; items: Record<string, number> }> = {};
    salesByType.forEach((val, key) => {
      const items: Record<string, number> = {};
      val.items.forEach((amt, name) => { items[name] = amt; });
      salesBreakdown[key] = { total: val.total, items };
    });

    // Detailed purchases breakdown by category and item_name
    const purchasesByCategory = new Map<string, { total: number; items: Map<string, number> }>();
    purchases?.forEach(p => {
      const cat = p.category || 'Other';
      if (!purchasesByCategory.has(cat)) purchasesByCategory.set(cat, { total: 0, items: new Map() });
      const entry = purchasesByCategory.get(cat)!;
      entry.total += p.total_cost || 0;
      const name = p.item_name || 'Unknown';
      entry.items.set(name, (entry.items.get(name) || 0) + (p.total_cost || 0));
    });

    const purchasesBreakdown: Record<string, { total: number; items: Record<string, number> }> = {};
    purchasesByCategory.forEach((val, key) => {
      const items: Record<string, number> = {};
      val.items.forEach((amt, name) => { items[name] = amt; });
      purchasesBreakdown[key] = { total: val.total, items };
    });

    // Monthly trends
    const monthlyData = new Map();
    sales?.forEach(sale => {
      const month = new Date(sale.sale_date).toISOString().substring(0, 7);
      if (!monthlyData.has(month)) monthlyData.set(month, { revenue: 0, costs: 0, sales_count: 0, purchases_count: 0 });
      const d = monthlyData.get(month);
      d.revenue += sale.total_amount || 0;
      d.sales_count += 1;
    });
    purchases?.forEach(purchase => {
      const month = new Date(purchase.purchase_date).toISOString().substring(0, 7);
      if (!monthlyData.has(month)) monthlyData.set(month, { revenue: 0, costs: 0, sales_count: 0, purchases_count: 0 });
      const d = monthlyData.get(month);
      d.costs += purchase.total_cost || 0;
      d.purchases_count += 1;
    });

    const monthlyTrends = Array.from(monthlyData.entries())
      .map(([month, d]) => ({ month, revenue: d.revenue, costs: d.costs, profit: d.revenue - d.costs, sales_count: d.sales_count, purchases_count: d.purchases_count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Category performance
    const categoryPerformance = new Map();
    sales?.forEach(sale => {
      const cat = sale.product_type || 'Other';
      if (!categoryPerformance.has(cat)) categoryPerformance.set(cat, { revenue: 0, quantity: 0, transactions: 0 });
      const p = categoryPerformance.get(cat);
      p.revenue += sale.total_amount || 0;
      p.quantity += sale.quantity || 0;
      p.transactions += 1;
    });

    const topCategories = Array.from(categoryPerformance.entries())
      .map(([category, p]) => ({ category, revenue: p.revenue, quantity: p.quantity, transactions: p.transactions, avg_transaction_value: p.transactions > 0 ? p.revenue / p.transactions : 0 }))
      .sort((a, b) => b.revenue - a.revenue);

    const reportData = {
      summary: {
        period: { start_date: start_date || 'All time', end_date: end_date || 'Present' },
        category: category || 'All Categories',
        total_revenue: totalRevenue,
        paid_revenue: paidRevenue,
        total_costs: totalCosts,
        paid_costs: paidCosts,
        gross_profit: grossProfit,
        net_profit: netProfit,
        profit_margin_percent: profitMargin,
        total_sales_transactions: sales?.length || 0,
        total_purchase_transactions: purchases?.length || 0,
      },
      sales_breakdown: salesBreakdown,
      purchases_breakdown: purchasesBreakdown,
      monthly_trends: monthlyTrends,
      category_performance: topCategories,
      generated_at: new Date().toISOString(),
      generated_by: userId,
    };

    // Persist the generated report
    const { error: insertError } = await supabase
      .from('reports')
      .insert({
        title: `P&L Report - ${category || 'All Categories'}`,
        report_type: 'profit_loss',
        content: reportData,
        period_start: start_date || null,
        period_end: end_date || null,
        created_by: userId,
        status: 'generated',
      });

    if (insertError) {
      console.error('Failed to persist report:', insertError);
    }

    return new Response(JSON.stringify({
      success: true,
      data: reportData,
      profit_loss_report: reportData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-profit-loss function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
