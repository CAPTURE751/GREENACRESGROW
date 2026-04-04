
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCrops } from "@/hooks/useCrops";
import { CropForm } from "@/components/CropForm";
import { exportModulePnLToPDF } from "@/lib/pnl-module-export";
import { toast } from "sonner";
import { 
  Plus, Search, Wheat, Calendar, MapPin, DollarSign, TrendingUp,
  Droplets, Sun, Loader2, Download, Pencil,
} from "lucide-react";


const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': case 'planted': case 'growing': return 'bg-green-100 text-green-800';
    case 'needs-attention': case 'flowering': return 'bg-yellow-100 text-yellow-800';
    case 'critical': return 'bg-red-100 text-red-800';
    case 'harvested': case 'ready_to_harvest': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function Crops() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<any>(null);
  const { crops, isLoading, createCrop, updateCrop, isCreating, isUpdating } = useCrops();
  
  const filteredCrops = crops.filter(crop =>
    crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crop.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crop.farm_location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCrop = async (cropData: any) => {
    const formatted: any = { ...cropData };
    if (formatted.planting_date instanceof Date) formatted.planting_date = formatted.planting_date.toISOString().split('T')[0];
    if (formatted.harvest_date instanceof Date) formatted.harvest_date = formatted.harvest_date.toISOString().split('T')[0];
    createCrop(formatted);
    setIsDialogOpen(false);
  };

  const handleUpdateCrop = async (cropData: any) => {
    if (!selectedCrop) return;
    const updates: any = {};
    Object.keys(cropData).forEach(key => {
      const val = cropData[key];
      if (val instanceof Date) {
        updates[key] = val.toISOString().split('T')[0];
      } else if (val !== undefined && val !== '') {
        updates[key] = val;
      }
    });
    updateCrop({ id: selectedCrop.id, updates });
    setEditDialogOpen(false);
    setSelectedCrop(null);
  };

  const totalCrops = crops.length;
  const healthyCrops = crops.filter(crop => crop.status === 'healthy' || crop.status === 'growing').length;
  const totalYield = crops.reduce((sum, crop) => sum + (crop.yield_quantity || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Crop Management</h1>
          <p className="text-muted-foreground">Track and manage your crops</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const reportData: Record<string, any> = {};
                crops.forEach(c => {
                  if (!reportData[c.name]) reportData[c.name] = { revenue: 0, costs: 0, salesCount: 0, salesDetails: [], costDetails: [] };
                  reportData[c.name].salesCount += 1;
                });
                const totals = { totalRevenue: 0, totalCosts: 0, netProfit: 0 };
                await exportModulePnLToPDF("crop", reportData, totals, "all");
                toast.success("Crop report downloaded");
              } catch (e) { toast.error("Failed to generate report"); }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-farm-green hover:bg-farm-green/90">
                <Plus className="h-4 w-4 mr-2" />
                Add New Crop
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Crop</DialogTitle>
              </DialogHeader>
              <CropForm onSubmit={handleCreateCrop} onCancel={() => setIsDialogOpen(false)} isLoading={isCreating} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setSelectedCrop(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Crop</DialogTitle>
          </DialogHeader>
          {selectedCrop && (
            <CropForm
              onSubmit={handleUpdateCrop}
              onCancel={() => { setEditDialogOpen(false); setSelectedCrop(null); }}
              isLoading={isUpdating}
              initialData={{
                name: selectedCrop.name,
                type: selectedCrop.type,
                farm_location: selectedCrop.farm_location,
                status: selectedCrop.status || 'planted',
                season: selectedCrop.season || '',
                notes: selectedCrop.notes || '',
                yield_quantity: selectedCrop.yield_quantity || undefined,
                yield_unit: selectedCrop.yield_unit || '',
                acreage: selectedCrop.acreage || undefined,
                planting_date: selectedCrop.planting_date ? new Date(selectedCrop.planting_date) : undefined,
                harvest_date: selectedCrop.harvest_date ? new Date(selectedCrop.harvest_date) : undefined,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search crops, varieties, or locations..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crop Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Crops</p><p className="text-2xl font-bold">{totalCrops}</p></div><Wheat className="h-8 w-8 text-farm-green" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Crops</p><p className="text-2xl font-bold">{healthyCrops}</p></div><MapPin className="h-8 w-8 text-farm-sage" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Yield</p><p className="text-2xl font-bold">{totalYield.toLocaleString()}</p></div><DollarSign className="h-8 w-8 text-farm-harvest" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Seasons</p><p className="text-2xl font-bold">{new Set(crops.filter(c => c.season).map(c => c.season)).size}</p></div><TrendingUp className="h-8 w-8 text-green-600" /></div></CardContent></Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-farm-green" />
          <span className="ml-2 text-muted-foreground">Loading crops...</span>
        </div>
      )}

      {/* Crops Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCrops.map((crop) => (
            <Card key={crop.id} className="hover:shadow-lg transition-shadow group">
              <div className="relative h-48 bg-gradient-to-br from-farm-earth to-farm-sage rounded-t-lg overflow-hidden">
                <img src={`https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=200&fit=crop`} alt={crop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute top-4 right-4 flex gap-2">
                  <Badge className={getStatusColor(crop.status || 'planted')}>
                    {crop.status === 'planted' ? 'Planted' : crop.status === 'growing' ? 'Growing' : crop.status === 'harvested' ? 'Harvested' : crop.status === 'flowering' ? 'Flowering' : crop.status === 'ready_to_harvest' ? 'Ready to Harvest' : crop.status || 'Unknown'}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{crop.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{crop.type}</p>
                  </div>
                  {crop.season && <Badge variant="outline">{crop.season}</Badge>}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{crop.farm_location}</span></div>
                  <div className="flex items-center gap-2"><Sun className="h-4 w-4 text-muted-foreground" /><span>{crop.status}</span></div>
                  {crop.planting_date && (
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>{new Date(crop.planting_date).toLocaleDateString()}</span></div>
                  )}
                  {crop.acreage && (
                    <div className="flex items-center gap-2"><Wheat className="h-4 w-4 text-muted-foreground" /><span>{crop.acreage} acres</span></div>
                  )}
                  {crop.yield_quantity && (
                    <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /><span>{crop.yield_quantity} {crop.yield_unit}</span></div>
                  )}
                </div>
                
                {crop.harvest_date && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Harvest Date:</span>
                      <span className="font-medium">{new Date(crop.harvest_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setSelectedCrop(crop); setEditDialogOpen(true); }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    View & Edit
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-farm-green hover:bg-farm-green/90"
                    onClick={() => { setSelectedCrop(crop); setEditDialogOpen(true); }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredCrops.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Wheat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No crops found</h3>
            <p className="text-muted-foreground mb-4">{searchTerm ? "Try adjusting your search terms" : "Get started by adding your first crop"}</p>
            <Button className="bg-farm-green hover:bg-farm-green/90" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Crop
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
