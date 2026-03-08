import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Layout } from "@/components/Layout";
import { useEquipment } from "@/hooks/useEquipment";
import { EquipmentForm } from "@/components/EquipmentForm";
import { formatKES } from "@/lib/currency";
import { Plus, Wrench, Loader2, Pencil, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  in_use: "bg-blue-100 text-blue-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  broken: "bg-red-100 text-red-800",
};

export default function Equipment() {
  const { equipment, isLoading, createEquipment, updateEquipment, deleteEquipment, isCreating, isUpdating } = useEquipment();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = equipment.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: equipment.length,
    available: equipment.filter((e) => e.status === "available").length,
    maintenance: equipment.filter((e) => e.status === "maintenance").length,
    totalValue: equipment.reduce((sum, e) => sum + (e.purchase_price || 0), 0),
  };

  const editingItem = editingId ? equipment.find((e) => e.id === editingId) : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Equipment Management</h1>
            <p className="text-muted-foreground">Track and manage farm equipment and machinery</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-farm-green hover:bg-farm-green-dark">
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Equipment</DialogTitle>
              </DialogHeader>
              <EquipmentForm
                isLoading={isCreating}
                onSubmit={(data) => {
                  createEquipment({
                    name: data.name,
                    category: data.category,
                    status: data.status,
                    purchase_date: data.purchase_date || null,
                    purchase_price: data.purchase_price ?? null,
                    maintenance_date: data.maintenance_date || null,
                    notes: data.notes || null,
                  });
                  setIsAddOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Equipment</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold text-green-600">{stats.available}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">In Maintenance</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-farm-green">{formatKES(stats.totalValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Equipment List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Equipment ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-farm-green" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {search ? "No equipment matches your search" : "No equipment added yet"}
              </p>
            ) : (
              <div className="space-y-3">
                {filtered.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-muted">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                        <div className="flex gap-2 mt-1">
                          {item.purchase_price && (
                            <span className="text-xs text-muted-foreground">{formatKES(item.purchase_price)}</span>
                          )}
                          {item.maintenance_date && (
                            <span className="text-xs text-muted-foreground">Maintenance: {new Date(item.maintenance_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusColors[item.status || "available"] || statusColors.available}>
                        {(item.status || "available").replace("_", " ")}
                      </Badge>
                      <Dialog open={editingId === item.id} onOpenChange={(open) => setEditingId(open ? item.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader><DialogTitle>Edit Equipment</DialogTitle></DialogHeader>
                          {editingItem && (
                            <EquipmentForm
                              isLoading={isUpdating}
                              initialData={{
                                name: editingItem.name,
                                category: editingItem.category,
                                status: editingItem.status || "available",
                                purchase_date: editingItem.purchase_date || "",
                                purchase_price: editingItem.purchase_price ?? undefined,
                                maintenance_date: editingItem.maintenance_date || "",
                                notes: editingItem.notes || "",
                              }}
                              onSubmit={(data) => {
                                updateEquipment({
                                  id: item.id,
                                  updates: {
                                    name: data.name,
                                    category: data.category,
                                    status: data.status,
                                    purchase_date: data.purchase_date || null,
                                    purchase_price: data.purchase_price ?? null,
                                    maintenance_date: data.maintenance_date || null,
                                    notes: data.notes || null,
                                  },
                                });
                                setEditingId(null);
                              }}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{item.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteEquipment(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
