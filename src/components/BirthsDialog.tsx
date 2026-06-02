import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Baby, Trash2, Pencil, Check, X } from 'lucide-react';
import { useLivestockBirths } from '@/hooks/useLivestockBirths';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mother: any | null;
}

export function BirthsDialog({ open, onOpenChange, mother }: Props) {
  const { births, recordBirth, updateBirth, deleteBirth, isRecording } = useLivestockBirths(mother?.id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [males, setMales] = useState('0');
  const [females, setFemales] = useState('1');
  const [notes, setNotes] = useState('');
  const [tagPrefix, setTagPrefix] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editCount, setEditCount] = useState('');
  const [editNotes, setEditNotes] = useState('');

  if (!mother) return null;

  const total = Number(males || 0) + Number(females || 0);

  const handleSubmit = () => {
    if (total < 1) return;
    recordBirth({
      mother_id: mother.id,
      birth_date: date,
      males: Number(males || 0),
      females: Number(females || 0),
      notes: notes || null,
      mother_type: mother.type,
      mother_breed: mother.breed,
      farm_location: mother.farm_location,
      mother_tag: mother.tag_number || null,
      tag_prefix: tagPrefix || undefined,
    });
    setMales('0'); setFemales('1'); setNotes(''); setTagPrefix('');
  };

  const startEdit = (b: any) => {
    setEditingId(b.id);
    setEditDate(b.birth_date);
    setEditCount(String(b.newborn_count));
    setEditNotes(b.notes || '');
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateBirth({
      id: editingId,
      updates: {
        birth_date: editDate,
        newborn_count: Number(editCount) || 1,
        notes: editNotes || null,
      },
    });
    setEditingId(null);
  };

  const totalNewborns = births.reduce((s, b) => s + (b.newborn_count || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5" />
            Birth History — {mother.type} {mother.tag_number ? `(${mother.tag_number})` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total births recorded</span>
              <Badge>{births.length} events · {totalNewborns} newborns</Badge>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {births.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No birth records yet</p>
            ) : (
              <ol className="relative border-l-2 border-muted pl-4 space-y-3">
                {births.map((b) => (
                  <li key={b.id} className="relative">
                    <span className="absolute -left-[22px] top-2 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                    <div className="border rounded-lg p-2 text-sm bg-card">
                      {editingId === b.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                            <Input type="number" min="1" value={editCount} onChange={(e) => setEditCount(e.target.value)} />
                          </div>
                          <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                            <Button size="sm" onClick={saveEdit}><Check className="h-4 w-4 mr-1" />Save</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium">{new Date(b.birth_date + 'T00:00:00').toLocaleDateString()} · {b.newborn_count} newborn(s)</div>
                            {b.notes && <div className="text-xs text-muted-foreground mt-0.5">{b.notes}</div>}
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => startEdit(b)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => {
                              if (confirm('Delete this birth record? Newborn animal records remain in livestock.')) deleteBirth(b.id);
                            }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Record a New Birth</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Birth Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><Label>Males</Label><Input type="number" min="0" value={males} onChange={(e) => setMales(e.target.value)} /></div>
              <div><Label>Females</Label><Input type="number" min="0" value={females} onChange={(e) => setFemales(e.target.value)} /></div>
              <div className="col-span-2">
                <Label>Tag base (optional)</Label>
                <Input value={tagPrefix} onChange={(e) => setTagPrefix(e.target.value)} placeholder={mother.tag_number || 'e.g. NB'} />
                <p className="text-xs text-muted-foreground mt-1">
                  Newborn tags will be: <span className="font-mono">{(tagPrefix || mother.tag_number || 'NB')}-M-1, {(tagPrefix || mother.tag_number || 'NB')}-F-1 …</span>
                </p>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. healthy delivery, assistance needed..." /></div>
            </div>
            <p className="text-xs text-muted-foreground">Total newborns: <span className="font-medium">{total}</span></p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSubmit} disabled={isRecording || total < 1}>
            <Baby className="h-4 w-4 mr-1" /> Record Birth
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
