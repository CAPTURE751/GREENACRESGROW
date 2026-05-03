import { useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, Receipt, FileDown } from 'lucide-react';
import { usePurchases } from '@/hooks/usePurchases';
import { formatKES } from '@/lib/currency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { farmFileName } from '@/lib/report-export';

export default function Expenses() {
  const { purchases } = usePurchases();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cat, setCat] = useState('all');

  const categories = useMemo(() => Array.from(new Set(purchases.map(p => p.category).filter(Boolean))) as string[], [purchases]);

  const filtered = useMemo(() => purchases.filter(p => {
    if (from && p.purchase_date < from) return false;
    if (to && p.purchase_date > to) return false;
    if (cat !== 'all' && p.category !== cat) return false;
    return true;
  }), [purchases, from, to, cat]);

  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';
  const todayTotal = purchases.filter(p => p.purchase_date === today).reduce((s, p) => s + Number(p.total_cost || 0), 0);
  const monthTotal = purchases.filter(p => p.purchase_date >= monthStart).reduce((s, p) => s + Number(p.total_cost || 0), 0);
  const filteredTotal = filtered.reduce((s, p) => s + Number(p.total_cost || 0), 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(p => { const k = p.category || 'Uncategorized'; map[k] = (map[k] || 0) + Number(p.total_cost || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const exportPDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Expenses Report', 14, 16);
    doc.setFontSize(9); doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    autoTable(doc, {
      startY: 28, head: [['Category', 'Total']],
      body: byCategory.map(([k, v]) => [k, formatKES(v)]),
      headStyles: { fillColor: [76, 119, 62] },
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['Date', 'Item', 'Category', 'Qty', 'Total', 'Linked']],
      body: filtered.map(p => [p.purchase_date, p.item_name || '-', p.category || '-', String(p.quantity || ''), formatKES(Number(p.total_cost || 0)), p.linked_record_name || '-']),
      headStyles: { fillColor: [76, 119, 62] }, styles: { fontSize: 8 },
    });
    doc.save(await farmFileName('Expenses', 'pdf'));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" /> Expenses</h1>
          <p className="text-muted-foreground">Daily, monthly, and per-category expense tracking</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Today</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatKES(todayTotal)}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">This Month</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatKES(monthTotal)}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Filtered Total</CardTitle><Receipt className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatKES(filteredTotal)}</div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportPDF}><FileDown className="h-4 w-4 mr-2" />Export PDF</Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-base">By Category</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {byCategory.length === 0 ? <p className="text-muted-foreground text-sm">No data</p> :
                byCategory.map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm"><span>{k}</span><span className="font-medium">{formatKES(v)}</span></div>
                ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Transactions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Total</TableHead><TableHead>Linked</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses</TableCell></TableRow>
                  ) : filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.purchase_date}</TableCell>
                      <TableCell>{p.item_name || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{p.category || 'Uncategorized'}</Badge></TableCell>
                      <TableCell>{formatKES(Number(p.total_cost || 0))}</TableCell>
                      <TableCell className="text-xs">{p.linked_record_name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
