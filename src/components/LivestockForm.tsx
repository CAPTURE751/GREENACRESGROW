import { useState, useEffect } from "react";
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
import { calculateAge } from "@/lib/age-calculator";

interface LivestockFormData {
  type: string;
  breed?: string;
  farm_location: string;
  gender?: string;
  age?: number;
  weight?: number;
  health_status: string;
  date_of_birth?: Date;
  date_of_arrival_at_farm?: Date;
  date_of_birth_on_farm?: Date;
  purchase_date?: Date;
  purchase_price?: number;
  notes?: string;
}

interface LivestockFormProps {
  onSubmit: (data: LivestockFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<LivestockFormData>;
}

export function LivestockForm({ onSubmit, onCancel, isLoading, initialData }: LivestockFormProps) {
  const [formData, setFormData] = useState<LivestockFormData>({
    type: initialData?.type || "",
    breed: initialData?.breed || "",
    farm_location: initialData?.farm_location || "",
    gender: initialData?.gender || "",
    health_status: initialData?.health_status || "healthy",
    notes: initialData?.notes || "",
    age: initialData?.age || undefined,
    weight: initialData?.weight || undefined,
    purchase_price: initialData?.purchase_price || undefined,
    date_of_birth: initialData?.date_of_birth,
    date_of_arrival_at_farm: initialData?.date_of_arrival_at_farm,
    date_of_birth_on_farm: initialData?.date_of_birth_on_farm,
    purchase_date: initialData?.purchase_date,
  });

  const [calculatedAge, setCalculatedAge] = useState<string>('');

  // Calculate age whenever birth dates change
  useEffect(() => {
    const age = calculateAge(formData.date_of_birth, formData.date_of_birth_on_farm);
    setCalculatedAge(age);
  }, [formData.date_of_birth, formData.date_of_birth_on_farm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one date is provided
    if (!formData.date_of_arrival_at_farm && !formData.date_of_birth_on_farm) {
      alert('Please provide either a Date of Arrival at Farm or Date of Birth on Farm');
      return;
    }
    
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof LivestockFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Animal Type *</Label>
          <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select animal type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cattle">Cattle</SelectItem>
              <SelectItem value="pig">Pig</SelectItem>
              <SelectItem value="chicken">Chicken</SelectItem>
              <SelectItem value="sheep">Sheep</SelectItem>
              <SelectItem value="goat">Goat</SelectItem>
              <SelectItem value="horse">Horse</SelectItem>
              <SelectItem value="duck">Duck</SelectItem>
              <SelectItem value="turkey">Turkey</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="breed">Breed</Label>
          <Input
            id="breed"
            value={formData.breed}
            onChange={(e) => handleInputChange("breed", e.target.value)}
            placeholder="e.g., Holstein, Yorkshire"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="farm_location">Farm Location *</Label>
          <Input
            id="farm_location"
            value={formData.farm_location}
            onChange={(e) => handleInputChange("farm_location", e.target.value)}
            placeholder="e.g., Barn A, Pen B"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="calculated_age">Age (Auto-calculated)</Label>
          <Input
            id="calculated_age"
            value={calculatedAge}
            placeholder="Will be calculated from birth date"
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">Weight (lbs)</Label>
          <Input
            id="weight"
            type="number"
            value={formData.weight || ""}
            onChange={(e) => handleInputChange("weight", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Weight in pounds"
            min="0"
            step="0.1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="health_status">Health Status</Label>
          <Select value={formData.health_status} onValueChange={(value) => handleInputChange("health_status", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select health status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="needs_attention">Needs Attention</SelectItem>
              <SelectItem value="sick">Sick</SelectItem>
              <SelectItem value="quarantine">Quarantine</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase_price">Purchase Price ($)</Label>
          <Input
            id="purchase_price"
            type="number"
            value={formData.purchase_price || ""}
            onChange={(e) => handleInputChange("purchase_price", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Purchase price"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.date_of_birth && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.date_of_birth ? format(formData.date_of_birth, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.date_of_birth}
                onSelect={(date) => handleInputChange("date_of_birth", date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Purchase Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.purchase_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.purchase_date ? format(formData.purchase_date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.purchase_date}
                onSelect={(date) => handleInputChange("purchase_date", date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date of Arrival at Farm *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.date_of_arrival_at_farm && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.date_of_arrival_at_farm ? format(formData.date_of_arrival_at_farm, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.date_of_arrival_at_farm}
                onSelect={(date) => handleInputChange("date_of_arrival_at_farm", date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Date of Birth on Farm *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.date_of_birth_on_farm && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.date_of_birth_on_farm ? format(formData.date_of_birth_on_farm, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.date_of_birth_on_farm}
                onSelect={(date) => handleInputChange("date_of_birth_on_farm", date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        * At least one of "Date of Arrival at Farm" or "Date of Birth on Farm" is required
      </p>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
          placeholder="Additional notes about this animal..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="bg-farm-barn hover:bg-farm-barn/90 text-white">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Animal" : "Add Animal"}
        </Button>
      </div>
    </form>
  );
}