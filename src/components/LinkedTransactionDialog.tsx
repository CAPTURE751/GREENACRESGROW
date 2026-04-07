import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLinkedTransactions } from "@/hooks/useLinkedTransactions";
import { useSales } from "@/hooks/useSales";
import { usePurchases } from "@/hooks/usePurchases";
import { formatKES } from "@/lib/currency";
import { exportModulePnLToPDF } from "@/lib/pnl-module-export";
import { toast } from "sonner";
import {
  Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Loader2, Download,
  Filter, X,
} from "lucide-react";

interface LinkedTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: 'crop' | 'livestock';
  recordId: string;
  recordName: string;
}

export function LinkedTransactionDialog({
  open, onOpenChange, module, recordId, recordName,
}: LinkedTransactionDialogProps) {
  const { transactions, totalIncome, totalExpenses, netProfitLoss, isLoading, sales, purchases } = useLinkedTransactions(module, recordId);
  const { createSale } = useSales();
  const { createPurchase } = usePurchases();
  const [showAddForm, setShowAddForm] = useState(false);
  const [txnType, setTxnType] = useState<'income' | 'expense'>('income');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    notes: '',
    product_name: recordName,
    buyer: '',
    buyer_contact: '',
    quantity: '',
    unit: '',
    unit_price: '',
    payment_status: 'pending',
    item_name: '',
    category: '',
    supplier: '',
    supplier_contact: '',
  });

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.date) > new Date(dateTo)) return false;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (txnType === 'income') {
      createSale({
        product_name: formData.product_name || recordName,
        product_type: module as any,
        product_id: recordId,
        buyer: formData.buyer,
        buyer_contact: formData.buyer_contact,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        unit_price: Number(formData.unit_price),
        sale_date: formData.date,
        payment_status: formData.payment_status as any,
        notes: formData.notes,
        linked_module: module,
        linked_record_id: recordId,
        linked_record_name: recordName,
      } as any);
    } else {
      createPurchase({
        item_name: formData.item_name,
        category: formData.category,
        supplier: formData.supplier,
        supplier_contact: formData.supplier_contact,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        unit_cost: Number(formData.unit_price),
        purchase_date: formData.date,
        payment_status: formData.payment_status as any,
        notes: formData.notes,
        linked_module: module,
        linked_record_id: recordId,
        linked_record_name: recordName,
      } as any);
    }
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      notes: '', product_name: recordName, buyer: '', buyer_contact: '',
      quantity: '', unit: '', unit_price: '', payment_status: 'pending',
      item_name: '', category: '', supplier: '', supplier_contact: '',
    });
  };

  const handleExportPDF = async () => {
    try {
      const reportData: Record<string, any> = {
        [recordName]: {
          revenue: totalIncome,
          costs: totalExpenses,
          salesCount: sales.length,
          salesDetails: sales,
          costDetails: purchases,
        },
      };
      const totals = { totalRevenue: totalIncome, totalCosts: totalExpenses, netProfit: netProfitLoss };
      await exportModulePnLToPDF(module, reportData, totals, recordName);
      toast.success(`${recordName} P&L report downloaded`);
    } catch { toast.error("Failed to generate PDF"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Financial Details — {recordName}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button size="sm" className="bg-farm-green hover:bg-farm-green/90" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="h-4 w-4 mr-1" /> Add Transaction
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="text-lg font-bold text-green-600">{formatKES(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-lg font-bold text-red-600">{formatKES(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${netProfitLoss >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{netProfitLoss >= 0 ? 'Profit' : 'Loss'}</p>
              <p className={`text-lg font-bold ${netProfitLoss >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatKES(Math.abs(netProfitLoss))}</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Transaction Form */}
        {showAddForm && (
          <Card className="border-2 border-dashed border-farm-green/30">
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-3 items-end">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={txnType} onValueChange={(v: 'income' | 'expense') => setTxnType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income (Sale)</SelectItem>
                        <SelectItem value="expense">Expense (Purchase)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {txnType === 'income' ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Product Name</Label>
                        <Input value={formData.product_name} onChange={e => setFormData(p => ({ ...p, product_name: e.target.value }))} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Buyer *</Label>
                        <Input value={formData.buyer} onChange={e => setFormData(p => ({ ...p, buyer: e.target.value }))} required />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Item Name *</Label>
                        <Input value={formData.item_name} onChange={e => setFormData(p => ({ ...p, item_name: e.target.value }))} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="seeds">Seeds</SelectItem>
                            <SelectItem value="fertilizer">Fertilizer</SelectItem>
                            <SelectItem value="pesticides">Pesticides</SelectItem>
                            <SelectItem value="feed">Animal Feed</SelectItem>
                            <SelectItem value="medicine">Medicine</SelectItem>
                            <SelectItem value="labor">Labor</SelectItem>
                            <SelectItem value="transport">Transport</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Supplier *</Label>
                        <Input value={formData.supplier} onChange={e => setFormData(p => ({ ...p, supplier: e.target.value }))} required />
                      </div>
                    </>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity *</Label>
                    <Input type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} required min="0" step="0.1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Input value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} placeholder="kg, lbs, pcs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{txnType === 'income' ? 'Unit Price' : 'Unit Cost'} *</Label>
                    <Input type="number" value={formData.unit_price} onChange={e => setFormData(p => ({ ...p, unit_price: e.target.value }))} required min="0" step="0.01" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddForm(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-farm-green hover:bg-farm-green/90">Save Transaction</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-2 items-center flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button variant={filterType === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('all')}>All</Button>
          <Button variant={filterType === 'income' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('income')}>Income</Button>
          <Button variant={filterType === 'expense' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('expense')}>Expenses</Button>
          <div className="ml-auto flex gap-2 items-center">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-[130px]" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-[130px]" />
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}><X className="h-3 w-3" /></Button>
            )}
          </div>
        </div>

        {/* Transaction History */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-farm-green" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No transactions linked to {recordName} yet.</p>
            <p className="text-xs mt-1">Click "Add Transaction" to record income or expenses.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map(t => (
                <TableRow key={`${t.type}-${t.id}`}>
                  <TableCell className="text-sm">{new Date(t.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{t.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{t.status}</Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'expense' ? '-' : '+'}{formatKES(t.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
