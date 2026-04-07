
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLivestock } from "@/hooks/useLivestock";
import { LivestockForm } from "@/components/LivestockForm";
import { LinkedTransactionDialog } from "@/components/LinkedTransactionDialog";
import { calculateAge } from "@/lib/age-calculator";
import { exportModulePnLToPDF } from "@/lib/pnl-module-export";
import { toast } from "sonner";
import { 
  Plus, Search, Beef, Calendar, MapPin, Activity, Heart, Scale,
  Loader2, Baby, Download, Pencil, FileText, DollarSign,
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

export function Livestock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [healthLogOpen, setHealthLogOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  const [financialsAnimal, setFinancialsAnimal] = useState<any>(null);
  const { livestock, isLoading, createLivestock, updateLivestock, isCreating, isUpdating } = useLivestock();
  
  const filteredLivestock = livestock.filter(animal =>
    (animal.type?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (animal.breed?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    animal.farm_location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateLivestock = async (livestockData: any) => {
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

  const totalAnimals = livestock.length;
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
                livestock.forEach(a => {
                  const key = `${a.type} - ${a.breed || 'Unknown'}`;
                  if (!reportData[key]) reportData[key] = { revenue: 0, costs: 0, salesCount: 0, salesDetails: [], costDetails: [] };
                  reportData[key].salesCount += 1;
                  if (a.purchase_price) reportData[key].costs += a.purchase_price;
                });
                const totals = { totalRevenue: 0, totalCosts: Object.values(reportData).reduce((s: number, d: any) => s + d.costs, 0), netProfit: 0 };
                totals.netProfit = -totals.totalCosts;
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
              <LivestockForm onSubmit={handleCreateLivestock} onCancel={() => setIsDialogOpen(false)} isLoading={isCreating} />
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
                    <CardTitle className="text-lg">{animal.type}</CardTitle>
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
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setFinancialsAnimal(animal)}
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    Financials
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setSelectedAnimal(animal); setHealthLogOpen(true); }}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Health
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-farm-barn hover:bg-farm-barn/90 text-white"
                    onClick={() => { setSelectedAnimal(animal); setEditDialogOpen(true); }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
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
    </div>
  );
}
