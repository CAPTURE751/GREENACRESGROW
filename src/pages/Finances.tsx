
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatKES } from "@/lib/currency";
import { useSales } from "@/hooks/useSales";
import { usePurchases } from "@/hooks/usePurchases";
import { useProfitLossCalculation } from "@/hooks/useEdgeFunctions";
import { TransactionForm } from "@/components/TransactionForm";
import { 
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Calendar,
  Filter,
  Loader2,
  FileBarChart,
  BarChart3,
  X,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { exportPnLToCSV, exportPnLToPDF } from "@/lib/report-export";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import farmLogo from "@/assets/farm-logo.png";


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
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txnStartDate, setTxnStartDate] = useState('');
  const [txnEndDate, setTxnEndDate] = useState('');
  const [showPnL, setShowPnL] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [pnlReport, setPnlReport] = useState<PnLReport | null>(null);
  const [pnlStartDate, setPnlStartDate] = useState('');
  const [pnlEndDate, setPnlEndDate] = useState('');
  
  const { sales, analytics: salesAnalytics, isLoading: salesLoading } = useSales();
  const { purchases, analytics: purchaseAnalytics, isLoading: purchasesLoading } = usePurchases();
  const profitLossMutation = useProfitLossCalculation();
  const { profile } = useAuth();
  const printedByName = profile?.name || "System User";


  const isLoading = salesLoading || purchasesLoading;

  const handleGeneratePnL = () => {
    profitLossMutation.mutate(
      {
        start_date: pnlStartDate || undefined,
        end_date: pnlEndDate || undefined,
      },
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

  // Combine sales and purchases into transactions
  const allTransactions = [
    ...sales.map(sale => ({
      id: sale.id,
      type: 'income' as const,
      category: sale.product_type,
      description: `${sale.product_name} - ${sale.buyer}`,
      amount: sale.total_amount || 0,
      date: sale.sale_date,
      status: sale.payment_status === 'paid' ? 'completed' as const : 'pending' as const,
      originalData: sale
    })),
    ...purchases.map(purchase => ({
      id: purchase.id,
      type: 'expense' as const,
      category: purchase.category,
      description: `${purchase.item_name} - ${purchase.supplier}`,
      amount: purchase.total_cost || 0,
      date: purchase.purchase_date,
      status: purchase.payment_status === 'paid' ? 'completed' as const : 'pending' as const,
      originalData: purchase
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = allTransactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (txnStartDate && new Date(t.date) < new Date(txnStartDate)) return false;
    if (txnEndDate && new Date(t.date) > new Date(txnEndDate)) return false;
    return true;
  });

  const totalIncome = salesAnalytics?.totalRevenue || 0;
  const totalExpenses = purchaseAnalytics?.totalExpenses || 0;
  const netProfit = totalIncome - totalExpenses;
  const pendingAmount = allTransactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const getTypeColor = (type: string) => {
    return type === 'income' 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusColor = (status: string) => {
    return status === 'completed'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Transaction</DialogTitle>
                </DialogHeader>
                <TransactionForm onClose={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-farm-harvest">
                    {formatKES(pendingAmount)}
                  </p>
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
                <Input
                  id="pnl-start"
                  type="date"
                  value={pnlStartDate}
                  onChange={(e) => setPnlStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="pnl-end">End Date</Label>
                <Input
                  id="pnl-end"
                  type="date"
                  value={pnlEndDate}
                  onChange={(e) => setPnlEndDate(e.target.value)}
                />
              </div>
              <Button
                onClick={handleGeneratePnL}
                disabled={profitLossMutation.isPending}
                className="bg-farm-green hover:bg-farm-green/90"
              >
                {profitLossMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Generate Report
              </Button>
            </div>

            {/* P&L Report Results - Modal */}
            <Dialog open={showPnL && !!pnlReport} onOpenChange={(open) => { if (!open) setShowPnL(false); }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <div id="pnl-report-preview" className="space-y-6">
                {/* === REPORT HEADER === */}
                <div className="bg-farm-green/5 border border-farm-green/20 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src={farmLogo} alt="JEFF TRICKS FARM LTD" className="h-14 w-14 object-contain" />
                      <div>
                        <h3 className="text-lg font-bold text-farm-green">JEFF TRICKS FARM LTD</h3>
                        <p className="text-xs text-muted-foreground">Nyeri, Kenya</p>
                        <p className="text-xs text-muted-foreground italic">"Nurturing the Land, Feeding the Future"</p>
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
                    <Button variant="outline" size="sm" onClick={() => exportPnLToPDF(pnlReport, printedByName)}>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Paid: {formatKES(pnlReport.summary.paid_revenue)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs text-muted-foreground font-medium">Total Costs</p>
                    <p className="text-lg font-bold text-red-700">{formatKES(pnlReport.summary.total_costs)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Paid: {formatKES(pnlReport.summary.paid_costs)}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg border ${pnlReport.summary.gross_profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-xs text-muted-foreground font-medium">Gross Profit</p>
                    <p className={`text-lg font-bold ${pnlReport.summary.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatKES(pnlReport.summary.gross_profit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Margin: {pnlReport.summary.profit_margin_percent.toFixed(1)}%
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg border ${pnlReport.summary.net_profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-xs text-muted-foreground font-medium">Net Profit</p>
                    <p className={`text-lg font-bold ${pnlReport.summary.net_profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {formatKES(pnlReport.summary.net_profit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pnlReport.summary.total_sales_transactions} sales · {pnlReport.summary.total_purchase_transactions} purchases
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
                          <p className="text-xs text-muted-foreground">
                            Avg: {formatKES(cat.avg_transaction_value)} per transaction
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === REPORT FOOTER === */}
                <Separator />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold text-farm-green">JEFF TRICKS FARM LTD</p>
                    <p className="italic">"Nurturing the Land, Feeding the Future"</p>
                  </div>
                  <div className="text-right">
                    <p>Generated: {new Date(pnlReport.generated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Transaction Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => { setFilter('all'); setCurrentPage(1); }}
            >
              All Transactions
            </Button>
            <Button
              variant={filter === 'income' ? 'default' : 'outline'}
              onClick={() => { setFilter('income'); setCurrentPage(1); }}
              className="text-green-700"
            >
              Income Only
            </Button>
            <Button
              variant={filter === 'expense' ? 'default' : 'outline'}
              onClick={() => setFilter('expense')}
              className="text-red-700"
            >
              Expenses Only
            </Button>
          </div>
          <div className="flex gap-2 items-end ml-auto">
            <div className="space-y-1">
              <Label htmlFor="txn-start" className="text-xs">From</Label>
              <Input
                id="txn-start"
                type="date"
                value={txnStartDate}
                onChange={(e) => setTxnStartDate(e.target.value)}
                className="h-9 w-[140px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="txn-end" className="text-xs">To</Label>
              <Input
                id="txn-end"
                type="date"
                value={txnEndDate}
                onChange={(e) => setTxnEndDate(e.target.value)}
                className="h-9 w-[140px]"
              />
            </div>
            {(txnStartDate || txnEndDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setTxnStartDate(''); setTxnEndDate(''); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recent Transactions
              {(txnStartDate || txnEndDate) && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {txnStartDate || '...'} → {txnEndDate || '...'}
                </Badge>
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
                    {filteredTransactions
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((transaction) => (
                      <div key={`${transaction.type}-${transaction.id}`} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {transaction.type === 'income' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">{transaction.category}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(transaction.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatKES(transaction.amount).replace('KSh ', '')}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Badge className={getTypeColor(transaction.type)}>
                              {transaction.type}
                            </Badge>
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {filteredTransactions.length > ITEMS_PER_PAGE && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                          >
                            Previous
                          </Button>
                          {Array.from({ length: Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) }, (_, i) => (
                            <Button
                              key={i + 1}
                              variant={currentPage === i + 1 ? 'default' : 'outline'}
                              size="sm"
                              className="w-9"
                              onClick={() => setCurrentPage(i + 1)}
                            >
                              {i + 1}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)}
                            onClick={() => setCurrentPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
