import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatKES } from "./currency";
import fallbackLogoUrl from "@/assets/farm-logo.png";
import { getFarmSettings } from "./farm-settings-cache";

const DEFAULT_FARM_NAME = "JEFF TRICKS FARM LTD";
const DEFAULT_LOCATION = "Nyeri, Kenya";
const DEFAULT_SLOGAN = "Nurturing the Land, Feeding the Future";

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

function stampCode(): string {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return [0, 1, 2].map(() => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("")).join("-");
}

interface SaleDetail {
  id: string;
  sale_date: string;
  buyer: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number | null;
}

interface CostDetail {
  id: string;
  purchase_date: string;
  item_name: string;
  category: string;
  supplier: string;
  total_cost: number | null;
}

interface ProductPnL {
  revenue: number;
  costs: number;
  salesCount: number;
  salesDetails: SaleDetail[];
  costDetails: CostDetail[];
}

export async function exportModulePnLToPDF(
  moduleType: "crop" | "livestock",
  pnlData: Record<string, ProductPnL>,
  totals: { totalRevenue: number; totalCosts: number; netProfit: number },
  selectedFilter: string
) {
  const settings = await getFarmSettings();
  const FARM_NAME = settings?.farm_name || DEFAULT_FARM_NAME;
  const FARM_LOCATION = settings?.location || DEFAULT_LOCATION;
  const FARM_SLOGAN = (settings as any)?.slogan || DEFAULT_SLOGAN;
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const now = new Date();
  const ref = stampCode();
  const hc: [number, number, number] = [76, 111, 60];
  let y = 14;

  const checkPage = (n: number) => { if (y > ph - n - 25) { doc.addPage(); y = 20; } };

  // Logo
  const logoSrc = settings?.logo_url || fallbackLogoUrl;
  let logo: string | null = null;
  try { logo = await loadImageAsBase64(logoSrc); } catch { /* skip */ }

  // Header
  doc.setFillColor(...hc);
  doc.rect(0, 0, pw, 3, "F");
  if (logo) doc.addImage(logo, "PNG", 14, y - 2, 22, 22);
  const tx = logo ? 40 : 14;
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...hc);
  doc.text(FARM_NAME, tx, y + 6);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text(FARM_LOCATION, tx, y + 12);
  doc.text(`"${FARM_SLOGAN}"`, tx, y + 17);
  doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text(`Date: ${now.toLocaleDateString()}`, pw - 14, y + 4, { align: "right" });
  doc.text(`Time: ${now.toLocaleTimeString()}`, pw - 14, y + 9, { align: "right" });
  doc.text(`Ref: ${ref}`, pw - 14, y + 14, { align: "right" });
  y += 26;
  doc.setDrawColor(...hc); doc.setLineWidth(0.8);
  doc.line(14, y, pw - 14, y);
  y += 10;

  // Title
  const title = moduleType === "crop" ? "Crop Profit & Loss Report" : "Livestock Profit & Loss Report";
  // No emoji icons in PDF
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text(title, pw / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text(`Filter: ${selectedFilter === "all" ? "All Products" : selectedFilter}  |  Generated: ${now.toLocaleDateString()}`, pw / 2, y, { align: "center" });
  y += 10;

  // Summary Table
  checkPage(40);
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...hc);
  doc.text("1. Summary", 14, y); y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Amount (KES)"]],
    body: [
      ["Total Revenue", formatKES(totals.totalRevenue)],
      ["Total Costs", formatKES(totals.totalCosts)],
      ["Net Profit / (Loss)", formatKES(totals.netProfit)],
      ["Profit Margin", totals.totalRevenue > 0 ? `${((totals.netProfit / totals.totalRevenue) * 100).toFixed(1)}%` : "N/A"],
    ],
    theme: "grid",
    headStyles: { fillColor: hc },
    styles: { fontSize: 10 },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 1) {
        if (data.row.index === 0) {
          data.cell.styles.textColor = [40, 120, 40];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.row.index === 1) {
          data.cell.styles.textColor = [180, 30, 30];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.row.index === 2) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = totals.netProfit >= 0 ? [40, 120, 40] : [180, 30, 30];
          data.cell.styles.fillColor = totals.netProfit >= 0 ? [230, 245, 230] : [245, 230, 230];
        }
      }
      if (data.section === "body" && data.row.index === 2 && data.column.index === 0) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = totals.netProfit >= 0 ? [230, 245, 230] : [245, 230, 230];
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Per-product breakdown
  let sectionNum = 2;
  for (const [productName, data] of Object.entries(pnlData)) {
    if (!data) continue;
    const profit = data.revenue - data.costs;
    const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

    checkPage(30);
    doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(...hc);
    doc.text(`${sectionNum}. ${productName}`, 14, y); y += 5;

    // Status line with color coding
    const statusText = profit >= 0 ? "PROFITABLE" : "LOSS-MAKING";
    const statusColor: [number, number, number] = profit >= 0 ? [40, 120, 40] : [180, 30, 30];
    
    // Draw colored status bar
    doc.setFillColor(...statusColor);
    doc.roundedRect(14, y - 2, pw - 28, 10, 2, 2, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text(`${statusText}  |  Net: ${formatKES(profit)}  |  Margin: ${margin.toFixed(1)}%`, 18, y + 4);
    y += 14;

    // Sales table
    if (data.salesDetails.length > 0) {
      checkPage(20);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(60, 60, 60);
      doc.text("Sales Revenue", 16, y); y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Buyer", "Qty", "Unit Price", "Amount"]],
        body: data.salesDetails.map((s) => [
          new Date(s.sale_date).toLocaleDateString(),
          s.buyer,
          `${s.quantity} ${s.unit}`,
          formatKES(s.unit_price),
          formatKES(s.total_amount),
        ]),
        theme: "grid",
        headStyles: { fillColor: [200, 220, 200], textColor: [30, 30, 30] },
        styles: { fontSize: 8 },
        foot: [["", "", "", "Total Revenue", formatKES(data.revenue)]],
        footStyles: { fillColor: [230, 245, 230], textColor: [40, 120, 40], fontStyle: "bold" },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Costs table
    if (data.costDetails.length > 0) {
      checkPage(20);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(60, 60, 60);
      doc.text("Associated Costs", 16, y); y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Item", "Category", "Supplier", "Cost"]],
        body: data.costDetails.map((p) => [
          new Date(p.purchase_date).toLocaleDateString(),
          p.item_name,
          p.category,
          p.supplier,
          formatKES(p.total_cost),
        ]),
        theme: "grid",
        headStyles: { fillColor: [220, 200, 200], textColor: [30, 30, 30] },
        styles: { fontSize: 8 },
        foot: [["", "", "", "Total Costs", formatKES(data.costs)]],
        footStyles: { fillColor: [245, 230, 230], textColor: [180, 30, 30], fontStyle: "bold" },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Product profit summary
    checkPage(15);
    doc.setDrawColor(...hc); doc.setLineWidth(0.3);
    doc.line(14, y, pw - 14, y); y += 5;
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.setTextColor(profit >= 0 ? 40 : 180, profit >= 0 ? 80 : 30, profit >= 0 ? 30 : 30);
    doc.text(`${productName} Net Profit: ${formatKES(profit)}`, 16, y);
    y += 12;
    sectionNum++;
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...hc); doc.setLineWidth(0.5);
    doc.line(14, ph - 18, pw - 14, ph - 18);
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...hc);
    doc.text(FARM_NAME, 14, ph - 12);
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    doc.text(`"${FARM_SLOGAN}"`, 14, ph - 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(`Page ${i} of ${totalPages}  |  Ref: ${ref}`, pw - 14, ph - 12, { align: "right" });
    doc.setFillColor(...hc);
    doc.rect(0, ph - 3, pw, 3, "F");
  }

  const label = moduleType === "crop" ? "Crop" : "Livestock";
  const filter = selectedFilter === "all" ? "" : `-${selectedFilter}`;
  const date = now.toISOString().slice(0, 10);
  doc.save(`${FARM_NAME} ${label}-PnL${filter}-${date}.pdf`);
}
