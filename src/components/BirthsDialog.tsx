import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Baby, Trash2 } from 'lucide-react';
import { useLivestockBirths } from '@/hooks/useLivestockBirths';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mother: any | null;
}

export function BirthsDialog({ open, onOpenChange, mother }: Props) {
  const { births, recordBirth, deleteBirth, isRecording } = useLivestockBirths(mother?.id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [count, setCount] = useState('1');
  const [notes, setNotes] = useState('');
  const [tagPrefix, setTagPrefix] = useState('');

  if (!mother) return null;

  const handleSubmit = () => {
    const c = Number(count);
    if (!c || c < 1) return;
    recordBirth({
      mother_id: mother.id,
      birth_date: date,
      newborn_count: c,
      notes: notes || null,
      mother_type: mother.type,
      mother_breed: mother.breed,
      farm_location: mother.farm_location,
      tag_prefix: tagPrefix || (mother.tag_number ? `${mother.tag_number}-C` : null),
    });
    setCount('1'); setNotes(''); setTagPrefix('');
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

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {births.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No birth records yet</p>
            ) : births.map((b) => (
              <div key={b.id} className="flex items-center justify-between border rounded-lg p-2 text-sm">
                <div>
                  <div className="font-medium">{new Date(b.birth_date).toLocaleDateString()} · {b.newborn_count} newborn(s)</div>
                  {b.notes && <div className="text-xs text-muted-foreground">{b.notes}</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteBirth(b.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Record a New Birth</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Birth Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><Label># of Newborns *</Label><Input type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} /></div>
              <div className="col-span-2"><Label>Tag prefix for newborns (optional)</Label><Input value={tagPrefix} onChange={(e) => setTagPrefix(e.target.value)} placeholder={mother.tag_number ? `${mother.tag_number}-C` : 'e.g. NB'} /></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. healthy delivery, assistance needed..." /></div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSubmit} disabled={isRecording}>
            <Baby className="h-4 w-4 mr-1" /> Record Birth
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
