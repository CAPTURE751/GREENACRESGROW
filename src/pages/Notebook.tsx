import { useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, FileDown, Pencil, Trash2, AlertTriangle, BookOpen, Sprout } from 'lucide-react';
import { useCrops } from '@/hooks/useCrops';
import { useNotebookNotes, useSeasonChallenges, NotebookNote, SeasonChallenge } from '@/hooks/useNotebook';
import { exportNotesPDF, exportChallengesPDF } from '@/lib/notebook-export';
import { ProgrammesTab } from '@/components/notebook/ProgrammesTab';
import { TemplatesTab } from '@/components/notebook/TemplatesTab';

export default function Notebook() {
  const { crops } = useCrops();
  const { notes, create: createNote, update: updateNote, remove: removeNote } = useNotebookNotes();
  const { challenges, create: createChal, update: updateChal, remove: removeChal } = useSeasonChallenges();

  const [search, setSearch] = useState('');
  const [activeCropId, setActiveCropId] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (activeCropId && n.crop_id !== activeCropId) return false;
      if (search) {
        const s = search.toLowerCase();
        return n.title.toLowerCase().includes(s) || (n.content || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [notes, activeCropId, search]);

  const filteredCrops = useMemo(() => {
    if (!search) return crops;
    const s = search.toLowerCase();
    return crops.filter(c => c.name.toLowerCase().includes(s) || c.type.toLowerCase().includes(s));
  }, [crops, search]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> Farm Notebook</h1>
            <p className="text-muted-foreground">Notes, crop journals, and seasonal challenges</p>
          </div>
        </div>

        <Input placeholder="Search notes, crops, challenges..." value={search} onChange={e => setSearch(e.target.value)} />

        <Tabs defaultValue="notes">
          <TabsList>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="crops">Crops</TabsTrigger>
            <TabsTrigger value="challenges">Season Challenges</TabsTrigger>
          </TabsList>

          {/* NOTES */}
          <TabsContent value="notes" className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex gap-2 items-center">
                <Select value={activeCropId || 'all'} onValueChange={(v) => setActiveCropId(v === 'all' ? null : v)}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Notes</SelectItem>
                    {crops.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => exportNotesPDF(filteredNotes, crops, { cropFilter: activeCropId ? crops.find(c => c.id === activeCropId)?.name : undefined })}>
                  <FileDown className="h-4 w-4 mr-2" />Export PDF
                </Button>
                <NoteDialog crops={crops} onSave={createNote} defaultCropId={activeCropId} />
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No notes yet</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNotes.map(n => (
                  <NoteCard key={n.id} note={n} crops={crops} onUpdate={updateNote} onDelete={removeNote} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* CROPS */}
          <TabsContent value="crops" className="space-y-4">
            {filteredCrops.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No crops in this farm</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCrops.map(c => {
                  const cropNotes = notes.filter(n => n.crop_id === c.id);
                  return (
                    <Card key={c.id} className="cursor-pointer hover:shadow-md" onClick={() => { setActiveCropId(c.id); }}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Sprout className="h-4 w-4 text-farm-green" />
                          {c.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm text-muted-foreground">{c.type} • {c.season || 'No season'}</div>
                        <Badge variant="secondary">{cropNotes.length} note{cropNotes.length !== 1 ? 's' : ''}</Badge>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); exportNotesPDF(cropNotes, crops, { cropFilter: c.name }); }}>
                            <FileDown className="h-3 w-3 mr-1" />PDF
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* CHALLENGES */}
          <TabsContent value="challenges" className="space-y-4">
            <ChallengesTab challenges={challenges} create={createChal} update={updateChal} remove={removeChal} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// --- Note Dialog ---
function NoteDialog({ crops, onSave, defaultCropId, note, trigger }: any) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [cropId, setCropId] = useState<string>(note?.crop_id || defaultCropId || 'none');

  const handleSave = async () => {
    if (!title.trim()) return;
    await onSave(note?.id ? { id: note.id, updates: { title, content, crop_id: cropId === 'none' ? null : cropId } }
      : { title, content, crop_id: cropId === 'none' ? null : cropId });
    setOpen(false);
    if (!note) { setTitle(''); setContent(''); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button><Plus className="h-4 w-4 mr-2" />Add Note</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{note ? 'Edit Note' : 'New Note'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label>Content</Label><Textarea rows={6} value={content} onChange={e => setContent(e.target.value)} /></div>
          <div>
            <Label>Link to Crop (optional)</Label>
            <Select value={cropId} onValueChange={setCropId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No crop</SelectItem>
                {crops.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteCard({ note, crops, onUpdate, onDelete }: { note: NotebookNote; crops: any[]; onUpdate: any; onDelete: any }) {
  const cropName = crops.find(c => c.id === note.crop_id)?.name;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">{note.title}</CardTitle>
          <div className="flex gap-1">
            <NoteDialog crops={crops} onSave={onUpdate} note={note} trigger={
              <Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3 w-3" /></Button>
            } />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(note.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 items-center text-xs text-muted-foreground">
          <span>{new Date(note.updated_at).toLocaleDateString()}</span>
          {cropName && <Badge variant="outline">{cropName}</Badge>}
        </div>
      </CardHeader>
      <CardContent><p className="text-sm whitespace-pre-wrap">{note.content}</p></CardContent>
    </Card>
  );
}

// --- Challenges Tab ---
function ChallengesTab({ challenges, create, update, remove }: any) {
  const high = challenges.filter((c: SeasonChallenge) => c.severity === 'high').length;
  const inProg = challenges.filter((c: SeasonChallenge) => c.status === 'in_progress').length;
  const resolved = challenges.filter((c: SeasonChallenge) => c.status === 'resolved').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">High Severity</div><div className="text-2xl font-bold text-destructive">{high}</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">In Progress</div><div className="text-2xl font-bold">{inProg}</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Resolved</div><div className="text-2xl font-bold text-farm-green">{resolved}</div></CardContent></Card>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => exportChallengesPDF(challenges)}><FileDown className="h-4 w-4 mr-2" />Export PDF</Button>
        <ChallengeDialog onSave={create} />
      </div>
      {challenges.length === 0 ? (
        <Card><CardContent className="py-12 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No challenges reported yet</p>
          <ChallengeDialog onSave={create} trigger={<Button>Report Challenge</Button>} />
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {challenges.map((c: SeasonChallenge) => (
            <Card key={c.id}>
              <CardContent className="pt-4 flex justify-between items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{c.title}</h3>
                    <Badge variant={c.severity === 'high' ? 'destructive' : c.severity === 'medium' ? 'default' : 'secondary'}>{c.severity}</Badge>
                    <Badge variant="outline">{c.status.replace('_', ' ')}</Badge>
                  </div>
                  {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Select value={c.status} onValueChange={(v) => update({ id: c.id, updates: { status: v } })}>
                    <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ChallengeDialog({ onSave, trigger }: any) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [status, setStatus] = useState('new');

  const save = async () => {
    if (!title.trim()) return;
    await onSave({ title, description, severity, status });
    setOpen(false); setTitle(''); setDescription(''); setSeverity('medium'); setStatus('new');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button><Plus className="h-4 w-4 mr-2" />Report Challenge</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report Season Challenge</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
