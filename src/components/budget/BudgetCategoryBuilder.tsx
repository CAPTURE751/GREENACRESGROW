import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, ChevronDown, ChevronRight, ChevronUp, Pencil, Trash2, Copy, ArrowUp, ArrowDown, FolderPlus, StickyNote,
} from "lucide-react";
import { formatKES } from "@/lib/currency";
import {
  BUDGET_UNITS, type BudgetCategory, type BudgetLineItem, categoryTotal, isFixed, lineTotal, uid,
} from "@/lib/budget-categories";

interface Props {
  categories: BudgetCategory[];
  farmSize: number;
  onChange: (next: BudgetCategory[]) => void;
}

const move = <T,>(arr: T[], idx: number, dir: -1 | 1) => {
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[idx], copy[j]] = [copy[j], copy[idx]];
  return copy;
};

const fmtNum = (n: number) => (Number(n) || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 });

export function BudgetCategoryBuilder({ categories, farmSize, onChange }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [catDialog, setCatDialog] = useState<{ id?: string; name: string; description: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BudgetCategory | null>(null);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  const updateCat = (id: string, patch: Partial<BudgetCategory>) =>
    onChange(categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const updateItem = (catId: string, itemId: string, patch: Partial<BudgetLineItem>) =>
    onChange(categories.map((c) => c.id !== catId ? c : { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }));

  const saveCategory = () => {
    if (!catDialog || !catDialog.name.trim()) return;
    if (catDialog.id) {
      updateCat(catDialog.id, { name: catDialog.name.trim(), description: catDialog.description.trim() || undefined });
    } else {
      onChange([...categories, { id: uid(), name: catDialog.name.trim(), description: catDialog.description.trim() || undefined, items: [] }]);
    }
    setCatDialog(null);
  };

  const deleteCategory = (c: BudgetCategory) => {
    if (c.items.length > 0) setConfirmDelete(c);
    else onChange(categories.filter((x) => x.id !== c.id));
  };

  const duplicateCategory = (idx: number) => {
    const c = categories[idx];
    const copy: BudgetCategory = { ...c, id: uid(), name: `${c.name} (copy)`, items: c.items.map((i) => ({ ...i, id: uid() })) };
    const next = [...categories];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  const addItem = (catId: string) => {
    const c = categories.find((x) => x.id === catId);
    if (!c) return;
    updateCat(catId, { items: [...c.items, { id: uid(), name: "", quantity: 1, unit: "units", unitCost: 0, perAcre: false }] });
    setCollapsed((s) => ({ ...s, [catId]: false }));
  };

  const grandTotal = categories.reduce((s, c) => s + categoryTotal(c, farmSize), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Budget Categories</h2>
          <p className="text-xs text-muted-foreground">Group your costs into categories, then add line items under each.</p>
        </div>
        <div className="flex gap-2">
          {categories.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => {
              const allCollapsed = categories.every((c) => collapsed[c.id]);
              setCollapsed(Object.fromEntries(categories.map((c) => [c.id, !allCollapsed])));
            }}>
              {categories.every((c) => collapsed[c.id]) ? "Expand all" : "Collapse all"}
            </Button>
          )}
          <Button size="sm" onClick={() => setCatDialog({ name: "", description: "" })}>
            <FolderPlus className="h-4 w-4 mr-1" /> Add Budget Category
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No budget categories yet. Click <span className="font-medium text-foreground">Add Budget Category</span> to start, or load a template.
          </CardContent>
        </Card>
      )}

      {categories.map((cat, ci) => {
        const total = categoryTotal(cat, farmSize);
        const isCollapsed = !!collapsed[cat.id];
        return (
          <Card key={cat.id} className="overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/40">
              <div className="flex items-start gap-2">
                <button
                  className="mt-0.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setCollapsed((s) => ({ ...s, [cat.id]: !isCollapsed }))}
                  aria-label={isCollapsed ? "Expand category" : "Collapse category"}
                >
                  {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setCollapsed((s) => ({ ...s, [cat.id]: !isCollapsed }))}>
                  <CardTitle className="text-base truncate">{ci + 1}. {cat.name}</CardTitle>
                  {cat.description && <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>}
                  <p className="text-sm mt-1">
                    <span className="text-muted-foreground">Category Total: </span>
                    <span className="font-bold text-primary">{formatKES(total)}</span>
                    <span className="text-xs text-muted-foreground ml-2">({cat.items.length} item{cat.items.length === 1 ? "" : "s"})</span>
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={ci === 0} onClick={() => onChange(move(categories, ci, -1))} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={ci === categories.length - 1} onClick={() => onChange(move(categories, ci, 1))} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCatDialog({ id: cat.id, name: cat.name, description: cat.description || "" })} aria-label="Edit category"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateCategory(ci)} aria-label="Duplicate category"><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCategory(cat)} aria-label="Delete category"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>

            {!isCollapsed && (
              <CardContent className="p-3 sm:p-4 space-y-3">
                {cat.items.length > 0 && (
                  <div className="hidden md:grid grid-cols-[minmax(0,2fr)_90px_120px_120px_80px_130px_auto] gap-2 px-1 text-xs text-muted-foreground">
                    <span>Item / Activity</span><span>Quantity</span><span>Unit</span><span>Cost per Unit</span><span>Per acre</span><span className="text-right">Total Cost</span><span />
                  </div>
                )}
                {cat.items.map((item, ii) => {
                  const fixed = isFixed(item);
                  const total = lineTotal(item, farmSize);
                  return (
                    <div key={item.id} className="rounded-md border p-2 md:border-0 md:p-0 space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-[minmax(0,2fr)_90px_120px_120px_80px_130px_auto] gap-2 items-center">
                        <div className="col-span-2 md:col-span-1">
                          <Label className="text-xs md:hidden">Item / Activity</Label>
                          <Input className="h-9" placeholder="e.g. Ploughing" value={item.name} onChange={(e) => updateItem(cat.id, item.id, { name: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs md:hidden">Quantity</Label>
                          <Input className="h-9" type="number" min={0} disabled={fixed} value={fixed ? "" : item.quantity || ""} placeholder={fixed ? "—" : "0"}
                            onChange={(e) => updateItem(cat.id, item.id, { quantity: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label className="text-xs md:hidden">Unit</Label>
                          <Select value={item.unit} onValueChange={(v) => updateItem(cat.id, item.id, { unit: v })}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {BUDGET_UNITS.map((u) => <SelectItem key={u} value={u}>{u === "fixed cost" ? "Fixed cost" : u}</SelectItem>)}
                              {!BUDGET_UNITS.includes(item.unit as any) && <SelectItem value={item.unit}>{item.unit}</SelectItem>}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs md:hidden">{fixed ? "Amount (KSh)" : "Cost per Unit"}</Label>
                          <Input className="h-9" type="number" min={0} value={item.unitCost || ""} placeholder={fixed ? "Amount" : "0"}
                            onChange={(e) => updateItem(cat.id, item.id, { unitCost: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <label className="flex items-center gap-2 text-xs md:justify-center">
                          <Checkbox checked={!!item.perAcre} onCheckedChange={(v) => updateItem(cat.id, item.id, { perAcre: !!v })} />
                          <span className="md:hidden">Per acre (× {fmtNum(farmSize)})</span>
                        </label>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatKES(total)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {fixed ? "fixed" : `${fmtNum(item.quantity)} × ${fmtNum(item.unitCost)}`}
                            {item.perAcre ? ` × ${fmtNum(farmSize)} ac` : ""}
                          </p>
                        </div>
                        <div className="col-span-2 md:col-span-1 flex justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={ii === 0} onClick={() => updateCat(cat.id, { items: move(cat.items, ii, -1) })} aria-label="Move item up"><ChevronUp className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={ii === cat.items.length - 1} onClick={() => updateCat(cat.id, { items: move(cat.items, ii, 1) })} aria-label="Move item down"><ChevronDown className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className={`h-8 w-8 ${item.notes ? "text-primary" : ""}`} onClick={() => setOpenNotes((s) => ({ ...s, [item.id]: !s[item.id] }))} aria-label="Notes"><StickyNote className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            const items = [...cat.items];
                            items.splice(ii + 1, 0, { ...item, id: uid() });
                            updateCat(cat.id, { items });
                          }} aria-label="Duplicate item"><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateCat(cat.id, { items: cat.items.filter((x) => x.id !== item.id) })} aria-label="Delete item"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      {(openNotes[item.id] || false) && (
                        <Input className="h-8 text-xs" placeholder="Optional notes" value={item.notes || ""} onChange={(e) => updateItem(cat.id, item.id, { notes: e.target.value })} />
                      )}
                      {!openNotes[item.id] && item.notes && <p className="text-xs text-muted-foreground px-1">📝 {item.notes}</p>}
                    </div>
                  );
                })}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => addItem(cat.id)}><Plus className="h-4 w-4 mr-1" /> Add Line Item</Button>
                  <p className="text-sm">Category Total: <span className="font-bold">{formatKES(total)}</span></p>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Overall budget summary */}
      <Card className="border-2 border-primary/40 bg-primary/5">
        <CardHeader className="pb-2"><CardTitle className="text-base">Total Estimated Investment</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {categories.length === 0 && <p className="text-sm text-muted-foreground">Add categories to see the breakdown.</p>}
          {categories.map((c, i) => (
            <div key={c.id} className="flex justify-between text-sm gap-2">
              <span className="truncate">{i + 1}. {c.name}</span>
              <span className="font-medium whitespace-nowrap">{formatKES(categoryTotal(c, farmSize))}</span>
            </div>
          ))}
          <div className="flex justify-between items-center border-t pt-2 mt-2">
            <span className="font-bold">TOTAL ESTIMATED COST</span>
            <span className="text-xl font-bold text-primary">{formatKES(grandTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!catDialog} onOpenChange={(o) => !o && setCatDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{catDialog?.id ? "Edit Budget Category" : "Add Budget Category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Category Name</Label>
              <Input autoFocus value={catDialog?.name || ""} onChange={(e) => setCatDialog((d) => d && { ...d, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && saveCategory()} placeholder="e.g. Land Preparation & Seedlings" />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea rows={2} value={catDialog?.description || ""} onChange={(e) => setCatDialog((d) => d && { ...d, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(null)}>Cancel</Button>
            <Button onClick={saveCategory} disabled={!catDialog?.name.trim()}>{catDialog?.id ? "Save" : "Add Category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirmDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This category has {confirmDelete?.items.length} line item(s) totalling {formatKES(confirmDelete ? categoryTotal(confirmDelete, farmSize) : 0)}. They will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (confirmDelete) onChange(categories.filter((x) => x.id !== confirmDelete.id));
              setConfirmDelete(null);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
