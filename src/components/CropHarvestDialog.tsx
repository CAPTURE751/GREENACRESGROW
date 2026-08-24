import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCropHarvests } from "@/hooks/useCropHarvests";
import { format } from "date-fns";
import { Loader2, Plus, Trash2, Sprout } from "lucide-react";

interface CropHarvestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crop: any;
}

const GRADES = ["A", "B", "C", "Reject"];

export function CropHarvestDialog({ open, onOpenChange, crop }: CropHarvestDialogProps) {
  const { harvests, isLoading, addHarvest, deleteHarvest, isSaving } = useCropHarvests(crop?.id);
  const [harvestDate, setHarvestDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(crop?.yield_unit || "kg");
  const [grade, setGrade] = useState("A");
  const [notes, setNotes] = useState("");

  const total = harvests.reduce((sum, h) => sum + (Number(h.quantity) || 0), 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;
    addHarvest({
      crop_id: crop.id,
      harvest_date: harvestDate,
      quantity: qty,
      unit,
      quality_grade: grade,
      notes: notes || null,
    });
    setQuantity("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-farm-green" /> Harvest Events — {crop?.name}
          </DialogTitle>
          <DialogDescription>
            Record every pick separately. Total Harvested is the sum of all events.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border border-farm-green/20 bg-farm-green/5 px-4 py-3">
          <span className="text-sm text-muted-foreground">Total Harvested</span>
          <span className="text-lg font-semibold text-farm-green">
            {total.toLocaleString()} {harvests[0]?.unit || crop?.yield_unit || ""}
          </span>
        </div>

        <form onSubmit={submit} className="space-y-4 border rounded-md p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="harvest_date">Harvest Date</Label>
              <Input id="harvest_date" type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" type="number" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 120" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, crates, bags" />
            </div>
            <div className="space-y-2">
              <Label>Quality Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hnotes">Notes</Label>
            <Textarea id="hnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Weather, workers, buyer..." />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving} className="bg-farm-green hover:bg-farm-green/90">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Record Harvest
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">History</h4>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-farm-green" /></div>
          ) : harvests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No harvest events recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {harvests.map((h) => (
                <div key={h.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {h.quantity.toLocaleString()} {h.unit}
                      {h.quality_grade && <Badge variant="outline" className="ml-2">Grade {h.quality_grade}</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {format(new Date(h.harvest_date + "T00:00:00"), "PPP")}{h.notes ? ` · ${h.notes}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteHarvest(h.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
