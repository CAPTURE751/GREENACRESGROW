import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HandCoins, Plus, Trash2, Sparkles, Wand2, FileText } from "lucide-react";
import { formatKES } from "@/lib/currency";
import type { ProjectMetrics } from "@/lib/profit-analytics";
import type { NewDisbursement, Disbursement } from "@/hooks/useDisbursements";
import { exportDisbursementsPDF } from "@/lib/disbursement-export";

const CATEGORIES = [
  "Loan Repayment", "Farm Loan Payment", "Salary", "Consultation", "Farm Reinvestment",
  "Owner Drawings", "Savings", "Emergency Fund", "Equipment", "Marketing", "Insurance", "Training", "Other",
];

interface Split {
  id: string;
  label: string;      // becomes category
  recipient: string;
  percent: number;    // used when mode = 'percent'
  amount: number;     // used when mode = 'amount' (per project, or fixed pool amount)
  notes: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profitableProjects: ProjectMetrics[];
  availableFor: (p: ProjectMetrics) => number;
  createMany: (payloads: NewDisbursement[]) => Promise<Disbursement[] | null>;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const defaultSplits = (): Split[] => [
  { id: uid(), label: "Loan Repayment", recipient: "", percent: 33.34, amount: 0, notes: "" },
  { id: uid(), label: "Farm Loan Payment", recipient: "", percent: 33.33, amount: 0, notes: "" },
  { id: uid(), label: "Owner Drawings", recipient: "", percent: 33.33, amount: 0, notes: "" },
];

export function BulkDisburseDialog({
  open, onOpenChange, profitableProjects, availableFor, createMany,
}: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [splits, setSplits] = useState<Split[]>(defaultSplits());
  const [disbursedOn, setDisbursedOn] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Auto-select all profitable projects with available balance > 0
      const next: Record<string, boolean> = {};
      profitableProjects.forEach((p) => {
        if (availableFor(p) > 0) next[`${p.kind}:${p.id}`] = true;
      });
      setSelected(next);
    }
  }, [open, profitableProjects, availableFor]);

  const chosen = profitableProjects.filter((p) => selected[`${p.kind}:${p.id}`] && availableFor(p) > 0);
  const totalAvailable = chosen.reduce((s, p) => s + availableFor(p), 0);
  const totalPercent = splits.reduce((s, x) => s + (Number(x.percent) || 0), 0);
  const totalFixed = splits.reduce((s, x) => s + (Number(x.amount) || 0), 0);

  const toggleAll = (v: boolean) => {
    const next: Record<string, boolean> = {};
    if (v) profitableProjects.forEach((p) => { if (availableFor(p) > 0) next[`${p.kind}:${p.id}`] = true; });
    setSelected(next);
  };

  const equalizeSplits = () => {
    if (splits.length === 0) return;
    const pct = +(100 / splits.length).toFixed(4);
    setSplits((prev) => prev.map((s) => ({ ...s, percent: pct })));
  };

  const addSplit = () => setSplits((prev) => [
    ...prev,
    { id: uid(), label: "Other", recipient: "", percent: 0, amount: 0, notes: "" },
  ]);
  const removeSplit = (id: string) => setSplits((prev) => prev.filter((s) => s.id !== id));
  const patchSplit = (id: string, patch: Partial<Split>) =>
    setSplits((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  // Build the payload matrix: per project × per split
  const payloads = useMemo<NewDisbursement[]>(() => {
    const rows: NewDisbursement[] = [];
    for (const p of chosen) {
      const avail = availableFor(p);
      if (avail <= 0) continue;
      for (const s of splits) {
        let amt = 0;
        if (mode === "percent") {
          amt = (avail * (Number(s.percent) || 0)) / 100;
        } else {
          // "amount" mode: split.amount is treated as a share of the total pool
          // and each project contributes proportionally to its available balance
          amt = totalAvailable > 0 ? (avail / totalAvailable) * (Number(s.amount) || 0) : 0;
        }
        amt = Math.round(amt * 100) / 100;
        if (amt <= 0) continue;
        rows.push({
          source_kind: p.kind,
          source_id: p.id,
          source_name: p.name,
          category: s.label || "Other",
          recipient: s.recipient || s.label || "Unassigned",
          amount: amt,
          disbursed_on: disbursedOn,
          notes: s.notes || null,
        });
      }
    }
    return rows;
  }, [chosen, splits, mode, disbursedOn, totalAvailable, availableFor]);

  const payloadTotal = payloads.reduce((s, r) => s + r.amount, 0);
  const validationErrors: string[] = [];
  if (chosen.length === 0) validationErrors.push("Select at least one profitable project.");
  if (splits.length === 0) validationErrors.push("Add at least one split.");
  if (mode === "percent" && Math.abs(totalPercent - 100) > 0.5)
    validationErrors.push(`Split percentages must total 100% (currently ${totalPercent.toFixed(2)}%).`);
  if (mode === "amount" && totalFixed > totalAvailable + 0.01)
    validationErrors.push(`Split amounts (${formatKES(totalFixed)}) exceed available pool (${formatKES(totalAvailable)}).`);
  if (splits.some((s) => !s.label.trim())) validationErrors.push("Every split needs a category label.");

  const submit = async (alsoExport: boolean) => {
    if (validationErrors.length > 0 || payloads.length === 0) return;
    setSaving(true);
    const created = await createMany(payloads);
    setSaving(false);
    if (created) {
      if (alsoExport) {
        await exportDisbursementsPDF(created, {
          title: "Bulk Profit Disbursement",
          subtitle: `${chosen.length} project(s) · ${splits.length} split(s) · Total ${formatKES(payloadTotal)}`,
          filters: `Date ${disbursedOn} · Mode: ${mode === "percent" ? "Percentage" : "Fixed amount"}`,
        });
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> Bulk Disburse Profits
          </DialogTitle>
          <DialogDescription>
            Distribute the profit pool from multiple break-even projects into any number of equal or unequal fractions in one click.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: pick projects */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">1. Profitable projects</Label>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleAll(true)}>Select all</Button>
              <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>Clear</Button>
            </div>
          </div>
          <div className="border rounded-md overflow-x-auto max-h-56 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitableProjects.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No profitable projects yet.
                  </TableCell></TableRow>
                )}
                {profitableProjects.map((p) => {
                  const key = `${p.kind}:${p.id}`;
                  const avail = availableFor(p);
                  const disabled = avail <= 0;
                  return (
                    <TableRow key={key} className={disabled ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={!!selected[key]}
                          disabled={disabled}
                          onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [key]: !!v }))}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.kind}</Badge></TableCell>
                      <TableCell className={`text-right font-semibold ${avail > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                        {formatKES(avail)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Selected: <strong>{chosen.length}</strong> · Pool available:{" "}
            <span className="font-semibold text-green-600">{formatKES(totalAvailable)}</span>
          </p>
        </div>

        {/* Step 2: splits */}
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <Label className="text-sm font-semibold">2. Splits / fractions</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={mode} onValueChange={(v: "percent" | "amount") => setMode(v)}>
                <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">By percentage</SelectItem>
                  <SelectItem value="amount">By fixed amount</SelectItem>
                </SelectContent>
              </Select>
              {mode === "percent" && (
                <Button size="sm" variant="outline" onClick={equalizeSplits}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Equal split
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={addSplit}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add split
              </Button>
            </div>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="w-32">{mode === "percent" ? "%" : "Amount (KES)"}</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {splits.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Select value={CATEGORIES.includes(s.label) ? s.label : "Other"} onValueChange={(v) => patchSplit(s.id, { label: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {(!CATEGORIES.includes(s.label) || s.label === "Other") && (
                        <Input
                          className="mt-1 h-8"
                          placeholder="Custom label"
                          value={s.label === "Other" ? "" : s.label}
                          onChange={(e) => patchSplit(s.id, { label: e.target.value || "Other" })}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input className="h-8" placeholder="Recipient / assigned to"
                        value={s.recipient}
                        onChange={(e) => patchSplit(s.id, { recipient: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8" type="number" min={0} step="0.01"
                        value={mode === "percent" ? (s.percent || "") : (s.amount || "")}
                        onChange={(e) => patchSplit(s.id, mode === "percent"
                          ? { percent: Number(e.target.value) }
                          : { amount: Number(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8" placeholder="Optional"
                        value={s.notes}
                        onChange={(e) => patchSplit(s.id, { notes: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeSplit(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {mode === "percent"
              ? <span>Total: <strong className={Math.abs(totalPercent - 100) < 0.5 ? "text-green-600" : "text-destructive"}>{totalPercent.toFixed(2)}%</strong></span>
              : <span>Total split amount: <strong>{formatKES(totalFixed)}</strong> of {formatKES(totalAvailable)} pool</span>}
            <span>Projected disbursement total: <strong>{formatKES(payloadTotal)}</strong></span>
            <span>Records to create: <strong>{payloads.length}</strong></span>
          </div>
        </div>

        {/* Step 3: date + preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Disbursement date</Label>
            <Input type="date" value={disbursedOn} onChange={(e) => setDisbursedOn(e.target.value)} />
          </div>
        </div>

        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Fix these before disbursing</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 text-xs">
                {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {payloads.length > 0 && validationErrors.length === 0 && (
          <div className="border rounded-md overflow-x-auto max-h-52 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payloads.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.source_name}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{r.recipient}</TableCell>
                    <TableCell className="text-right font-semibold">{formatKES(r.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="outline"
            disabled={saving || validationErrors.length > 0 || payloads.length === 0}
            onClick={() => submit(true)}
          >
            <FileText className="h-4 w-4 mr-1" /> Disburse + Export PDF
          </Button>
          <Button
            disabled={saving || validationErrors.length > 0 || payloads.length === 0}
            onClick={() => submit(false)}
          >
            <HandCoins className="h-4 w-4 mr-1" /> Disburse {payloads.length ? `(${payloads.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
