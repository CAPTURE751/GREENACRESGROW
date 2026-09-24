// Budget vs Actual engine: Budget Simulator (planned) vs Finance records (actual).
import { ensureCategories, lineTotal } from "./budget-categories";

export interface EntityFilter {
  recordId?: string | null;   // linked Finance record (crop / livestock / batch id)
  keyword?: string;           // fallback text match (entity name)
  start?: string;             // yyyy-MM-dd
  end?: string;
}

export interface BvaRow { name: string; budget: number; actual: number; diff: number; pct: number; txCount: number }
export interface BvaCategory { name: string; rows: BvaRow[]; budget: number; actual: number; diff: number; pct: number }
export interface BvaReport {
  entityName: string; entityType: string; period: string;
  categories: BvaCategory[];
  unbudgeted: BvaRow[];
  totalBudget: number; totalActual: number; difference: number; utilisation: number;
  budgetItems: number; underItems: number; overItems: number; onItems: number; unbudgetedTotal: number;
  implementedBudget: number; implementationPct: number;
  revenue: { target: number; actual: number; diff: number; totalCost: number; netProfit: number; roi: number; plannedProfit: number };
  recommendations: string[];
}

const norm = (s: any) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pctOf = (diff: number, budget: number) => (budget > 0 ? (diff / budget) * 100 : diff === 0 ? 0 : -100);

function inPeriod(date: string | null | undefined, f: EntityFilter) {
  if (!date) return true;
  const d = date.slice(0, 10);
  if (f.start && d < f.start) return false;
  if (f.end && d > f.end) return false;
  return true;
}

export function matchesEntity(tx: any, f: EntityFilter) {
  if (f.recordId) return tx.linked_record_id === f.recordId;
  const k = norm(f.keyword);
  if (!k) return true;
  const hay = norm([tx.linked_record_name, tx.item_name, tx.product_name, tx.notes, tx.category].join(" "));
  return hay.includes(k);
}

function nameMatch(a: string, b: string) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

export function buildBudgetVsActual(budget: any, purchases: any[], sales: any[], f: EntityFilter): BvaReport {
  const inputs = budget?.inputs || {};
  const farmSize = Number(inputs.farmSize) || 0;
  const cats = ensureCategories(inputs);

  const expenses = purchases.filter((p) => inPeriod(p.purchase_date, f) && matchesEntity(p, f));
  const revenueTx = sales.filter((s) => inPeriod(s.sale_date, f) && matchesEntity(s, f));

  // Build budget lines
  const lines = cats.flatMap((c) => c.items.map((i) => ({ cat: c.name, name: i.name, budget: lineTotal(i, farmSize), actual: 0, tx: 0 })));
  const unb: Record<string, BvaRow> = {};

  for (const p of expenses) {
    const amt = Number(p.total_cost) || 0;
    const label = p.item_name || p.category || "Uncategorised";
    // 1) category + item match, 2) item match anywhere
    let line = lines.find((l) => nameMatch(l.cat, p.category || "") && nameMatch(l.name, label));
    if (!line) line = lines.find((l) => nameMatch(l.name, label));
    if (!line && p.category) line = lines.find((l) => nameMatch(l.name, p.category));
    if (line) { line.actual += amt; line.tx += 1; continue; }
    const key = `${p.category || "Other"} · ${label}`;
    unb[key] ??= { name: key, budget: 0, actual: 0, diff: 0, pct: 0, txCount: 0 };
    unb[key].actual += amt; unb[key].txCount += 1;
  }

  const categories: BvaCategory[] = cats.map((c) => {
    const rows = lines.filter((l) => l.cat === c.name).map((l) => {
      const diff = l.budget - l.actual;
      return { name: l.name, budget: l.budget, actual: l.actual, diff, pct: pctOf(diff, l.budget), txCount: l.tx };
    });
    const b = rows.reduce((s, r) => s + r.budget, 0), a = rows.reduce((s, r) => s + r.actual, 0);
    return { name: c.name, rows, budget: b, actual: a, diff: b - a, pct: pctOf(b - a, b) };
  });
  const unbudgeted = Object.values(unb).map((r) => ({ ...r, diff: -r.actual, pct: -100 })).sort((a, b) => b.actual - a.actual);

  const allRows = categories.flatMap((c) => c.rows);
  const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
  const unbudgetedTotal = unbudgeted.reduce((s, r) => s + r.actual, 0);
  const budgetedActual = categories.reduce((s, c) => s + c.actual, 0);
  const totalActual = budgetedActual + unbudgetedTotal;
  const implementedBudget = allRows.reduce((s, r) => s + Math.min(r.actual, r.budget), 0);

  const target = (Number(inputs.expectedYieldPerAcre) || 0) * farmSize * (Number(inputs.marketPricePerUnit) || 0) || Number(budget?.revenue_total) || 0;
  const actualRev = revenueTx.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const netProfit = actualRev - totalActual;

  const report: BvaReport = {
    entityName: budget?.name || inputs.name || "Budget",
    entityType: budget?.venture_type || inputs.type || "",
    period: f.start || f.end ? `${f.start || "Start"} to ${f.end || "Today"}` : "All time",
    categories, unbudgeted,
    totalBudget, totalActual, difference: totalBudget - totalActual,
    utilisation: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
    budgetItems: allRows.length,
    underItems: allRows.filter((r) => r.diff > 0).length,
    overItems: allRows.filter((r) => r.diff < 0).length,
    onItems: allRows.filter((r) => r.diff === 0).length,
    unbudgetedTotal,
    implementedBudget,
    implementationPct: totalBudget > 0 ? (implementedBudget / totalBudget) * 100 : 0,
    revenue: {
      target, actual: actualRev, diff: actualRev - target, totalCost: totalActual, netProfit,
      roi: totalActual > 0 ? (netProfit / totalActual) * 100 : 0,
      plannedProfit: target - totalBudget,
    },
    recommendations: [],
  };
  report.recommendations = buildRecommendations(report);
  return report;
}

