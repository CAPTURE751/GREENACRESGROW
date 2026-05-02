import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/hooks/useInventory';
import { useInventoryMovements } from '@/hooks/useInventoryMovements';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: any;
}

export function InventoryItemForm({ open, onOpenChange, item }: Props) {
  const { createInventoryItem, updateInventoryItem } = useInventory();
  const { createMovement } = useInventoryMovements();
  const isEdit = !!item;

  const [form, setForm] = useState({
    item_name: item?.item_name || '',
    category: item?.category || 'Seeds',
    item_type: item?.item_type || 'input',
    unit: item?.unit || 'kg',
    quantity: item?.quantity ?? 0,
    unit_cost: item?.unit_cost ?? 0,
    min_threshold: item?.min_threshold ?? 0,
    supplier: item?.supplier || '',
    location: item?.location || '',
  });

  const handleSubmit = async () => {
    if (!form.item_name.trim()) return;
    if (isEdit) {
      updateInventoryItem({
        id: item.id,
        updates: {
          item_name: form.item_name,
          category: form.category,
          item_type: form.item_type,
          unit: form.unit,
          unit_cost: form.unit_cost,
          min_threshold: form.min_threshold,
          supplier: form.supplier,
          location: form.location,
        } as any,
      });
      onOpenChange(false);
    } else {
      // Create item with quantity 0, then record opening stock as a Stock In movement so FIFO batch is created
      createInventoryItem(
        {
          item_name: form.item_name,
          category: form.category,
          item_type: form.item_type,
          unit: form.unit,
          quantity: 0,
          unit_cost: form.unit_cost,
          min_threshold: form.min_threshold,
          supplier: form.supplier,
          location: form.location,
        } as any,
        {
          onSuccess: (created: any) => {
            if (form.quantity > 0) {
              createMovement({
                inventory_id: created.id,
                movement_type: 'in',
                quantity: form.quantity,
                unit_cost: form.unit_cost,
                source: form.supplier || 'Opening Stock',
                purpose: 'Opening Stock',
                linked_module: 'manual',
              });
            }
            onOpenChange(false);
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Item Name *</Label>
            <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="input">Input</SelectItem>
                  <SelectItem value="output">Output</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Seeds, Feed, Fertilizer..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="litres">litres</SelectItem>
                  <SelectItem value="pieces">pieces</SelectItem>
                  <SelectItem value="bags">bags</SelectItem>
                  <SelectItem value="boxes">boxes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isEdit ? 'Current Stock (read-only)' : 'Opening Stock'}</Label>
              <Input
                type="number"
                value={form.quantity}
                disabled={isEdit}
                onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cost / Unit (KSh)</Label>
              <Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Min Stock Level</Label>
              <Input type="number" value={form.min_threshold} onChange={(e) => setForm({ ...form, min_threshold: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div>
              <Label>Storage Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 bg-background pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Save' : 'Add Item'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
