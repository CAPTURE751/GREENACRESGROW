import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Scale } from "lucide-react";
import { useVentureBudgets } from "@/hooks/useVentureBudgets";
import { useCrops } from "@/hooks/useCrops";
import { useLivestock } from "@/hooks/useLivestock";
import { useLivestockBatches } from "@/hooks/useLivestockBatches";
import { buildBudgetVsActual } from "@/lib/budget-vs-actual";
import { exportBudgetVsActualPDF } from "@/lib/budget-vs-actual-export";
import { formatKES } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props { purchases: any[]; sales: any[]; startDate?: string; endDate?: string }

function Diff({ d, pct }: { d: number; pct?: number }) {
  const cls = d > 0 ? "text-farm-green" : d < 0 ? "text-destructive" : "text-muted-foreground";
  const sym = d > 0 ? "▲" : d < 0 ? "▼" : "→";
  return (
    <span className={cn("font-medium whitespace-nowrap", cls)}>
      {sym} {formatKES(Math.abs(d))}{pct !== undefined && <span className="text-xs ml-1">({pct.toFixed(1)}%)</span>}
    </span>
  );
}

export function BudgetVsActualReport({ purchases, sales, startDate, endDate }: Props) {
  const { budgets } = useVentureBudgets();
  const { crops } = useCrops();
  const { livestock } = useLivestock();
  const { batches } = useLivestockBatches();
  const { toast } = useToast();
  const [budgetId, setBudgetId] = useState<string>("");
  const [link, setLink] = useState<string>("keyword");
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);

  const budget = budgets.find((b) => b.id === budgetId);
  useEffect(() => { if (!budgetId && budgets.length) setBudgetId(budgets[0].id); }, [budgets, budgetId]);
  useEffect(() => { if (budget) setKeyword(budget.inputs?.type && budget.inputs.type !== "custom" ? budget.inputs.type : budget.name); }, [budget?.id]);

  const records = useMemo(() => [
    ...crops.map((c: any) => ({ id: c.id, label: `Crop · ${c.name}${c.variety ? ` (${c.variety})` : ""}` })),
    ...livestock.map((l: any) => ({ id: l.id, label: `Animal · ${l.tag_number || l.type}${l.breed ? ` (${l.breed})` : ""}` })),
    ...batches.map((b: any) => ({ id: b.id, label: `Batch · ${b.batch_id}` })),
  ], [crops, livestock, batches]);

  const report = useMemo(() => budget ? buildBudgetVsActual(budget, purchases, sales, {
    recordId: link === "keyword" || link === "all" ? null : link,
    keyword: link === "keyword" ? keyword : "",
    start: startDate, end: endDate,
  }) : null, [budget, purchases, sales, link, keyword, startDate, endDate]);

  const download = async () => {
    if (!report) return;
    setBusy(true);
    try { await exportBudgetVsActualPDF(report); toast({ title: "Budget vs Actual PDF downloaded" }); }
    catch (e: any) { toast({ variant: "destructive", title: "PDF failed", description: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-farm-green" />Budget vs Actual Spending</CardTitle>
        <CardDescription>Planned spending from the Budget Simulator compared automatically with Finance records. Uses the date range above.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {budgets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved budgets yet. Save a budget in the Budget Simulator to compare it with actual spending.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Budget</Label>
              <Select value={budgetId} onValueChange={setBudgetId}>
                <SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger>
                <SelectContent>{budgets.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.venture_type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Match Finance records by</Label>
              <Select value={link} onValueChange={setLink}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Entity name / keyword</SelectItem>
                  <SelectItem value="all">All farm expenses</SelectItem>
                  {records.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {link === "keyword" && (
              <div className="space-y-1">
                <Label>Entity keyword</Label>
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. Onion, Goats, Irrigation" />
              </div>
            )}
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ["Total Budget", formatKES(report.totalBudget)],
                ["Total Actual", formatKES(report.totalActual)],
                [report.difference >= 0 ? "Savings" : "Overspend", <Diff key="d" d={report.difference} />],
                ["Budget Utilisation", `${report.utilisation.toFixed(1)}%`],
                ["Budget Items", report.budgetItems],
                ["Under Budget Items", <span key="u" className="text-farm-green">{report.underItems}</span>],
                ["Over Budget Items", <span key="o" className="text-destructive">{report.overItems}</span>],
                ["Unbudgeted Expenses", `${report.unbudgeted.length} · ${formatKES(report.unbudgetedTotal)}`],
              ].map(([l, v], i) => (
                <div key={i} className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p className="text-sm sm:text-base font-semibold mt-1">{v}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Difference</TableHead></TableRow></TableHeader>
                <TableBody>
                  {report.categories.map((c) => (
                    <>
                      <TableRow key={c.name} className="bg-muted/50 font-semibold">
                        <TableCell>{c.name}</TableCell><TableCell className="text-right">{formatKES(c.budget)}</TableCell>
                        <TableCell className="text-right">{formatKES(c.actual)}</TableCell><TableCell className="text-right"><Diff d={c.diff} pct={c.pct} /></TableCell>
                      </TableRow>
                      {c.rows.map((r, i) => (
                        <TableRow key={c.name + i}>
                          <TableCell className="pl-6">{r.name}{r.txCount > 0 && <span className="text-xs text-muted-foreground ml-1">({r.txCount} tx)</span>}</TableCell>
                          <TableCell className="text-right">{formatKES(r.budget)}</TableCell><TableCell className="text-right">{formatKES(r.actual)}</TableCell>
                          <TableCell className="text-right"><Diff d={r.diff} pct={r.pct} /></TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold"><TableCell colSpan={4}>Unbudgeted Expenses</TableCell></TableRow>
                  {report.unbudgeted.length === 0 && <TableRow><TableCell colSpan={4} className="pl-6 text-muted-foreground">None</TableCell></TableRow>}
                  {report.unbudgeted.map((u) => (
                    <TableRow key={u.name}>
                      <TableCell className="pl-6">{u.name}</TableCell><TableCell className="text-right">{formatKES(0)}</TableCell>
                      <TableCell className="text-right">{formatKES(u.actual)}</TableCell><TableCell className="text-right"><Diff d={u.diff} /></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Overall Total</TableCell><TableCell className="text-right">{formatKES(report.totalBudget)}</TableCell>
                    <TableCell className="text-right">{formatKES(report.totalActual)}</TableCell><TableCell className="text-right"><Diff d={report.difference} /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="font-semibold">Budget Implementation</h3>
                <p className="text-sm">{formatKES(report.implementedBudget)} of {formatKES(report.totalBudget)} implemented</p>
                <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-farm-green" style={{ width: `${Math.min(report.implementationPct, 100)}%` }} /></div>
                <p className="text-sm text-muted-foreground">{report.implementationPct.toFixed(1)}% implemented · {report.utilisation.toFixed(1)}% utilisation</p>
              </div>
              {(report.revenue.target > 0 || report.revenue.actual > 0) && (
                <div className="rounded-lg border p-4 space-y-1 text-sm">
                  <h3 className="font-semibold mb-1">Revenue & Returns</h3>
                  <div className="flex justify-between"><span>Target Revenue</span><span>{formatKES(report.revenue.target)}</span></div>
                  <div className="flex justify-between"><span>Actual / Gross Revenue</span><span>{formatKES(report.revenue.actual)} <Diff d={report.revenue.diff} /></span></div>
                  <div className="flex justify-between"><span>Total Cost</span><span>{formatKES(report.revenue.totalCost)}</span></div>
                  <div className="flex justify-between"><span>Net Profit</span><span className={report.revenue.netProfit >= 0 ? "text-farm-green" : "text-destructive"}>{formatKES(report.revenue.netProfit)}</span></div>
                  <div className="flex justify-between"><span>ROI</span><span>{report.revenue.roi.toFixed(1)}%</span></div>
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Recommendation & Management Analysis</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">{report.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>

            <Button onClick={download} disabled={busy} className="bg-farm-green hover:bg-farm-green/90">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download Budget vs Actual Report PDF
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
