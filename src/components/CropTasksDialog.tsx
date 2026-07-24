import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { toast } from "sonner";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { Plus, Trash2, CheckCircle2, Download, Calendar as CalendarIcon, Sprout } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { applyBrandedHeader, applyBrandedFooter } from "@/lib/pdf-branding";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  crop: any;
}

const TEMPLATES = [
  { key: "fungicide", label: "Fungicide Spray", interval: 14, priority: "high" as const },
  { key: "pesticide", label: "Pesticide Spray", interval: 14, priority: "high" as const },
  { key: "herbicide", label: "Herbicide Spray", interval: 21, priority: "medium" as const },
  { key: "foliar",    label: "Foliar Feed",     interval: 14, priority: "medium" as const },
  { key: "top-dress", label: "Fertilizer Top-Dressing", interval: 30, priority: "high" as const },
  { key: "weeding",   label: "Weeding",         interval: 14, priority: "medium" as const },
  { key: "irrigation",label: "Irrigation Check",interval: 7,  priority: "low" as const },
  { key: "scouting",  label: "Pest & Disease Scouting", interval: 7, priority: "medium" as const },
];

const cropTag = (id: string) => `[crop:${id}]`;

export function CropTasksDialog({ open, onOpenChange, crop }: Props) {
  const { tasks } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [templateKey, setTemplateKey] = useState<string>("fungicide");
  const [customTitle, setCustomTitle] = useState("");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [interval, setInterval] = useState<number>(14);
  const [occurrences, setOccurrences] = useState<number>(4);
  const [notes, setNotes] = useState("");

  const tag = cropTag(crop.id);
  const cropTasks = useMemo(
    () => tasks
      .filter((t: any) => (t.notes || "").includes(tag))
      .sort((a: any, b: any) => a.task_date.localeCompare(b.task_date)),
    [tasks, tag]
  );

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (tpl) { setInterval(tpl.interval); setCustomTitle(tpl.label); }
  };

  const handleAdd = async () => {
    const title = customTitle || TEMPLATES.find((t) => t.key === templateKey)?.label || "Crop Task";
    const tpl = TEMPLATES.find((t) => t.key === templateKey);
    const priority = tpl?.priority || "medium";
    const base = parseISO(startDate + "T00:00:00");
    const harvestCap = (crop as any).harvest_date ? parseISO((crop as any).harvest_date + "T00:00:00") : null;

    const items: Promise<any>[] = [];
    for (let i = 0; i < Math.max(1, occurrences); i++) {
      const d = addDays(base, interval * i);
      if (harvestCap && d > harvestCap) break;
      items.push(
        new Promise<void>((resolve, reject) => {
          createTask.mutate(
            {
              title: `${title} — ${crop.name}`,
              description: `${title} for ${crop.name}${(crop as any).variety ? ` (${(crop as any).variety})` : ""}`,
              task_date: d.toISOString().split("T")[0],
              task_type: "crop",
              priority,
              completed: false,
              recurrence: null,
              recurrence_end_date: null,
              parent_task_id: null,
              assigned_to: null,
              notes: `${tag} ${notes}`.trim(),
            } as any,
            { onSuccess: () => resolve(), onError: (e) => reject(e) }
          );
        })
      );
    }
    try {
      await Promise.all(items);
      toast.success(`${items.length} task${items.length > 1 ? "s" : ""} scheduled`);
      setCustomTitle(""); setNotes(""); setOccurrences(4);
    } catch (e: any) {
      toast.error(`Failed to add: ${e.message}`);
    }
  };

  const toggleDone = (t: any) => {
    updateTask.mutate({ id: t.id, updates: { completed: !t.completed } });
  };

  const remove = (id: string) => {
    if (confirm("Delete this task?")) deleteTask.mutate(id);
  };

  const exportPDF = async () => {
    try {
      const doc = new jsPDF();
      const startY = await applyBrandedHeader(doc, {
        title: `Crop Activity Schedule — ${crop.name}`,
        subtitle: `${(crop as any).variety ? (crop as any).variety + " · " : ""}${crop.farm_location}`,
        filters: `${crop.planting_date ? "Planted " + crop.planting_date : ""}${(crop as any).harvest_date ? " → Harvest " + (crop as any).harvest_date : ""}`,
      });
      autoTable(doc, {
        startY,
        head: [["Date", "Activity", "Priority", "Status", "Notes"]],
        body: cropTasks.map((t: any) => [
          format(parseISO(t.task_date + "T00:00:00"), "yyyy-MM-dd"),
          t.title,
          t.priority,
          t.completed ? "Completed" : "Pending",
          (t.notes || "").replace(tag, "").trim(),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [76, 111, 60] },
      });
      await applyBrandedFooter(doc, "calendar");
      doc.save(`crop-tasks-${crop.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("Schedule exported");
    } catch (e: any) {
      toast.error(`Export failed: ${e.message}`);
    }
  };

  const today = new Date();
  const completedCount = cropTasks.filter((t: any) => t.completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-farm-green" /> Tasks · {crop.name}
            {(crop as any).variety && <span className="text-sm text-muted-foreground">({(crop as any).variety})</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add / template block */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Schedule new activity</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Template</Label>
                <Select value={templateKey} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.key} value={t.key}>{t.label} · every {t.interval}d</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Activity name</Label>
                <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="e.g. Fungicide Spray" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Repeat every (days)</Label>
                  <Input type="number" min={1} value={interval} onChange={(e) => setInterval(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Occurrences</Label>
                  <Input type="number" min={1} value={occurrences} onChange={(e) => setOccurrences(Number(e.target.value))} />
                </div>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Product, rate, worker…" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAdd} className="bg-farm-green hover:bg-farm-green/90">
                <Plus className="h-4 w-4 mr-1" /> Add to schedule
              </Button>
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{cropTasks.length}</span>{" "}
                <span className="text-muted-foreground">scheduled ·</span>{" "}
                <span className="font-medium text-farm-green">{completedCount}</span>{" "}
                <span className="text-muted-foreground">done</span>
              </div>
              <Button size="sm" variant="outline" onClick={exportPDF} disabled={cropTasks.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Export PDF
              </Button>
            </div>
            {cropTasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
                No tasks yet. Pick a template above to schedule sprays or fertilizer.
              </div>
            ) : (
              <ScrollArea className="h-[300px] rounded-lg border">
                <div className="divide-y">
                  {cropTasks.map((t: any) => {
                    const d = parseISO(t.task_date + "T00:00:00");
                    const days = differenceInDays(d, today);
                    const overdue = !t.completed && days < 0;
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                        <Checkbox checked={t.completed} onCheckedChange={() => toggleDone(t)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-medium truncate ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                            <Badge variant="outline" className="text-[10px] capitalize">{t.priority}</Badge>
                            {t.completed ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />Done</Badge>
                            ) : overdue ? (
                              <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">{Math.abs(days)}d overdue</Badge>
                            ) : days === 0 ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Today</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">in {days}d</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <CalendarIcon className="h-3 w-3" /> {format(d, "EEE, MMM d yyyy")}
                            {(t.notes || "").replace(tag, "").trim() && (
                              <span className="ml-2 truncate">· {(t.notes || "").replace(tag, "").trim()}</span>
                            )}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => remove(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