const k = (n: number) => `KSh ${Math.round(Math.abs(n)).toLocaleString("en-KE")}`;

function buildRecommendations(r: BvaReport): string[] {
  const out: string[] = [];
  if (r.totalBudget === 0) {
    out.push("This budget has no costed line items. Add categories and items in the Budget Simulator to enable a meaningful comparison.");
    return out;
  }
  out.push(`Budget implementation stands at ${r.implementationPct.toFixed(1)}% (${k(r.implementedBudget)} of ${k(r.totalBudget)} planned spending has been executed against budgeted items). Overall utilisation including unbudgeted spend is ${r.utilisation.toFixed(1)}%.`);
  if (r.difference > 0) out.push(`Total spending is ${k(r.difference)} under budget. Confirm whether savings are genuine efficiencies or activities not yet carried out.`);
  else if (r.difference < 0) out.push(`Total spending exceeds the budget by ${k(r.difference)}. Review cost drivers before committing further funds.`);
  else out.push("Total spending matches the budget exactly.");

  const under = r.categories.filter((c) => c.diff > 0 && c.budget > 0).sort((a, b) => b.diff - a.diff).slice(0, 3);
  const over = r.categories.filter((c) => c.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 3);
  if (under.length) out.push(`Major under-budget categories: ${under.map((c) => `${c.name} (${k(c.diff)} saved, ${c.pct.toFixed(0)}%)`).join("; ")}.`);
  if (over.length) out.push(`Major over-budget categories: ${over.map((c) => `${c.name} (${k(c.diff)} over, ${Math.abs(c.pct).toFixed(0)}%)`).join("; ")}.`);

  const unspent = r.categories.flatMap((c) => c.rows.filter((x) => x.actual === 0 && x.budget > 0).map((x) => x.name));
  if (unspent.length) out.push(`${unspent.length} budget item(s) have no recorded spending yet (${unspent.slice(0, 5).join(", ")}${unspent.length > 5 ? "…" : ""}). Check whether these were skipped or recorded without a link.`);

  if (r.unbudgeted.length) out.push(`${r.unbudgeted.length} unbudgeted expense line(s) totalling ${k(r.unbudgetedTotal)} (${((r.unbudgetedTotal / Math.max(r.totalActual, 1)) * 100).toFixed(0)}% of actual spend). Largest: ${r.unbudgeted.slice(0, 3).map((u) => `${u.name} ${k(u.actual)}`).join("; ")}. Add these as line items in future budgets.`);

  const bigOver = r.categories.flatMap((c) => c.rows).filter((x) => x.diff < 0 && x.budget > 0 && Math.abs(x.pct) >= 20);
  if (bigOver.length) out.push(`Revise estimates for future budgets: ${bigOver.slice(0, 5).map((x) => `${x.name} (+${Math.abs(x.pct).toFixed(0)}%)`).join(", ")} exceeded budget by 20% or more.`);

  if (r.revenue.target > 0 || r.revenue.actual > 0) {
    const rv = r.revenue;
    out.push(rv.diff >= 0
      ? `Revenue of ${k(rv.actual)} is ${k(rv.diff)} above the ${k(rv.target)} target. ROI is ${rv.roi.toFixed(1)}%.`
      : `Revenue of ${k(rv.actual)} is ${k(rv.diff)} below the ${k(rv.target)} target. Net result ${rv.netProfit >= 0 ? "profit" : "loss"} of ${k(rv.netProfit)}, ROI ${rv.roi.toFixed(1)}%.`);
  }
  return out;
}
