import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatKES } from "./currency";
import fallbackLogoUrl from "@/assets/farm-logo.png";
import { getFarmSettings } from "./farm-settings-cache";

const DEFAULT_FARM_NAME = "JEFF TRICKS FARM LTD";
const DEFAULT_LOCATION = "Nyeri, Kenya";
const DEFAULT_SLOGAN = "Nurturing the Land, Feeding the Future";

/** Generate a standardized filename with farm prefix */
export async function farmFileName(docName: string, ext: string): Promise<string> {
  const settings = await getFarmSettings();
  const name = settings?.farm_name || DEFAULT_FARM_NAME;
  const date = new Date().toISOString().slice(0, 10);
  return `${name} ${docName}-${date}.${ext}`;
}

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
  sales_breakdown?: Record<string, { total: number; items: Record<string, number> }>;
  purchases_breakdown?: Record<string, { total: number; items: Record<string, number> }>;
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

export async function exportPnLToCSV(report: PnLReport, printedBy?: string) {
  const settings = await getFarmSettings();
  const FARM_NAME = settings?.farm_name || DEFAULT_FARM_NAME;
  const FARM_LOCATION = settings?.location || DEFAULT_LOCATION;
  const FARM_SLOGAN = (settings as any)?.slogan || DEFAULT_SLOGAN;
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
  a.download = await farmFileName('PNL-report', 'csv');
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPnLToPDF(report: PnLReport, printedBy?: string) {
  const settings = await getFarmSettings();
  const FARM_NAME = settings?.farm_name || DEFAULT_FARM_NAME;
  const FARM_LOCATION = settings?.location || DEFAULT_LOCATION;
  const FARM_SLOGAN = (settings as any)?.slogan || DEFAULT_SLOGAN;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const stampCode = generateStampCode();
  let y = 14;
  const headerColor: [number, number, number] = [76, 111, 60];
  const sectionColor: [number, number, number] = [40, 80, 30];

  // Load logo
  const logoSrc = settings?.logo_url || fallbackLogoUrl;
  let logoBase64: string | null = null;
  try { logoBase64 = await loadImageAsBase64(logoSrc); } catch { /* continue */ }

  // Helper: check page break
  const checkPage = (needed: number) => {
    if (y > pageHeight - needed - 25) { doc.addPage(); y = 20; }
  };

  // Helper: section header
  const sectionHeader = (num: string, title: string) => {
    checkPage(20);
    doc.setFillColor(240, 245, 235);
    doc.rect(14, y - 5, pageWidth - 28, 8, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...sectionColor);
    doc.text(`${num}. ${title}`, 16, y);
    y += 8;
  };

  // Helper: sub-section header
  const subHeader = (title: string) => {
    checkPage(12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(title, 18, y);
    y += 5;
  };

  // Helper: line item row
  const lineItem = (label: string, amount: number, indent = 22) => {
    checkPage(7);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    doc.text(label, indent, y);
    doc.text(formatKES(amount), pageWidth - 18, y, { align: "right" });
    y += 5;
  };

  // Helper: total line (bold with line above)
  const totalLine = (label: string, amount: number, isGrand = false) => {
    checkPage(10);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(14, y - 1, pageWidth - 14, y - 1);
    y += 2;
    doc.setFontSize(isGrand ? 10 : 9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isGrand ? 0 : 30, isGrand ? 0 : 30, isGrand ? 0 : 30);
    doc.text(label, 16, y);
    doc.text(formatKES(amount), pageWidth - 18, y, { align: "right" });
    y += isGrand ? 8 : 6;
  };

  // Helper: double-line total (for final result)
  const doubleTotalLine = (label: string, amount: number) => {
    checkPage(14);
    doc.setDrawColor(40, 80, 30);
    doc.setLineWidth(0.5);
    doc.line(14, y - 1, pageWidth - 14, y - 1);
    doc.line(14, y + 1, pageWidth - 14, y + 1);
    y += 5;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(amount >= 0 ? 40 : 180, amount >= 0 ? 80 : 30, amount >= 0 ? 30 : 30);
    doc.text(label, 16, y);
    doc.text(formatKES(amount), pageWidth - 18, y, { align: "right" });
    y += 10;
  };

  // === HEADER ===
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, 3, "F");
  if (logoBase64) doc.addImage(logoBase64, "PNG", 14, y - 2, 22, 22);
  const textX = logoBase64 ? 40 : 14;
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...headerColor);
  doc.text(FARM_NAME, textX, y + 6);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text(FARM_LOCATION, textX, y + 12);
  doc.text(`"${FARM_SLOGAN}"`, textX, y + 17);
  doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text(`Date: ${now.toLocaleDateString()}`, pageWidth - 14, y + 4, { align: "right" });
  doc.text(`Time: ${now.toLocaleTimeString()}`, pageWidth - 14, y + 9, { align: "right" });
  doc.text(`Printed By: ${printedBy || "System User"}`, pageWidth - 14, y + 14, { align: "right" });
  doc.text(`Ref: ${stampCode}`, pageWidth - 14, y + 19, { align: "right" });
  y += 26;
  doc.setDrawColor(...headerColor); doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 10;

  // === TITLE ===
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Profit and Loss Statement (P&L)", pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  const periodText = `Period: ${report.summary.period.start_date || "All time"} — ${report.summary.period.end_date || "Present"}`;
  doc.text(periodText, pageWidth / 2, y, { align: "center" });
  y += 5;
  if (report.summary.category !== 'All Categories') {
    doc.text(`Category: ${report.summary.category}`, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  y += 5;

  // Column headers
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
  doc.text("DESCRIPTION", 16, y);
  doc.text("AMOUNT (KES)", pageWidth - 18, y, { align: "right" });
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
  doc.line(14, y + 2, pageWidth - 14, y + 2);
  y += 8;

  // Get breakdown data
  const salesBk = report.sales_breakdown || {};
  const purchasesBk = report.purchases_breakdown || {};

  // ============================================================
  // 1. FARM REVENUE (INCOME)
  // ============================================================
  sectionHeader("1", "FARM REVENUE (INCOME)");

  // Crop Sales
  const cropTypes = ['crop', 'crops', 'maize', 'beans', 'onion', 'vegetable', 'fruit'];
  const cropSalesEntries = Object.entries(salesBk).filter(([k]) => 
    cropTypes.some(t => k.toLowerCase().includes(t))
  );
  const otherSalesEntries = Object.entries(salesBk).filter(([k]) => 
    !cropTypes.some(t => k.toLowerCase().includes(t)) && 
    !['livestock', 'milk', 'egg', 'meat', 'honey', 'seed'].some(t => k.toLowerCase().includes(t))
  );
  const livestockSalesEntries = Object.entries(salesBk).filter(([k]) =>
    ['livestock', 'milk', 'egg', 'meat'].some(t => k.toLowerCase().includes(t))
  );
  const valueAddedEntries = Object.entries(salesBk).filter(([k]) =>
    ['honey', 'seed', 'processed'].some(t => k.toLowerCase().includes(t))
  );

  let cropSalesTotal = 0;
  if (cropSalesEntries.length > 0 || Object.keys(salesBk).length > 0) {
    subHeader("Crop Sales");
    // Show each crop sale sub-item
    cropSalesEntries.forEach(([type, data]) => {
      Object.entries(data.items).forEach(([name, amt]) => {
        lineItem(name, amt);
        cropSalesTotal += amt;
      });
    });
    // If no crop-specific entries found, check for generic entries
    if (cropSalesEntries.length === 0) {
      lineItem("No crop sales recorded", 0);
    }
  }

  let livestockIncomeTotal = 0;
  subHeader("Livestock Income");
  if (livestockSalesEntries.length > 0) {
    livestockSalesEntries.forEach(([type, data]) => {
      Object.entries(data.items).forEach(([name, amt]) => {
        lineItem(name, amt);
        livestockIncomeTotal += amt;
      });
    });
  } else {
    lineItem("No livestock income recorded", 0);
  }

  let valueAddedTotal = 0;
  subHeader("Value Added Products");
  if (valueAddedEntries.length > 0) {
    valueAddedEntries.forEach(([type, data]) => {
      Object.entries(data.items).forEach(([name, amt]) => {
        lineItem(name, amt);
        valueAddedTotal += amt;
      });
    });
  } else {
    lineItem("No value added product sales", 0);
  }

  // Other farm income (anything not categorized above)
  let otherIncomeTotal = 0;
  subHeader("Other Farm Income");
  if (otherSalesEntries.length > 0) {
    otherSalesEntries.forEach(([type, data]) => {
      Object.entries(data.items).forEach(([name, amt]) => {
        lineItem(name, amt);
        otherIncomeTotal += amt;
      });
    });
  } else {
    lineItem("Government Subsidies", 0);
    lineItem("Farm Tours / Training", 0);
    lineItem("Equipment Rental", 0);
    lineItem("Grants or Donations", 0);
  }

  totalLine("Total Farm Revenue", report.summary.total_revenue, true);

  // ============================================================
  // 2. COST OF PRODUCTION (DIRECT COSTS)
  // ============================================================
  sectionHeader("2", "COST OF PRODUCTION (DIRECT COSTS)");

  // Direct cost category mappings (match purchase category keys)
  const directCostMappings: { label: string; keys: string[] }[] = [
    { label: "Seeds and Planting Materials", keys: ["seeds", "seed", "seedling", "nursery", "planting"] },
    { label: "Fertilizers", keys: ["fertilizer", "manure", "compost"] },
    { label: "Chemicals and Crop Protection", keys: ["chemicals", "pesticide", "herbicide", "fungicide", "chemical", "spray"] },
    { label: "Irrigation Costs", keys: ["irrigation", "water", "pump", "drip"] },
    { label: "Livestock Feed", keys: ["feed", "supplement", "mineral", "hay", "fodder"] },
    { label: "Veterinary Costs", keys: ["veterinary", "vet", "vaccine", "vaccination", "medicine", "drug"] },
    { label: "Casual Labour", keys: ["casual_labour", "casual labour", "casual"] },
  ];

  // Operating expense category mappings
  const opexMappings: { label: string; keys: string[] }[] = [
    { label: "Labour Costs (Permanent Workers / Farm Manager)", keys: ["permanent_labour", "permanent labour", "salaries", "salary", "farm manager"] },
    { label: "Machinery & Equipment (Fuel, Maintenance, Repairs)", keys: ["machinery", "equipment", "maintenance", "tractor fuel", "repairs"] },
    { label: "Utilities (Electricity, Water)", keys: ["utilities", "electricity"] },
    { label: "Transport & Distribution", keys: ["transport", "distribution", "delivery", "fuel"] },
    { label: "Farm Supplies (Tools, Packaging, Storage)", keys: ["farm_supplies", "farm supplies", "tools", "packaging", "storage"] },
    { label: "Communication (Internet, Phone)", keys: ["communication", "internet", "phone"] },
    { label: "Land Costs (Lease, Rates)", keys: ["land_costs", "land costs", "lease", "land rates"] },
    { label: "Insurance (Crop, Livestock)", keys: ["insurance"] },
    { label: "Administration (Office, Software, Accounting)", keys: ["administration", "admin", "office", "software", "accounting"] },
    { label: "Marketing (Advertising, Branding, Market Fees)", keys: ["marketing", "advertising", "branding", "market fees"] },
  ];

  // Financial cost category mappings
  const financialMappings: { label: string; keys: string[] }[] = [
    { label: "Loan Interest", keys: ["loan_interest", "loan interest", "interest"] },
    { label: "Bank Charges", keys: ["bank_charges", "bank charges", "bank"] },
    { label: "Equipment Financing", keys: ["equipment_financing", "equipment financing", "financing"] },
  ];

  // Adjustment category mappings
  const adjustmentMappings: { label: string; keys: string[] }[] = [
    { label: "Depreciation", keys: ["depreciation"] },
    { label: "Taxes", keys: ["taxes", "tax"] },
  ];

  // All non-direct keys for filtering
  const nonDirectKeys = [...opexMappings, ...financialMappings, ...adjustmentMappings]
    .flatMap(m => m.keys);

  // Helper to sum matched purchases
  const renderCostSection = (mappings: { label: string; keys: string[] }[]): number => {
    let sectionTotal = 0;
    mappings.forEach(mapping => {
      const matched = Object.entries(purchasesBk).filter(([cat]) =>
        mapping.keys.some(kw => cat.toLowerCase() === kw || cat.toLowerCase().includes(kw))
      );
      subHeader(mapping.label);
      if (matched.length > 0) {
        matched.forEach(([, data]) => {
          Object.entries(data.items).forEach(([name, amt]) => {
            lineItem(name, amt);
            sectionTotal += amt;
          });
        });
      } else {
        lineItem(`—`, 0);
      }
    });
    return sectionTotal;
  };

  const directCostsTotal = renderCostSection(directCostMappings);

  // Check for unmapped purchases that don't fit any category
  const allMappedKeys = [...directCostMappings, ...opexMappings, ...financialMappings, ...adjustmentMappings]
    .flatMap(m => m.keys);
  const unmappedPurchases = Object.entries(purchasesBk).filter(([cat]) =>
    !allMappedKeys.some(kw => cat.toLowerCase() === kw || cat.toLowerCase().includes(kw))
  );
  let unmappedDirectTotal = 0;
  if (unmappedPurchases.length > 0) {
    subHeader("Other Direct Costs");
    unmappedPurchases.forEach(([cat, data]) => {
      Object.entries(data.items).forEach(([name, amt]) => {
        lineItem(`${name} (${cat})`, amt);
        unmappedDirectTotal += amt;
      });
    });
  }

  const totalDirectCosts = directCostsTotal + unmappedDirectTotal;
  totalLine("Total Direct Costs", totalDirectCosts, true);

  // ============================================================
  // 3. GROSS PROFIT
  // ============================================================
  const grossProfit = report.summary.total_revenue - totalDirectCosts;
  sectionHeader("3", "GROSS PROFIT");
  doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100);
  doc.text("Gross Profit = Total Farm Revenue – Total Direct Costs", 18, y);
  y += 6;
  totalLine("Gross Profit", grossProfit, true);

  // ============================================================
  // 4. OPERATING EXPENSES
  // ============================================================
  sectionHeader("4", "OPERATING EXPENSES");
  const opexTotal = renderCostSection(opexMappings);
  totalLine("Total Operating Expenses", opexTotal, true);

  // ============================================================
  // 5. OPERATING PROFIT
  // ============================================================
  const operatingProfit = grossProfit - opexTotal;
  sectionHeader("5", "OPERATING PROFIT");
  doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100);
  doc.text("Operating Profit = Gross Profit – Operating Expenses", 18, y);
  y += 6;
  totalLine("Operating Profit", operatingProfit, true);

  // ============================================================
  // 6. FINANCIAL COSTS
  // ============================================================
  sectionHeader("6", "FINANCIAL COSTS");
  const financialTotal = renderCostSection(financialMappings);
  totalLine("Total Financial Costs", financialTotal, true);

  // ============================================================
  // 7. NET FARM PROFIT
  // ============================================================
  const netFarmProfit = operatingProfit - financialTotal;
  sectionHeader("7", "NET FARM PROFIT");
  doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100);
  doc.text("Net Profit = Operating Profit – Financial Costs", 18, y);
  y += 6;
  totalLine("Net Farm Profit", netFarmProfit, true);

  // ============================================================
  // 8. OTHER ADJUSTMENTS
  // ============================================================
  sectionHeader("8", "OTHER ADJUSTMENTS");
  let adjustmentTotal = 0;
  adjustmentMappings.forEach(mapping => {
    const matched = Object.entries(purchasesBk).filter(([cat]) =>
      mapping.keys.some(kw => cat.toLowerCase() === kw || cat.toLowerCase().includes(kw))
    );
    subHeader(mapping.label);
    if (matched.length > 0) {
      matched.forEach(([, data]) => {
        Object.entries(data.items).forEach(([name, amt]) => {
          lineItem(name, amt);
          adjustmentTotal += amt;
        });
      });
    } else {
      lineItem(`—`, 0);
    }
  });
  totalLine("Total Adjustments", adjustmentTotal);

  // ============================================================
  // FINAL NET PROFIT / LOSS
  // ============================================================
  const finalNetProfit = netFarmProfit - adjustmentTotal;

  // ============================================================
  // FINAL NET PROFIT / LOSS
  // ============================================================
  checkPage(20);
  doc.setFillColor(...headerColor);
  doc.rect(14, y - 2, pageWidth - 28, 12, "F");
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("FINAL NET PROFIT / LOSS", 18, y + 5);
  doc.text(formatKES(finalNetProfit), pageWidth - 18, y + 5, { align: "right" });
  y += 18;

  // Paid amounts summary
  checkPage(20);
  doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Cash Flow Summary (Paid Only)", 14, y);
  y += 6;
  lineItem("Paid Revenue", report.summary.paid_revenue, 18);
  lineItem("Paid Costs", report.summary.paid_costs, 18);
  totalLine("Net Cash Profit", report.summary.net_profit);

  // Profit Margin
  lineItem(`Profit Margin: ${report.summary.profit_margin_percent.toFixed(1)}%`, 0, 18);
  y += 4;

  // ============================================================
  // MONTHLY TRENDS
  // ============================================================
  if (report.monthly_trends.length > 0) {
    checkPage(30);
    sectionHeader("", "MONTHLY PERFORMANCE TRENDS");

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
      styles: { fontSize: 8 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ============================================================
  // CATEGORY PERFORMANCE
  // ============================================================
  if (report.category_performance.length > 0) {
    checkPage(30);
    sectionHeader("", "CATEGORY PERFORMANCE ANALYSIS");

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
      styles: { fontSize: 8 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ============================================================
  // EXTRA: Profit per category
  // ============================================================
  if (report.category_performance.length > 0) {
    checkPage(30);
    sectionHeader("", "PROFIT PER CATEGORY");

    const catProfitRows = report.category_performance.map(c => {
      // Find matching cost category
      const matchingCosts = Object.entries(purchasesBk)
        .filter(([k]) => k.toLowerCase().includes(c.category.toLowerCase()))
        .reduce((sum, [, data]) => sum + data.total, 0);
      const catProfit = c.revenue - matchingCosts;
      return [c.category, formatKES(c.revenue), formatKES(matchingCosts), formatKES(catProfit)];
    });

    autoTable(doc, {
      startY: y,
      head: [["Category", "Revenue", "Costs", "Profit"]],
      body: catProfitRows,
      theme: "grid",
      headStyles: { fillColor: headerColor },
      styles: { fontSize: 8 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ============================================================
  // FOOTER on every page
  // ============================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...headerColor); doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...headerColor);
    doc.text(FARM_NAME, 14, pageHeight - 12);
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    doc.text(`"${FARM_SLOGAN}"`, 14, pageHeight - 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(`Page ${i} of ${totalPages}  |  Ref: ${stampCode}`, pageWidth - 14, pageHeight - 12, { align: "right" });
    doc.setFillColor(...headerColor);
    doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
  }

  doc.save(await farmFileName('PNL-Statement', 'pdf'));
}

/** Export a comprehensive farm report to PDF */
export async function exportFarmReportToPDF(report: any, printedBy?: string) {
  const settings = await getFarmSettings();
  const FARM_NAME = settings?.farm_name || DEFAULT_FARM_NAME;
  const FARM_LOCATION = settings?.location || DEFAULT_LOCATION;
  const FARM_SLOGAN = (settings as any)?.slogan || DEFAULT_SLOGAN;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const headerColor: [number, number, number] = [76, 111, 60];
  let y = 14;

  // Load logo
  const logoSrc = settings?.logo_url || fallbackLogoUrl;
  let logoBase64: string | null = null;
  try { logoBase64 = await loadImageAsBase64(logoSrc); } catch { /* continue */ }

  // Header
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, 3, "F");
  if (logoBase64) doc.addImage(logoBase64, "PNG", 14, y - 2, 22, 22);
  const textX = logoBase64 ? 40 : 14;
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...headerColor);
  doc.text(FARM_NAME, textX, y + 6);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text(FARM_LOCATION, textX, y + 12);
  doc.text(`"${FARM_SLOGAN}"`, textX, y + 17);
  doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text(`Date: ${now.toLocaleDateString()}`, pageWidth - 14, y + 4, { align: "right" });
  doc.text(`Time: ${now.toLocaleTimeString()}`, pageWidth - 14, y + 9, { align: "right" });
  doc.text(`Printed By: ${printedBy || "System User"}`, pageWidth - 14, y + 14, { align: "right" });
  y += 26;
  doc.setDrawColor(...headerColor); doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Title
  const title = report?.report?.title || "Farm Report";
  doc.setFontSize(15); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 10;

  const content = report?.report?.content || {};
  const summary = content.summary || {};

  // Summary table
  if (Object.keys(summary).length > 0) {
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Summary", 14, y); y += 2;

    const summaryRows: string[][] = [];
    if (summary.period) summaryRows.push(["Period", String(summary.period)]);
    if (summary.revenue !== undefined) summaryRows.push(["Revenue", formatKES(summary.revenue)]);
    if (summary.expenses !== undefined) summaryRows.push(["Expenses", formatKES(summary.expenses)]);
    if (summary.profit !== undefined) summaryRows.push(["Profit", formatKES(summary.profit)]);
    if (summary.totalLivestock !== undefined) summaryRows.push(["Total Livestock", String(summary.totalLivestock)]);
    if (summary.totalCrops !== undefined) summaryRows.push(["Total Crops", String(summary.totalCrops)]);
    if (summary.inventoryItems !== undefined) summaryRows.push(["Inventory Items", String(summary.inventoryItems)]);
    if (summary.totalItems !== undefined) summaryRows.push(["Total Items", String(summary.totalItems)]);
    if (summary.lowStockItems !== undefined) summaryRows.push(["Low Stock Items", String(summary.lowStockItems)]);
    if (summary.totalInventoryValue !== undefined) summaryRows.push(["Inventory Value", formatKES(summary.totalInventoryValue)]);
    if (summary.totalSales !== undefined) summaryRows.push(["Total Sales", String(summary.totalSales)]);
    if (summary.totalRevenue !== undefined) summaryRows.push(["Total Revenue", formatKES(summary.totalRevenue)]);

    if (summaryRows.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: summaryRows,
        theme: "grid",
        headStyles: { fillColor: headerColor },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    }
  }

  // Sales section
  if (content.sales && Object.keys(content.sales).length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Sales Overview", 14, y); y += 2;
    const salesRows = [
      ["Total Sales", String(content.sales.totalSales || 0)],
      ["Revenue", formatKES(content.sales.revenue || 0)],
    ];
    autoTable(doc, {
      startY: y, head: [["Metric", "Value"]], body: salesRows,
      theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Purchases section
  if (content.purchases && Object.keys(content.purchases).length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Purchases Overview", 14, y); y += 2;
    const purchaseRows = [
      ["Total Purchases", String(content.purchases.totalPurchases || 0)],
      ["Total Cost", formatKES(content.purchases.totalCost || 0)],
    ];
    autoTable(doc, {
      startY: y, head: [["Metric", "Value"]], body: purchaseRows,
      theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Livestock section
  if (content.livestock && content.livestock.total > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Livestock", 14, y); y += 2;
    const livestockRows: string[][] = [["Total", String(content.livestock.total)]];
    if (content.livestock.byType) {
      Object.entries(content.livestock.byType).forEach(([type, count]) => {
        livestockRows.push([type.charAt(0).toUpperCase() + type.slice(1), String(count)]);
      });
    }
    autoTable(doc, {
      startY: y, head: [["Type", "Count"]], body: livestockRows,
      theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Crops section
  if (content.crops && content.crops.total > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Crops", 14, y); y += 2;
    const cropRows: string[][] = [["Total", String(content.crops.total)]];
    if (content.crops.byType) {
      Object.entries(content.crops.byType).forEach(([type, count]) => {
        cropRows.push([type.charAt(0).toUpperCase() + type.slice(1), String(count)]);
      });
    }
    autoTable(doc, {
      startY: y, head: [["Type", "Count"]], body: cropRows,
      theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...headerColor); doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...headerColor);
    doc.text(FARM_NAME, 14, pageHeight - 12);
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    doc.text(`"${FARM_SLOGAN}"`, 14, pageHeight - 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 12, { align: "right" });
    doc.setFillColor(...headerColor);
    doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
  }

  doc.save(await farmFileName('Farm-Report', 'pdf'));
}

/** Export inventory alerts to PDF */
export async function exportInventoryAlertsToPDF(alertData: any, printedBy?: string) {
  const settings = await getFarmSettings();
  const FARM_NAME = settings?.farm_name || DEFAULT_FARM_NAME;
  const FARM_LOCATION = settings?.location || DEFAULT_LOCATION;
  const FARM_SLOGAN = (settings as any)?.slogan || DEFAULT_SLOGAN;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const headerColor: [number, number, number] = [76, 111, 60];
  let y = 14;

  const logoSrc = settings?.logo_url || fallbackLogoUrl;
  let logoBase64: string | null = null;
  try { logoBase64 = await loadImageAsBase64(logoSrc); } catch { /* continue */ }

  // Header
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, 3, "F");
  if (logoBase64) doc.addImage(logoBase64, "PNG", 14, y - 2, 22, 22);
  const textX = logoBase64 ? 40 : 14;
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...headerColor);
  doc.text(FARM_NAME, textX, y + 6);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text(FARM_LOCATION, textX, y + 12);
  doc.text(`"${FARM_SLOGAN}"`, textX, y + 17);
  doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text(`Date: ${now.toLocaleDateString()}`, pageWidth - 14, y + 4, { align: "right" });
  doc.text(`Time: ${now.toLocaleTimeString()}`, pageWidth - 14, y + 9, { align: "right" });
  doc.text(`Printed By: ${printedBy || "System User"}`, pageWidth - 14, y + 14, { align: "right" });
  y += 26;
  doc.setDrawColor(...headerColor); doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Title
  doc.setFontSize(15); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Inventory Check Report", pageWidth / 2, y, { align: "center" });
  y += 10;

  const summary = alertData?.alert_summary || alertData;

  // Summary
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Summary", 14, y); y += 2;
  
  const totalLow = summary?.total_low_stock || 0;
  const critical = summary?.critical_items || 0;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Check Date", now.toLocaleString()],
      ["Total Low Stock Items", String(totalLow)],
      ["Critical Items", String(critical)],
      ["Status", totalLow === 0 ? "✅ All inventory levels are good" : `⚠️ ${totalLow} items need attention`],
    ],
    theme: "grid",
    headStyles: { fillColor: headerColor },
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // Low stock items detail
  const lowStockItems = summary?.low_stock_items || [];
  if (lowStockItems.length > 0) {
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Low Stock Items", 14, y); y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Item", "Current Qty", "Min Threshold", "Category", "Critical?"]],
      body: lowStockItems.map((item: any) => [
        item.item_name,
        String(item.current_quantity),
        String(item.min_threshold),
        item.category,
        item.is_critical ? "YES" : "No",
      ]),
      theme: "grid",
      headStyles: { fillColor: headerColor },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...headerColor); doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...headerColor);
    doc.text(FARM_NAME, 14, pageHeight - 12);
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    doc.text(`"${FARM_SLOGAN}"`, 14, pageHeight - 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 12, { align: "right" });
    doc.setFillColor(...headerColor);
    doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
  }

  doc.save(await farmFileName('Inventory-Check', 'pdf'));
}
