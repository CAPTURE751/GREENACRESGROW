
import { useState, useMemo } from "react";
import { exportAnalyticsPDF } from "@/lib/analytics-export";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatKES } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCapitalInjections } from "@/hooks/useCapitalInjections";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  Wheat,
  Bug,
  DollarSign,
  ShoppingCart,
  Landmark,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  Legend,
  ComposedChart,
} from "recharts";

const PIE_COLORS = [
  "hsl(142 50% 45%)",
  "hsl(210 65% 50%)",
  "hsl(45 80% 50%)",
  "hsl(340 60% 50%)",
  "hsl(270 50% 55%)",
  "hsl(180 50% 45%)",
  "hsl(25 70% 50%)",
  "hsl(100 40% 45%)",
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<"6m" | "12m" | "all" | "custom">("12m");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);

  // ── Fetch all raw data ──
  const { data: sales = [], isLoading: sl } = useQuery({
    queryKey: ["analytics-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("sale_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: purchases = [], isLoading: pl } = useQuery({
    queryKey: ["analytics-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .order("purchase_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: crops = [], isLoading: cl } = useQuery({
    queryKey: ["analytics-crops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crops").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: livestock = [], isLoading: ll } = useQuery({
    queryKey: ["analytics-livestock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("livestock").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: inventory = [], isLoading: il } = useQuery({
    queryKey: ["analytics-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory").select("*");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = sl || pl || cl || ll || il;

  // ── Time filter helper ──
  const cutoffDate = useMemo(() => {
    if (timeRange === "custom") return customStart ? customStart.toISOString().substring(0, 10) : null;
    if (timeRange === "all") return null;
    const d = new Date();
    d.setMonth(d.getMonth() - (timeRange === "6m" ? 6 : 12));
    return d.toISOString().substring(0, 10);
  }, [timeRange, customStart]);

  const endDate = useMemo(() => {
    if (timeRange === "custom" && customEnd) return customEnd.toISOString().substring(0, 10);
    return null;
  }, [timeRange, customEnd]);

  const filteredSales = useMemo(
    () => {
      let filtered = sales;
      if (cutoffDate) filtered = filtered.filter((s) => s.sale_date >= cutoffDate);
      if (endDate) filtered = filtered.filter((s) => s.sale_date <= endDate);
      return filtered;
    },
    [sales, cutoffDate, endDate]
  );
  const filteredPurchases = useMemo(
    () => {
      let filtered = purchases;
      if (cutoffDate) filtered = filtered.filter((p) => p.purchase_date >= cutoffDate);
      if (endDate) filtered = filtered.filter((p) => p.purchase_date <= endDate);
      return filtered;
    },
    [purchases, cutoffDate, endDate]
  );

  // ── KPI Summaries ──
  const totals = useMemo(() => {
    const totalRevenue = filteredSales.reduce((s, r) => s + (r.total_amount || 0), 0);
    const totalCosts = filteredPurchases.reduce((s, r) => s + (r.total_cost || 0), 0);
    const netProfit = totalRevenue - totalCosts;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCosts, netProfit, margin };
  }, [filteredSales, filteredPurchases]);

  // ── Monthly Revenue vs Costs (bar chart) ──
  const monthlyFinancials = useMemo(() => {
    const map = new Map<string, { revenue: number; costs: number }>();
    filteredSales.forEach((s) => {
      const m = s.sale_date?.substring(0, 7);
      if (!m) return;
      if (!map.has(m)) map.set(m, { revenue: 0, costs: 0 });
      map.get(m)!.revenue += s.total_amount || 0;
    });
    filteredPurchases.forEach((p) => {
      const m = p.purchase_date?.substring(0, 7);
      if (!m) return;
      if (!map.has(m)) map.set(m, { revenue: 0, costs: 0 });
      map.get(m)!.costs += p.total_cost || 0;
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month: new Date(month + "-01").toLocaleDateString("en", { month: "short", year: "2-digit" }),
        revenue: d.revenue,
        costs: d.costs,
        profit: d.revenue - d.costs,
      }));
  }, [filteredSales, filteredPurchases]);

  // ── Revenue by product type (pie) ──
  const revenueByType = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach((s) => {
      const key = s.product_name || "Other";
      map.set(key, (map.get(key) || 0) + (s.total_amount || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [filteredSales]);

  // ── Costs by category (pie) ──
  const costsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredPurchases.forEach((p) => {
      const key = p.category || "Other";
      map.set(key, (map.get(key) || 0) + (p.total_cost || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({ name: name.replace(/_/g, " "), value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [filteredPurchases]);

  // ── Break-even analysis ──
  const opexKeys = [
    "permanent_labour", "salaries", "salary", "machinery", "equipment",
    "maintenance", "utilities", "electricity", "water", "transport",
    "insurance", "administration", "marketing", "communication",
    "land_costs", "farm_supplies", "loan_interest", "bank_charges",
    "depreciation", "taxes",
  ];

  const breakEvenData = useMemo(() => {
    const monthlyMap = new Map<string, { revenue: number; fixedCosts: number; variableCosts: number }>();
    filteredSales.forEach((s) => {
      const month = s.sale_date?.substring(0, 7);
      if (!month) return;
      if (!monthlyMap.has(month)) monthlyMap.set(month, { revenue: 0, fixedCosts: 0, variableCosts: 0 });
      monthlyMap.get(month)!.revenue += s.total_amount || 0;
    });
    filteredPurchases.forEach((p) => {
      const month = p.purchase_date?.substring(0, 7);
      if (!month) return;
      if (!monthlyMap.has(month)) monthlyMap.set(month, { revenue: 0, fixedCosts: 0, variableCosts: 0 });
      const isFixed = opexKeys.some((k) => (p.category || "").toLowerCase().includes(k));
      if (isFixed) monthlyMap.get(month)!.fixedCosts += p.total_cost || 0;
      else monthlyMap.get(month)!.variableCosts += p.total_cost || 0;
    });
    let cumR = 0, cumF = 0, cumV = 0;
    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => {
        cumR += d.revenue;
        cumF += d.fixedCosts;
        cumV += d.variableCosts;
        const cmRatio = cumR > 0 ? (cumR - cumV) / cumR : 0;
        const be = cmRatio > 0 ? cumF / cmRatio : cumF + cumV;
        return {
          month: new Date(month + "-01").toLocaleDateString("en", { month: "short", year: "2-digit" }),
          revenue: cumR,
          totalCosts: cumF + cumV,
          breakEven: Math.round(be),
        };
      });
  }, [filteredSales, filteredPurchases]);

  const latestBE = breakEvenData.length > 0 ? breakEvenData[breakEvenData.length - 1] : null;
  const isAboveBreakEven = latestBE ? latestBE.revenue >= latestBE.breakEven : false;

  // ── Top sales ranking ──
  const topProducts = useMemo(() => {
    const map = new Map<string, { revenue: number; qty: number; unit: string }>();
    filteredSales.forEach((s) => {
      const key = s.product_name;
      const cur = map.get(key) || { revenue: 0, qty: 0, unit: s.unit };
      cur.revenue += s.total_amount || 0;
      cur.qty += s.quantity || 0;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, d]) => ({ name, ...d }));
  }, [filteredSales]);

  // ── Inventory health ──
  const inventoryStats = useMemo(() => {
    const lowStock = inventory.filter((i) => i.min_threshold && i.quantity <= i.min_threshold).length;
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((s, i) => s + (i.quantity * (i.unit_cost || 0)), 0);
    return { lowStock, totalItems, totalValue };
  }, [inventory]);

  const timeRanges = [
    { id: "6m" as const, label: "6 Months" },
    { id: "12m" as const, label: "12 Months" },
    { id: "all" as const, label: "All Time" },
    { id: "custom" as const, label: "Custom" },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-farm-green" />
          <span className="ml-3 text-muted-foreground">Loading analytics...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Real-time insights from your farm data</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {timeRanges.map((r) => (
              <Button
                key={r.id}
                variant={timeRange === r.id ? "default" : "outline"}
                onClick={() => setTimeRange(r.id)}
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {r.label}
              </Button>
            ))}
            {timeRange === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !customStart && "text-muted-foreground")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      {customStart ? format(customStart, "dd/MM/yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-sm">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !customEnd && "text-muted-foreground")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      {customEnd ? format(customEnd, "dd/MM/yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className={cn("p-3 pointer-events-auto")} disabled={(date) => customStart ? date < customStart : false} />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <Button
              size="sm"
              className="bg-farm-green hover:bg-farm-green/90"
              onClick={async () => {
                try {
                  const beData = breakEvenData.length > 0 ? {
                    isAbove: isAboveBreakEven,
                    revenue: latestBE?.revenue || 0,
                    breakEvenPoint: latestBE?.breakEven || 0,
                    difference: Math.abs((latestBE?.revenue || 0) - (latestBE?.breakEven || 0)),
                  } : null;
                  await exportAnalyticsPDF({
                    totals,
                    monthlyFinancials,
                    revenueByType,
                    costsByCategory,
                    topProducts,
                    inventoryStats,
                    breakEven: beData,
                    farmCounts: {
                      crops: crops.length,
                      livestock: livestock.length,
                      sales: filteredSales.length,
                      purchases: filteredPurchases.length,
                    },
                    timeRange: timeRange === "6m" ? "Last 6 Months" : timeRange === "12m" ? "Last 12 Months" : timeRange === "custom" ? `${customStart ? format(customStart, "dd/MM/yyyy") : "?"} – ${customEnd ? format(customEnd, "dd/MM/yyyy") : "?"}` : "All Time",
                  });
                  toast.success("Analytics PDF downloaded successfully");
                } catch (e: any) {
                  toast.error("Failed to export PDF: " + e.message);
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{formatKES(totals.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{filteredSales.length} transactions</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-600">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Costs</p>
                  <p className="text-2xl font-bold text-gray-700 mt-1">{formatKES(totals.totalCosts)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{filteredPurchases.length} purchases</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${totals.netProfit >= 0 ? "border-l-green-500" : "border-l-red-500"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {totals.netProfit >= 0 ? "Net Profit" : "Net Loss"}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${totals.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatKES(Math.abs(totals.netProfit))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Margin: {totals.margin.toFixed(1)}%
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${totals.netProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                  {totals.netProfit >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Farm Assets</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    {crops.length + livestock.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {crops.length} crops · {livestock.length} livestock
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                  <Wheat className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Revenue vs Costs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Monthly Revenue vs Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyFinancials.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No financial data available for the selected period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyFinancials}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatKES(value), ""]} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(210 65% 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costs" name="Costs" fill="hsl(0 0% 55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit/Loss" fill="hsl(142 50% 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        {/* Monthly Profit Margin Trend */}
        {monthlyFinancials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Monthly Profit Margin Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthlyFinancials.map((m) => ({
                  ...m,
                  margin: m.revenue > 0 ? ((m.profit / m.revenue) * 100) : 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "Margin") return [`${value.toFixed(1)}%`, name];
                      return [formatKES(value), name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="profit" name="Profit/Loss" fill="hsl(142 50% 45%)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="margin" name="Margin" stroke="hsl(210 65% 50%)" strokeWidth={3} dot={{ r: 5, fill: "hsl(210 65% 50%)" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pie Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Product */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Revenue by Product
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByType.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No sales data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {revenueByType.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatKES(value), ""]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Costs by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-gray-600" />
                Costs by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {costsByCategory.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No purchase data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costsByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {costsByCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatKES(value), ""]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Break-Even Analysis */}
        {breakEvenData.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-farm-green" />
                  Break-Even Analysis
                </CardTitle>
                <Badge className={isAboveBreakEven ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {isAboveBreakEven ? "Above Break-Even" : "Below Break-Even"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Cumulative revenue vs costs with break-even threshold</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Cumulative Revenue</p>
                  <p className="text-lg font-bold text-blue-600">{formatKES(latestBE?.revenue || 0)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Break-Even Point</p>
                  <p className="text-lg font-bold text-amber-600">{formatKES(latestBE?.breakEven || 0)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{isAboveBreakEven ? "Surplus" : "Shortfall"}</p>
                  <p className={`text-lg font-bold ${isAboveBreakEven ? "text-green-600" : "text-red-600"}`}>
                    {formatKES(Math.abs((latestBE?.revenue || 0) - (latestBE?.breakEven || 0)))}
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={breakEvenData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatKES(value), ""]} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(210 65% 50%)" fill="hsl(210 65% 50% / 0.2)" strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="totalCosts" stroke="hsl(0 0% 55%)" fill="hsl(0 0% 55% / 0.1)" strokeWidth={2} name="Total Costs" />
                  <Line type="monotone" dataKey="breakEven" stroke="hsl(45 80% 50%)" strokeWidth={2} strokeDasharray="8 4" dot={false} name="Break-Even Line" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Products + Inventory Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top Revenue Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No sales data yet.</p>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((p, i) => {
                    const maxRevenue = topProducts[0]?.revenue || 1;
                    const pct = (p.revenue / maxRevenue) * 100;
                    return (
                      <div key={p.name} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">
                            <span className="text-muted-foreground mr-2">#{i + 1}</span>
                            {p.name}
                          </span>
                          <span className="font-bold text-blue-600">{formatKES(p.revenue)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.qty} {p.unit} sold
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-amber-600" />
                Inventory Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-lg border p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold text-foreground">{inventoryStats.totalItems}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
                <div className="rounded-lg border p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory Value</p>
                    <p className="text-2xl font-bold text-foreground">{formatKES(inventoryStats.totalValue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
                <div className={`rounded-lg border p-4 flex items-center justify-between ${inventoryStats.lowStock > 0 ? "border-red-300 bg-red-50" : ""}`}>
                  <div>
                    <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
                    <p className={`text-2xl font-bold ${inventoryStats.lowStock > 0 ? "text-red-600" : "text-green-600"}`}>
                      {inventoryStats.lowStock}
                    </p>
                  </div>
                  {inventoryStats.lowStock > 0 ? (
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  ) : (
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Farm Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Farm Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg border">
                <p className="text-3xl font-bold text-foreground">{crops.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Active Crops</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="text-3xl font-bold text-foreground">{livestock.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Livestock</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="text-3xl font-bold text-foreground">{filteredSales.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Sales Made</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="text-3xl font-bold text-foreground">{filteredPurchases.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Purchases</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
