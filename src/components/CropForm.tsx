import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Sprout, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  establishmentMethods,
  calculateSchedule,
  toISODate,
  type EstablishmentMethod,
} from "@/lib/crop-lifecycle";

export interface CropFormData {
  name: string;
  type: string;
  variety?: string;
  farm_location: string;
  establishment_method: EstablishmentMethod;
  nursery_start_date?: Date;
  nursery_duration_days?: number;
  nursery_location?: string;
  seed_quantity?: number;
  expected_transplant_date?: Date;
  actual_transplant_date?: Date;
  seedlings_transplanted?: number;
  spacing?: string;
  field_growth_duration_days?: number;
  planting_date?: Date;
  expected_harvest_date?: Date;
  actual_harvest_date?: Date;
  harvest_date?: Date;
  growth_duration_days?: number;
  status: string;
  yield_unit?: string;
  season?: string;
  acreage?: number;
  nursery_notes?: string;
  transplant_notes?: string;
  notes?: string;
}

interface CropFormProps {
  onSubmit: (data: CropFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<CropFormData>;
}

function DateField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value?: Date;
  onChange: (d?: Date) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CropForm({ onSubmit, onCancel, isLoading, initialData }: CropFormProps) {
  const [formData, setFormData] = useState<CropFormData>({
    name: initialData?.name || "",
    type: initialData?.type || "",
    variety: initialData?.variety || "",
    farm_location: initialData?.farm_location || "",
    establishment_method: (initialData?.establishment_method as EstablishmentMethod) || "direct_seed",
    nursery_start_date: initialData?.nursery_start_date,
    nursery_duration_days: initialData?.nursery_duration_days,
    nursery_location: initialData?.nursery_location || "",
    seed_quantity: initialData?.seed_quantity,
    actual_transplant_date: initialData?.actual_transplant_date,
    seedlings_transplanted: initialData?.seedlings_transplanted,
    spacing: initialData?.spacing || "",
    field_growth_duration_days:
      initialData?.field_growth_duration_days ?? initialData?.growth_duration_days,
    planting_date: initialData?.planting_date,
    actual_harvest_date: initialData?.actual_harvest_date,
    status: initialData?.status || "planted",
    yield_unit: initialData?.yield_unit || "",
    season: initialData?.season || "",
    acreage: initialData?.acreage,
    nursery_notes: initialData?.nursery_notes || "",
    transplant_notes: initialData?.transplant_notes || "",
    notes: initialData?.notes || "",
  });

  const isNursery = formData.establishment_method === "nursery_transplant";

  // Live auto-calculated schedule
  const schedule = useMemo(
    () =>
      calculateSchedule({
        establishment_method: formData.establishment_method,
        nursery_start_date: toISODate(formData.nursery_start_date ?? null),
        nursery_duration_days: formData.nursery_duration_days ?? null,
        actual_transplant_date: toISODate(formData.actual_transplant_date ?? null),
        field_growth_duration_days: formData.field_growth_duration_days ?? null,
        planting_date: toISODate(formData.planting_date ?? null),
        actual_harvest_date: toISODate(formData.actual_harvest_date ?? null),
      }),
    [formData]
  );

  const handleInputChange = (field: keyof CropFormData, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      // persist the derived schedule so the DB stays in sync with what the farmer saw
      expected_transplant_date: schedule.expectedTransplantDate ?? undefined,
      expected_harvest_date: schedule.expectedHarvestDate ?? undefined,
      growth_duration_days: formData.field_growth_duration_days,
      planting_date: isNursery
        ? formData.planting_date ?? schedule.fieldStart ?? undefined
        : formData.planting_date,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Crop Name *</Label>
          <Input id="name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} placeholder="e.g., Tomatoes" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Crop Type *</Label>
          <Input id="type" value={formData.type} onChange={(e) => handleInputChange("type", e.target.value)} placeholder="e.g., Vegetable" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="variety">Variety</Label>
          <Input id="variety" value={formData.variety || ""} onChange={(e) => handleInputChange("variety", e.target.value)} placeholder="e.g., Rio Grande, H614" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="farm_location">Field / Block *</Label>
          <Input id="farm_location" value={formData.farm_location} onChange={(e) => handleInputChange("farm_location", e.target.value)} placeholder="e.g., Field A-1" required />
        </div>
      </div>

      {/* Establishment method */}
      <div className="space-y-2">
        <Label>Establishment Method *</Label>
        <Select
          value={formData.establishment_method}
          onValueChange={(v) => handleInputChange("establishment_method", v as EstablishmentMethod)}
        >
          <SelectTrigger><SelectValue placeholder="How is this crop established?" /></SelectTrigger>
          <SelectContent>
            {establishmentMethods.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {establishmentMethods.find((m) => m.value === formData.establishment_method)?.hint}
        </p>
      </div>

      {/* Nursery block */}
      {isNursery && (
        <div className="rounded-md border border-farm-green/20 bg-farm-green/5 p-4 space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-farm-green">
            <Sprout className="h-4 w-4" /> Nursery Stage
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateField label="Nursery Sowing Date" value={formData.nursery_start_date} onChange={(d) => handleInputChange("nursery_start_date", d)} />
            <div className="space-y-2">
              <Label htmlFor="nursery_duration_days">Nursery Duration (days)</Label>
              <Input id="nursery_duration_days" type="number" min="1" value={formData.nursery_duration_days ?? ""} onChange={(e) => handleInputChange("nursery_duration_days", e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nursery_location">Nursery Location</Label>
              <Input id="nursery_location" value={formData.nursery_location || ""} onChange={(e) => handleInputChange("nursery_location", e.target.value)} placeholder="e.g., Greenhouse 2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seed_quantity">Seed Quantity</Label>
              <Input id="seed_quantity" type="number" min="0" step="0.01" value={formData.seed_quantity ?? ""} onChange={(e) => handleInputChange("seed_quantity", e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 250 g" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expected Transplant Date</Label>
              <div className="h-10 flex items-center rounded-md border bg-muted/40 px-3 text-sm">
                {schedule.expectedTransplantDate ? format(schedule.expectedTransplantDate, "PPP") : "Enter sowing date + duration"}
              </div>
              <p className="text-xs text-muted-foreground">Auto-calculated from sowing date + nursery duration.</p>
            </div>
            <DateField label="Actual Transplant Date" value={formData.actual_transplant_date} onChange={(d) => handleInputChange("actual_transplant_date", d)} hint="Set this once seedlings actually go to the field — it overrides the estimate." />
            <div className="space-y-2">
              <Label htmlFor="seedlings_transplanted">Seedlings Transplanted</Label>
              <Input id="seedlings_transplanted" type="number" min="0" value={formData.seedlings_transplanted ?? ""} onChange={(e) => handleInputChange("seedlings_transplanted", e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 4000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spacing">Spacing</Label>
              <Input id="spacing" value={formData.spacing || ""} onChange={(e) => handleInputChange("spacing", e.target.value)} placeholder="e.g., 60cm x 45cm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nursery_notes">Nursery Notes</Label>
            <Textarea id="nursery_notes" rows={2} value={formData.nursery_notes || ""} onChange={(e) => handleInputChange("nursery_notes", e.target.value)} placeholder="Germination rate, treatments..." />
          </div>
        </div>
      )}

      {/* Field stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateField
          label={isNursery ? "Field Planting Date (optional)" : "Planting Date"}
          value={formData.planting_date}
          onChange={(d) => handleInputChange("planting_date", d)}
          hint={isNursery ? "Leave empty to use the transplant date." : undefined}
        />
        <div className="space-y-2">
          <Label htmlFor="field_growth_duration_days">
            {isNursery ? "Field Growth Duration (days after transplant)" : "Growth Duration (days)"}
          </Label>
          <Input
            id="field_growth_duration_days"
            type="number"
            min="1"
            value={formData.field_growth_duration_days ?? ""}
            onChange={(e) => handleInputChange("field_growth_duration_days", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g., 90"
          />
        </div>
      </div>

      {/* Live schedule summary */}
      <div className="rounded-md border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-2"><Info className="h-4 w-4" /> Auto-calculated schedule</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {isNursery && (
            <div>
              <p className="text-muted-foreground text-xs">Transplant</p>
              <p className="font-medium">{schedule.expectedTransplantDate ? format(schedule.expectedTransplantDate, "MMM d, yyyy") : "—"}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">Expected Harvest</p>
            <p className="font-medium">{schedule.expectedHarvestDate ? format(schedule.expectedHarvestDate, "MMM d, yyyy") : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total Cycle</p>
            <p className="font-medium">{schedule.totalDuration ? `${schedule.totalDuration} days` : "—"}</p>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="planted">Planted</SelectItem>
              <SelectItem value="growing">Growing</SelectItem>
              <SelectItem value="flowering">Flowering</SelectItem>
              <SelectItem value="ready_to_harvest">Ready to Harvest</SelectItem>
              <SelectItem value="harvested">Harvested</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Lifecycle stage is recalculated automatically from the dates above.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="season">Season</Label>
          <Select value={formData.season} onValueChange={(value) => handleInputChange("season", value)}>
            <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="long_rains">Long Rains</SelectItem>
              <SelectItem value="short_rains">Short Rains</SelectItem>
              <SelectItem value="dry">Dry Season</SelectItem>
              <SelectItem value="irrigated">Irrigated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="yield_unit">Yield Unit</Label>
          <Input id="yield_unit" value={formData.yield_unit} onChange={(e) => handleInputChange("yield_unit", e.target.value)} placeholder="e.g., kg, bags, crates" />
          <p className="text-xs text-muted-foreground">Total Harvested is summed from recorded harvest events.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acreage">Acreage (Acres)</Label>
          <Input id="acreage" type="number" min="0" step="0.1" value={formData.acreage ?? ""} onChange={(e) => handleInputChange("acreage", e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 5.5" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={formData.notes} onChange={(e) => handleInputChange("notes", e.target.value)} placeholder="Additional notes about this crop..." rows={3} />
      </div>

      <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-background pb-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        )}
        <Button type="submit" disabled={isLoading} className="bg-farm-green hover:bg-farm-green/90">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Crop" : "Create Crop"}
        </Button>
      </div>
    </form>
  );
}
