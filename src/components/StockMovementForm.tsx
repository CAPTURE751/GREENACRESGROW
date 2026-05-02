import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useInventory } from '@/hooks/useInventory';
import { useInventoryMovements } from '@/hooks/useInventoryMovements';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: 'in' | 'out' | 'adjustment';
  defaultItemId?: string;
}

export function StockMovementForm({ open, onOpenChange, type, defaultItemId }: Props) {
  const { inventory } = useInventory();
  const { createMovement, isCreating } = useInventoryMovements();

  const [form, setForm] = useState({
    inventory_id: defaultItemId || '',
    quantity: 0,
    unit_cost: 0,
    movement_date: new Date().toISOString().slice(0, 10),
    source: '',
    destination: '',
    purpose: '',
    reason: '',
    batch_number: '',
    expiry_date: '',
    linked_module: 'manual' as 'crop' | 'livestock' | 'sale' | 'purchase' | 'equipment' | 'manual',
    notes: '',
  });

  const titles = { in: 'Stock In', out: 'Stock Out', adjustment: 'Stock Adjustment' };

  const submit = () => {
    if (!form.inventory_id || form.quantity <= 0) return;
    const payload: any = {
      inventory_id: form.inventory_id,
      movement_type: type,
      quantity: form.quantity,
      movement_date: form.movement_date,
      notes: form.notes || null,
      linked_module: form.linked_module,
    };
    if (type === 'in') {
      payload.unit_cost = form.unit_cost;
      payload.total_cost = form.quantity * form.unit_cost;
      payload.source = form.source || null;
      payload.batch_number = form.batch_number || null;
      payload.expiry_date = form.expiry_date || null;
    } else if (type === 'out') {
      payload.destination = form.destination || null;
      payload.purpose = form.purpose || null;
    } else {
      payload.reason = form.reason || null;
    }
    createMovement(payload, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[type]}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Item *</Label>
            <Select value={form.inventory_id} onValueChange={(v) => setForm({ ...form, inventory_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>
                {inventory.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.item_name} ({i.quantity} {i.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity *</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.movement_date} onChange={(e) => setForm({ ...form, movement_date: e.target.value })} />
            </div>
          </div>

          {type === 'in' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Unit Cost (KSh)</Label>
                  <Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Source / Supplier</Label>
                  <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Batch Number</Label>
                  <Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} placeholder="Auto if blank" />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {type === 'out' && (
            <>
              <div>
                <Label>Purpose</Label>
                <Select value={form.linked_module} onValueChange={(v: any) => setForm({ ...form, linked_module: v, purpose: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crop">Crop Application</SelectItem>
                    <SelectItem value="livestock">Livestock Feeding/Treatment</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="manual">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Field A, Coop 2..." />
              </div>
            </>
          )}

          {type === 'adjustment' && (
            <div>
              <Label>Reason *</Label>
              <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spoilage">Spoilage</SelectItem>
                  <SelectItem value="Damage">Damage</SelectItem>
                  <SelectItem value="Theft">Theft</SelectItem>
                  <SelectItem value="Stock Count Correction">Stock Count Correction</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 bg-background pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={isCreating || !form.inventory_id || form.quantity <= 0}>
            Record {titles[type]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
