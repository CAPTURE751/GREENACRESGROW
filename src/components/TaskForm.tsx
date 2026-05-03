import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask } from "@/hooks/useTasks";
import { useInventory } from "@/hooks/useInventory";
import { Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function TaskForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskType, setTaskType] = useState<'crop' | 'livestock' | 'maintenance' | 'harvest'>('crop');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<string>("planned");
  const [recurrence, setRecurrence] = useState<string>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [workersInput, setWorkersInput] = useState("");
  const [workers, setWorkers] = useState<string[]>([]);
  const [inputsUsed, setInputsUsed] = useState<{ inventory_id: string; name: string; quantity: number }[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<string>("");
  const [inputQty, setInputQty] = useState<string>("");
  const [notes, setNotes] = useState("");

  const createTask = useCreateTask();
  const { inventory } = useInventory();

  const addWorker = () => {
    if (workersInput.trim()) { setWorkers([...workers, workersInput.trim()]); setWorkersInput(""); }
  };
  const addInput = () => {
    const inv = inventory.find((i: any) => i.id === selectedInventory);
    const qty = Number(inputQty);
    if (inv && qty > 0) {
      setInputsUsed([...inputsUsed, { inventory_id: inv.id, name: inv.item_name, quantity: qty }]);
      setSelectedInventory(""); setInputQty("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !taskDate) return;

    await createTask.mutateAsync({
      title,
      description: description || undefined,
      task_date: taskDate,
      task_type: taskType,
      priority,
      completed: status === 'completed',
      recurrence: recurrence === "none" ? null : recurrence,
      recurrence_end_date: recurrenceEndDate || null,
      ...({
        task_time: taskTime || null,
        status,
        workers: workers.length ? workers : null,
        inputs_used: inputsUsed.length ? inputsUsed : null,
        notes: notes || null,
      } as any),
    } as any);

    setTitle(""); setDescription(""); setTaskDate(""); setTaskTime("");
    setTaskType('crop'); setPriority('medium'); setStatus('planned');
    setRecurrence("none"); setRecurrenceEndDate("");
    setWorkers([]); setInputsUsed([]); setNotes("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-farm-green hover:bg-farm-green/90">
          <Plus className="h-4 w-4 mr-2" />Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader><DialogTitle>Add New Farm Work / Task</DialogTitle></DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={taskType} onValueChange={(v: any) => setTaskType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="crop">Crop</SelectItem>
                    <SelectItem value="livestock">Livestock</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="harvest">Harvest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Workers</Label>
              <div className="flex gap-2">
                <Input value={workersInput} onChange={e => setWorkersInput(e.target.value)} placeholder="Worker name" />
                <Button type="button" variant="outline" onClick={addWorker}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {workers.map((w, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">{w}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setWorkers(workers.filter((_, idx) => idx !== i))} />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Inputs Used (from Inventory)</Label>
              <div className="grid grid-cols-[1fr,80px,auto] gap-2">
                <Select value={selectedInventory} onValueChange={setSelectedInventory}>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    {inventory.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.item_name} ({i.quantity} {i.unit})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Qty" value={inputQty} onChange={e => setInputQty(e.target.value)} />
                <Button type="button" variant="outline" onClick={addInput}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {inputsUsed.map((inp, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">{inp.name}: {inp.quantity}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setInputsUsed(inputsUsed.filter((_, idx) => idx !== i))} />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recurrence</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="none">No Repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recurrence !== "none" && (
                <div className="space-y-2">
                  <Label>Repeat Until</Label>
                  <Input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </form>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="task-form" disabled={createTask.isPending} className="bg-farm-green hover:bg-farm-green/90">
            {createTask.isPending ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
