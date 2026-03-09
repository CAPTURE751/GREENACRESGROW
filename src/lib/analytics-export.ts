import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatKES } from "./currency";
import fallbackLogoUrl from "@/assets/farm-logo.png";
import { getFarmSettings } from "./farm-settings-cache";

const DEFAULT_FARM_NAME = "My Farm";
const DEFAULT_LOCATION = "";
const DEFAULT_SLOGAN = "";

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
  return [0, 1, 2]
    .map(() =>
      Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("")
    )
    .join("-");
}

interface AnalyticsData {
  totals: { totalRevenue: number; totalCosts: number; netProfit: number; margin: number };
  monthlyFinancials: { month: string; revenue: number; costs: number; profit: number }[];
  revenueByType: { name: string; value: number }[];
  costsByCategory: { name: string; value: number }[];
  topProducts: { name: string; revenue: number; qty: number; unit: string }[];
  inventoryStats: { totalItems: number; totalValue: number; lowStock: number };
  breakEven: { isAbove: boolean; revenue: number; breakEvenPoint: number; difference: number } | null;
  farmCounts: { crops: number; livestock: number; sales: number; purchases: number };
  timeRange: string;
}

export async function exportAnalyticsPDF(data: AnalyticsData) {
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

  const checkPage = (n: number) => {
    if (y > ph - n - 25) {
      doc.addPage();
      y = 20;
    }
  };

  // Logo
  const logoSrc = settings?.logo_url || fallbackLogoUrl;
  let logo: string | null = null;
  try {
    logo = await loadImageAsBase64(logoSrc);
  } catch {
    /* skip */
  }

  // ── Header ──
  doc.setFillColor(...hc);
  doc.rect(0, 0, pw, 3, "F");
  if (logo) doc.addImage(logo, "PNG", 14, y - 2, 22, 22);
  const tx = logo ? 40 : 14;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hc);
  doc.text(FARM_NAME, tx, y + 6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(FARM_LOCATION, tx, y + 12);
  doc.text(`"${FARM_SLOGAN}"`, tx, y + 17);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Date: ${now.toLocaleDateString()}`, pw - 14, y + 4, { align: "right" });
  doc.text(`Time: ${now.toLocaleTimeString()}`, pw - 14, y + 9, { align: "right" });
  doc.text(`Ref: ${ref}`, pw - 14, y + 14, { align: "right" });
  y += 26;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, pw - 14, y);
  y += 6;

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Farm Analytics Report", 14, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`Period: ${data.timeRange}`, 14, y + 6);
  y += 14;

  // ── Financial Summary ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hc);
  doc.text("Financial Summary", 14, y);
  y += 6;

  const isProfit = data.totals.netProfit >= 0;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Amount"]],
    body: [
      ["Total Revenue", formatKES(data.totals.totalRevenue)],
      ["Total Costs", formatKES(data.totals.totalCosts)],
      [isProfit ? "Net Profit" : "Net Loss", formatKES(Math.abs(data.totals.netProfit))],
      ["Profit Margin", `${data.totals.margin.toFixed(1)}%`],
    ],
    headStyles: { fillColor: [...hc] as any, textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9 },
    didParseCell: (cellData) => {
      if (cellData.section === "body" && cellData.column.index === 1) {
        // Revenue = Blue
        if (cellData.row.index === 0) {
          cellData.cell.styles.textColor = [30, 80, 180];
          cellData.cell.styles.fontStyle = "bold";
        }
        // Costs = Charcoal
        if (cellData.row.index === 1) {
          cellData.cell.styles.textColor = [70, 70, 70];
          cellData.cell.styles.fontStyle = "bold";
        }
        // Profit/Loss
        if (cellData.row.index === 2) {
          cellData.cell.styles.textColor = isProfit ? [40, 120, 40] : [180, 30, 30];
          cellData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Monthly Revenue vs Costs ──
  if (data.monthlyFinancials.length > 0) {
    checkPage(60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hc);
    doc.text("Monthly Revenue vs Costs", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Month", "Revenue", "Costs", "Profit/Loss"]],
      body: data.monthlyFinancials.map((m) => [
        m.month,
        formatKES(m.revenue),
        formatKES(m.costs),
        formatKES(m.profit),
      ]),
      headStyles: { fillColor: [...hc] as any, textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      didParseCell: (cellData) => {
        if (cellData.section === "body") {
          if (cellData.column.index === 1) cellData.cell.styles.textColor = [30, 80, 180];
          if (cellData.column.index === 2) cellData.cell.styles.textColor = [70, 70, 70];
          if (cellData.column.index === 3) {
            const row = data.monthlyFinancials[cellData.row.index];
            cellData.cell.styles.textColor = row.profit >= 0 ? [40, 120, 40] : [180, 30, 30];
            cellData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Revenue by Product ──
  if (data.revenueByType.length > 0) {
    checkPage(60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hc);
    doc.text("Revenue by Product", 14, y);
    y += 6;

    const totalRev = data.revenueByType.reduce((s, r) => s + r.value, 0);
    autoTable(doc, {
      startY: y,
      head: [["Product", "Revenue", "% Share"]],
      body: data.revenueByType.map((r) => [
        r.name,
        formatKES(r.value),
        `${totalRev > 0 ? ((r.value / totalRev) * 100).toFixed(1) : 0}%`,
      ]),
      headStyles: { fillColor: [30, 80, 180], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      foot: [["Total", formatKES(totalRev), "100%"]],
      footStyles: { fillColor: [230, 240, 255], textColor: [30, 80, 180], fontStyle: "bold" },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Costs by Category ──
  if (data.costsByCategory.length > 0) {
    checkPage(60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hc);
    doc.text("Costs by Category", 14, y);
    y += 6;

    const totalCost = data.costsByCategory.reduce((s, r) => s + r.value, 0);
    autoTable(doc, {
      startY: y,
      head: [["Category", "Amount", "% Share"]],
      body: data.costsByCategory.map((c) => [
        c.name,
        formatKES(c.value),
        `${totalCost > 0 ? ((c.value / totalCost) * 100).toFixed(1) : 0}%`,
      ]),
      headStyles: { fillColor: [70, 70, 70], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      foot: [["Total", formatKES(totalCost), "100%"]],
      footStyles: { fillColor: [235, 235, 235], textColor: [70, 70, 70], fontStyle: "bold" },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Top Revenue Products ──
  if (data.topProducts.length > 0) {
    checkPage(60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hc);
    doc.text("Top Revenue Products", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Rank", "Product", "Quantity Sold", "Revenue"]],
      body: data.topProducts.map((p, i) => [
        `#${i + 1}`,
        p.name,
        `${p.qty} ${p.unit}`,
        formatKES(p.revenue),
      ]),
      headStyles: { fillColor: [...hc] as any, textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      didParseCell: (cellData) => {
        if (cellData.section === "body" && cellData.column.index === 3) {
          cellData.cell.styles.textColor = [30, 80, 180];
          cellData.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Break-Even Analysis ──
  if (data.breakEven) {
    checkPage(40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hc);
    doc.text("Break-Even Analysis", 14, y);
    y += 6;

    const be = data.breakEven;
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: [
        ["Cumulative Revenue", formatKES(be.revenue)],
        ["Break-Even Point", formatKES(be.breakEvenPoint)],
        [be.isAbove ? "Surplus" : "Shortfall", formatKES(be.difference)],
        ["Status", be.isAbove ? "ABOVE BREAK-EVEN" : "BELOW BREAK-EVEN"],
      ],
      headStyles: { fillColor: [...hc] as any, textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      didParseCell: (cellData) => {
        if (cellData.section === "body") {
          if (cellData.row.index === 2 && cellData.column.index === 1) {
            cellData.cell.styles.textColor = be.isAbove ? [40, 120, 40] : [180, 30, 30];
            cellData.cell.styles.fontStyle = "bold";
          }
          if (cellData.row.index === 3 && cellData.column.index === 1) {
            cellData.cell.styles.textColor = be.isAbove ? [40, 120, 40] : [180, 30, 30];
            cellData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Inventory Health ──
  checkPage(40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hc);
  doc.text("Inventory Health", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Total Items", String(data.inventoryStats.totalItems)],
      ["Inventory Value", formatKES(data.inventoryStats.totalValue)],
      ["Low Stock Alerts", String(data.inventoryStats.lowStock)],
    ],
    headStyles: { fillColor: [...hc] as any, textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
    didParseCell: (cellData) => {
      if (cellData.section === "body" && cellData.row.index === 2 && cellData.column.index === 1) {
        cellData.cell.styles.textColor = data.inventoryStats.lowStock > 0 ? [180, 30, 30] : [40, 120, 40];
        cellData.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Farm Summary ──
  checkPage(40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hc);
  doc.text("Farm Summary", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Active Crops", "Livestock", "Sales", "Purchases"]],
    body: [[
      String(data.farmCounts.crops),
      String(data.farmCounts.livestock),
      String(data.farmCounts.sales),
      String(data.farmCounts.purchases),
    ]],
    headStyles: { fillColor: [...hc] as any, textColor: [255, 255, 255] },
    styles: { fontSize: 9, halign: "center" },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Footer on each page ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    // Footer
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(`${FARM_NAME} - Analytics Report | Page ${i} of ${pages}`, pw / 2, ph - 8, { align: "center" });
    doc.text(`Generated: ${now.toLocaleString()} | Ref: ${ref}`, pw / 2, ph - 4, { align: "center" });
    doc.setFillColor(...hc);
    doc.rect(0, ph - 2, pw, 2, "F");
  }

  doc.save(`${FARM_NAME.replace(/\s+/g, "_")}_Analytics_Report_${now.toISOString().substring(0, 10)}.pdf`);
}
