import { useState } from "react";
import { useFarm } from "@/contexts/FarmContext";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function FarmSwitcher() {
  const { farms, activeFarm, setActiveFarmId, refetchFarms } = useFarm();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showNewFarmDialog, setShowNewFarmDialog] = useState(false);
  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmLocation, setNewFarmLocation] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateFarm = async () => {
    if (!newFarmName.trim() || !user) return;
    setCreating(true);

    const { data, error } = await supabase
      .from('farms' as any)
      .insert({
        name: newFarmName.trim(),
        location: newFarmLocation.trim(),
        owner_id: user.id,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else if (data) {
      toast({ title: "Farm created", description: `${newFarmName} has been created.` });
      await refetchFarms();
      setActiveFarmId((data as any).id);
      setShowNewFarmDialog(false);
      setNewFarmName("");
      setNewFarmLocation("");
    }
    setCreating(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
          >
            <span className="truncate">{activeFarm?.name || "Select farm"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-1" align="start">
          <div className="space-y-0.5">
            {farms.map((farm) => (
              <button
                key={farm.id}
                onClick={() => {
                  setActiveFarmId(farm.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                  activeFarm?.id === farm.id && "bg-accent"
                )}
              >
                {activeFarm?.id === farm.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
                <span className={cn(activeFarm?.id !== farm.id && "ml-6", "truncate")}>
                  {farm.name}
                </span>
              </button>
            ))}
            <div className="border-t my-1" />
            <button
              onClick={() => {
                setOpen(false);
                setShowNewFarmDialog(true);
              }}
              className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Add new farm</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showNewFarmDialog} onOpenChange={setShowNewFarmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Farm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="farm-name">Farm Name</Label>
              <Input
                id="farm-name"
                placeholder="e.g. Nyeri Highland Farm"
                value={newFarmName}
                onChange={(e) => setNewFarmName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farm-location">Location</Label>
              <Input
                id="farm-location"
                placeholder="e.g. Nyeri, Kenya"
                value={newFarmLocation}
                onChange={(e) => setNewFarmLocation(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFarmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFarm} disabled={creating || !newFarmName.trim()}>
              {creating ? "Creating..." : "Create Farm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
