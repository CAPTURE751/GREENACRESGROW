
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatKES } from "@/lib/currency";
import { useSales } from "@/hooks/useSales";
import { usePurchases } from "@/hooks/usePurchases";
import { useCapitalInjections } from "@/hooks/useCapitalInjections";
import { useProfitLossCalculation } from "@/hooks/useEdgeFunctions";
import { TransactionForm } from "@/components/TransactionForm";
import { 
  DollarSign, Plus, TrendingUp, TrendingDown, Receipt, CreditCard, Calendar,
  Filter, Loader2, FileBarChart, BarChart3, X, Download, FileSpreadsheet,
  Trash2, Landmark, Pencil, History,
} from "lucide-react";
import { AuditTimeline } from "@/components/AuditTimeline";
import { useCrops } from "@/hooks/useCrops";
import { buildReconciliation, reconciliationSummary, exportReconciliationPDF } from "@/lib/reconciliation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { exportPnLToCSV, exportPnLToPDF } from "@/lib/report-export";
import { exportCapitalInjectionsPDF } from "@/lib/capital-injection-export";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import farmLogo from "@/assets/farm-logo.png";
import { useFarm } from "@/contexts/FarmContext";


interface PnLReport {
  summary: {
    period: { start_date: string; end_date: string };
    category: string;
    total_revenue: number;
    paid_revenue: number;
    total_costs: number;
    paid_costs: number;
    gross_profit: number;
    net_profit: number;
    profit_margin_percent: number;
    total_sales_transactions: number;
    total_purchase_transactions: number;
  };
  monthly_trends: Array<{
    month: string;
    revenue: number;
    costs: number;
    profit: number;
    sales_count: number;
    purchases_count: number;
  }>;
  category_performance: Array<{
    category: string;
    revenue: number;
    quantity: number;
    transactions: number;
    avg_transaction_value: number;
  }>;
  generated_at: string;
}

