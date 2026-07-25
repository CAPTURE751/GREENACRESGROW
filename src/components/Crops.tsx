import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCrops } from "@/hooks/useCrops";
import { useSales } from "@/hooks/useSales";
import { CropForm } from "@/components/CropForm";
import { LinkedTransactionDialog } from "@/components/LinkedTransactionDialog";
import { CropTasksDialog } from "@/components/CropTasksDialog";
import { exportModulePnLToPDF } from "@/lib/pnl-module-export";
import { computeLifecycle, lifecycleStages, currentStageIndex, harvestAlertFor } from "@/lib/crop-lifecycle";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, Search, Wheat, Calendar, MapPin, DollarSign, TrendingUp,
  Sun, Loader2, Download, Pencil, CheckCircle2, Archive, Clock, Bell, ListChecks,
} from "lucide-react";

const statusColor: Record<string, string> = {
  upcoming: "bg-slate-100 text-slate-700 border-slate-200",
  growing: "bg-green-100 text-green-800 border-green-200",
  ready: "bg-amber-100 text-amber-800 border-amber-200",
  harvested: "bg-blue-100 text-blue-800 border-blue-200",
  archived: "bg-gray-100 text-gray-600 border-gray-200",
};

export function Crops() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<any>(null);
  const [financialsCrop, setFinancialsCrop] = useState<any>(null);
  const [tasksCrop, setTasksCrop] = useState<any>(null);
  const { crops, isLoading, createCrop, updateCrop, isCreating, isUpdating } = useCrops();
  const { sales } = useSales();

  // Aggregate harvested totals per crop from cumulative sales
  const harvestedByCrop = useMemo(() => {
    const map = new Map<string, { qty: number; unit: string }>();
    for (const s of sales as any[]) {
      const qty = Number(s.quantity) || 0;
      if (!qty) continue;
      let key: string | null = null;
      if (s.linked_module === "crop" && s.linked_record_id) key = s.linked_record_id;
      else {
        const match = crops.find(c => c.name && s.product_name && c.name.toLowerCase() === String(s.product_name).toLowerCase());
        if (match) key = match.id;
      }
      if (!key) continue;
      const existing = map.get(key) || { qty: 0, unit: s.unit || "" };
      existing.qty += qty;
      if (!existing.unit && s.unit) existing.unit = s.unit;
      map.set(key, existing);
    }
    return map;
  }, [sales, crops]);

  const matchesSearch = (crop: any) =>
    crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crop.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (crop as any).variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crop.farm_location.toLowerCase().includes(searchTerm.toLowerCase());

  const activeCropsList = useMemo(
    () => crops.filter(c => !(c as any).archived && matchesSearch(c)),
    [crops, searchTerm]
  );
  const archivedCropsList = useMemo(
    () => crops.filter(c => (c as any).archived && matchesSearch(c)),
    [crops, searchTerm]
  );

  const handleCreateCrop = async (cropData: any) => {
    const formatted: any = { ...cropData };
    if (formatted.planting_date instanceof Date) formatted.planting_date = formatted.planting_date.toISOString().split("T")[0];
    if (formatted.harvest_date instanceof Date) formatted.harvest_date = formatted.harvest_date.toISOString().split("T")[0];
    createCrop(formatted);
    setIsDialogOpen(false);
  };

  const handleUpdateCrop = async (cropData: any) => {
    if (!selectedCrop) return;
    const updates: any = {};
    Object.keys(cropData).forEach((key) => {
      const val = cropData[key];
      if (val instanceof Date) updates[key] = val.toISOString().split("T")[0];
      else if (val !== undefined && val !== "") updates[key] = val;
    });
    updateCrop({ id: selectedCrop.id, updates });
    setEditDialogOpen(false);
    setSelectedCrop(null);
  };

  const confirmHarvest = (crop: any) => {
    updateCrop({
      id: crop.id,
      updates: { status: "harvested", archived: true, archived_at: new Date().toISOString() } as any,
    });
    toast.success(`${crop.name} marked as harvested and archived`);
  };

  const activeCrops = crops.filter((c) => !(c as any).archived);
  const totalCrops = activeCrops.length;
  const readyCount = activeCrops.filter((c) => computeLifecycle(c as any).status === "ready").length;
  const upcomingHarvests = activeCrops
    .map((c) => ({ crop: c, info: computeLifecycle(c as any) }))
    .filter(({ info }) => info.daysRemaining !== null && info.daysRemaining >= 0 && info.daysRemaining <= 30)
    .sort((a, b) => (a.info.daysRemaining ?? 0) - (b.info.daysRemaining ?? 0));
  const totalYield = crops.reduce((sum, crop) => sum + (crop.yield_quantity || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Crop Management</h1>
          <p className="text-muted-foreground">Automatic lifecycle tracking from planting to harvest</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const reportData: Record<string, any> = {};
                crops.forEach((c) => {
                  if (!reportData[c.name]) reportData[c.name] = { revenue: 0, costs: 0, salesCount: 0, salesDetails: [], costDetails: [] };
                  reportData[c.name].salesCount += 1;
                });
                const totals = { totalRevenue: 0, totalCosts: 0, netProfit: 0 };
                await exportModulePnLToPDF("crop", reportData, totals, "all");
                toast.success("Crop report downloaded");
              } catch {
                toast.error("Failed to generate report");
              }
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
                <DialogTitle>Add New Crop Batch</DialogTitle>
              </DialogHeader>
              <CropForm onSubmit={handleCreateCrop} onCancel={() => setIsDialogOpen(false)} isLoading={isCreating} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setSelectedCrop(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Update Crop</DialogTitle></DialogHeader>
          {selectedCrop && (
            <CropForm
              onSubmit={handleUpdateCrop}
              onCancel={() => { setEditDialogOpen(false); setSelectedCrop(null); }}
              isLoading={isUpdating}
              initialData={{
                name: selectedCrop.name,
                type: selectedCrop.type,
                variety: selectedCrop.variety || "",
                farm_location: selectedCrop.farm_location,
                status: selectedCrop.status || "planted",
                season: selectedCrop.season || "",
                notes: selectedCrop.notes || "",
                yield_quantity: selectedCrop.yield_quantity || undefined,
                yield_unit: selectedCrop.yield_unit || "",
                acreage: selectedCrop.acreage || undefined,
                growth_duration_days: selectedCrop.growth_duration_days || undefined,
                planting_date: selectedCrop.planting_date ? new Date(selectedCrop.planting_date) : undefined,
                harvest_date: selectedCrop.harvest_date ? new Date(selectedCrop.harvest_date) : undefined,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Search + toggle */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, variety, or field..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="archived-toggle" checked={showArchived} onCheckedChange={setShowArchived} />
            <Label htmlFor="archived-toggle" className="text-sm cursor-pointer flex items-center gap-1">
              <Archive className="h-3.5 w-3.5" /> Archived
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Batches</p><p className="text-2xl font-bold">{totalCrops}</p></div><Wheat className="h-8 w-8 text-farm-green" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Ready to Harvest</p><p className="text-2xl font-bold text-amber-600">{readyCount}</p></div><CheckCircle2 className="h-8 w-8 text-amber-500" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Upcoming (30d)</p><p className="text-2xl font-bold">{upcomingHarvests.length}</p></div><Bell className="h-8 w-8 text-farm-sage" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Yield</p><p className="text-2xl font-bold">{totalYield.toLocaleString()}</p></div><TrendingUp className="h-8 w-8 text-farm-harvest" /></CardContent></Card>
      </div>

      {/* Upcoming harvests strip */}
      {upcomingHarvests.length > 0 && !showArchived && (
        <Card className="border-l-4 border-l-amber-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" /> Harvest reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {upcomingHarvests.slice(0, 8).map(({ crop, info }) => (
              <Badge key={crop.id} variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                {crop.name}{(crop as any).variety ? ` (${(crop as any).variety})` : ""} — {info.daysRemaining === 0 ? "Today" : `${info.daysRemaining}d`}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-farm-green" />
          <span className="ml-2 text-muted-foreground">Loading crops...</span>
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCrops.map((crop) => {
            const info = computeLifecycle(crop as any);
            const alert = harvestAlertFor(info.daysRemaining);
            const stageIdx = currentStageIndex(info);
            const variety = (crop as any).variety;
            return (
              <Card key={crop.id} className="hover:shadow-lg transition-shadow group flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{crop.name}</CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {variety ? `${variety} · ` : ""}{crop.type}
                      </p>
                    </div>
                    <Badge className={statusColor[info.status]}>{info.statusLabel}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="truncate">{crop.farm_location}</span></div>
                    <div className="flex items-center gap-2"><Sun className="h-4 w-4 text-muted-foreground" /><span>{info.ageLabel}</span></div>
                    {crop.planting_date && (
                      <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Planted {format(new Date(crop.planting_date + "T00:00:00"), "MMM d")}</span></div>
                    )}
                    {info.expectedHarvest && (
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>Harvest {format(info.expectedHarvest, "MMM d")}</span></div>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{info.ageBreakdown}</span>
                      <span>
                        {info.daysRemaining === null
                          ? "—"
                          : info.daysRemaining > 0
                            ? `${info.daysRemaining}d left`
                            : info.daysRemaining === 0
                              ? "Harvest today"
                              : `${Math.abs(info.daysRemaining)}d overdue`}
                      </span>
                    </div>
                    <Progress value={info.progressPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{Math.round(info.progressPercent)}%</p>
                  </div>

                  {/* Lifecycle timeline */}
                  <div>
                    <div className="flex justify-between items-center">
                      {lifecycleStages.map((s, i) => (
                        <div key={s.key} className="flex-1 flex flex-col items-center relative">
                          <div className={`h-3 w-3 rounded-full z-10 ${i <= stageIdx ? "bg-farm-green" : "bg-muted"}`} />
                          {i < lifecycleStages.length - 1 && (
                            <div className={`absolute top-1/2 left-1/2 h-0.5 w-full -translate-y-1/2 ${i < stageIdx ? "bg-farm-green" : "bg-muted"}`} />
                          )}
                          <span className={`mt-1 text-[10px] ${i === stageIdx ? "font-semibold text-farm-green" : "text-muted-foreground"}`}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {alert && (
                    <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-2">
                      <Bell className="h-3.5 w-3.5 mt-0.5" /> {alert}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 mt-auto">
                    <Button size="sm" variant="outline" onClick={() => setFinancialsCrop(crop)}>
                      <DollarSign className="h-3 w-3 mr-1" /> Financials
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTasksCrop(crop)}>
                      <ListChecks className="h-3 w-3 mr-1" /> Tasks
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedCrop(crop); setEditDialogOpen(true); }}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    {info.status !== "harvested" && info.status !== "archived" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="flex-1 bg-farm-green hover:bg-farm-green/90">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Harvest
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Harvest</AlertDialogTitle>
                            <AlertDialogDescription>
                              Mark {crop.name} as harvested? It will be archived and removed from the Active Crops list, but remain in reports and analytics.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => confirmHarvest(crop)}>Confirm Harvest</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <div />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filteredCrops.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Wheat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{showArchived ? "No archived crops" : "No crops found"}</h3>
            <p className="text-muted-foreground mb-4">{searchTerm ? "Try adjusting your search terms" : showArchived ? "Harvested crops will appear here" : "Get started by adding your first crop batch"}</p>
            {!showArchived && (
              <Button className="bg-farm-green hover:bg-farm-green/90" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add New Crop
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {financialsCrop && (
        <LinkedTransactionDialog
          open={!!financialsCrop}
          onOpenChange={(open) => { if (!open) setFinancialsCrop(null); }}
          module="crop"
          recordId={financialsCrop.id}
          recordName={financialsCrop.name}
        />
      )}

      {tasksCrop && (
        <CropTasksDialog
          open={!!tasksCrop}
          onOpenChange={(open) => { if (!open) setTasksCrop(null); }}
          crop={tasksCrop}
        />
      )}
    </div>
  );
}
