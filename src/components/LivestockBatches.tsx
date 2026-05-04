import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Skull } from 'lucide-react';
import { useLivestockBatches } from '@/hooks/useLivestockBatches';

export function LivestockBatches() {
  const { batches, createBatch, recordMortality, deleteBatch, isCreating } = useLivestockBatches();
  const [open, setOpen] = useState(false);
  const [mortalityFor, setMortalityFor] = useState<string | null>(null);
  const [mortalityCount, setMortalityCount] = useState('1');
  const [form, setForm] = useState({
    animal_type: 'chicken',
    breed: '',
    batch_id: '',
    initial_quantity: '',
    arrival_date: new Date().toISOString().split('T')[0],
    source: '',
    notes: '',
  });

  const handleSubmit = () => {
    if (!form.batch_id || !form.initial_quantity) return;
    createBatch({
      animal_type: form.animal_type,
      breed: form.breed || null,
      batch_id: form.batch_id,
      initial_quantity: Number(form.initial_quantity),
      current_quantity: Number(form.initial_quantity),
      arrival_date: form.arrival_date,
      source: form.source || null,
      notes: form.notes || null,
    } as any);
    setOpen(false);
    setForm({ ...form, batch_id: '', initial_quantity: '', breed: '', source: '', notes: '' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Bulk Livestock Batches (Poultry / Turkey)</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Batch</Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Batch ID</TableHead><TableHead>Type</TableHead><TableHead>Breed</TableHead>
            <TableHead>Initial</TableHead><TableHead>Current</TableHead><TableHead>Mortality</TableHead>
            <TableHead>Arrival</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No batches yet</TableCell></TableRow>
            ) : batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.batch_id}</TableCell>
                <TableCell className="capitalize">{b.animal_type}</TableCell>
                <TableCell>{b.breed || '-'}</TableCell>
                <TableCell>{b.initial_quantity}</TableCell>
                <TableCell><Badge>{b.current_quantity}</Badge></TableCell>
                <TableCell><Badge variant="destructive">{b.mortality_count}</Badge></TableCell>
                <TableCell className="text-xs">{b.arrival_date}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setMortalityFor(b.id)} title="Record mortality"><Skull className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteBatch(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Livestock Batch</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Animal Type *</Label>
              <Select value={form.animal_type} onValueChange={(v) => setForm({ ...form, animal_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chicken">Chicken</SelectItem>
                  <SelectItem value="turkey">Turkey</SelectItem>
                  <SelectItem value="duck">Duck</SelectItem>
                  <SelectItem value="quail">Quail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Batch ID *</Label><Input value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })} placeholder="e.g. B-001" /></div>
            <div><Label>Breed</Label><Input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} /></div>
            <div><Label>Initial Quantity *</Label><Input type="number" value={form.initial_quantity} onChange={(e) => setForm({ ...form, initial_quantity: e.target.value })} /></div>
            <div><Label>Arrival Date</Label><Input type="date" value={form.arrival_date} onChange={(e) => setForm({ ...form, arrival_date: e.target.value })} /></div>
            <div><Label>Source</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isCreating}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mortalityFor} onOpenChange={(o) => !o && setMortalityFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Mortality</DialogTitle></DialogHeader>
          <Label>How many died?</Label>
          <Input type="number" value={mortalityCount} onChange={(e) => setMortalityCount(e.target.value)} min="1" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMortalityFor(null)}>Cancel</Button>
            <Button onClick={() => {
              if (mortalityFor) recordMortality({ id: mortalityFor, count: Number(mortalityCount) || 1 });
              setMortalityFor(null);
              setMortalityCount('1');
            }}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
