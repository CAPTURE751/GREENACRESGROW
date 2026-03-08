import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface EquipmentFormData {
  name: string;
  category: string;
  status: string;
  purchase_date?: string;
  purchase_price?: number;
  maintenance_date?: string;
  notes?: string;
}

interface EquipmentFormProps {
  onSubmit: (data: EquipmentFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<EquipmentFormData>;
}

const CATEGORIES = ["Tractor", "Plow", "Harvester", "Sprayer", "Irrigation", "Vehicle", "Tool", "Other"];
const STATUSES = ["available", "in_use", "maintenance", "broken"];

export function EquipmentForm({ onSubmit, isLoading, initialData }: EquipmentFormProps) {
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: initialData?.name || "",
    category: initialData?.category || "",
    status: initialData?.status || "available",
    purchase_date: initialData?.purchase_date || "",
    purchase_price: initialData?.purchase_price,
    maintenance_date: initialData?.maintenance_date || "",
    notes: initialData?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Equipment Name *</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchase_price">Purchase Price (KSh)</Label>
          <Input id="purchase_price" type="number" value={formData.purchase_price ?? ""} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchase_date">Purchase Date</Label>
          <Input id="purchase_date" type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maintenance_date">Next Maintenance</Label>
          <Input id="maintenance_date" type="date" value={formData.maintenance_date} onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
      </div>
      <Button type="submit" disabled={isLoading || !formData.name || !formData.category} className="w-full">
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {initialData ? "Update Equipment" : "Add Equipment"}
      </Button>
    </form>
  );
}
