import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { applyBrandedHeader, applyBrandedFooter, BRAND_HEADER_COLOR } from "./pdf-branding";
import { drawBarChart, drawDonutChart, drawHBarChart, drawKpiRow, drawLineChart, CHART_COLORS, RGB } from "./pdf-charts";
import { formatKES } from "./currency";

/** Per-module branded PDF reports with charts: crops, livestock, finance, budgets. */
type Row = Record<string, any>;
export interface ModuleData { sales: Row[]; purchases: Row[] }

const GREEN: RGB = [76, 111, 60];
const AMBER: RGB = [196, 138, 58];
const RED: RGB = [180, 70, 60];
const num = (v: any) => Number(v) || 0;
const k = (n: number) => formatKES(n).replace(".00", "");
const today = () => new Date().toISOString().slice(0, 10);
const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "_");

function linkedTotal(rows: Row[], amountKey: string, ids: Set<string>, names: Set<string>, id: string, name: string) {
  return rows
    .filter((r) => (r.linked_record_id && r.linked_record_id === id) || (!r.linked_record_id && r.linked_record_name && r.linked_record_name.toLowerCase() === name.toLowerCase()))
    .reduce((s, r) => s + num(r[amountKey]), 0);
}

function ensureSpace(doc: jsPDF, y: number, need: number) {
  const ph = doc.internal.pageSize.getHeight();
  if (y + need > ph - 30) { doc.addPage(); return 20; }
  return y;
}

function section(doc: jsPDF, y: number, text: string) {
  y = ensureSpace(doc, y, 14);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...BRAND_HEADER_COLOR);
  doc.text(text, 14, y);
  return y + 5;
}

const tableStyle = {
  theme: "grid" as const,
  headStyles: { fillColor: GREEN, textColor: 255, fontSize: 8 },
  styles: { fontSize: 7.5, cellPadding: 1.8 },
  alternateRowStyles: { fillColor: [247, 249, 244] as [number, number, number] },
  margin: { left: 14, right: 14, bottom: 30 },
};

async function finish(doc: jsPDF, reportType: string, file: string) {
  await applyBrandedFooter(doc, reportType);
  doc.save(file);
}

