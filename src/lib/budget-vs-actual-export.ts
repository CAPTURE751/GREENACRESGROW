import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { applyBrandedHeader, applyBrandedFooter, applySignature, BRAND_HEADER_COLOR } from "./pdf-branding";
import type { BvaReport } from "./budget-vs-actual";

const ks = (n: number) => `KSh ${Math.round(n).toLocaleString("en-KE")}`;
const diffTxt = (d: number) => (d > 0 ? `${ks(d)} UP (saving)` : d < 0 ? `${ks(-d)} DOWN (over)` : "On budget");
const GREEN: [number, number, number] = [46, 125, 50];
const RED: [number, number, number] = [198, 40, 40];
const GREY: [number, number, number] = [110, 110, 110];

export async function exportBudgetVsActualPDF(r: BvaReport) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = await applyBrandedHeader(doc, {
    title: "Budget vs Actual Spending Report",
    subtitle: `${r.entityName}${r.entityType ? ` (${r.entityType})` : ""}`,
    filters: `Period: ${r.period}`,
  });
  const last = () => (doc as any).lastAutoTable.finalY as number;
  const color = (d: number) => (d > 0 ? GREEN : d < 0 ? RED : GREY);
  const colorDiffCol = (col: number, vals: number[]) => (data: any) => {
    if (data.section === "body" && data.column.index === col && vals[data.row.index] !== undefined && !Number.isNaN(vals[data.row.index])) data.cell.styles.textColor = color(vals[data.row.index]);
  };

  autoTable(doc, {
    startY: y + 2,
    head: [["Summary", "Value"]],
    body: [
      ["Total Budget", ks(r.totalBudget)], ["Total Actual", ks(r.totalActual)],
      [r.difference >= 0 ? "Savings" : "Overspend", diffTxt(r.difference)],
      ["Budget Utilisation", `${r.utilisation.toFixed(1)}%`], ["Budget Items", String(r.budgetItems)],
      ["Under Budget Items", String(r.underItems)], ["Over Budget Items", String(r.overItems)],
      ["Unbudgeted Expenses", `${r.unbudgeted.length} (${ks(r.unbudgetedTotal)})`],
    ],
    headStyles: { fillColor: BRAND_HEADER_COLOR }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 },
    didParseCell: (d) => { if (d.section === "body" && d.row.index === 2 && d.column.index === 1) d.cell.styles.textColor = color(r.difference); },
  });
  y = last() + 8;

  doc.setFontSize(12); doc.setTextColor(...BRAND_HEADER_COLOR); doc.text("Category / Item Breakdown", 14, y);
  const body: any[] = []; const diffs: number[] = [];
  for (const c of r.categories) {
    body.push([{ content: c.name, styles: { fontStyle: "bold", fillColor: [238, 243, 232] } }, { content: ks(c.budget), styles: { fontStyle: "bold", fillColor: [238, 243, 232] } }, { content: ks(c.actual), styles: { fontStyle: "bold", fillColor: [238, 243, 232] } }, { content: diffTxt(c.diff), styles: { fontStyle: "bold", fillColor: [238, 243, 232] } }, { content: `${c.pct.toFixed(1)}%`, styles: { fontStyle: "bold", fillColor: [238, 243, 232] } }]);
    diffs.push(c.diff);
    for (const row of c.rows) { body.push([`   ${row.name}`, ks(row.budget), ks(row.actual), diffTxt(row.diff), `${row.pct.toFixed(1)}%`]); diffs.push(row.diff); }
  }
  body.push([{ content: "TOTAL (budgeted items)", styles: { fontStyle: "bold" } }, ks(r.totalBudget), ks(r.totalActual - r.unbudgetedTotal), diffTxt(r.totalBudget - (r.totalActual - r.unbudgetedTotal)), ""]);
  diffs.push(r.totalBudget - (r.totalActual - r.unbudgetedTotal));
  autoTable(doc, {
    startY: y + 3, head: [["Item", "Budget", "Actual", "Difference", "Diff %"]], body,
    headStyles: { fillColor: BRAND_HEADER_COLOR }, styles: { fontSize: 8 }, margin: { left: 14, right: 14 },
    didParseCell: colorDiffCol(3, diffs),
  });
  y = last() + 8;

  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(12); doc.setTextColor(...BRAND_HEADER_COLOR); doc.text("Unbudgeted Expenses", 14, y);
  autoTable(doc, {
    startY: y + 3, head: [["Expense", "Budget", "Actual", "Difference"]],
    body: r.unbudgeted.length ? [...r.unbudgeted.map((u) => [u.name, ks(0), ks(u.actual), diffTxt(u.diff)]), [{ content: "Total unbudgeted", styles: { fontStyle: "bold" } }, ks(0), ks(r.unbudgetedTotal), diffTxt(-r.unbudgetedTotal)]] : [["None", "", "", ""]],
    headStyles: { fillColor: BRAND_HEADER_COLOR }, styles: { fontSize: 8 }, margin: { left: 14, right: 14 },
    didParseCell: (d) => { if (d.section === "body" && d.column.index === 3 && r.unbudgeted.length) d.cell.styles.textColor = RED; },
  });
  y = last() + 8;

  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(12); doc.setTextColor(...BRAND_HEADER_COLOR); doc.text("Budget Implementation", 14, y);
  autoTable(doc, {
    startY: y + 3, body: [
      ["Planned budget", ks(r.totalBudget)], ["Implemented (spent against budgeted items, capped per item)", ks(r.implementedBudget)],
      ["Implementation %", `${r.implementationPct.toFixed(1)}%`], ["Grand total actual (incl. unbudgeted)", ks(r.totalActual)],
      ["Utilisation %", `${r.utilisation.toFixed(1)}%`],
    ], styles: { fontSize: 9 }, margin: { left: 14, right: 14 },
  });
  y = last() + 8;

  const rv = r.revenue;
  if (rv.target > 0 || rv.actual > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setTextColor(...BRAND_HEADER_COLOR); doc.text("Revenue & Returns", 14, y);
    autoTable(doc, {
      startY: y + 3, body: [
        ["Target Revenue", ks(rv.target)], ["Actual / Gross Revenue", ks(rv.actual)],
        ["Revenue vs Target", rv.diff >= 0 ? `${ks(rv.diff)} UP` : `${ks(-rv.diff)} DOWN`],
        ["Total Cost", ks(rv.totalCost)], ["Net Profit", ks(rv.netProfit)], ["ROI", `${rv.roi.toFixed(1)}%`],
      ], styles: { fontSize: 9 }, margin: { left: 14, right: 14 },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 1 && d.row.index === 2) d.cell.styles.textColor = rv.diff >= 0 ? GREEN : RED;
        if (d.section === "body" && d.column.index === 1 && d.row.index === 4) d.cell.styles.textColor = rv.netProfit >= 0 ? GREEN : RED;
      },
    });
    y = last() + 8;
  }

  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(12); doc.setTextColor(...BRAND_HEADER_COLOR); doc.text("Recommendation & Management Analysis", 14, y);
  y += 6; doc.setFontSize(9); doc.setTextColor(40, 40, 40);
  for (const rec of r.recommendations) {
    const lines = doc.splitTextToSize(`• ${rec}`, pw - 28);
    if (y + lines.length * 4.5 > 270) { doc.addPage(); y = 20; }
    doc.text(lines, 14, y); y += lines.length * 4.5 + 2;
  }

  await applySignature(doc, "reports");
  await applyBrandedFooter(doc, "reports");
  doc.save(`Budget_vs_Actual_${r.entityName.replace(/[^a-z0-9]+/gi, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
