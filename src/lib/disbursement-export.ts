import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { applyBrandedHeader, applyBrandedFooter } from "./pdf-branding";
import { formatKES } from "./currency";
import type { Disbursement } from "@/hooks/useDisbursements";

export async function exportDisbursementsPDF(items: Disbursement[], opts?: { title?: string; subtitle?: string; filters?: string }) {
  const doc = new jsPDF();
  const total = items.reduce((s, d) => s + Number(d.amount || 0), 0);
  let y = await applyBrandedHeader(doc, {
    title: opts?.title || "Profit Disbursement Ledger",
    subtitle: opts?.subtitle || `${items.length} record(s) · Total ${formatKES(total)}`,
    filters: opts?.filters || "Records live only in the Profit Distribution module.",
  });

  autoTable(doc, {
    startY: y,
    head: [["Date", "Crop / Project", "Type", "Category", "Recipient", "Amount", "Notes"]],
    body: items.map((d) => [
      d.disbursed_on,
      d.source_name,
      d.source_kind,
      d.category,
      d.recipient,
      formatKES(Number(d.amount)),
      d.notes || "—",
    ]),
    theme: "striped",
    headStyles: { fillColor: [76, 111, 60] },
    styles: { fontSize: 8, cellPadding: 2, valign: "top" },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 30 },
      2: { cellWidth: 18 },
      3: { cellWidth: 26 },
      4: { cellWidth: 30 },
      5: { cellWidth: 24, halign: "right" },
      6: { cellWidth: "auto" },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Disbursed: ${formatKES(total)}`, 14, finalY + 10);

  const byCategory = new Map<string, number>();
  items.forEach((d) => byCategory.set(d.category, (byCategory.get(d.category) || 0) + Number(d.amount)));
  if (byCategory.size > 0) {
    autoTable(doc, {
      startY: finalY + 16,
      head: [["Category", "Total"]],
      body: Array.from(byCategory.entries()).map(([c, v]) => [c, formatKES(v)]),
      theme: "grid",
      headStyles: { fillColor: [76, 111, 60] },
    });
  }

  await applyBrandedFooter(doc);
  const slug = (opts?.title || "profit-disbursements").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportDisbursementsBatch(
  items: Disbursement[],
  groupBy: "project" | "category"
) {
  const groups = new Map<string, Disbursement[]>();
  items.forEach((d) => {
    const key = groupBy === "project" ? d.source_name : d.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  });
  for (const [key, list] of groups) {
    const total = list.reduce((s, d) => s + Number(d.amount || 0), 0);
    await exportDisbursementsPDF(list, {
      title: `Disbursements — ${key}`,
      subtitle: `${groupBy === "project" ? "Crop/Project" : "Category"}: ${key} · ${list.length} record(s) · Total ${formatKES(total)}`,
      filters: `Grouped by ${groupBy}. Records live only in the Profit Distribution module.`,
    });
  }
}
