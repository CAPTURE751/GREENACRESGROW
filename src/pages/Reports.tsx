import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatKES } from "@/lib/currency";
import { farmFileName } from "@/lib/report-export";
import { useFarm } from "@/contexts/FarmContext";
import { useSales } from "@/hooks/useSales";
import { usePurchases } from "@/hooks/usePurchases";
import { useCrops } from "@/hooks/useCrops";
import { useLivestock } from "@/hooks/useLivestock";
import { useInventory } from "@/hooks/useInventory";
import { useEquipment } from "@/hooks/useEquipment";
import { useToast } from "@/hooks/use-toast";
import {
  generateIncomeStatement,
  generateCashFlowStatement,
  generateBalanceSheet,
  generateProductionBudget,
  generateEnterpriseProfitability,
  generateCostOfProduction,
  generateInventoryReport,
  generateSalesRevenueReport,
  generateExpenseReport,
  generateBreakEvenAnalysis,
} from "@/lib/report-generators";
import {
  BarChart3,
  Download,
  TrendingUp,
  DollarSign,
  Wheat,
  Beef,
  Package,
  Loader2,
  AlertTriangle,
  FileText,
  PiggyBank,
  Scale,
  Factory,
  Layers,
  Receipt,
  ShoppingCart,
  Target,
  CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
  Legend,
} from "recharts";

const CHART_COLORS = [
  'hsl(84 31% 44%)',
  'hsl(31 45% 58%)',
  'hsl(23 47% 42%)',
  'hsl(43 74% 66%)',
  'hsl(84 31% 60%)',
  'hsl(200 50% 50%)',
];

const REPORT_TYPES = [
  { id: 'income-statement', title: 'Income Statement (P&L)', description: 'Revenue, expenses, and net profit summary', icon: FileText, generator: generateIncomeStatement },
  { id: 'cash-flow', title: 'Cash Flow Statement', description: 'Monthly inflows, outflows, and cumulative cash position', icon: TrendingUp, generator: generateCashFlowStatement },
  { id: 'balance-sheet', title: 'Balance Sheet', description: 'Assets, liabilities, and farm net worth', icon: Scale, generator: generateBalanceSheet },
  { id: 'production-budget', title: 'Production Budget', description: 'Input costs and crop production budgets', icon: Factory, generator: generateProductionBudget },
  { id: 'enterprise-profitability', title: 'Enterprise Profitability', description: 'Profit analysis per crop and livestock enterprise', icon: Layers, generator: generateEnterpriseProfitability },
  { id: 'cost-of-production', title: 'Cost of Production', description: 'Detailed breakdown of all production costs', icon: Receipt, generator: generateCostOfProduction },
  { id: 'inventory-report', title: 'Inventory / Stock Report', description: 'Current stock levels, values, and alerts', icon: Package, generator: generateInventoryReport },
  { id: 'sales-revenue', title: 'Sales Revenue Report', description: 'Revenue by product, buyer, and transaction detail', icon: ShoppingCart, generator: generateSalesRevenueReport },
  { id: 'expense-report', title: 'Expense Report', description: 'Expenses by category, supplier, and transactions', icon: DollarSign, generator: generateExpenseReport },
  { id: 'break-even', title: 'Break-Even Analysis', description: 'Fixed vs variable costs and break-even point', icon: Target, generator: generateBreakEvenAnalysis },
];

