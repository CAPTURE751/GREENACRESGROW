import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Plus, Trash2, HandCoins, Sparkles, Pencil, Filter, X, ChevronDown, Files } from "lucide-react";
import { formatKES } from "@/lib/currency";
import { useDisbursements, type NewDisbursement, type Disbursement } from "@/hooks/useDisbursements";
import { exportDisbursementsPDF, exportDisbursementsBatch } from "@/lib/disbursement-export";
import type { ProjectMetrics } from "@/lib/profit-analytics";

const CATEGORIES = [
  "Loan Repayment", "Salary", "Consultation", "Farm Reinvestment", "Owner Drawings",
  "Savings", "Emergency Fund", "Equipment", "Marketing", "Insurance", "Training", "Other",
];

interface Props {
  projects: ProjectMetrics[];
}

export function DisbursementsTab({ projects }: Props) {
  const { items, create, update, remove } = useDisbursements();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Disbursement | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<NewDisbursement>(emptyForm());

  // Filters
  const [fProject, setFProject] = useState<string>("all");
  const [fCategory, setFCategory] = useState<string>("all");
  const [fRecipient, setFRecipient] = useState<string>("");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");

  const profitableProjects = useMemo(
    () => projects.filter((p) => p.profit > 0),
    [projects]
  );

  function emptyForm(): NewDisbursement {
    return {
      source_kind: "crop",
      source_id: null,
      source_name: "",
      category: "Loan Repayment",
      recipient: "",
      amount: 0,
      disbursed_on: new Date().toISOString().slice(0, 10),
      notes: null,
    };
  }

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (d: Disbursement) => {
    setEditing(d);
    setForm({
      source_kind: d.source_kind,
      source_id: d.source_id,
      source_name: d.source_name,
      category: d.category,
      recipient: d.recipient,
      amount: Number(d.amount),
      disbursed_on: d.disbursed_on,
      notes: d.notes,
    });
    setOpen(true);
  };

  const chooseProject = (id: string) => {
    const p = profitableProjects.find((x) => x.id === id);
    if (!p) return;
    setForm((f) => ({ ...f, source_kind: p.kind, source_id: p.id, source_name: p.name }));
  };

  const disbursedBySource = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((d) => {
      const k = `${d.source_kind}:${d.source_id || d.source_name}`;
      m.set(k, (m.get(k) || 0) + Number(d.amount));
    });
    return m;
  }, [items]);

  const availableFor = (p: ProjectMetrics) =>
    p.profit - (disbursedBySource.get(`${p.kind}:${p.id}`) || 0);

  // Available for a given source key (used in validation), excluding the editing record.
  const availableForSource = (kind: string, id: string | null, name: string) => {
    const project = projects.find(
      (p) => p.kind === kind && (id ? p.id === id : p.name === name)
    );
    if (!project) return Infinity; // Unknown source: don't block
    const disbursed = items
      .filter((d) => d.source_kind === kind && (id ? d.source_id === id : d.source_name === name))
      .filter((d) => !editing || d.id !== editing.id)
      .reduce((s, d) => s + Number(d.amount), 0);
    return project.profit - disbursed;
  };

  const currentAvailable = form.source_name
    ? availableForSource(form.source_kind, form.source_id, form.source_name)
    : 0;
  const exceedsAvailable = Number.isFinite(currentAvailable) && form.amount > currentAvailable;

  const submit = async () => {
    if (!form.source_name || !form.recipient || !form.category || form.amount <= 0) return;
    if (exceedsAvailable) return;
    const result = editing
      ? await update(editing.id, form)
      : await create(form);
    if (result) {
      setOpen(false);
      setEditing(null);
      setForm(emptyForm());
    }
  };

  // Filtered items (applied to ledger + exports)
  const filtered = useMemo(() => {
    return items.filter((d) => {
      if (fProject !== "all") {
        const key = `${d.source_kind}:${d.source_id || d.source_name}`;
        if (key !== fProject) return false;
      }
      if (fCategory !== "all" && d.category !== fCategory) return false;
      if (fRecipient && !d.recipient.toLowerCase().includes(fRecipient.toLowerCase())) return false;
      if (fFrom && d.disbursed_on < fFrom) return false;
      if (fTo && d.disbursed_on > fTo) return false;
      return true;
    });
  }, [items, fProject, fCategory, fRecipient, fFrom, fTo]);

  const clearFilters = () => {
    setFProject("all"); setFCategory("all"); setFRecipient(""); setFFrom(""); setFTo("");
  };
  const activeFilterCount =
    (fProject !== "all" ? 1 : 0) + (fCategory !== "all" ? 1 : 0) +
    (fRecipient ? 1 : 0) + (fFrom ? 1 : 0) + (fTo ? 1 : 0);

  const totalDisbursed = filtered.reduce((s, d) => s + Number(d.amount), 0);
  const totalProfit = projects.reduce((s, p) => s + Math.max(p.profit, 0), 0);
  const allTimeDisbursed = items.reduce((s, d) => s + Number(d.amount), 0);

  // Unique sources present in ledger (for filter dropdown)
  const sourceOptions = useMemo(() => {
    const m = new Map<string, { key: string; label: string; kind: string }>();
    items.forEach((d) => {
      const key = `${d.source_kind}:${d.source_id || d.source_name}`;
      if (!m.has(key)) m.set(key, { key, label: d.source_name, kind: d.source_kind });
    });
    return Array.from(m.values());
  }, [items]);

  return (
    <div className="space-y-4">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Isolated ledger</AlertTitle>
        <AlertDescription>
          Disbursement records live only in the Profit Distribution module. They do not affect finances, wallet, sales, purchases or any other module.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Profitable Projects" value={String(profitableProjects.length)} />
        <StatCard label="Available Profit Pool" value={formatKES(totalProfit)} tone="success" />
        <StatCard label="Total Disbursed" value={formatKES(allTimeDisbursed)} />
        <StatCard label="Remaining Pool" value={formatKES(totalProfit - allTimeDisbursed)} tone={totalProfit - allTimeDisbursed >= 0 ? "success" : "danger"} />
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" /> Disburse Profits</CardTitle>
            <CardDescription>Record who received a share of a profitable project.</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={!filtered.length}>
                  <FileText className="h-4 w-4 mr-1" /> Export
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Single PDF</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportDisbursementsPDF(filtered)}>
                  <FileText className="h-4 w-4 mr-2" /> Filtered ledger
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Batch (one PDF per group)</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportDisbursementsBatch(filtered, "project")}>
                  <Files className="h-4 w-4 mr-2" /> By crop / project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportDisbursementsBatch(filtered, "category")}>
                  <Files className="h-4 w-4 mr-2" /> By category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={openNew} disabled={profitableProjects.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> New Disbursement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {profitableProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No profitable projects yet. Once a crop or livestock project turns profitable, you can disburse funds from it here.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Disbursed</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitableProjects.map((p) => {
                    const disbursed = disbursedBySource.get(`${p.kind}:${p.id}`) || 0;
                    const available = availableFor(p);
                    return (
                      <TableRow key={`${p.kind}-${p.id}`}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant="outline">{p.kind}</Badge></TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">{formatKES(p.profit)}</TableCell>
                        <TableCell className="text-right">{formatKES(disbursed)}</TableCell>
                        <TableCell className={`text-right font-semibold ${available > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                          {formatKES(available)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" disabled={available <= 0} onClick={() => {
                            setEditing(null);
                            setForm({
                              ...emptyForm(),
                              source_kind: p.kind,
                              source_id: p.id,
                              source_name: p.name,
                              amount: Math.max(available, 0),
                            });
                            setOpen(true);
                          }}>
                            <HandCoins className="h-3.5 w-3.5 mr-1" /> Disburse
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" /> Filters
            {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount} active</Badge>}
          </CardTitle>
          <CardDescription>Narrow the ledger by project, category, recipient, or date.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Crop / Project</Label>
              <Select value={fProject} onValueChange={setFProject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {sourceOptions.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label} ({s.kind})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={fCategory} onValueChange={setFCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Recipient</Label>
              <Input placeholder="Search recipient" value={fRecipient} onChange={(e) => setFRecipient(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disbursement Ledger</CardTitle>
          <CardDescription>
            {filtered.length} of {items.length} record(s) shown · {formatKES(totalDisbursed)} in view
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From (Source)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {items.length === 0 ? "No disbursements yet." : "No records match the current filters."}
                </TableCell></TableRow>
              )}
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.disbursed_on}</TableCell>
                  <TableCell className="font-medium">{d.source_name}</TableCell>
                  <TableCell><Badge variant="outline">{d.source_kind}</Badge></TableCell>
                  <TableCell>{d.category}</TableCell>
                  <TableCell>{d.recipient}</TableCell>
                  <TableCell className="text-right font-semibold">{formatKES(Number(d.amount))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">{d.notes}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDeleteId(d.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Disbursement" : "New Disbursement"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this payout — balances recalculate immediately." : "Record funds paid out from a profitable project."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Source Project</Label>
              {editing ? (
                <Input value={form.source_name} disabled />
              ) : (
                <Select value={form.source_id || ""} onValueChange={chooseProject}>
                  <SelectTrigger><SelectValue placeholder="Select profitable project" /></SelectTrigger>
                  <SelectContent>
                    {profitableProjects.map((p) => (
                      <SelectItem key={`${p.kind}-${p.id}`} value={p.id}>
                        {p.name} — {formatKES(availableFor(p))} available
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {form.source_name && Number.isFinite(currentAvailable) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available: <span className="font-semibold text-green-600">{formatKES(currentAvailable)}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.disbursed_on}
                  onChange={(e) => setForm((f) => ({ ...f, disbursed_on: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Recipient / Assigned To</Label>
              <Input placeholder="e.g. Bank of Kenya, John Doe, Cooperative"
                value={form.recipient}
                onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))} />
            </div>

            <div>
              <Label>Amount (KES)</Label>
              <Input type="number" min={0} step="0.01" value={form.amount || ""}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                className={exceedsAvailable ? "border-destructive focus-visible:ring-destructive" : ""} />
              {exceedsAvailable && (
                <p className="text-xs text-destructive mt-1">
                  Exceeds available profit balance ({formatKES(currentAvailable)}) for this project.
                </p>
              )}
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={form.notes || ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}
              disabled={!form.source_name || !form.recipient || form.amount <= 0 || exceedsAvailable}>
              <HandCoins className="h-4 w-4 mr-1" />
              {editing ? "Save Changes" : "Record Disbursement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete disbursement?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the record and recalculates the available balance for its source project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (confirmDeleteId) await remove(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const cls = tone === "success" ? "text-green-600" : tone === "danger" ? "text-destructive" : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-lg md:text-xl font-bold mt-1 truncate ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