export default function Finances() {
  const { activeFarm } = useFarm();
  const farmName = activeFarm?.name || 'My Farm';
  const farmLocation = activeFarm?.location || '';
  const farmSlogan = activeFarm?.slogan || '';
  const logoUrl = activeFarm?.logo_url || farmLogo;
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'capital_injection'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<{ type: 'income' | 'expense' | 'capital_injection'; data: any } | null>(null);
  const [txnStartDate, setTxnStartDate] = useState('');
  const [txnEndDate, setTxnEndDate] = useState('');
  const [showPnL, setShowPnL] = useState(false);
  const [visibleCount, setVisibleCount] = useState(200);
  const PAGE_INCREMENT = 200;
  const [pnlReport, setPnlReport] = useState<PnLReport | null>(null);
  const [pnlStartDate, setPnlStartDate] = useState('');
  const [pnlEndDate, setPnlEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [auditTarget, setAuditTarget] = useState<{ table: string; id: string; label: string } | null>(null);
  const [showReconciliation, setShowReconciliation] = useState(false);
  
  const { sales, analytics: salesAnalytics, isLoading: salesLoading, deleteSale, isDeleting: isDeletingSale } = useSales();
  const { purchases, analytics: purchaseAnalytics, isLoading: purchasesLoading, deletePurchase, isDeleting: isDeletingPurchase } = usePurchases();
  const { crops } = useCrops();
  const reconciliationRows = useMemo(() => buildReconciliation(crops || [], sales || []), [crops, sales]);
  const reconSummary = useMemo(() => reconciliationSummary(reconciliationRows), [reconciliationRows]);
  const { capitalInjections, totalCapital, isLoading: capitalLoading, deleteInjection, isDeleting: isDeletingInjection } = useCapitalInjections();
  const profitLossMutation = useProfitLossCalculation();
  const { profile } = useAuth();
  const printedByName = profile?.name || "System User";

  const isLoading = salesLoading || purchasesLoading || capitalLoading;

  const handleGeneratePnL = () => {
    profitLossMutation.mutate(
      { start_date: pnlStartDate || undefined, end_date: pnlEndDate || undefined },
      {
        onSuccess: (data) => {
          if (data?.profit_loss_report) {
            setPnlReport(data.profit_loss_report);
            setShowPnL(true);
          }
        },
      }
    );
  };

  const handleEdit = (type: 'income' | 'expense' | 'capital_injection', originalData: any) => {
    let data: any = {};
    if (type === 'income') {
      data = {
        id: originalData.id, product_name: originalData.product_name, product_type: originalData.product_type,
        buyer: originalData.buyer, buyer_contact: originalData.buyer_contact, quantity: originalData.quantity,
        unit: originalData.unit, unit_price: originalData.unit_price, date: originalData.sale_date,
        payment_status: originalData.payment_status, notes: originalData.notes,
      };
    } else if (type === 'expense') {
      data = {
        id: originalData.id, item_name: originalData.item_name, category: originalData.category,
        supplier: originalData.supplier, supplier_contact: originalData.supplier_contact,
        quantity: originalData.quantity, unit: originalData.unit, unit_price: originalData.unit_cost,
        date: originalData.purchase_date, received_date: originalData.received_date,
        payment_status: originalData.payment_status, notes: originalData.notes,
      };
    } else {
      data = {
        id: originalData.id, amount: originalData.amount, date: originalData.injection_date,
        source: originalData.source, description: originalData.description, notes: originalData.notes,
      };
    }
    setEditTransaction({ type, data });
    setEditDialogOpen(true);
  };

  // Combine sales and purchases into transactions
  const allTransactions = [
    ...sales.map(sale => ({
      id: sale.id, type: 'income' as const, category: sale.product_type,
      description: `${sale.product_name} - ${sale.buyer}`,
      amount: sale.total_amount || 0, date: sale.sale_date,
      status: sale.payment_status === 'paid' ? 'completed' as const : 'pending' as const,
      linkedModule: (sale as any).linked_module || null,
      linkedRecordName: (sale as any).linked_record_name || null,
      originalData: sale
    })),
    ...purchases.map(purchase => ({
      id: purchase.id, type: 'expense' as const, category: purchase.category,
      description: `${purchase.item_name} - ${purchase.supplier}`,
      amount: purchase.total_cost || 0, date: purchase.purchase_date,
      status: purchase.payment_status === 'paid' ? 'completed' as const : 'pending' as const,
      linkedModule: (purchase as any).linked_module || null,
      linkedRecordName: (purchase as any).linked_record_name || null,
      originalData: purchase
    })),
    ...capitalInjections.map(ci => ({
      id: ci.id, type: 'capital_injection' as const, category: 'Capital Injection',
      description: `${ci.source}${ci.description ? ' - ' + ci.description : ''}`,
      amount: ci.amount || 0, date: ci.injection_date,
      status: 'completed' as const,
      linkedModule: null as string | null,
      linkedRecordName: null as string | null,
      originalData: ci
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = allTransactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (txnStartDate && new Date(t.date) < new Date(txnStartDate)) return false;
    if (txnEndDate && new Date(t.date) > new Date(txnEndDate)) return false;
    if (minAmount && t.amount < Number(minAmount)) return false;
    if (maxAmount && t.amount > Number(maxAmount)) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const hay = `${t.description} ${t.category} ${t.linkedRecordName || ''} ${t.amount}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc': return a.amount - b.amount;
      default: return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const totalIncome = salesAnalytics?.totalRevenue || 0;
  const totalExpenses = purchaseAnalytics?.totalExpenses || 0;
  const netProfit = totalIncome - totalExpenses;
  const pendingAmount = allTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);

  const getTypeColor = (type: string) => {
    if (type === 'income') return 'bg-green-100 text-green-800 border-green-200';
    if (type === 'capital_injection') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusColor = (status: string) => {
    return status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financial Management</h1>
            <p className="text-muted-foreground mt-1">Track income, expenses, and profitability</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-farm-green hover:bg-farm-green/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Transaction</DialogTitle>
                </DialogHeader>
                <TransactionForm onClose={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
            </DialogHeader>
            {editTransaction && (
              <TransactionForm
                onClose={() => { setEditDialogOpen(false); setEditTransaction(null); }}
                editMode
                editType={editTransaction.type}
                editData={editTransaction.data}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">{formatKES(totalIncome)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">{formatKES(totalExpenses)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatKES(netProfit)}
                  </p>
                </div>
                <DollarSign className={`h-8 w-8 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Capital Injected</p>
                  <p className="text-2xl font-bold text-blue-600">{formatKES(totalCapital)}</p>
                  <p className="text-xs text-muted-foreground">Owner's Equity</p>
                </div>
                <Landmark className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cash Balance</p>
                  <p className={`text-2xl font-bold ${(totalIncome + totalCapital - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatKES(totalIncome + totalCapital - totalExpenses)}
                  </p>
                  <p className="text-xs text-muted-foreground">Income + Capital − Expenses</p>
                </div>
                <Receipt className="h-8 w-8 text-farm-harvest" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* P&L Report Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              Profit & Loss Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1">
                <Label htmlFor="pnl-start">Start Date</Label>
                <Input id="pnl-start" type="date" value={pnlStartDate} onChange={(e) => setPnlStartDate(e.target.value)} />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="pnl-end">End Date</Label>
                <Input id="pnl-end" type="date" value={pnlEndDate} onChange={(e) => setPnlEndDate(e.target.value)} />
              </div>
              <Button onClick={handleGeneratePnL} disabled={profitLossMutation.isPending} className="bg-farm-green hover:bg-farm-green/90">
                {profitLossMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
                Generate Report
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await exportCapitalInjectionsPDF(capitalInjections, totalCapital, printedByName);
                  } catch (e) { console.error(e); }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Capital Report
              </Button>
            </div>

            {/* P&L Report Results - Modal */}
            <Dialog open={showPnL && !!pnlReport} onOpenChange={(open) => { if (!open) setShowPnL(false); }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {pnlReport && <div id="pnl-report-preview" className="space-y-6">
                {/* === REPORT HEADER === */}
                <div className="bg-farm-green/5 border border-farm-green/20 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src={logoUrl} alt={farmName} className="h-14 w-14 object-contain" />
                      <div>
                        <h3 className="text-lg font-bold text-farm-green">{farmName}</h3>
                        <p className="text-xs text-muted-foreground">{farmLocation}</p>
                        {farmSlogan && <p className="text-xs text-muted-foreground italic">"{farmSlogan}"</p>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground space-y-0.5">
                      <p>Date: {new Date().toLocaleDateString()}</p>
                      <p>Time: {new Date().toLocaleTimeString()}</p>
                      <p>Printed By: {printedByName}</p>
                    </div>
                  </div>
                </div>

                {/* Title + Export Controls */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Profit & Loss Report</h3>
                  <div className="flex gap-2 print:hidden">
                    <Button variant="outline" size="sm" onClick={() => exportPnLToCSV(pnlReport, printedByName)}>
                      <FileSpreadsheet className="h-4 w-4 mr-1" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportPnLToPDF(pnlReport, printedByName, { injections: capitalInjections, totalCapital })}>
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
                    <p className="text-lg font-bold text-green-700">{formatKES(pnlReport.summary.total_revenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Paid: {formatKES(pnlReport.summary.paid_revenue)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs text-muted-foreground font-medium">Total Costs</p>
                    <p className="text-lg font-bold text-red-700">{formatKES(pnlReport.summary.total_costs)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Paid: {formatKES(pnlReport.summary.paid_costs)}</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${pnlReport.summary.gross_profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-xs text-muted-foreground font-medium">Gross Profit</p>
                    <p className={`text-lg font-bold ${pnlReport.summary.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatKES(pnlReport.summary.gross_profit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Margin: {pnlReport.summary.profit_margin_percent.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-muted-foreground font-medium">Capital Injected</p>
                    <p className="text-lg font-bold text-blue-700">{formatKES(totalCapital)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Owner's Equity</p>
                  </div>
                </div>

                {/* Cash Balance row */}
                <div className="p-4 rounded-lg bg-muted border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Cash Balance (Income + Capital − Expenses)</p>
                    </div>
                    <p className={`text-xl font-bold ${(pnlReport.summary.total_revenue + totalCapital - pnlReport.summary.total_costs) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatKES(pnlReport.summary.total_revenue + totalCapital - pnlReport.summary.total_costs)}
                    </p>
                  </div>
                </div>

                {/* Revenue vs Costs Chart */}
                {pnlReport.monthly_trends.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Revenue vs Costs</h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pnlReport.monthly_trends} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => formatKES(value)} />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="costs" name="Costs" fill="#dc2626" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="profit" name="Profit" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Monthly Trends Table */}
                {pnlReport.monthly_trends.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Monthly Trends</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Month</th>
                            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Revenue</th>
                            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Costs</th>
                            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Profit</th>
                            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Txns</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pnlReport.monthly_trends.map((trend) => (
                            <tr key={trend.month} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 px-3 font-medium">{trend.month}</td>
                              <td className="py-2 px-3 text-right text-green-600">{formatKES(trend.revenue)}</td>
                              <td className="py-2 px-3 text-right text-red-600">{formatKES(trend.costs)}</td>
                              <td className={`py-2 px-3 text-right font-semibold ${trend.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {formatKES(trend.profit)}
                              </td>
                              <td className="py-2 px-3 text-right text-muted-foreground">
                                {trend.sales_count + trend.purchases_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Category Performance */}
                {pnlReport.category_performance.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Category Performance</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {pnlReport.category_performance.map((cat) => (
                        <div key={cat.category} className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium capitalize">{cat.category}</span>
                            <Badge variant="secondary">{cat.transactions} sales</Badge>
                          </div>
                          <p className="text-lg font-bold text-green-600">{formatKES(cat.revenue)}</p>
                          <p className="text-xs text-muted-foreground">Avg: {formatKES(cat.avg_transaction_value)} per transaction</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === REPORT FOOTER === */}
                <Separator />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold text-farm-green">{farmName}</p>
                    {farmSlogan && <p className="italic">"{farmSlogan}"</p>}
                  </div>
                  <div className="text-right">
                    <p>Generated: {new Date(pnlReport.generated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Transaction Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions by description, category, linked record, or amount..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(200); }}
            />
            {searchTerm && (
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7" onClick={() => setSearchTerm('')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex gap-2 flex-wrap">
              <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => { setFilter('all'); setVisibleCount(200); }}>All Transactions</Button>
              <Button variant={filter === 'income' ? 'default' : 'outline'} onClick={() => { setFilter('income'); setVisibleCount(200); }} className="text-green-700">Income Only</Button>
              <Button variant={filter === 'expense' ? 'default' : 'outline'} onClick={() => { setFilter('expense'); setVisibleCount(200); }} className="text-red-700">Expenses Only</Button>
              <Button variant={filter === 'capital_injection' ? 'default' : 'outline'} onClick={() => { setFilter('capital_injection'); setVisibleCount(200); }} className="text-blue-700">Capital Injections</Button>
            </div>
            <div className="flex gap-2 items-end ml-auto flex-wrap">
              <div className="space-y-1">
                <Label htmlFor="min-amt" className="text-xs">Min Amount</Label>
                <Input id="min-amt" type="number" placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="h-9 w-[110px]" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="max-amt" className="text-xs">Max Amount</Label>
                <Input id="max-amt" type="number" placeholder="∞" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="h-9 w-[110px]" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sort-by" className="text-xs">Sort by</Label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="date-desc">Newest first</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="amount-desc">Amount: High → Low</option>
                  <option value="amount-asc">Amount: Low → High</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="txn-start" className="text-xs">From</Label>
                <Input id="txn-start" type="date" value={txnStartDate} onChange={(e) => setTxnStartDate(e.target.value)} className="h-9 w-[140px]" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="txn-end" className="text-xs">To</Label>
                <Input id="txn-end" type="date" value={txnEndDate} onChange={(e) => setTxnEndDate(e.target.value)} className="h-9 w-[140px]" />
              </div>
              {(txnStartDate || txnEndDate || minAmount || maxAmount) && (
                <Button variant="ghost" size="sm" onClick={() => { setTxnStartDate(''); setTxnEndDate(''); setMinAmount(''); setMaxAmount(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recent Transactions
              {(txnStartDate || txnEndDate) && (
                <Badge variant="secondary" className="ml-2 text-xs">{txnStartDate || '...'} → {txnEndDate || '...'}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-farm-green" />
                <span className="ml-2 text-muted-foreground">Loading transactions...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No transactions found</p>
                ) : (
                  <>
                    <div className="max-h-[600px] overflow-y-auto space-y-3 pr-1">
                      {filteredTransactions.slice(0, visibleCount).map((transaction) => (
                      <div key={`${transaction.type}-${transaction.id}`} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-100' : transaction.type === 'capital_injection' ? 'bg-blue-100' : 'bg-red-100'}`}>
                            {transaction.type === 'income' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : transaction.type === 'capital_injection' ? (
                              <Landmark className="h-4 w-4 text-blue-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">{transaction.category}</p>
                              {transaction.linkedModule && (
                                <Badge variant="outline" className="text-xs capitalize">{transaction.linkedModule}: {transaction.linkedRecordName}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className={`text-lg font-bold ${transaction.type === 'income' || transaction.type === 'capital_injection' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'expense' ? '-' : '+'}{formatKES(transaction.amount).replace('KSh ', '')}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <Badge className={getTypeColor(transaction.type)}>
                                {transaction.type === 'capital_injection' ? 'capital' : transaction.type}
                              </Badge>
                              <Badge className={getStatusColor(transaction.status)}>{transaction.status}</Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            title="View audit history"
                            onClick={() => setAuditTarget({
                              table: transaction.type === 'income' ? 'sales' : transaction.type === 'capital_injection' ? 'capital_injections' : 'purchases',
                              id: transaction.id,
                              label: transaction.description,
                            })}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(transaction.type, transaction.originalData)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this {transaction.type === 'income' ? 'sale' : transaction.type === 'capital_injection' ? 'capital injection' : 'purchase'}? This will also update financial summaries.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => {
                                    if (transaction.type === 'income') deleteSale(transaction.id);
                                    else if (transaction.type === 'capital_injection') deleteInjection(transaction.id);
                                    else deletePurchase(transaction.id);
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {Math.min(visibleCount, filteredTransactions.length)} of {filteredTransactions.length}
                      </p>
                      {visibleCount < filteredTransactions.length && (
                        <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_INCREMENT)}>
                          Load more
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <AuditTimeline
          open={!!auditTarget}
          onOpenChange={(o) => !o && setAuditTarget(null)}
          tableName={auditTarget?.table || 'sales'}
          recordId={auditTarget?.id || null}
          title={auditTarget?.label}
        />

        <Dialog open={showReconciliation} onOpenChange={setShowReconciliation}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5" />
                Harvest vs Transaction Reconciliation
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Crops with sales</p>
                <p className="text-xl font-bold">{reconSummary.cropsWithSales}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Matched</p>
                <p className="text-xl font-bold text-green-600">{reconSummary.matched}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Mismatched</p>
                <p className="text-xl font-bold text-red-600">{reconSummary.mismatched}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Net variance</p>
                <p className="text-xl font-bold">{formatKES(reconSummary.netVariance)}</p>
              </div>
            </div>

            <div className="rounded-lg border divide-y">
              {reconciliationRows.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center">No crops to reconcile.</p>
              )}
              {reconciliationRows.map((row) => (
                <div key={row.cropId} className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.cropName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.saleCount} linked sale(s) · Harvested {row.salesQuantity} {row.unit}
                        {row.recordedYield !== null && ` · Recorded yield ${row.recordedYield} ${row.unit}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        Expected {formatKES(row.expectedValue)} · Recorded {formatKES(row.transactionTotal)}
                      </p>
                      <Badge
                        className={
                          row.status === 'matched'
                            ? 'bg-green-100 text-green-800'
                            : row.status === 'no-sales'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {row.status === 'matched' ? 'Matched' : row.status === 'no-sales' ? 'No sales' : 'Mismatch'}
                      </Badge>
                    </div>
                  </div>
                  {row.issues.length > 0 && (
                    <ul className="mt-2 text-xs text-red-600 list-disc pl-5 space-y-0.5">
                      {row.issues.map((i, idx) => <li key={idx}>{i}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => exportReconciliationPDF(reconciliationRows)}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