function monthly(rows: Row[], dateKey: string, amountKey: string, months: string[]) {
  return months.map((m) => rows.filter((r) => String(r[dateKey] || "").startsWith(m)).reduce((s, r) => s + num(r[amountKey]), 0));
}
function lastMonths(n: number) {
  const out: string[] = []; const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`); }
  return out;
}
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-KE", { month: "short", year: "2-digit" });

// ---------------- CROPS ----------------
export async function exportCropsModulePDF(crops: Row[], harvests: Row[], data: ModuleData) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const active = crops.filter((c) => !c.archived);
  let y = await applyBrandedHeader(doc, { title: "Crops Report", subtitle: `${active.length} active crops · ${crops.length - active.length} archived` });

  const rows = crops.map((c) => {
    const revenue = linkedTotal(data.sales, "total_amount", new Set(), new Set(), c.id, c.name);
    const cost = linkedTotal(data.purchases, "total_cost", new Set(), new Set(), c.id, c.name);
    const harvested = harvests.filter((h) => h.crop_id === c.id).reduce((s, h) => s + num(h.quantity), 0);
    return { c, revenue, cost, profit: revenue - cost, harvested };
  });
  const tRev = rows.reduce((s, r) => s + r.revenue, 0), tCost = rows.reduce((s, r) => s + r.cost, 0);
  const acres = active.reduce((s, c) => s + num(c.acreage), 0);

  y = drawKpiRow(doc, y, [
    { label: "Active crops", value: String(active.length) },
    { label: "Acreage", value: `${acres.toFixed(1)} ac` },
    { label: "Revenue", value: k(tRev), tone: "good" },
    { label: "Costs", value: k(tCost) },
    { label: "Net", value: k(tRev - tCost), tone: tRev - tCost >= 0 ? "good" : "bad" },
  ]);

  const byStatus: Record<string, number> = {};
  active.forEach((c) => { const s = c.status || "unknown"; byStatus[s] = (byStatus[s] || 0) + 1; });
  const half = (pw - 28 - 6) / 2;
  drawDonutChart(doc, { x: 14, y, w: half, h: 55, title: "Crops by stage" }, Object.entries(byStatus).map(([label, value]) => ({ label, value })));
  const top = [...rows].sort((a, b) => b.revenue + b.cost - (a.revenue + a.cost)).slice(0, 6);
  drawBarChart(doc, { x: 20 + half, y, w: half, h: 55, title: "Revenue vs cost (top crops)" }, top.map((r) => r.c.name),
    [{ name: "Revenue", color: GREEN, values: top.map((r) => r.revenue) }, { name: "Cost", color: AMBER, values: top.map((r) => r.cost) }]);
  y += 62;
  drawHBarChart(doc, { x: 14, y, w: pw - 28, h: 50, title: "Net profit by crop" },
    [...rows].sort((a, b) => b.profit - a.profit).slice(0, 10).map((r) => ({ label: r.c.name, value: r.profit, color: r.profit < 0 ? RED : GREEN })));
  y += 58;

  y = section(doc, y, "Crop register");
  autoTable(doc, {
    ...tableStyle, startY: y,
    head: [["Crop", "Variety", "Stage", "Acres", "Planted", "Harvest", "Harvested", "Revenue", "Cost", "Net"]],
    body: rows.map(({ c, revenue, cost, profit, harvested }) => [
      c.name, c.variety || "-", c.archived ? "archived" : c.status || "-", num(c.acreage) || "-",
      c.planting_date || "-", c.actual_harvest_date || c.expected_harvest_date || "-",
      harvested ? `${harvested} ${c.yield_unit || ""}` : "-", k(revenue), k(cost), k(profit),
    ]),
    columnStyles: { 7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" } },
  });
  await finish(doc, "reports", `Crops_Report_${today()}.pdf`);
}

// ---------------- LIVESTOCK ----------------
export async function exportLivestockModulePDF(animals: Row[], batches: Row[], data: ModuleData) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const headCount = animals.length + batches.reduce((s, b) => s + num(b.current_quantity), 0);
  let y = await applyBrandedHeader(doc, { title: "Livestock Report", subtitle: `${animals.length} individual animals · ${batches.length} batches` });

  const linked = (r: Row) => (r.linked_module || "").toLowerCase().includes("livestock") || animals.some((a) => a.id === r.linked_record_id) || batches.some((b) => b.id === r.linked_record_id);
  const rev = data.sales.filter(linked).reduce((s, r) => s + num(r.total_amount), 0);
  const cost = data.purchases.filter(linked).reduce((s, r) => s + num(r.total_cost), 0);
  const mortality = batches.reduce((s, b) => s + num(b.mortality_count), 0);
  const initial = batches.reduce((s, b) => s + num(b.initial_quantity), 0);
  const sick = animals.filter((a) => a.health_status && !/healthy|good/i.test(a.health_status)).length;

  y = drawKpiRow(doc, y, [
    { label: "Head count", value: String(headCount) },
    { label: "Needs attention", value: String(sick), tone: sick ? "bad" : "good" },
    { label: "Batch mortality", value: initial ? `${((mortality / initial) * 100).toFixed(1)}%` : "0%", tone: mortality ? "bad" : "neutral" },
    { label: "Revenue", value: k(rev), tone: "good" },
    { label: "Costs", value: k(cost) },
  ]);

  const byType: Record<string, number> = {};
  animals.forEach((a) => { byType[a.type] = (byType[a.type] || 0) + 1; });
  batches.forEach((b) => { byType[b.animal_type] = (byType[b.animal_type] || 0) + num(b.current_quantity); });
  const byHealth: Record<string, number> = {};
  animals.forEach((a) => { const h = a.health_status || "unknown"; byHealth[h] = (byHealth[h] || 0) + 1; });
  const half = (pw - 28 - 6) / 2;
  drawDonutChart(doc, { x: 14, y, w: half, h: 55, title: "Herd by type" }, Object.entries(byType).map(([label, value]) => ({ label, value })));
  drawDonutChart(doc, { x: 20 + half, y, w: half, h: 55, title: "Health status" }, Object.entries(byHealth).map(([label, value]) => ({ label, value })));
  y += 62;
  if (batches.length) {
    const bs = batches.slice(0, 8);
    drawBarChart(doc, { x: 14, y, w: pw - 28, h: 50, title: "Batches: starting vs current vs deaths" }, bs.map((b) => b.batch_id), [
      { name: "Initial", color: CHART_COLORS[4], values: bs.map((b) => num(b.initial_quantity)) },
      { name: "Current", color: GREEN, values: bs.map((b) => num(b.current_quantity)) },
      { name: "Deaths", color: RED, values: bs.map((b) => num(b.mortality_count)) },
    ]);
    y += 58;
  }

  if (batches.length) {
    y = section(doc, y, "Batches");
    autoTable(doc, {
      ...tableStyle, startY: y,
      head: [["Batch", "Type", "Breed", "Arrived", "Initial", "Current", "Deaths", "Feed used"]],
      body: batches.map((b) => [b.batch_id, b.animal_type, b.breed || "-", b.arrival_date, b.initial_quantity, b.current_quantity, b.mortality_count, `${num(b.feed_consumed)} ${b.feed_unit || ""}`]),
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }
  if (animals.length) {
    y = section(doc, y, "Individual animals");
    autoTable(doc, {
      ...tableStyle, startY: y,
      head: [["Tag", "Type", "Breed", "Sex", "Born", "Weight", "Health", "Purchase"]],
      body: animals.map((a) => [a.tag_number || "-", a.type, a.breed || "-", a.gender || "-", a.date_of_birth || "-", a.weight ? `${a.weight} kg` : "-", a.health_status || "-", a.purchase_price ? k(num(a.purchase_price)) : "-"]),
    });
  }
  await finish(doc, "reports", `Livestock_Report_${today()}.pdf`);
}

// ---------------- FINANCE ----------------
export async function exportFinanceModulePDF(data: ModuleData) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const months = lastMonths(12);
  let y = await applyBrandedHeader(doc, { title: "Finance Report", subtitle: `Last 12 months: ${monthLabel(months[0])} to ${monthLabel(months[11])}` });
  const inRange = (d: string) => String(d || "").slice(0, 7) >= months[0];
  const sales = data.sales.filter((s) => inRange(s.sale_date));
  const purchases = data.purchases.filter((p) => inRange(p.purchase_date));
  const income = sales.reduce((s, r) => s + num(r.total_amount), 0);
  const expense = purchases.reduce((s, r) => s + num(r.total_cost), 0);
  const pending = sales.filter((s) => s.payment_status === "pending").reduce((s, r) => s + num(r.total_amount), 0);

  y = drawKpiRow(doc, y, [
    { label: "Income", value: k(income), tone: "good" },
    { label: "Expenses", value: k(expense) },
    { label: "Net", value: k(income - expense), tone: income - expense >= 0 ? "good" : "bad" },
    { label: "Margin", value: income ? `${(((income - expense) / income) * 100).toFixed(1)}%` : "-" },
    { label: "Unpaid sales", value: k(pending), tone: pending ? "bad" : "neutral" },
  ]);

  const inc = monthly(sales, "sale_date", "total_amount", months);
  const exp = monthly(purchases, "purchase_date", "total_cost", months);
  drawBarChart(doc, { x: 14, y, w: pw - 28, h: 55, title: "Monthly income vs expenses" }, months.map(monthLabel),
    [{ name: "Income", color: GREEN, values: inc }, { name: "Expenses", color: AMBER, values: exp }]);
  y += 62;
  let run = 0;
  drawLineChart(doc, { x: 14, y, w: pw - 28, h: 45, title: "Cumulative net cash" }, months.map(monthLabel),
    [{ name: "Net", color: GREEN, values: inc.map((v, i) => (run += v - exp[i])) }]);
  y += 52;
  const group = (rows: Row[], key: string, amt: string) => {
    const m: Record<string, number> = {};
    rows.forEach((r) => { const g = r[key] || "Other"; m[g] = (m[g] || 0) + num(r[amt]); });
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };
  const half = (pw - 28 - 6) / 2;
  y = ensureSpace(doc, y, 62);
  const expCats = group(purchases, "category", "total_cost");
  drawDonutChart(doc, { x: 14, y, w: half, h: 55, title: "Expenses by category" }, expCats);
  drawHBarChart(doc, { x: 20 + half, y, w: half, h: 55, title: "Top income sources" }, group(sales, "product_name", "total_amount"));
  y += 62;

  y = section(doc, y, "Monthly summary");
  autoTable(doc, {
    ...tableStyle, startY: y,
    head: [["Month", "Income", "Expenses", "Net"]],
    body: months.map((m, i) => [monthLabel(m), k(inc[i]), k(exp[i]), k(inc[i] - exp[i])]),
    foot: [["Total", k(income), k(expense), k(income - expense)]],
    footStyles: { fillColor: [235, 240, 228], textColor: 30, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;
  y = section(doc, y, "Expense categories");
  autoTable(doc, {
    ...tableStyle, startY: y,
    head: [["Category", "Amount", "Share"]],
    body: expCats.map((c) => [c.label, k(c.value), expense ? `${((c.value / expense) * 100).toFixed(1)}%` : "-"]),
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });
  await finish(doc, "pnl", `Finance_Report_${today()}.pdf`);
}

// ---------------- BUDGETS ----------------
export async function exportBudgetsModulePDF(budgets: Row[]) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = await applyBrandedHeader(doc, { title: "Budgets Report", subtitle: `${budgets.length} saved venture budgets` });
  const tCost = budgets.reduce((s, b) => s + num(b.costs_total), 0);
  const tRev = budgets.reduce((s, b) => s + num(b.revenue_total), 0);
  y = drawKpiRow(doc, y, [
    { label: "Budgets", value: String(budgets.length) },
    { label: "Planned investment", value: k(tCost) },
    { label: "Expected revenue", value: k(tRev), tone: "good" },
    { label: "Expected profit", value: k(tRev - tCost), tone: tRev - tCost >= 0 ? "good" : "bad" },
    { label: "Avg ROI", value: tCost ? `${(((tRev - tCost) / tCost) * 100).toFixed(1)}%` : "-" },
  ]);
  const bs = budgets.slice(0, 8);
  drawBarChart(doc, { x: 14, y, w: pw - 28, h: 55, title: "Investment vs expected revenue" }, bs.map((b) => b.name),
    [{ name: "Investment", color: AMBER, values: bs.map((b) => num(b.costs_total)) }, { name: "Revenue", color: GREEN, values: bs.map((b) => num(b.revenue_total)) }]);
  y += 62;
  drawHBarChart(doc, { x: 14, y, w: pw - 28, h: 45, title: "ROI % by venture" }, budgets.map((b) => {
    const roi = num(b.costs_total) ? ((num(b.revenue_total) - num(b.costs_total)) / num(b.costs_total)) * 100 : 0;
    return { label: b.name, value: Math.round(roi), color: roi < 0 ? RED : GREEN };
  }));
  y += 52;
  y = section(doc, y, "Budget summary");
  autoTable(doc, {
    ...tableStyle, startY: y,
    head: [["Venture", "Type", "Investment", "Revenue", "Profit", "ROI"]],
    body: budgets.map((b) => {
      const c = num(b.costs_total), r = num(b.revenue_total);
      return [b.name, b.venture_type, k(c), k(r), k(r - c), c ? `${(((r - c) / c) * 100).toFixed(1)}%` : "-"];
    }),
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  for (const b of budgets) {
    const cats: Row[] = Array.isArray(b.inputs?.categories) ? b.inputs.categories : [];
    if (!cats.length) continue;
    const totals = cats.map((c) => ({ label: c.name || "Category", value: (c.items || []).reduce((s: number, i: Row) => s + num(i.total ?? num(i.quantity) * num(i.costPerUnit ?? i.unitCost)), 0) }));
    y = ensureSpace(doc, y, 70);
    y = section(doc, y, `${b.name}: cost breakdown`);
    drawDonutChart(doc, { x: 14, y, w: pw - 28, h: 48 }, totals);
    y += 54;
  }
  await finish(doc, "venture", `Budgets_Report_${today()}.pdf`);
}

export const moduleReportFile = safe;
