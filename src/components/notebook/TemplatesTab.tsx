import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, FileText, X, Copy } from 'lucide-react';
import { useProgrammeTemplates, useProgrammes, ProgrammeTemplate, TemplateStage } from '@/hooks/useProgrammes';
import { useCrops } from '@/hooks/useCrops';
import { useToast } from '@/hooks/use-toast';

const CROP_FAMILIES = ['Cereals', 'Legumes', 'Brassicas', 'Cucurbits', 'Solanaceae', 'Alliums', 'Roots & Tubers', 'Leafy Greens', 'Fallow'];

export function TemplatesTab() {
  const { templates, stages, createTemplate, updateTemplate, removeTemplate } = useProgrammeTemplates();
  const { createProgramme } = useProgrammes();
  const { crops } = useCrops();
  const { toast } = useToast();
  const [openNew, setOpenNew] = useState(false);
  const [quickTpl, setQuickTpl] = useState<ProgrammeTemplate | null>(null);

  const oneClickCreate = async (tpl: ProgrammeTemplate) => {
    const tplStages = stages.filter(s => s.template_id === tpl.id).sort((a, b) => a.sort_order - b.sort_order);
    if (!tplStages.length) { toast({ variant: 'destructive', title: 'Template has no stages' }); return; }
    await createProgramme({
      programme: {
        name: `${tpl.name} – ${new Date().toLocaleDateString()}`,
        template_id: tpl.id,
        anchor_stage: tplStages[0].name || 'Planting',
        anchor_date: new Date().toISOString().slice(0, 10),
        next_crop_family: tpl.next_crop_family,
      } as any,
      activities: tplStages.map(s => ({
        name: s.name, day_offset: s.day_offset,
        task_type: s.task_type || 'general', priority: s.priority || 'medium', notes: s.notes || '',
      })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Reusable stage offsets and rotation rules. Create programmes from a template in one click.</p>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Template</Button>
          </DialogTrigger>
          <TemplateFormDialog
            onSave={async (t, s) => { await createTemplate({ template: t, stages: s }); setOpenNew(false); }}
            onCancel={() => setOpenNew(false)}
          />
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card><CardContent className="py-12 text-center space-y-2">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No templates yet</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(t => {
            const ts = stages.filter(s => s.template_id === t.id).sort((a, b) => a.sort_order - b.sort_order);
            return <TemplateCard key={t.id} template={t} stages={ts}
              onUpdate={updateTemplate} onDelete={removeTemplate} onUse={() => oneClickCreate(t)} />;
          })}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, stages, onUpdate, onDelete, onUse }: any) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            <div className="flex gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
              {template.crop_type && <Badge variant="outline">{template.crop_type}</Badge>}
              {template.next_crop_family && <Badge variant="secondary">Rotate → {template.next_crop_family}</Badge>}
              <span>{stages.length} stage{stages.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3 w-3" /></Button>
              </DialogTrigger>
              <TemplateFormDialog template={template} initialStages={stages}
                onSave={async (t, s) => { await onUpdate({ id: template.id, updates: t, stages: s }); setEditOpen(false); }}
                onCancel={() => setEditOpen(false)} />
            </Dialog>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm('Delete template?')) onDelete(template.id); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {template.description && <p className="text-xs text-muted-foreground">{template.description}</p>}
        <ol className="text-xs space-y-1 max-h-32 overflow-auto">
          {stages.map((s: TemplateStage) => (
            <li key={s.id} className="flex justify-between gap-2">
              <span className="truncate">{s.name}</span>
              <span className="text-muted-foreground">Day {s.day_offset >= 0 ? '+' : ''}{s.day_offset}</span>
            </li>
          ))}
        </ol>
        <Button size="sm" className="w-full" onClick={onUse}><Copy className="h-3 w-3 mr-2" />Create Programme</Button>
      </CardContent>
    </Card>
  );
}

function TemplateFormDialog({ template, initialStages, onSave, onCancel }: any) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [cropType, setCropType] = useState(template?.crop_type || '');
  const [nextFamily, setNextFamily] = useState(template?.next_crop_family || 'none');
  const [rows, setRows] = useState<any[]>(initialStages?.length ? initialStages.map((s: TemplateStage) => ({
    name: s.name, day_offset: s.day_offset, task_type: s.task_type, priority: s.priority, notes: s.notes,
  })) : []);

  const addRow = () => setRows([...rows, { name: '', day_offset: 0, task_type: 'general', priority: 'medium', notes: '' }]);
  const updRow = (i: number, k: string, v: any) => { const n = [...rows]; n[i] = { ...n[i], [k]: v }; setRows(n); };
  const rmRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!name.trim()) return;
    await onSave({
      name, description: description || null, crop_type: cropType || null,
      next_crop_family: nextFamily === 'none' ? null : nextFamily,
    }, rows.filter(r => r.name.trim()));
  };

  return (
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{template ? 'Edit Template' : 'New Template'}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Crop type</Label><Input value={cropType} onChange={e => setCropType(e.target.value)} placeholder="e.g. Maize" /></div>
        </div>
        <div><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div><Label>Next crop family (rotation rule)</Label>
          <Select value={nextFamily} onValueChange={setNextFamily}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {CROP_FAMILIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Stages</Label>
            <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-3 w-3 mr-1" />Add stage</Button>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
              <div className="col-span-4"><Label className="text-xs">Stage</Label><Input value={r.name} onChange={e => updRow(i, 'name', e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs">Day offset</Label><Input type="number" value={r.day_offset} onChange={e => updRow(i, 'day_offset', parseInt(e.target.value) || 0)} /></div>
              <div className="col-span-2"><Label className="text-xs">Type</Label><Input value={r.task_type} onChange={e => updRow(i, 'task_type', e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs">Priority</Label>
                <Select value={r.priority} onValueChange={(v) => updRow(i, 'priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex gap-1">
                <Input placeholder="Notes" value={r.notes} onChange={e => updRow(i, 'notes', e.target.value)} />
                <Button size="icon" variant="ghost" onClick={() => rmRow(i)}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={save}>Save Template</Button>
      </DialogFooter>
    </DialogContent>
  );
}
