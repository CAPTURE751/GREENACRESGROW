import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ListChecks, CalendarDays, Wand2, X } from 'lucide-react';
import { useProgrammes, useProgrammeTemplates, CropProgramme, ProgrammeActivity, TemplateStage } from '@/hooks/useProgrammes';
import { useCrops } from '@/hooks/useCrops';

const CROP_FAMILIES = ['Cereals', 'Legumes', 'Brassicas', 'Cucurbits', 'Solanaceae', 'Alliums', 'Roots & Tubers', 'Leafy Greens', 'Fallow'];

export function ProgrammesTab() {
  const { programmes, activities, createProgramme, updateProgramme, removeProgramme, toggleActivity } = useProgrammes();
  const { templates, stages: allStages } = useProgrammeTemplates();
  const { crops } = useCrops();
  const [openNew, setOpenNew] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Plan stage-based activities. Each one creates a linked task in the Calendar.</p>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Programme</Button>
          </DialogTrigger>
          <ProgrammeFormDialog
            crops={crops} templates={templates} allStages={allStages}
            onSave={async (p) => { await createProgramme(p); setOpenNew(false); }}
            onCancel={() => setOpenNew(false)}
          />
        </Dialog>
      </div>

      {programmes.length === 0 ? (
        <Card><CardContent className="py-12 text-center space-y-2">
          <ListChecks className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No programmes yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {programmes.map(p => {
            const acts = activities.filter(a => a.programme_id === p.id).sort((a, b) => a.day_offset - b.day_offset);
            return (
              <ProgrammeCard
                key={p.id} programme={p} activities={acts} crops={crops} templates={templates} allStages={allStages}
                onUpdate={updateProgramme} onDelete={removeProgramme} onToggle={toggleActivity}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgrammeCard({ programme, activities, crops, templates, allStages, onUpdate, onDelete, onToggle }: {
  programme: CropProgramme; activities: ProgrammeActivity[]; crops: any[]; templates: any[]; allStages: TemplateStage[];
  onUpdate: any; onDelete: any; onToggle: any;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const cropName = crops.find(c => c.id === programme.crop_id)?.name;
  const done = activities.filter(a => a.completed).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" />{programme.name}</CardTitle>
            <div className="flex gap-2 mt-1 flex-wrap text-xs text-muted-foreground items-center">
              {cropName && <Badge variant="outline">{cropName}</Badge>}
              <span>Anchor: {programme.anchor_stage} • {programme.anchor_date}</span>
              {programme.next_crop_family && <Badge variant="secondary">Next: {programme.next_crop_family}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{done}/{activities.length}</Badge>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3 w-3" /></Button>
              </DialogTrigger>
              <EditProgrammeDialog programme={programme} crops={crops}
                onSave={async (updates, regenerate) => { await onUpdate({ id: programme.id, updates, regenerate }); setEditOpen(false); }}
                onCancel={() => setEditOpen(false)} />
            </Dialog>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm('Delete programme and its linked tasks?')) onDelete(programme.id); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activities</p>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-3">
            {activities.map(a => (
              <li key={a.id} className="ml-4">
                <div className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full ${a.completed ? 'bg-farm-green' : 'bg-muted-foreground/40'}`} />
                <div className="flex items-start gap-3">
                  <Checkbox checked={a.completed} onCheckedChange={(v) => onToggle({ activity: a, completed: !!v })} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${a.completed ? 'line-through text-muted-foreground' : ''}`}>{a.name}</div>
                    <div className="text-xs text-muted-foreground flex gap-2 flex-wrap items-center">
                      <span>{a.scheduled_date}</span>
                      <span>•</span>
                      <span>Day {a.day_offset >= 0 ? '+' : ''}{a.day_offset}</span>
                      {a.priority && <Badge variant="outline" className="text-[10px] py-0">{a.priority}</Badge>}
                      {a.task_id && <Badge variant="secondary" className="text-[10px] py-0">Task linked</Badge>}
                    </div>
                    {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// --- Create dialog (with optional template) ---
function ProgrammeFormDialog({ crops, templates, allStages, onSave, onCancel }: any) {
  const [name, setName] = useState('');
  const [cropId, setCropId] = useState('none');
  const [anchorStage, setAnchorStage] = useState('Planting');
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextFamily, setNextFamily] = useState('none');
  const [templateId, setTemplateId] = useState('none');
  const [activities, setActivities] = useState<any[]>([]);

  const applyTemplate = (tid: string) => {
    setTemplateId(tid);
    if (tid === 'none') { setActivities([]); return; }
    const tpl = templates.find((t: any) => t.id === tid);
    const stages = allStages.filter((s: TemplateStage) => s.template_id === tid)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (tpl?.next_crop_family) setNextFamily(tpl.next_crop_family);
    setActivities(stages.map(s => ({
      name: s.name, day_offset: s.day_offset, task_type: s.task_type || 'general',
      priority: s.priority || 'medium', notes: s.notes || '',
    })));
  };

  const addRow = () => setActivities([...activities, { name: '', day_offset: 0, task_type: 'general', priority: 'medium', notes: '' }]);
  const updateRow = (i: number, key: string, v: any) => {
    const next = [...activities]; next[i] = { ...next[i], [key]: v }; setActivities(next);
  };
  const removeRow = (i: number) => setActivities(activities.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!name.trim() || !anchorDate) return;
    await onSave({
      programme: {
        name, crop_id: cropId === 'none' ? null : cropId,
        template_id: templateId === 'none' ? null : templateId,
        anchor_stage: anchorStage, anchor_date: anchorDate,
        next_crop_family: nextFamily === 'none' ? null : nextFamily,
      },
      activities: activities.filter(a => a.name.trim()),
    });
  };

  return (
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New Programme</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Programme name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Crop (optional)</Label>
            <Select value={cropId} onValueChange={setCropId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No crop</SelectItem>
                {crops.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Anchor stage</Label><Input value={anchorStage} onChange={e => setAnchorStage(e.target.value)} placeholder="e.g. Planting" /></div>
          <div><Label>Anchor date</Label><Input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} /></div>
          <div><Label>Next crop family (rotation)</Label>
            <Select value={nextFamily} onValueChange={setNextFamily}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CROP_FAMILIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>From template</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Blank</SelectItem>
                {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Activities</Label>
            <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-3 w-3 mr-1" />Add activity</Button>
          </div>
          {activities.length === 0 && <p className="text-xs text-muted-foreground">Add at least one activity. Each becomes a task in the Calendar.</p>}
          {activities.map((a, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
              <div className="col-span-4"><Label className="text-xs">Name</Label><Input value={a.name} onChange={e => updateRow(i, 'name', e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs">Day offset</Label><Input type="number" value={a.day_offset} onChange={e => updateRow(i, 'day_offset', parseInt(e.target.value) || 0)} /></div>
              <div className="col-span-2"><Label className="text-xs">Type</Label><Input value={a.task_type} onChange={e => updateRow(i, 'task_type', e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs">Priority</Label>
                <Select value={a.priority} onValueChange={(v) => updateRow(i, 'priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex gap-1">
                <Input placeholder="Notes" value={a.notes} onChange={e => updateRow(i, 'notes', e.target.value)} />
                <Button size="icon" variant="ghost" onClick={() => removeRow(i)}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={save}>Create Programme</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// --- Edit programme dialog (anchor + regenerate) ---
function EditProgrammeDialog({ programme, crops, onSave, onCancel }: any) {
  const [name, setName] = useState(programme.name);
  const [cropId, setCropId] = useState(programme.crop_id || 'none');
  const [anchorStage, setAnchorStage] = useState(programme.anchor_stage);
  const [anchorDate, setAnchorDate] = useState(programme.anchor_date);
  const [nextFamily, setNextFamily] = useState(programme.next_crop_family || 'none');
  const [regenerate, setRegenerate] = useState(true);

  const save = async () => {
    await onSave({
      name, crop_id: cropId === 'none' ? null : cropId,
      anchor_stage: anchorStage, anchor_date: anchorDate,
      next_crop_family: nextFamily === 'none' ? null : nextFamily,
    }, regenerate);
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Edit Programme</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Anchor stage</Label><Input value={anchorStage} onChange={e => setAnchorStage(e.target.value)} /></div>
          <div><Label>Anchor date</Label><Input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} /></div>
          <div><Label>Crop</Label>
            <Select value={cropId} onValueChange={setCropId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No crop</SelectItem>
                {crops.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Next crop family</Label>
            <Select value={nextFamily} onValueChange={setNextFamily}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CROP_FAMILIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
          <Checkbox checked={regenerate} onCheckedChange={(v) => setRegenerate(!!v)} />
          <Wand2 className="h-3 w-3" />
          <span>Regenerate calendar & tasks from new anchor date (day offsets preserved)</span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
