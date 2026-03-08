import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatKES } from "./currency";

interface PnLReport {
  summary: {
    period: { start_date: string; end_date: string };
    category: string;
    total_revenue: number;
    paid_revenue: number;
    total_costs: number;
    paid_costs: number;
    gross_profit: number;
    net_profit: number;
    profit_margin_percent: number;
    total_sales_transactions: number;
    total_purchase_transactions: number;
  };
  monthly_trends: Array<{
    month: string;
    revenue: number;
    costs: number;
    profit: number;
    sales_count: number;
    purchases_count: number;
  }>;
  category_performance: Array<{
    category: string;
    revenue: number;
    quantity: number;
    transactions: number;
    avg_transaction_value: number;
  }>;
  generated_at: string;
}

export function exportPnLToCSV(report: PnLReport) {
  const lines: string[] = [];

  // Summary
  lines.push("PROFIT & LOSS REPORT");
  lines.push(`Period,${report.summary.period.start_date || "All time"},${report.summary.period.end_date || "Present"}`);
  lines.push(`Category,${report.summary.category}`);
  lines.push(`Generated,${new Date(report.generated_at).toLocaleString()}`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push(`Total Revenue,${report.summary.total_revenue}`);
  lines.push(`Paid Revenue,${report.summary.paid_revenue}`);
  lines.push(`Total Costs,${report.summary.total_costs}`);
  lines.push(`Paid Costs,${report.summary.paid_costs}`);
  lines.push(`Gross Profit,${report.summary.gross_profit}`);
  lines.push(`Net Profit,${report.summary.net_profit}`);
  lines.push(`Profit Margin %,${report.summary.profit_margin_percent.toFixed(1)}`);
  lines.push(`Total Sales,${report.summary.total_sales_transactions}`);
  lines.push(`Total Purchases,${report.summary.total_purchase_transactions}`);

  // Monthly Trends
  if (report.monthly_trends.length > 0) {
    lines.push("");
    lines.push("MONTHLY TRENDS");
    lines.push("Month,Revenue,Costs,Profit,Sales,Purchases");
    report.monthly_trends.forEach((t) => {
      lines.push(`${t.month},${t.revenue},${t.costs},${t.profit},${t.sales_count},${t.purchases_count}`);
    });
  }

  // Category Performance
  if (report.category_performance.length > 0) {
    lines.push("");
    lines.push("CATEGORY PERFORMANCE");
    lines.push("Category,Revenue,Quantity,Transactions,Avg Value");
    report.category_performance.forEach((c) => {
      lines.push(`${c.category},${c.revenue},${c.quantity},${c.transactions},${c.avg_transaction_value.toFixed(2)}`);
    });
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pnl-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPnLToPDF(report: PnLReport) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Profit & Loss Report", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Period: ${report.summary.period.start_date || "All time"} — ${report.summary.period.end_date || "Present"}  |  Category: ${report.summary.category}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 5;
  doc.text(`Generated: ${new Date(report.generated_at).toLocaleString()}`, pageWidth / 2, y, { align: "center" });
  y += 12;

  // Summary table
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Amount"]],
    body: [
      ["Total Revenue", formatKES(report.summary.total_revenue)],
      ["Paid Revenue", formatKES(report.summary.paid_revenue)],
      ["Total Costs", formatKES(report.summary.total_costs)],
      ["Paid Costs", formatKES(report.summary.paid_costs)],
      ["Gross Profit", formatKES(report.summary.gross_profit)],
      ["Net Profit", formatKES(report.summary.net_profit)],
      ["Profit Margin", `${report.summary.profit_margin_percent.toFixed(1)}%`],
      ["Total Sales Transactions", String(report.summary.total_sales_transactions)],
      ["Total Purchase Transactions", String(report.summary.total_purchase_transactions)],
    ],
    theme: "grid",
    headStyles: { fillColor: [76, 111, 60] },
    styles: { fontSize: 9 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Monthly Trends
  if (report.monthly_trends.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Monthly Trends", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Month", "Revenue", "Costs", "Profit", "Sales", "Purchases"]],
      body: report.monthly_trends.map((t) => [
        t.month,
        formatKES(t.revenue),
        formatKES(t.costs),
        formatKES(t.profit),
        String(t.sales_count),
        String(t.purchases_count),
      ]),
      theme: "grid",
      headStyles: { fillColor: [76, 111, 60] },
      styles: { fontSize: 9 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Category Performance
  if (report.category_performance.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Category Performance", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Category", "Revenue", "Qty", "Transactions", "Avg Value"]],
      body: report.category_performance.map((c) => [
        c.category,
        formatKES(c.revenue),
        String(c.quantity),
        String(c.transactions),
        formatKES(c.avg_transaction_value),
      ]),
      theme: "grid",
      headStyles: { fillColor: [76, 111, 60] },
      styles: { fontSize: 9 },
    });
  }

  doc.save(`pnl-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
