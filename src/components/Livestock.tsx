
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useLivestock } from "@/hooks/useLivestock";
import { useLivestockBatches } from "@/hooks/useLivestockBatches";
import { useSales } from "@/hooks/useSales";
import { usePurchases } from "@/hooks/usePurchases";
import { formatKES } from "@/lib/currency";
import { LivestockForm } from "@/components/LivestockForm";
import { LinkedTransactionDialog } from "@/components/LinkedTransactionDialog";
import { BirthsDialog } from "@/components/BirthsDialog";
import { calculateAge } from "@/lib/age-calculator";
import { exportModulePnLToPDF } from "@/lib/pnl-module-export";
import { toast } from "sonner";
import {
  Plus, Search, Beef, Calendar, MapPin, Activity, Heart, Scale,
  Loader2, Baby, Download, Pencil, FileText, DollarSign, Skull, Wheat, Users,
} from "lucide-react";


const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-green-100 text-green-800';
    case 'needs-attention': case 'needs_attention': return 'bg-yellow-100 text-yellow-800';
    case 'sick': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'cattle': return '🐄';
    case 'pig': return '🐷';
    case 'chicken': return '🐔';
    case 'sheep': return '🐑';
    case 'goat': return '🐐';
    default: return '🐾';
  }
};

const autoBatchId = (type: string, date: string) =>
  `${(type || 'BATCH').toUpperCase().replace(/\s+/g, '')}${date}`;

