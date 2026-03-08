import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatKES } from "./currency";
import farmLogoUrl from "@/assets/farm-logo.png";

const FARM_NAME = "JEFF TRICKS FARM LTD";
const FARM_LOCATION = "Nyeri, Kenya";
const FARM_SLOGAN = "Nurturing the Land, Feeding the Future";

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

/** Generate a unique verification stamp code */
function generateStampCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [];
  for (let s = 0; s < 3; s++) {
    let seg = "";
    for (let i = 0; i < 4; i++) {
      seg += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(seg);
  }
  return segments.join("-");
}

/** Load image as base64 for jsPDF */
function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No canvas context");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function exportPnLToCSV(report: PnLReport, printedBy?: string) {
  const lines: string[] = [];
  const now = new Date();
  const stampCode = generateStampCode();

  // Header
  lines.push(FARM_NAME);
  lines.push(FARM_LOCATION);
  lines.push(`"${FARM_SLOGAN}"`);
  lines.push("");
  lines.push("PROFIT & LOSS REPORT");
  lines.push(`Period,${report.summary.period.start_date || "All time"},${report.summary.period.end_date || "Present"}`);
  lines.push(`Category,${report.summary.category}`);
  lines.push(`Generated,${new Date(report.generated_at).toLocaleString()}`);
  lines.push(`Printed By,${printedBy || "System User"}`);
  lines.push(`Print Date,${now.toLocaleDateString()}`);
  lines.push(`Print Time,${now.toLocaleTimeString()}`);
  lines.push(`Verification Code,${stampCode}`);
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

  if (report.monthly_trends.length > 0) {
    lines.push("");
    lines.push("MONTHLY TRENDS");
    lines.push("Month,Revenue,Costs,Profit,Sales,Purchases");
    report.monthly_trends.forEach((t) => {
      lines.push(`${t.month},${t.revenue},${t.costs},${t.profit},${t.sales_count},${t.purchases_count}`);
    });
  }

  if (report.category_performance.length > 0) {
    lines.push("");
    lines.push("CATEGORY PERFORMANCE");
    lines.push("Category,Revenue,Quantity,Transactions,Avg Value");
    report.category_performance.forEach((c) => {
      lines.push(`${c.category},${c.revenue},${c.quantity},${c.transactions},${c.avg_transaction_value.toFixed(2)}`);
    });
  }

  lines.push("");
  lines.push(`--- ${FARM_NAME} | ${FARM_SLOGAN} ---`);

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pnl-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPnLToPDF(report: PnLReport, printedBy?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const stampCode = generateStampCode();
  let y = 14;

  // Load logo
  let logoBase64: string | null = null;
  try {
    logoBase64 = await loadImageAsBase64(farmLogoUrl);
  } catch {
    // continue without logo
  }

  // === HEADER ===
  const headerColor: [number, number, number] = [76, 111, 60];

  // Top green bar
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, 3, "F");

  // Logo
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 14, y - 2, 22, 22);
  }

  // Farm name & location
  const textX = logoBase64 ? 40 : 14;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...headerColor);
  doc.text(FARM_NAME, textX, y + 6);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(FARM_LOCATION, textX, y + 12);
  doc.text(`"${FARM_SLOGAN}"`, textX, y + 17);

  // Print info on right side
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Date: ${now.toLocaleDateString()}`, pageWidth - 14, y + 4, { align: "right" });
  doc.text(`Time: ${now.toLocaleTimeString()}`, pageWidth - 14, y + 9, { align: "right" });
  doc.text(`Printed By: ${printedBy || "System User"}`, pageWidth - 14, y + 14, { align: "right" });

  y += 26;

  // Header divider
  doc.setDrawColor(...headerColor);
  doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // === TITLE ===
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Profit & Loss Report", pageWidth / 2, y, { align: "center" });
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Period: ${report.summary.period.start_date || "All time"} — ${report.summary.period.end_date || "Present"}  |  Category: ${report.summary.category}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 10;

  // === SUMMARY TABLE ===
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
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
    headStyles: { fillColor: headerColor },
    styles: { fontSize: 9 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // === MONTHLY TRENDS ===
  if (report.monthly_trends.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
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
      headStyles: { fillColor: headerColor },
      styles: { fontSize: 9 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // === CATEGORY PERFORMANCE ===
  if (report.category_performance.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
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
      headStyles: { fillColor: headerColor },
      styles: { fontSize: 9 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // === FOOTER on every page ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider
    doc.setDrawColor(...headerColor);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

    // Footer text
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...headerColor);
    doc.text(FARM_NAME, 14, pageHeight - 12);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`"${FARM_SLOGAN}"`, 14, pageHeight - 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 12, { align: "right" });

    // Bottom green bar
    doc.setFillColor(...headerColor);
    doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
  }

  doc.save(`pnl-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
