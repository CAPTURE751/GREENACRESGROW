import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, FileDown, Plus } from 'lucide-react';
import { useEquipmentMaintenance } from '@/hooks/useEquipmentMaintenance';
import { formatKES } from '@/lib/currency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { applyBrandedHeader, applyBrandedFooter, BRAND_HEADER_COLOR } from '@/lib/pdf-branding';
import { farmFileName } from '@/lib/report-export';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  equipmentId: string;
  equipmentName: string;
}

export function EquipmentMaintenanceDialog({ open, onOpenChange, equipmentId, equipmentName }: Props) {
  const { logs, createLog, deleteLog, isCreating } = useEquipmentMaintenance(equipmentId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    log_type: 'service',
    log_date: new Date().toISOString().split('T')[0],
    description: '',
    performed_by: '',
    cost: '',
    fuel_litres: '',
    hours_used: '',
    next_service_date: '',
    notes: '',
  });

  const totals = {
    cost: logs.reduce((s, l) => s + Number(l.cost || 0), 0),
    fuel: logs.reduce((s, l) => s + Number(l.fuel_litres || 0), 0),
    hours: logs.reduce((s, l) => s + Number(l.hours_used || 0), 0),
    lastService: logs.find((l) => l.log_type === 'service')?.log_date,
    nextService: logs.find((l) => l.next_service_date)?.next_service_date,
  };

  const handleSubmit = () => {
    createLog({
      equipment_id: equipmentId,
      log_type: form.log_type,
      log_date: form.log_date,
      description: form.description || null,
      performed_by: form.performed_by || null,
      cost: form.cost ? Number(form.cost) : 0,
      fuel_litres: form.fuel_litres ? Number(form.fuel_litres) : null,
      hours_used: form.hours_used ? Number(form.hours_used) : null,
      next_service_date: form.next_service_date || null,
      notes: form.notes || null,
    });
    setShowForm(false);
    setForm({ ...form, description: '', cost: '', fuel_litres: '', hours_used: '', notes: '' });
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    const startY = await applyBrandedHeader(doc, { title: `Equipment Maintenance Log`, subtitle: equipmentName });
    autoTable(doc, {
      startY,
      head: [['Type', 'Total']],
      body: [
        ['Total Cost', formatKES(totals.cost)],
        ['Total Fuel (L)', String(totals.fuel)],
        ['Total Hours', String(totals.hours)],
        ['Last Service', totals.lastService || '-'],
        ['Next Service', totals.nextService || '-'],
      ],
      headStyles: { fillColor: BRAND_HEADER_COLOR },
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['Date', 'Type', 'Description', 'By', 'Cost', 'Fuel L', 'Hours']],
      body: logs.map((l) => [
        l.log_date, l.log_type, l.description || '-', l.performed_by || '-',
        formatKES(Number(l.cost || 0)), String(l.fuel_litres ?? '-'), String(l.hours_used ?? '-'),
      ]),
      headStyles: { fillColor: BRAND_HEADER_COLOR },
      styles: { fontSize: 8 },
    });
    await applyBrandedFooter(doc);
    doc.save(await farmFileName(`Equipment-${equipmentName}`, 'pdf'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Maintenance Log — {equipmentName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Cost</p><p className="font-bold">{formatKES(totals.cost)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Fuel (L)</p><p className="font-bold">{totals.fuel.toFixed(1)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Hours Used</p><p className="font-bold">{totals.hours.toFixed(1)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Last Service</p><p className="font-bold text-sm">{totals.lastService || '-'}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Next Service</p><p className="font-bold text-sm">{totals.nextService || '-'}</p></CardContent></Card>
        </div>

        <div className="flex justify-end gap-2 mb-2">
          <Button size="sm" variant="outline" onClick={exportPDF}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />Add Log</Button>
        </div>

        {showForm && (
          <Card className="mb-3"><CardContent className="pt-4 grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={form.log_type} onValueChange={(v) => setForm({ ...form, log_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="usage">Usage</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} /></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Performed By</Label><Input value={form.performed_by} onChange={(e) => setForm({ ...form, performed_by: e.target.value })} /></div>
            <div><Label>Cost (KSh)</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            <div><Label>Fuel (Litres)</Label><Input type="number" value={form.fuel_litres} onChange={(e) => setForm({ ...form, fuel_litres: e.target.value })} /></div>
            <div><Label>Hours Used</Label><Input type="number" value={form.hours_used} onChange={(e) => setForm({ ...form, hours_used: e.target.value })} /></div>
            <div className="col-span-2"><Label>Next Service Date</Label><Input type="date" value={form.next_service_date} onChange={(e) => setForm({ ...form, next_service_date: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isCreating}>Save</Button>
            </div>
          </CardContent></Card>
        )}

        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead>
            <TableHead>Cost</TableHead><TableHead>Fuel</TableHead><TableHead>Hrs</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No logs yet</TableCell></TableRow>
            ) : logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.log_date}</TableCell>
                <TableCell className="capitalize">{l.log_type}</TableCell>
                <TableCell className="text-xs">{l.description || '-'}</TableCell>
                <TableCell>{formatKES(Number(l.cost || 0))}</TableCell>
                <TableCell>{l.fuel_litres ?? '-'}</TableCell>
                <TableCell>{l.hours_used ?? '-'}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => deleteLog(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
