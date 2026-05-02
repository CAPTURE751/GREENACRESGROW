import { useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ArrowDownToLine, ArrowUpFromLine, Wrench, FileDown, Pencil, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useInventoryMovements } from '@/hooks/useInventoryMovements';
import { useFarm } from '@/contexts/FarmContext';
import { formatKES } from '@/lib/currency';
import { InventoryItemForm } from '@/components/InventoryItemForm';
import { StockMovementForm } from '@/components/StockMovementForm';
import { exportInventoryPDF, exportMovementsPDF } from '@/lib/inventory-export';

export default function InventoryPage() {
  const { inventory, isLoading } = useInventory();
  const { movements } = useInventoryMovements();
  const { activeFarm } = useFarm();

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [movementOpen, setMovementOpen] = useState<{ open: boolean; type: 'in' | 'out' | 'adjustment' }>({ open: false, type: 'in' });

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);

  const [movFromDate, setMovFromDate] = useState('');
  const [movToDate, setMovToDate] = useState('');
  const [movTypeFilter, setMovTypeFilter] = useState('all');
  const [movModuleFilter, setMovModuleFilter] = useState('all');

  const itemMap = useMemo(() => Object.fromEntries(inventory.map((i: any) => [i.id, i])), [inventory]);

  const categories = useMemo(
    () => Array.from(new Set(inventory.map((i: any) => i.category).filter(Boolean))) as string[],
    [inventory]
  );

  const filteredInventory = useMemo(() => {
    return inventory.filter((i: any) => {
      if (search && !i.item_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      if (typeFilter !== 'all' && i.item_type !== typeFilter) return false;
      if (lowOnly && Number(i.quantity) > Number(i.min_threshold || 0)) return false;
      return true;
    });
  }, [inventory, search, categoryFilter, typeFilter, lowOnly]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (movFromDate && m.movement_date < movFromDate) return false;
      if (movToDate && m.movement_date > movToDate) return false;
      if (movTypeFilter !== 'all' && m.movement_type !== movTypeFilter) return false;
      if (movModuleFilter !== 'all' && m.linked_module !== movModuleFilter) return false;
      return true;
    });
  }, [movements, movFromDate, movToDate, movTypeFilter, movModuleFilter]);

  const totalValue = filteredInventory.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_cost || 0), 0);
  const lowStockCount = inventory.filter((i: any) => Number(i.quantity) <= Number(i.min_threshold || 0)).length;

  // Predictive: days remaining = current / avg daily out (last 30 days)
  const usageStats = useMemo(() => {
    const stats: Record<string, { dailyAvg: number; daysLeft: number | null }> = {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    inventory.forEach((i: any) => {
      const outs = movements.filter(
        (m) => m.inventory_id === i.id && m.movement_type === 'out' && new Date(m.movement_date + 'T00:00:00') >= cutoff
      );
      const total = outs.reduce((s, m) => s + Number(m.quantity), 0);
      const dailyAvg = total / 30;
      const daysLeft = dailyAvg > 0 ? Math.floor(Number(i.quantity) / dailyAvg) : null;
      stats[i.id] = { dailyAvg, daysLeft };
    });
    return stats;
  }, [inventory, movements]);

  const farmName = activeFarm?.name || 'JEFF TRICKS FARM LTD';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-muted-foreground">Stock tracking, FIFO costing, and audit trail</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => { setEditItem(null); setItemFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Add Item
            </Button>
            <Button variant="outline" onClick={() => setMovementOpen({ open: true, type: 'in' })}>
              <ArrowDownToLine className="h-4 w-4 mr-2" />Stock In
            </Button>
            <Button variant="outline" onClick={() => setMovementOpen({ open: true, type: 'out' })}>
              <ArrowUpFromLine className="h-4 w-4 mr-2" />Stock Out
            </Button>
            <Button variant="outline" onClick={() => setMovementOpen({ open: true, type: 'adjustment' })}>
              <Wrench className="h-4 w-4 mr-2" />Adjustment
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{inventory.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Stock Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{formatKES(totalValue)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-destructive">{lowStockCount}</div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="movements">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="input">Input</SelectItem>
                      <SelectItem value="output">Output</SelectItem>
                      <SelectItem value="asset">Asset</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant={lowOnly ? 'default' : 'outline'} onClick={() => setLowOnly(!lowOnly)}>
                    {lowOnly ? '✓ Low Stock' : 'Low Stock Only'}
                  </Button>
                  <Button variant="outline" onClick={() => exportInventoryPDF(filteredInventory, { farmName, title: 'Inventory Report' })}>
                    <FileDown className="h-4 w-4 mr-2" />Export PDF
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategoryFilter('all'); setTypeFilter('all'); setLowOnly(false); }}>
                  Reset Filters
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : filteredInventory.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No items found</TableCell></TableRow>
                    ) : (
                      filteredInventory.map((i: any) => {
                        const isLow = Number(i.quantity) <= Number(i.min_threshold || 0);
                        const daysLeft = usageStats[i.id]?.daysLeft;
                        return (
                          <TableRow key={i.id}>
                            <TableCell>
                              <div className="font-medium">{i.item_name}</div>
                              <div className="text-xs text-muted-foreground">{i.category} • {i.location || 'No location'}</div>
                            </TableCell>
                            <TableCell><Badge variant="outline">{i.item_type || 'input'}</Badge></TableCell>
                            <TableCell>{Number(i.quantity).toFixed(2)} {i.unit}</TableCell>
                            <TableCell>{formatKES(Number(i.unit_cost) || 0)}</TableCell>
                            <TableCell>{formatKES(Number(i.quantity) * Number(i.unit_cost || 0))}</TableCell>
                            <TableCell>
                              {daysLeft === null ? <span className="text-xs text-muted-foreground">—</span> :
                                <span className={daysLeft < 7 ? 'text-destructive font-medium' : ''}>{daysLeft}d</span>}
                            </TableCell>
                            <TableCell>
                              {isLow ? <Badge variant="destructive">Low</Badge> : <Badge variant="secondary">OK</Badge>}
                            </TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" onClick={() => { setEditItem(i); setItemFormOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <Input type="date" value={movFromDate} onChange={(e) => setMovFromDate(e.target.value)} placeholder="From" />
                  <Input type="date" value={movToDate} onChange={(e) => setMovToDate(e.target.value)} placeholder="To" />
                  <Select value={movTypeFilter} onValueChange={setMovTypeFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="in">Stock In</SelectItem>
                      <SelectItem value="out">Stock Out</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={movModuleFilter} onValueChange={setMovModuleFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      <SelectItem value="crop">Crop</SelectItem>
                      <SelectItem value="livestock">Livestock</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => exportMovementsPDF(filteredMovements, itemMap, { farmName, title: 'Inventory Transactions' })}>
                    <FileDown className="h-4 w-4 mr-2" />Export PDF
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setMovFromDate(''); setMovToDate(''); setMovTypeFilter('all'); setMovModuleFilter('all'); }}>
                  Reset Filters
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Source/Dest</TableHead>
                      <TableHead>Module</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow>
                    ) : (
                      filteredMovements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{m.movement_date}</TableCell>
                          <TableCell>{itemMap[m.inventory_id]?.item_name || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={m.movement_type === 'in' ? 'default' : m.movement_type === 'out' ? 'secondary' : 'destructive'}>
                              {m.movement_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{Number(m.quantity).toFixed(2)}</TableCell>
                          <TableCell>{formatKES(Number(m.total_cost) || 0)}</TableCell>
                          <TableCell className="text-sm">{m.source || m.destination || m.reason || '—'}</TableCell>
                          <TableCell>{m.linked_module && <Badge variant="outline">{m.linked_module}</Badge>}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <InventoryItemForm
        open={itemFormOpen}
        onOpenChange={(o) => { setItemFormOpen(o); if (!o) setEditItem(null); }}
        item={editItem}
      />
      <StockMovementForm
        open={movementOpen.open}
        onOpenChange={(o) => setMovementOpen({ ...movementOpen, open: o })}
        type={movementOpen.type}
      />
    </Layout>
  );
}
