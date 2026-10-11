import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, ListChecks } from "lucide-react";
import { useVentureBudgets } from "@/hooks/useVentureBudgets";
import { usePurchases } from "@/hooks/usePurchases";
import { ensureCategories, lineTotal } from "@/lib/budget-categories";
import { formatKES } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

const norm = (s: any) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const parts = (n: string) => String(n || "").split("›").map((s) => s.trim());

/** Pick a budget → category → line item and see its actual Finance spending; link matching expenses in one click. */
export function BudgetItemsPanel({ startDate, endDate }: { startDate?: string; endDate?: string }) {
  const { budgets } = useVentureBudgets();
  const { purchases, updatePurchase } = usePurchases();
  const { toast } = useToast();
  const [budgetId, setBudgetId] = useState("");
  const [cat, setCat] = useState("");
  const [item, setItem] = useState("");

  const budget = budgets.find((b) => b.id === budgetId);
  const cats = useMemo(() => (budget ? ensureCategories(budget.inputs || {}) : []), [budget]);
  const farmSize = Number((budget?.inputs as any)?.farmSize) || 0;
  const inPeriod = (d?: string) => !d || ((!startDate || d.slice(0, 10) >= startDate) && (!endDate || d.slice(0, 10) <= endDate));

  const linkedTo = (p: any, c: string, i: string) => {
    if (p.linked_module !== "budget" || p.linked_record_id !== budgetId) return false;
    const pr = parts(p.linked_record_name);
    return norm(pr[1]) === norm(c) && norm(pr[pr.length - 1]) === norm(i);
  };
  const isSuggested = (p: any, i: string) => p.linked_module !== "budget" && norm(i) && norm(p.item_name) === norm(i);

  const lines = cats.flatMap((c) => c.items.map((i) => {
    const linked = (purchases as any[]).filter((p) => inPeriod(p.purchase_date) && linkedTo(p, c.name, i.name));
    const budgetAmt = lineTotal(i, farmSize);
    const actual = linked.reduce((s, p) => s + (Number(p.total_cost) || 0), 0);
    return { cat: c.name, name: i.name, budget: budgetAmt, actual, count: linked.length };
  }));

  const sel = lines.find((l) => l.cat === cat && l.name === item);
  const linkedTx = sel ? (purchases as any[]).filter((p) => inPeriod(p.purchase_date) && linkedTo(p, cat, item)) : [];
  const suggested = sel ? (purchases as any[]).filter((p) => inPeriod(p.purchase_date) && isSuggested(p, item)) : [];

  const link = (ids: string[]) => {
    ids.forEach((id) => updatePurchase({ id, updates: { linked_module: "budget", linked_record_id: budgetId, linked_record_name: `${budget?.name} › ${cat} › ${item}` } as any }));
    toast({ title: `Linked ${ids.length} expense${ids.length === 1 ? "" : "s"} to ${item}` });
  };

  const diffTone = (b: number, a: number) => (a < b ? "text-green-600" : a > b ? "text-red-600" : "text-muted-foreground");

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" /> Budget Items &amp; Actual Spending</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={budgetId} onValueChange={(v) => { setBudgetId(v); setCat(""); setItem(""); }}>
            <SelectTrigger><SelectValue placeholder="Choose a budget" /></SelectTrigger>
            <SelectContent>{budgets.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={cat} onValueChange={(v) => { setCat(v); setItem(""); }} disabled={!budget}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={item} onValueChange={setItem} disabled={!cat}>
            <SelectTrigger><SelectValue placeholder="Line item" /></SelectTrigger>
            <SelectContent>{(cats.find((c) => c.name === cat)?.items || []).filter((i) => i.name).map((i) => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {sel && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-muted-foreground">Budget</p><p className="font-semibold">{formatKES(sel.budget)}</p></div>
              <div><p className="text-muted-foreground">Actual ({sel.count})</p><p className="font-semibold">{formatKES(sel.actual)}</p></div>
              <div><p className="text-muted-foreground">Difference</p><p className={`font-semibold ${diffTone(sel.budget, sel.actual)}`}>{formatKES(sel.budget - sel.actual)}</p></div>
            </div>
            {linkedTx.length > 0 && (
              <div className="text-sm space-y-1">
                {linkedTx.map((p) => <div key={p.id} className="flex justify-between border-b py-1"><span>{p.purchase_date} · {p.item_name || p.category}</span><span>{formatKES(Number(p.total_cost) || 0)}</span></div>)}
              </div>
            )}
            {suggested.length > 0 && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span>{suggested.length} unlinked expense{suggested.length === 1 ? "" : "s"} named "{item}" found</span>
                  <Button size="sm" onClick={() => link(suggested.map((p) => p.id))}><Link2 className="h-4 w-4 mr-1" /> Link all</Button>
                </div>
                {suggested.map((p) => <div key={p.id} className="flex justify-between"><span>{p.purchase_date} · {p.item_name}</span><span>{formatKES(Number(p.total_cost) || 0)}</span></div>)}
              </div>
            )}
          </div>
        )}

        {budget && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2">Item</th><th className="text-right">Budget</th><th className="text-right">Actual</th><th className="text-right">Difference</th></tr></thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={idx} className="border-b cursor-pointer hover:bg-muted/50" onClick={() => { setCat(l.cat); setItem(l.name); }}>
                    <td className="py-1.5"><Badge variant="outline" className="mr-2">{l.cat}</Badge>{l.name}</td>
                    <td className="text-right">{formatKES(l.budget)}</td>
                    <td className="text-right">{formatKES(l.actual)}</td>
                    <td className={`text-right ${diffTone(l.budget, l.actual)}`}>{formatKES(l.budget - l.actual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
