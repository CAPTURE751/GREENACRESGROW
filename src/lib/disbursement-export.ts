import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { applyBrandedHeader, applyBrandedFooter } from "./pdf-branding";
import { formatKES } from "./currency";
import type { Disbursement } from "@/hooks/useDisbursements";

export async function exportDisbursementsPDF(items: Disbursement[]) {
  const doc = new jsPDF();
  const total = items.reduce((s, d) => s + Number(d.amount || 0), 0);
  let y = await applyBrandedHeader(doc, {
    title: "Profit Disbursement Ledger",
    subtitle: `${items.length} record(s) · Total ${formatKES(total)}`,
    filters: "Records live only in the Profit Distribution module.",
  });

  autoTable(doc, {
    startY: y,
    head: [["Date", "From (Source)", "Type", "Category", "Recipient", "Amount", "Notes"]],
    body: items.map((d) => [
      d.disbursed_on,
      d.source_name,
      d.source_kind,
      d.category,
      d.recipient,
      formatKES(Number(d.amount)),
      d.notes || "",
    ]),
    theme: "striped",
    headStyles: { fillColor: [76, 111, 60] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 5: { halign: "right" } },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Disbursed: ${formatKES(total)}`, 14, finalY + 10);

  // Group by category summary
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
  doc.save(`profit-disbursements-${new Date().toISOString().slice(0, 10)}.pdf`);
}