export default function Reports() {
  const { activeFarm } = useFarm();
  const { sales, isLoading: salesLoading } = useSales();
  const { purchases, isLoading: purchasesLoading } = usePurchases();
  const { crops, isLoading: cropsLoading } = useCrops();
  const { livestock, isLoading: livestockLoading } = useLivestock();
  const { inventory, lowStockItems, isLoading: inventoryLoading } = useInventory();
  const { equipment } = useEquipment();
  const { toast } = useToast();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [reportStartDate, setReportStartDate] = useState<Date | undefined>(undefined);
  const [reportEndDate, setReportEndDate] = useState<Date | undefined>(undefined);

  const isLoading = salesLoading || purchasesLoading || cropsLoading || livestockLoading || inventoryLoading;

  const reportData = useMemo(() => ({
    sales, purchases, crops, livestock, inventory, equipment,
  }), [sales, purchases, crops, livestock, inventory, equipment]);

  const handleGenerateReport = async (reportId: string, generator: (data: any) => Promise<void>) => {
    setGeneratingId(reportId);
    try {
      await generator(reportData);
      toast({ title: "Report downloaded", description: "Your PDF report has been generated and downloaded." });
    } catch (error: any) {
      console.error('Report generation failed:', error);
      toast({ variant: "destructive", title: "Report failed", description: error.message || "Failed to generate report." });
    } finally {
      setGeneratingId(null);
    }
  };

  // Compute monthly revenue vs expenses
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; expenses: number; profit: number }> = {};
    sales.forEach(sale => {
      const m = sale.sale_date.slice(0, 7);
      const label = new Date(sale.sale_date + 'T00:00:00').toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: label, revenue: 0, expenses: 0, profit: 0 };
      months[m].revenue += sale.total_amount || 0;
    });
    purchases.forEach(p => {
      const m = p.purchase_date.slice(0, 7);
      const label = new Date(p.purchase_date + 'T00:00:00').toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: label, revenue: 0, expenses: 0, profit: 0 };
      months[m].expenses += p.total_cost || 0;
    });
    Object.values(months).forEach(m => { m.profit = m.revenue - m.expenses; });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [sales, purchases]);

  // Expense breakdown by category
  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    purchases.forEach(p => {
      const cat = p.category || 'Other';
      cats[cat] = (cats[cat] || 0) + (p.total_cost || 0);
    });
    return Object.entries(cats).map(([category, amount], i) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [purchases]);

  // Revenue by product type
  const revenueByType = useMemo(() => {
    const types: Record<string, number> = {};
    sales.forEach(s => {
      const t = s.product_type || 'Other';
      types[t] = (types[t] || 0) + (s.total_amount || 0);
    });
    return Object.entries(types).map(([type, amount], i) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      amount,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [sales]);

  // Inventory value by category
  const inventoryByCategory = useMemo(() => {
    const cats: Record<string, { quantity: number; value: number }> = {};
    inventory.forEach(item => {
      const cat = item.category || 'Other';
      if (!cats[cat]) cats[cat] = { quantity: 0, value: 0 };
      cats[cat].quantity += Number(item.quantity) || 0;
      cats[cat].value += (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
    });
    return Object.entries(cats).map(([category, data]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      ...data,
    }));
  }, [inventory]);

  // Summary stats
  const totalRevenue = useMemo(() => sales.reduce((s, sale) => s + (sale.total_amount || 0), 0), [sales]);
  const totalExpenses = useMemo(() => purchases.reduce((s, p) => s + (p.total_cost || 0), 0), [purchases]);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;
  const totalInventoryValue = useMemo(() =>
    inventory.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0), 0), [inventory]);

  // Crop status breakdown
  const cropStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    crops.forEach(c => {
      const s = c.status || 'unknown';
      statuses[s] = (statuses[s] || 0) + 1;
    });
    return Object.entries(statuses).map(([status, count], i) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [crops]);

  // Livestock by type
  const livestockByType = useMemo(() => {
    const types: Record<string, number> = {};
    livestock.forEach(l => {
      types[l.type] = (types[l.type] || 0) + 1;
    });
    return Object.entries(types).map(([type, count], i) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [livestock]);

  // Export full overview as CSV
  const handleExportCSV = async () => {
    const farmName = activeFarm?.name || 'My Farm';
    const farmLocation = activeFarm?.location || '';
    const lines: string[] = [];
    lines.push(farmName);
    lines.push(farmLocation);
    lines.push(farmLocation);
    lines.push('');
    lines.push('FARM OVERVIEW REPORT');
    lines.push(`Generated,${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push(`Total Revenue,${totalRevenue}`);
    lines.push(`Total Expenses,${totalExpenses}`);
    lines.push(`Net Profit,${netProfit}`);
    lines.push(`Profit Margin,${profitMargin.toFixed(1)}%`);
    lines.push(`Total Crops,${crops.length}`);
    lines.push(`Total Livestock,${livestock.length}`);
    lines.push(`Inventory Items,${inventory.length}`);
    lines.push(`Inventory Value,${totalInventoryValue}`);
    lines.push(`Low Stock Alerts,${lowStockItems.length}`);
    lines.push('');

    if (monthlyData.length > 0) {
      lines.push('MONTHLY TRENDS');
      lines.push('Month,Revenue,Expenses,Profit');
      monthlyData.forEach(m => lines.push(`${m.month},${m.revenue},${m.expenses},${m.profit}`));
      lines.push('');
    }

    if (expenseByCategory.length > 0) {
      lines.push('EXPENSES BY CATEGORY');
      lines.push('Category,Amount');
      expenseByCategory.forEach(c => lines.push(`${c.category},${c.amount}`));
      lines.push('');
    }

    if (revenueByType.length > 0) {
      lines.push('REVENUE BY PRODUCT TYPE');
      lines.push('Type,Amount');
      revenueByType.forEach(r => lines.push(`${r.type},${r.amount}`));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = await farmFileName('Farm-Overview-Report', 'csv');
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">{activeFarm?.name || 'My Farm'} — Live farm data overview</p>
          </div>
          <Button onClick={handleExportCSV} className="bg-farm-green hover:bg-farm-green/90">
            <Download className="h-4 w-4 mr-2" />
            Export Overview CSV
          </Button>
        </div>

        {/* ============ DOWNLOADABLE REPORTS SECTION ============ */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Downloadable Reports</h2>
          <p className="text-sm text-muted-foreground mb-4">Generate branded PDF reports from your farm data. Click any report to download.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon;
              const isGenerating = generatingId === report.id;
              return (
                <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="pt-5 pb-4 px-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground leading-tight">{report.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{report.description}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      disabled={isGenerating}
                      onClick={() => handleGenerateReport(report.id, report.generator)}
                    >
                      {isGenerating ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
                      ) : (
                        <><Download className="h-3 w-3 mr-1" /> Download PDF</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-farm-green">{formatKES(totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sales.length} transactions</p>
                </div>
                <TrendingUp className="h-8 w-8 text-farm-green" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-farm-barn">{formatKES(totalExpenses)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{purchases.length} purchases</p>
                </div>
                <DollarSign className="h-8 w-8 text-farm-barn" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-farm-green' : 'text-destructive'}`}>
                    {formatKES(netProfit)}
                  </p>
                  <Badge className={`mt-1 ${profitMargin >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {profitMargin.toFixed(1)}% margin
                  </Badge>
                </div>
                <BarChart3 className="h-8 w-8 text-farm-harvest" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inventory Value</p>
                  <p className="text-2xl font-bold text-foreground">{formatKES(totalInventoryValue)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {lowStockItems.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {lowStockItems.length} low stock
                      </Badge>
                    )}
                    {lowStockItems.length === 0 && (
                      <p className="text-xs text-muted-foreground">{inventory.length} items</p>
                    )}
                  </div>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Profit Trends */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-farm-green" />
                Monthly Revenue vs Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatKES(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(84 31% 44%)" strokeWidth={2} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(31 45% 58%)" strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(23 47% 42%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">No transaction data yet. Record sales and purchases to see trends.</p>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-farm-barn" />
                Expense Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenseByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="amount"
                      nameKey="category"
                    >
                      {expenseByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatKES(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">No purchase data yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Product Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-farm-harvest" />
                Revenue by Product Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatKES(value)} />
                    <Bar dataKey="amount" name="Revenue" radius={[4, 4, 0, 0]}>
                      {revenueByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">No sales data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Farm Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Crop Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wheat className="h-5 w-5 text-farm-green" />
                Crops ({crops.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cropStatusData.length > 0 ? (
                <div className="space-y-3">
                  {cropStatusData.map((s) => (
                    <div key={s.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-sm">{s.status}</span>
                      </div>
                      <Badge variant="secondary">{s.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">No crops recorded yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Livestock Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beef className="h-5 w-5 text-farm-barn" />
                Livestock ({livestock.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {livestockByType.length > 0 ? (
                <div className="space-y-3">
                  {livestockByType.map((l) => (
                    <div key={l.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                        <span className="text-sm">{l.type}</span>
                      </div>
                      <Badge variant="secondary">{l.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">No livestock recorded yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Inventory by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                Inventory Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryByCategory.length > 0 ? (
                <div className="space-y-3">
                  {inventoryByCategory.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <span className="text-sm">{cat.category}</span>
                      <span className="text-sm font-medium">{formatKES(cat.value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">No inventory items yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
