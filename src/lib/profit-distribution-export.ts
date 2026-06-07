import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { applyBrandedHeader, applyBrandedFooter } from "./pdf-branding";
import { formatKES } from "./currency";
import type { ProjectMetrics, DistributionBucket, Scenario } from "./profit-analytics";
import { distribute } from "./profit-analytics";

export async function exportProfitDistributionPDF(opts: {
  projects: ProjectMetrics[];
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  buckets: DistributionBucket[];
  scenarios: Scenario[];
  periodLabel?: string;
}) {
  const doc = new jsPDF();
  let y = await applyBrandedHeader(doc, {
    title: "Profit Distribution Analytics Report",
    subtitle: opts.periodLabel || "All-time",
    filters: "Analytics only — no records were modified",
  });

  // Executive summary
  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Total Revenue", formatKES(opts.totalRevenue)],
      ["Total Expenses", formatKES(opts.totalExpenses)],
      ["Net Profit", formatKES(opts.totalProfit)],
      ["Profit Margin", opts.totalRevenue > 0 ? `${((opts.totalProfit / opts.totalRevenue) * 100).toFixed(1)}%` : "—"],
      ["ROI", opts.totalExpenses > 0 ? `${((opts.totalProfit / opts.totalExpenses) * 100).toFixed(1)}%` : "—"],
      ["Projects Tracked", String(opts.projects.length)],
      ["Profitable Projects", String(opts.projects.filter((p) => p.profit > 0).length)],
    ],
    theme: "grid",
    headStyles: { fillColor: [76, 111, 60] },
  });

  // Distribution projection
  doc.addPage();
  y = await applyBrandedHeader(doc, { title: "Projected Distribution", subtitle: "Based on current distribution model" });
  if (opts.totalProfit > 0) {
    const rows = distribute(opts.totalProfit, opts.buckets).map((b) => [
      b.label, `${b.percent.toFixed(1)}%`, formatKES(b.amount),
    ]);
    autoTable(doc, {
      startY: y,
      head: [["Bucket", "Allocation %", "Projected Amount"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [76, 111, 60] },
    });
  } else {
    doc.setFontSize(11);
    doc.text("Break-even not reached. No distribution available.", 14, y + 10);
  }

  // Scenario comparison
  if (opts.scenarios.length > 0 && opts.totalProfit > 0) {
    doc.addPage();
    y = await applyBrandedHeader(doc, { title: "Scenario Comparison" });
    const allKeys = Array.from(
      new Set(opts.scenarios.flatMap((s) => s.buckets.map((b) => b.label)))
    );
    const head = [["Bucket", ...opts.scenarios.map((s) => s.name)]];
    const body = allKeys.map((label) => [
      label,
      ...opts.scenarios.map((s) => {
        const b = s.buckets.find((x) => x.label === label);
        if (!b) return "—";
        const dist = distribute(opts.totalProfit, s.buckets).find((x) => x.label === label);
        return `${b.percent.toFixed(1)}% (${formatKES(dist?.amount || 0)})`;
      }),
    ]);
    autoTable(doc, { startY: y, head, body, theme: "grid", headStyles: { fillColor: [76, 111, 60] } });
  }

  // Per-project breakdown
  doc.addPage();
  y = await applyBrandedHeader(doc, { title: "Per-Project Profitability" });
  autoTable(doc, {
    startY: y,
    head: [["Project", "Type", "Revenue", "Expenses", "Profit", "Margin", "ROI"]],
    body: opts.projects.map((p) => [
      p.name,
      p.kind,
      formatKES(p.revenue),
      formatKES(p.expenses),
      formatKES(p.profit),
      `${p.margin.toFixed(1)}%`,
      `${p.roi.toFixed(1)}%`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [76, 111, 60] },
    styles: { fontSize: 8 },
  });

  await applyBrandedFooter(doc);
  doc.save(`profit-distribution-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportProjectsCSV(projects: ProjectMetrics[]) {
  const headers = ["Project", "Type", "Meta", "Revenue", "Expenses", "Profit", "Margin %", "ROI %"];
  const rows = projects.map((p) => [
    p.name, p.kind, p.meta || "",
    p.revenue.toFixed(2), p.expenses.toFixed(2), p.profit.toFixed(2),
    p.margin.toFixed(2), p.roi.toFixed(2),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `profit-projects-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportProjectDistributionPDF(opts: {
  project: ProjectMetrics;
  buckets: DistributionBucket[];
}) {
  const { project, buckets } = opts;
  const doc = new jsPDF();
  let y = await applyBrandedHeader(doc, {
    title: `Profit Distribution — ${project.name}`,
    subtitle: `${project.kind.toUpperCase()}${project.meta ? ` · ${project.meta}` : ""}`,
    filters: "Analytics only — no records were modified",
  });

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Revenue", formatKES(project.revenue)],
      ["Expenses", formatKES(project.expenses)],
      ["Net Profit", formatKES(project.profit)],
      ["Profit Margin", `${project.margin.toFixed(1)}%`],
      ["ROI", `${project.roi.toFixed(1)}%`],
      ["Status", project.profit > 0 ? "Profitable" : "Below break-even"],
    ],
    theme: "grid",
    headStyles: { fillColor: [76, 111, 60] },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y;
  if (project.profit > 0) {
    autoTable(doc, {
      startY: finalY + 10,
      head: [["Bucket", "Allocation %", "Projected Amount"]],
      body: distribute(project.profit, buckets).map((b) => [
        b.label, `${b.percent.toFixed(1)}%`, formatKES(b.amount),
      ]),
      theme: "striped",
      headStyles: { fillColor: [76, 111, 60] },
    });
  } else {
    doc.setFontSize(11);
    doc.text("Project not profitable — no distribution available.", 14, finalY + 14);
  }

  await applyBrandedFooter(doc);
  doc.save(`profit-distribution-${project.name.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