export function Livestock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [healthLogOpen, setHealthLogOpen] = useState(false);
  const [birthsOpen, setBirthsOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  const [financialsAnimal, setFinancialsAnimal] = useState<any>(null);
  const [financialsBatch, setFinancialsBatch] = useState<any>(null);
  const [editBatch, setEditBatch] = useState<any>(null);
  const [mortalityFor, setMortalityFor] = useState<string | null>(null);
  const [mortalityCount, setMortalityCount] = useState('1');
  const [feedFor, setFeedFor] = useState<string | null>(null);
  const [feedAmount, setFeedAmount] = useState('');
  const [feedUnit, setFeedUnit] = useState('kg');
  const { livestock, isLoading, createLivestock, updateLivestock, isCreating, isUpdating } = useLivestock();
  const { batches, createBatch, updateBatch, recordMortality, recordFeed, deleteBatch, isCreating: isCreatingBatch } = useLivestockBatches();
  const [addMode, setAddMode] = useState<'individual' | 'batch'>('individual');
  const today = new Date().toISOString().split('T')[0];
  const [batchForm, setBatchForm] = useState({
    animal_type: 'chicken', breed: '', batch_id: autoBatchId('chicken', today), initial_quantity: '',
    arrival_date: today, source: '', notes: '',
  });

  const filteredLivestock = livestock.filter(animal =>
    (animal.type?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (animal.breed?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    animal.farm_location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateLivestock = async (livestockData: any) => {
    if (livestockData.tag_number && livestock.some(a => (a.tag_number || '').toLowerCase() === String(livestockData.tag_number).toLowerCase())) {
      toast.error(`Tag number "${livestockData.tag_number}" is already in use`);
      return;
    }
    createLivestock(livestockData);
    setIsDialogOpen(false);
  };

  const handleUpdateLivestock = async (livestockData: any) => {
    if (!selectedAnimal) return;
    const updates: any = {};
    Object.keys(livestockData).forEach(key => {
      const val = livestockData[key];
      if (val instanceof Date) {
        updates[key] = val.toISOString().split('T')[0];
      } else if (val !== undefined && val !== '') {
        updates[key] = val;
      }
    });
    updateLivestock({ id: selectedAnimal.id, updates });
    setEditDialogOpen(false);
    setSelectedAnimal(null);
  };

  const handleHealthStatusUpdate = (animal: any, newStatus: string) => {
    updateLivestock({
      id: animal.id,
      updates: {
        health_status: newStatus,
        notes: `${animal.notes ? animal.notes + '\n' : ''}[${new Date().toLocaleDateString()}] Health status changed to: ${newStatus}`,
      },
    });
    setHealthLogOpen(false);
    setSelectedAnimal(null);
  };

  const batchAnimalsTotal = batches.reduce((s, b) => s + (b.current_quantity || 0), 0);
  const totalAnimals = livestock.length + batchAnimalsTotal;
  const healthyAnimals = livestock.filter(animal => animal.health_status === 'healthy').length;
  const needAttentionAnimals = livestock.filter(animal => animal.health_status === 'needs_attention' || animal.health_status === 'sick').length;
  const avgWeight = livestock.length > 0 
    ? livestock.reduce((sum, animal) => sum + (animal.weight || 0), 0) / livestock.length 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Livestock Management</h1>
          <p className="text-muted-foreground">Monitor and care for your animals</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const reportData: Record<string, any> = {};
                const keyFor = (a: any) => `${a.type} - ${a.breed || 'Unknown'}`;
                const bucket = (key: string) => {
                  if (!reportData[key]) reportData[key] = { revenue: 0, costs: 0, salesCount: 0, salesDetails: [], costDetails: [] };
                  return reportData[key];
                };
                livestock.forEach((a: any) => {
                  const b = bucket(keyFor(a));
                  if (a.purchase_price) {
                    b.costs += Number(a.purchase_price) || 0;
                    b.costDetails.push({ date: a.purchase_date, item: `Purchase ${a.tag_number || a.type}`, amount: Number(a.purchase_price) || 0 });
                  }
                });
                batches.forEach((b: any) => bucket(`${b.animal_type} - ${b.breed || 'Batch'}`));
                const groupFor = (rec: any) => {
                  if (rec.linked_module === 'livestock' && rec.linked_record_id) {
                    const a = livestock.find((l: any) => l.id === rec.linked_record_id);
                    if (a) return keyFor(a);
                    const bt: any = batches.find((x: any) => x.id === rec.linked_record_id);
                    if (bt) return `${bt.animal_type} - ${bt.breed || 'Batch'}`;
                  }
                  return null;
                };
                (sales as any[]).forEach((s) => {
                  const key = groupFor(s);
                  if (!key) return;
                  const amount = Number(s.total_amount) || (Number(s.quantity) || 0) * (Number(s.unit_price) || 0);
                  const b = bucket(key);
                  b.revenue += amount;
                  b.salesCount += 1;
                  b.salesDetails.push({ date: s.sale_date, buyer: s.buyer, quantity: s.quantity, unit: s.unit, amount });
                });
                (purchases as any[]).forEach((p) => {
                  const key = groupFor(p);
                  if (!key) return;
                  const amount = Number(p.total_cost) || (Number(p.quantity) || 0) * (Number(p.unit_cost) || 0);
                  const b = bucket(key);
                  b.costs += amount;
                  b.costDetails.push({ date: p.purchase_date, item: p.item_name, supplier: p.supplier, amount });
                });
                const totalRevenue = Object.values(reportData).reduce((s: number, d: any) => s + d.revenue, 0);
                const totalCosts = Object.values(reportData).reduce((s: number, d: any) => s + d.costs, 0);
                const totals = { totalRevenue, totalCosts, netProfit: totalRevenue - totalCosts };
                await exportModulePnLToPDF("livestock", reportData, totals, "all");
                toast.success("Livestock report downloaded");
              } catch (e) { toast.error("Failed to generate report"); }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-farm-barn hover:bg-farm-barn/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add New Animal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Animal</DialogTitle>
              </DialogHeader>
              <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'individual' | 'batch')}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="individual">Individual Animal</TabsTrigger>
                  <TabsTrigger value="batch">Bulk Batch (Poultry/Group)</TabsTrigger>
                </TabsList>
                <TabsContent value="individual" className="pt-4">
                  <LivestockForm onSubmit={handleCreateLivestock} onCancel={() => setIsDialogOpen(false)} isLoading={isCreating} />
                </TabsContent>
                <TabsContent value="batch" className="pt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">Use for groups counted as a total (e.g. 100 chickens). Each batch is counted toward Total Animals.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Animal Type *</Label>
                      <Input
                        value={batchForm.animal_type}
                        onChange={(e) => {
                          const t = e.target.value;
                          setBatchForm({ ...batchForm, animal_type: t, batch_id: autoBatchId(t, batchForm.arrival_date) });
                        }}
                        list="batch-animal-types"
                        placeholder="e.g. chicken, turkey, duck"
                      />
                      <datalist id="batch-animal-types">
                        <option value="chicken" /><option value="turkey" /><option value="duck" />
                        <option value="quail" /><option value="rabbit" /><option value="goat" /><option value="sheep" />
                      </datalist>
                    </div>
                    <div><Label>Batch ID * (auto)</Label><Input value={batchForm.batch_id} onChange={(e) => setBatchForm({ ...batchForm, batch_id: e.target.value })} placeholder="e.g. CHICKEN2026-05-09" /></div>
                    <div><Label>Breed</Label><Input value={batchForm.breed} onChange={(e) => setBatchForm({ ...batchForm, breed: e.target.value })} /></div>
                    <div><Label>Quantity *</Label><Input type="number" min="1" value={batchForm.initial_quantity} onChange={(e) => setBatchForm({ ...batchForm, initial_quantity: e.target.value })} /></div>
                    <div><Label>Arrival Date</Label><Input type="date" value={batchForm.arrival_date} onChange={(e) => {
                      const d = e.target.value;
                      setBatchForm({ ...batchForm, arrival_date: d, batch_id: autoBatchId(batchForm.animal_type, d) });
                    }} /></div>
                    <div><Label>Source</Label><Input value={batchForm.source} onChange={(e) => setBatchForm({ ...batchForm, source: e.target.value })} /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea value={batchForm.notes} onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button
                      disabled={isCreatingBatch || !batchForm.batch_id || !batchForm.initial_quantity || !batchForm.animal_type}
                      onClick={() => {
                        const qty = Number(batchForm.initial_quantity);
                        if (!qty || qty < 1) { toast.error('Enter a valid quantity'); return; }
                        createBatch({
                          animal_type: batchForm.animal_type.toLowerCase(),
                          breed: batchForm.breed || null,
                          batch_id: batchForm.batch_id,
                          initial_quantity: qty,
                          current_quantity: qty,
                          arrival_date: batchForm.arrival_date,
                          source: batchForm.source || null,
                          notes: batchForm.notes || null,
                        } as any);
                        setIsDialogOpen(false);
                        const nd = new Date().toISOString().split('T')[0];
                        setBatchForm({ animal_type: 'chicken', breed: '', batch_id: autoBatchId('chicken', nd), initial_quantity: '', arrival_date: nd, source: '', notes: '' });
                      }}
                    >
                      {isCreatingBatch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Batch
                    </Button>
                  </DialogFooter>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setSelectedAnimal(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Animal</DialogTitle>
          </DialogHeader>
          {selectedAnimal && (
            <LivestockForm
              onSubmit={handleUpdateLivestock}
              onCancel={() => { setEditDialogOpen(false); setSelectedAnimal(null); }}
              isLoading={isUpdating}
              initialData={{
                type: selectedAnimal.type,
                tag_number: selectedAnimal.tag_number || '',
                breed: selectedAnimal.breed || '',
                farm_location: selectedAnimal.farm_location,
                gender: selectedAnimal.gender || '',
                health_status: selectedAnimal.health_status || 'healthy',
                weight: selectedAnimal.weight || undefined,
                purchase_price: selectedAnimal.purchase_price || undefined,
                notes: selectedAnimal.notes || '',
                date_of_birth: selectedAnimal.date_of_birth ? new Date(selectedAnimal.date_of_birth) : undefined,
                date_of_arrival_at_farm: selectedAnimal.date_of_arrival_at_farm ? new Date(selectedAnimal.date_of_arrival_at_farm) : undefined,
                date_of_birth_on_farm: selectedAnimal.date_of_birth_on_farm ? new Date(selectedAnimal.date_of_birth_on_farm) : undefined,
                purchase_date: selectedAnimal.purchase_date ? new Date(selectedAnimal.purchase_date) : undefined,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Health Log Dialog */}
      <Dialog open={healthLogOpen} onOpenChange={(open) => { setHealthLogOpen(open); if (!open) setSelectedAnimal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Health Log - {selectedAnimal?.type} {selectedAnimal?.breed ? `(${selectedAnimal.breed})` : ''}</DialogTitle>
          </DialogHeader>
          {selectedAnimal && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium">Current Status: <Badge className={getStatusColor(selectedAnimal.health_status || 'healthy')}>{selectedAnimal.health_status || 'healthy'}</Badge></p>
                {selectedAnimal.notes && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notes / History:</p>
                    <p className="text-sm whitespace-pre-line">{selectedAnimal.notes}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Update Health Status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['healthy', 'needs_attention', 'sick', 'quarantine'].map(status => (
                    <Button
                      key={status}
                      variant={selectedAnimal.health_status === status ? 'default' : 'outline'}
                      size="sm"
                      className="capitalize"
                      onClick={() => handleHealthStatusUpdate(selectedAnimal, status)}
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, tag, type, or breed..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Livestock Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Animals</p><p className="text-2xl font-bold">{totalAnimals}</p></div><Beef className="h-8 w-8 text-farm-barn" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Healthy Animals</p><p className="text-2xl font-bold text-green-600">{healthyAnimals}</p></div><Heart className="h-8 w-8 text-green-600" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Need Attention</p><p className="text-2xl font-bold text-yellow-600">{needAttentionAnimals}</p></div><Activity className="h-8 w-8 text-yellow-600" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Avg Weight</p><p className="text-2xl font-bold">{avgWeight > 0 ? `${Math.round(avgWeight)} lbs` : 'N/A'}</p></div><Scale className="h-8 w-8 text-farm-sage" /></div></CardContent></Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-farm-barn" />
          <span className="ml-2 text-muted-foreground">Loading livestock...</span>
        </div>
      )}

      {/* Livestock Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLivestock.map((animal) => (
            <Card key={animal.id} className="hover:shadow-lg transition-shadow group">
              <div className="relative h-48 bg-gradient-to-br from-farm-earth to-farm-sage rounded-t-lg overflow-hidden">
                <img src={`https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&h=200&fit=crop`} alt={animal.type} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute top-4 left-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 text-2xl">{getTypeIcon(animal.type)}</div>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge className={getStatusColor(animal.health_status || 'healthy')}>
                    {animal.health_status === 'healthy' ? 'Healthy' : animal.health_status === 'sick' ? 'Sick' : animal.health_status === 'quarantine' ? 'Quarantine' : 'Needs Attention'}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg capitalize">{animal.type}</CardTitle>
                    {animal.tag_number && (
                      <p className="text-xs font-mono text-foreground">Tag: {animal.tag_number}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{animal.breed} {animal.gender && `• ${animal.gender}`}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Age: {calculateAge(animal.date_of_birth, animal.date_of_birth_on_farm)}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2"><Baby className="h-4 w-4 text-muted-foreground" /><span>Age: {calculateAge(animal.date_of_birth, animal.date_of_birth_on_farm)}</span></div>
                  <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-muted-foreground" /><span>{animal.weight ? `${animal.weight} lbs` : 'N/A'}</span></div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{animal.farm_location}</span></div>
                  <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /><span>{animal.health_status || 'Unknown'}</span></div>
                </div>
                
                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                  {animal.date_of_birth && <div>DOB: {new Date(animal.date_of_birth).toLocaleDateString()}</div>}
                  {animal.date_of_arrival_at_farm && <div>Arrived: {new Date(animal.date_of_arrival_at_farm).toLocaleDateString()}</div>}
                  {animal.date_of_birth_on_farm && <div>Born on farm: {new Date(animal.date_of_birth_on_farm).toLocaleDateString()}</div>}
                </div>
                
                {animal.purchase_price && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Purchase Price:</span>
                      <span className="font-medium">${animal.purchase_price.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 min-w-[90px]" onClick={() => setFinancialsAnimal(animal)}>
                    <DollarSign className="h-3 w-3 mr-1" />Financials
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 min-w-[90px]" onClick={() => { setSelectedAnimal(animal); setHealthLogOpen(true); }}>
                    <FileText className="h-3 w-3 mr-1" />Health
                  </Button>
                  {(animal.gender || '').toLowerCase() === 'female' && (
                    <Button size="sm" variant="outline" className="flex-1 min-w-[90px]" onClick={() => { setSelectedAnimal(animal); setBirthsOpen(true); }}>
                      <Baby className="h-3 w-3 mr-1" />Births
                    </Button>
                  )}
                  <Button size="sm" className="flex-1 min-w-[90px] bg-farm-barn hover:bg-farm-barn/90 text-white" onClick={() => { setSelectedAnimal(animal); setEditDialogOpen(true); }}>
                    <Pencil className="h-3 w-3 mr-1" />Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Batch cards rendered alongside individual animals */}
          {batches
            .filter((b) =>
              !searchTerm ||
              b.animal_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
              b.batch_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (b.breed || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((b) => (
            <Card key={`batch-${b.id}`} className="hover:shadow-lg transition-shadow group border-farm-sage/40">
              <div className="relative h-48 bg-gradient-to-br from-farm-sage to-farm-earth rounded-t-lg overflow-hidden flex items-center justify-center">
                <div className="text-7xl">{getTypeIcon(b.animal_type)}</div>
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="font-mono text-xs">{b.batch_id}</Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge className="bg-blue-100 text-blue-800">Batch</Badge>
                </div>
              </div>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg capitalize">{b.animal_type}</CardTitle>
                    <p className="text-sm text-muted-foreground">{b.breed || '—'}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{b.current_quantity} / {b.initial_quantity}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span>Current: {b.current_quantity}</span></div>
                  <div className="flex items-center gap-2"><Skull className="h-4 w-4 text-muted-foreground" /><span>Mortality: {b.mortality_count}</span></div>
                  <div className="flex items-center gap-2"><Wheat className="h-4 w-4 text-muted-foreground" /><span>Feed: {b.feed_consumed || 0} {b.feed_unit || 'kg'}</span></div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>{b.arrival_date}</span></div>
                </div>
                {b.source && <div className="text-xs text-muted-foreground">Source: {b.source}</div>}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 min-w-[80px]" onClick={() => setFinancialsBatch(b)}>
                    <DollarSign className="h-3 w-3 mr-1" />Financials
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 min-w-[80px]" onClick={() => { setFeedFor(b.id); setFeedUnit(b.feed_unit || 'kg'); }}>
                    <Wheat className="h-3 w-3 mr-1" />Feed
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 min-w-[80px]" onClick={() => setMortalityFor(b.id)}>
                    <Skull className="h-3 w-3 mr-1" />Health
                  </Button>
                  <Button size="sm" className="flex-1 min-w-[80px] bg-farm-barn hover:bg-farm-barn/90 text-white" onClick={() => setEditBatch(b)}>
                    <Pencil className="h-3 w-3 mr-1" />Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredLivestock.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Beef className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No animals found</h3>
            <p className="text-muted-foreground mb-4">{searchTerm ? "Try adjusting your search terms" : "Get started by adding your first animal"}</p>
            <Button className="bg-farm-barn hover:bg-farm-barn/90 text-white" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Animal
            </Button>
          </CardContent>
        </Card>
      )}
      {/* Linked Transactions Dialog */}
      {financialsAnimal && (
        <LinkedTransactionDialog
          open={!!financialsAnimal}
          onOpenChange={(open) => { if (!open) setFinancialsAnimal(null); }}
          module="livestock"
          recordId={financialsAnimal.id}
          recordName={`${financialsAnimal.type}${financialsAnimal.breed ? ' - ' + financialsAnimal.breed : ''}`}
        />
      )}

      {/* Batch financials */}
      {financialsBatch && (
        <LinkedTransactionDialog
          open={!!financialsBatch}
          onOpenChange={(open) => { if (!open) setFinancialsBatch(null); }}
          module="livestock"
          recordId={financialsBatch.id}
          recordName={`${financialsBatch.animal_type} batch ${financialsBatch.batch_id}`}
        />
      )}

      {/* Births dialog */}
      <BirthsDialog open={birthsOpen} onOpenChange={(o) => { setBirthsOpen(o); if (!o) setSelectedAnimal(null); }} mother={selectedAnimal} />

      {/* Mortality dialog */}
      <Dialog open={!!mortalityFor} onOpenChange={(o) => !o && setMortalityFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Mortality</DialogTitle></DialogHeader>
          <Label>How many died?</Label>
          <Input type="number" value={mortalityCount} onChange={(e) => setMortalityCount(e.target.value)} min="1" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMortalityFor(null)}>Cancel</Button>
            <Button onClick={() => {
              if (mortalityFor) recordMortality({ id: mortalityFor, count: Number(mortalityCount) || 1 });
              setMortalityFor(null); setMortalityCount('1');
            }}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feed dialog */}
      <Dialog open={!!feedFor} onOpenChange={(o) => !o && setFeedFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Feed</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount *</Label><Input type="number" value={feedAmount} onChange={(e) => setFeedAmount(e.target.value)} min="0" step="0.01" /></div>
            <div><Label>Unit</Label>
              <Select value={feedUnit} onValueChange={setFeedUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="bag">bag</SelectItem>
                  <SelectItem value="litre">litre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFeedFor(null); setFeedAmount(''); }}>Cancel</Button>
            <Button onClick={() => {
              const amt = Number(feedAmount);
              if (feedFor && amt > 0) recordFeed({ id: feedFor, amount: amt, unit: feedUnit });
              setFeedFor(null); setFeedAmount('');
            }}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit batch dialog */}
      <Dialog open={!!editBatch} onOpenChange={(o) => { if (!o) setEditBatch(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Batch</DialogTitle></DialogHeader>
          {editBatch && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Animal Type</Label><Input value={editBatch.animal_type} onChange={(e) => setEditBatch({ ...editBatch, animal_type: e.target.value })} /></div>
              <div><Label>Batch ID</Label><Input value={editBatch.batch_id} onChange={(e) => setEditBatch({ ...editBatch, batch_id: e.target.value })} /></div>
              <div><Label>Breed</Label><Input value={editBatch.breed || ''} onChange={(e) => setEditBatch({ ...editBatch, breed: e.target.value })} /></div>
              <div><Label>Current Quantity</Label><Input type="number" value={editBatch.current_quantity} onChange={(e) => setEditBatch({ ...editBatch, current_quantity: Number(e.target.value) })} /></div>
              <div><Label>Arrival Date</Label><Input type="date" value={editBatch.arrival_date} onChange={(e) => setEditBatch({ ...editBatch, arrival_date: e.target.value })} /></div>
              <div><Label>Source</Label><Input value={editBatch.source || ''} onChange={(e) => setEditBatch({ ...editBatch, source: e.target.value })} /></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={editBatch.notes || ''} onChange={(e) => setEditBatch({ ...editBatch, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="text-destructive mr-auto" onClick={() => {
              if (editBatch && confirm('Delete this batch?')) { deleteBatch(editBatch.id); setEditBatch(null); }
            }}>Delete</Button>
            <Button variant="outline" onClick={() => setEditBatch(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!editBatch) return;
              const { id, animal_type, batch_id, breed, current_quantity, arrival_date, source, notes } = editBatch;
              updateBatch({ id, updates: { animal_type, batch_id, breed, current_quantity, arrival_date, source, notes } });
              setEditBatch(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
