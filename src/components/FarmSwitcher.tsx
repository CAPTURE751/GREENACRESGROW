import { useState, useRef } from "react";
import { useFarm } from "@/contexts/FarmContext";
import { Check, ChevronsUpDown, Plus, Trash2, Pencil, Upload, X } from "lucide-react";
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
  DialogDescription,
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [farmToDelete, setFarmToDelete] = useState<{ id: string; name: string } | null>(null);
  const [farmToEdit, setFarmToEdit] = useState<{ id: string; name: string; location: string; logo_url: string | null } | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmLocation, setNewFarmLocation] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreateFarm = async () => {
    if (!newFarmName.trim() || !user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('farms' as any)
      .insert({ name: newFarmName.trim(), location: newFarmLocation.trim(), owner_id: user.id } as any)
      .select().single();
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

  const handleDeleteFarm = async () => {
    if (!farmToDelete) return;
    if (farms.length <= 1) {
      toast({ variant: "destructive", title: "Cannot delete", description: "You must have at least one farm." });
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from('farms' as any).delete().eq('id', farmToDelete.id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Farm deleted", description: `${farmToDelete.name} has been deleted.` });
      await refetchFarms();
    }
    setDeleting(false);
    setShowDeleteDialog(false);
    setFarmToDelete(null);
  };

  const handleEditFarm = async () => {
    if (!farmToEdit || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('farms' as any)
      .update({ name: editName.trim(), location: editLocation.trim() } as any)
      .eq('id', farmToEdit.id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Farm updated", description: "Farm details have been saved." });
      await refetchFarms();
    }
    setSaving(false);
    setShowEditDialog(false);
    setFarmToEdit(null);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between text-left font-normal">
            <span className="truncate">{activeFarm?.name || "Select farm"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-1" align="start">
          <div className="space-y-0.5">
            {farms.map((farm) => (
              <div key={farm.id} className="flex items-center group">
                <button
                  onClick={() => { setActiveFarmId(farm.id); setOpen(false); }}
                  className={cn(
                    "flex items-center gap-2 flex-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                    activeFarm?.id === farm.id && "bg-accent"
                  )}
                >
                  {activeFarm?.id === farm.id ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                  <span className="truncate">{farm.name}</span>
                </button>
                {farm.owner_id === user?.id && (
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFarmToEdit({ id: farm.id, name: farm.name, location: farm.location });
                        setEditName(farm.name);
                        setEditLocation(farm.location);
                        setShowEditDialog(true);
                        setOpen(false);
                      }}
                      className="p-1 rounded hover:bg-accent text-muted-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {farms.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFarmToDelete({ id: farm.id, name: farm.name });
                          setShowDeleteDialog(true);
                          setOpen(false);
                        }}
                        className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="border-t my-1" />
            <button
              onClick={() => { setOpen(false); setShowNewFarmDialog(true); }}
              className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Add new farm</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Create Farm Dialog */}
      <Dialog open={showNewFarmDialog} onOpenChange={setShowNewFarmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Farm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="farm-name">Farm Name</Label>
              <Input id="farm-name" placeholder="e.g. Nyeri Highland Farm" value={newFarmName} onChange={(e) => setNewFarmName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farm-location">Location</Label>
              <Input id="farm-location" placeholder="e.g. Nyeri, Kenya" value={newFarmLocation} onChange={(e) => setNewFarmLocation(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFarmDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateFarm} disabled={creating || !newFarmName.trim()}>
              {creating ? "Creating..." : "Create Farm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Farm Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Farm</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{farmToDelete?.name}</strong>? This will permanently remove all data associated with this farm including crops, livestock, sales, purchases, and inventory. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteFarm} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Farm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Farm Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Farm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-farm-name">Farm Name</Label>
              <Input id="edit-farm-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-farm-location">Location</Label>
              <Input id="edit-farm-location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditFarm} disabled={saving || !editName.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}