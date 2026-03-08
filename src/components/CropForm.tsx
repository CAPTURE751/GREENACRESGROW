import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CropFormData {
  name: string;
  type: string;
  farm_location: string;
  planting_date?: Date;
  harvest_date?: Date;
  status: string;
  yield_quantity?: number;
  yield_unit?: string;
  season?: string;
  acreage?: number;
  notes?: string;
}

interface CropFormProps {
  onSubmit: (data: CropFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<CropFormData>;
}

export function CropForm({ onSubmit, onCancel, isLoading, initialData }: CropFormProps) {
  const [formData, setFormData] = useState<CropFormData>({
    name: initialData?.name || "",
    type: initialData?.type || "",
    farm_location: initialData?.farm_location || "",
    status: initialData?.status || "planted",
    season: initialData?.season || "",
    notes: initialData?.notes || "",
    yield_quantity: initialData?.yield_quantity || undefined,
    yield_unit: initialData?.yield_unit || "",
    planting_date: initialData?.planting_date,
    harvest_date: initialData?.harvest_date,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof CropFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Crop Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="e.g., Winter Wheat"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Crop Type *</Label>
          <Input
            id="type"
            value={formData.type}
            onChange={(e) => handleInputChange("type", e.target.value)}
            placeholder="e.g., Grain, Vegetable"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="farm_location">Farm Location *</Label>
          <Input
            id="farm_location"
            value={formData.farm_location}
            onChange={(e) => handleInputChange("farm_location", e.target.value)}
            placeholder="e.g., Field A-1"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planted">Planted</SelectItem>
              <SelectItem value="growing">Growing</SelectItem>
              <SelectItem value="flowering">Flowering</SelectItem>
              <SelectItem value="ready_to_harvest">Ready to Harvest</SelectItem>
              <SelectItem value="harvested">Harvested</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="season">Season</Label>
          <Select value={formData.season} onValueChange={(value) => handleInputChange("season", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spring">Spring</SelectItem>
              <SelectItem value="summer">Summer</SelectItem>
              <SelectItem value="fall">Fall</SelectItem>
              <SelectItem value="winter">Winter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="yield_unit">Yield Unit</Label>
          <Input
            id="yield_unit"
            value={formData.yield_unit}
            onChange={(e) => handleInputChange("yield_unit", e.target.value)}
            placeholder="e.g., bushels, tons, kg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Planting Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.planting_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.planting_date ? format(formData.planting_date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.planting_date}
                onSelect={(date) => handleInputChange("planting_date", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Harvest Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.harvest_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.harvest_date ? format(formData.harvest_date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.harvest_date}
                onSelect={(date) => handleInputChange("harvest_date", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="yield_quantity">Yield Quantity</Label>
        <Input
          id="yield_quantity"
          type="number"
          value={formData.yield_quantity || ""}
          onChange={(e) => handleInputChange("yield_quantity", e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Expected or actual yield"
          min="0"
          step="0.1"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
          placeholder="Additional notes about this crop..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="bg-farm-green hover:bg-farm-green/90">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Crop" : "Create Crop"}
        </Button>
      </div>
    </form>
  );
}