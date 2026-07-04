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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Plus, Trash2, HandCoins, Sparkles } from "lucide-react";
import { formatKES } from "@/lib/currency";
import { useDisbursements, type NewDisbursement } from "@/hooks/useDisbursements";
import { exportDisbursementsPDF } from "@/lib/disbursement-export";
import type { ProjectMetrics } from "@/lib/profit-analytics";

const CATEGORIES = [
  "Loan Repayment",
  "Salary",
  "Consultation",
  "Farm Reinvestment",
  "Owner Drawings",
  "Savings",
  "Emergency Fund",
  "Equipment",
  "Marketing",
  "Insurance",
  "Training",
  "Other",
];

interface Props {
  projects: ProjectMetrics[];
}

export function DisbursementsTab({ projects }: Props) {
  const { items, create, remove } = useDisbursements();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewDisbursement>(emptyForm());

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
    setForm(emptyForm());
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

  const submit = async () => {
    if (!form.source_name || !form.recipient || !form.category || form.amount <= 0) return;
    const created = await create(form);
    if (created) {
      setOpen(false);
      setForm(emptyForm());
    }
  };

  const totalDisbursed = items.reduce((s, d) => s + Number(d.amount), 0);
  const totalProfit = projects.reduce((s, p) => s + Math.max(p.profit, 0), 0);

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
        <StatCard label="Total Disbursed" value={formatKES(totalDisbursed)} />
        <StatCard label="Remaining Pool" value={formatKES(totalProfit - totalDisbursed)} tone={totalProfit - totalDisbursed >= 0 ? "success" : "danger"} />
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" /> Disburse Profits</CardTitle>
            <CardDescription>Record who received a share of a profitable project.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportDisbursementsPDF(items)} disabled={!items.length}>
              <FileText className="h-4 w-4 mr-1" /> Export PDF
            </Button>
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
                          <Button size="sm" variant="outline" onClick={() => {
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
          <CardTitle>Disbursement Ledger</CardTitle>
          <CardDescription>All recorded payouts. Export as PDF for records.</CardDescription>
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
              {items.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No disbursements yet.
                </TableCell></TableRow>
              )}
              {items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.disbursed_on}</TableCell>
                  <TableCell className="font-medium">{d.source_name}</TableCell>
                  <TableCell><Badge variant="outline">{d.source_kind}</Badge></TableCell>
                  <TableCell>{d.category}</TableCell>
                  <TableCell>{d.recipient}</TableCell>
                  <TableCell className="text-right font-semibold">{formatKES(Number(d.amount))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">{d.notes}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(d.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
            <DialogTitle>New Disbursement</DialogTitle>
            <DialogDescription>Record funds paid out from a profitable project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Source Project</Label>
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
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
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
              disabled={!form.source_name || !form.recipient || form.amount <= 0}>
              <HandCoins className="h-4 w-4 mr-1" /> Record Disbursement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
