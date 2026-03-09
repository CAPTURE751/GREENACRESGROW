import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatKES } from "./currency";
import { farmFileName } from "./report-export";
import fallbackLogoUrl from "@/assets/farm-logo.png";
import { getFarmSettings } from "./farm-settings-cache";

const DEFAULT_FARM_NAME = "My Farm";
const DEFAULT_LOCATION = "";
const DEFAULT_SLOGAN = "";

interface ReportData {
  sales: any[];
  purchases: any[];
  crops: any[];
  livestock: any[];
  inventory: any[];
  equipment?: any[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

function filterByDateRange(data: ReportData): ReportData {
  const { startDate, endDate } = data;
  if (!startDate && !endDate) return data;
  const filterDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return true;
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };
  return {
    ...data,
    sales: data.sales.filter(s => filterDate(s.sale_date)),
    purchases: data.purchases.filter(p => filterDate(p.purchase_date)),
  };
}

function periodLabel(data: ReportData): string {
  if (data.startDate && data.endDate) return `Period: ${data.startDate} to ${data.endDate}`;
  if (data.startDate) return `From: ${data.startDate}`;
  if (data.endDate) return `Up to: ${data.endDate}`;
  return "Period: All Time";
}

// ========== PDF Helpers ==========

async function loadImageAsBase64(url: string): Promise<string> {
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

function generateStampCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [];
  for (let s = 0; s < 3; s++) {
    let seg = "";
    for (let i = 0; i < 4; i++) seg += chars[Math.floor(Math.random() * chars.length)];
    segments.push(seg);
  }
  return segments.join("-");
}

async function createBrandedPDF(title: string, period?: string) {
  const settings = await getFarmSettings();
  const FARM_NAME = settings?.farm_name || DEFAULT_FARM_NAME;
  const FARM_LOCATION = settings?.location || DEFAULT_LOCATION;
  const FARM_SLOGAN = (settings as any)?.slogan || DEFAULT_SLOGAN;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const stampCode = generateStampCode();
  const headerColor: [number, number, number] = [76, 111, 60];
  let y = 14;

  const logoSrc = settings?.logo_url || fallbackLogoUrl;
  let logoBase64: string | null = null;
  try { logoBase64 = await loadImageAsBase64(logoSrc); } catch { /* */ }

  // Top bar
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
  doc.text(`Ref: ${stampCode}`, pageWidth - 14, y + 14, { align: "right" });
  y += 26;
  doc.setDrawColor(...headerColor); doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 10;

  // Period subtitle
  if (period) {
    doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100);
    doc.text(period, pageWidth / 2, y, { align: "center" });
    y += 4;
  }

  // Title
  doc.setFontSize(15); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 10;

  const addFooters = () => {
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
  };

  const checkPage = (needed: number) => {
    if (y > pageHeight - needed - 25) { doc.addPage(); y = 20; }
  };

  return { doc, y, pageWidth, pageHeight, headerColor, checkPage, addFooters, setY: (newY: number) => { y = newY; }, getY: () => y };
}

// ========== 1. Income Statement (P&L) ==========
export async function generateIncomeStatement(data: ReportData) {
  data = filterByDateRange(data);
  const ctx = await createBrandedPDF("Income Statement (Profit & Loss)", periodLabel(data));
  const { doc, headerColor, checkPage, addFooters, pageWidth } = ctx;
  let y = ctx.getY();

  const totalRevenue = data.sales.reduce((s, sale) => s + (sale.total_amount || 0), 0);
  const totalExpenses = data.purchases.reduce((s, p) => s + (p.total_cost || 0), 0);
  const grossProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

  // Revenue by product
  const revenueByProduct: Record<string, number> = {};
  data.sales.forEach(s => {
    revenueByProduct[s.product_name] = (revenueByProduct[s.product_name] || 0) + (s.total_amount || 0);
  });

  // Expenses by category
  const expensesByCategory: Record<string, number> = {};
  data.purchases.forEach(p => {
    expensesByCategory[p.category] = (expensesByCategory[p.category] || 0) + (p.total_cost || 0);
  });

  // Revenue section
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 80, 30);
  doc.text("REVENUE", 14, y); y += 6;

  const revenueRows = Object.entries(revenueByProduct).map(([name, amt]) => [name, formatKES(amt)]);
  if (revenueRows.length === 0) revenueRows.push(["No sales recorded", formatKES(0)]);
  revenueRows.push(["Total Revenue", formatKES(totalRevenue)]);

  autoTable(doc, {
    startY: y, head: [["Product", "Amount (KES)"]], body: revenueRows,
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    didParseCell: (d: any) => { if (d.row.index === revenueRows.length - 1 && d.section === "body") d.cell.styles.fontStyle = "bold"; },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Expenses section
  checkPage(30);
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(150, 50, 30);
  doc.text("EXPENSES", 14, y); y += 6;

  const expenseRows = Object.entries(expensesByCategory).map(([cat, amt]) => [cat, formatKES(amt)]);
  if (expenseRows.length === 0) expenseRows.push(["No expenses recorded", formatKES(0)]);
  expenseRows.push(["Total Expenses", formatKES(totalExpenses)]);

  autoTable(doc, {
    startY: y, head: [["Category", "Amount (KES)"]], body: expenseRows,
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    didParseCell: (d: any) => { if (d.row.index === expenseRows.length - 1 && d.section === "body") d.cell.styles.fontStyle = "bold"; },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Summary
  checkPage(40);
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("NET INCOME SUMMARY", 14, y); y += 6;

  autoTable(doc, {
    startY: y, head: [["Metric", "Value"]],
    body: [
      ["Total Revenue", formatKES(totalRevenue)],
      ["Total Expenses", formatKES(totalExpenses)],
      ["Gross Profit", formatKES(grossProfit)],
      ["Profit Margin", `${profitMargin.toFixed(1)}%`],
    ],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
  });

  addFooters();
  doc.save(await farmFileName("Income-Statement", "pdf"));
}

// ========== 2. Cash Flow Statement ==========
export async function generateCashFlowStatement(data: ReportData) {
  const ctx = await createBrandedPDF("Cash Flow Statement");
  const { doc, headerColor, checkPage, addFooters } = ctx;
  let y = ctx.getY();

  // Monthly cash flows
  const months: Record<string, { inflow: number; outflow: number }> = {};
  data.sales.forEach(s => {
    const m = s.sale_date?.slice(0, 7) || "unknown";
    if (!months[m]) months[m] = { inflow: 0, outflow: 0 };
    months[m].inflow += s.total_amount || 0;
  });
  data.purchases.forEach(p => {
    const m = p.purchase_date?.slice(0, 7) || "unknown";
    if (!months[m]) months[m] = { inflow: 0, outflow: 0 };
    months[m].outflow += p.total_cost || 0;
  });

  const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;
  const cashFlowRows = sorted.map(([month, flow]) => {
    const net = flow.inflow - flow.outflow;
    cumulative += net;
    return [month, formatKES(flow.inflow), formatKES(flow.outflow), formatKES(net), formatKES(cumulative)];
  });

  if (cashFlowRows.length === 0) cashFlowRows.push(["No data", formatKES(0), formatKES(0), formatKES(0), formatKES(0)]);

  const totalInflow = data.sales.reduce((s, sale) => s + (sale.total_amount || 0), 0);
  const totalOutflow = data.purchases.reduce((s, p) => s + (p.total_cost || 0), 0);
  cashFlowRows.push(["TOTAL", formatKES(totalInflow), formatKES(totalOutflow), formatKES(totalInflow - totalOutflow), formatKES(cumulative)]);

  autoTable(doc, {
    startY: y, head: [["Month", "Inflows", "Outflows", "Net Flow", "Cumulative"]],
    body: cashFlowRows,
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 8 },
    didParseCell: (d: any) => { if (d.row.index === cashFlowRows.length - 1 && d.section === "body") d.cell.styles.fontStyle = "bold"; },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // By payment status
  checkPage(30);
  const paidSales = data.sales.filter(s => s.payment_status === 'paid').reduce((s, sale) => s + (sale.total_amount || 0), 0);
  const pendingSales = data.sales.filter(s => s.payment_status !== 'paid').reduce((s, sale) => s + (sale.total_amount || 0), 0);
  const paidPurchases = data.purchases.filter(p => p.payment_status === 'paid').reduce((s, p) => s + (p.total_cost || 0), 0);
  const pendingPurchases = data.purchases.filter(p => p.payment_status !== 'paid').reduce((s, p) => s + (p.total_cost || 0), 0);

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Payment Status Summary", 14, y); y += 6;

  autoTable(doc, {
    startY: y, head: [["Category", "Paid", "Pending"]],
    body: [
      ["Sales Revenue", formatKES(paidSales), formatKES(pendingSales)],
      ["Purchase Costs", formatKES(paidPurchases), formatKES(pendingPurchases)],
      ["Net Cash Position", formatKES(paidSales - paidPurchases), formatKES(pendingSales - pendingPurchases)],
    ],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
  });

  addFooters();
  doc.save(await farmFileName("Cash-Flow-Statement", "pdf"));
}

// ========== 3. Balance Sheet ==========
export async function generateBalanceSheet(data: ReportData) {
  const ctx = await createBrandedPDF("Balance Sheet (Farm Net Worth Report)");
  const { doc, headerColor, checkPage, addFooters } = ctx;
  let y = ctx.getY();

  const inventoryValue = data.inventory.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0), 0);
  const livestockValue = data.livestock.reduce((s, l) => s + (Number(l.purchase_price) || 0), 0);
  const equipmentValue = (data.equipment || []).reduce((s, e) => s + (Number(e.purchase_price) || 0), 0);
  const receivables = data.sales.filter(s => s.payment_status !== 'paid').reduce((s, sale) => s + (sale.total_amount || 0), 0);
  const payables = data.purchases.filter(p => p.payment_status !== 'paid').reduce((s, p) => s + (p.total_cost || 0), 0);

  const totalAssets = inventoryValue + livestockValue + equipmentValue + receivables;
  const totalLiabilities = payables;
  const netWorth = totalAssets - totalLiabilities;

  // Assets
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 80, 30);
  doc.text("ASSETS", 14, y); y += 6;

  autoTable(doc, {
    startY: y, head: [["Asset Category", "Value (KES)"]],
    body: [
      ["Inventory (Stock on Hand)", formatKES(inventoryValue)],
      ["Livestock", formatKES(livestockValue)],
      ["Equipment & Machinery", formatKES(equipmentValue)],
      ["Accounts Receivable (Pending Sales)", formatKES(receivables)],
      ["Total Assets", formatKES(totalAssets)],
    ],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    didParseCell: (d: any) => { if (d.row.index === 4 && d.section === "body") d.cell.styles.fontStyle = "bold"; },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Liabilities
  checkPage(30);
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(150, 50, 30);
  doc.text("LIABILITIES", 14, y); y += 6;

  autoTable(doc, {
    startY: y, head: [["Liability Category", "Value (KES)"]],
    body: [
      ["Accounts Payable (Pending Purchases)", formatKES(payables)],
      ["Total Liabilities", formatKES(totalLiabilities)],
    ],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    didParseCell: (d: any) => { if (d.row.index === 1 && d.section === "body") d.cell.styles.fontStyle = "bold"; },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Net Worth
  checkPage(30);
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("NET WORTH", 14, y); y += 6;

  autoTable(doc, {
    startY: y, head: [["Metric", "Value (KES)"]],
    body: [
      ["Total Assets", formatKES(totalAssets)],
      ["Total Liabilities", formatKES(totalLiabilities)],
      ["Farm Net Worth (Equity)", formatKES(netWorth)],
    ],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 10 },
    didParseCell: (d: any) => { if (d.row.index === 2 && d.section === "body") { d.cell.styles.fontStyle = "bold"; d.cell.styles.textColor = netWorth >= 0 ? [40, 120, 40] : [180, 30, 30]; } },
  });

  addFooters();
  doc.save(await farmFileName("Balance-Sheet", "pdf"));
}

// ========== 4. Production Budget Report ==========
export async function generateProductionBudget(data: ReportData) {
  const ctx = await createBrandedPDF("Production Budget Report");
  const { doc, headerColor, checkPage, addFooters } = ctx;
  let y = ctx.getY();

  // Per crop production costs & expected revenue
  const cropData = data.crops.map(crop => {
    const cropPurchases = data.purchases.filter(p => p.item_name.toLowerCase().includes(crop.name.toLowerCase()) || p.category.toLowerCase().includes(crop.type.toLowerCase()));
    const cropSales = data.sales.filter(s => s.product_name.toLowerCase().includes(crop.name.toLowerCase()));
    const costs = cropPurchases.reduce((s, p) => s + (p.total_cost || 0), 0);
    const revenue = cropSales.reduce((s, s2) => s + (s2.total_amount || 0), 0);
    return {
      name: crop.name, type: crop.type, acreage: crop.acreage || 0,
      status: crop.status || 'unknown', costs, revenue, profit: revenue - costs,
    };
  });

  // General input costs by category
  const inputsByCategory: Record<string, number> = {};
  data.purchases.forEach(p => { inputsByCategory[p.category] = (inputsByCategory[p.category] || 0) + (p.total_cost || 0); });

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Input Costs by Category", 14, y); y += 6;

  const inputRows = Object.entries(inputsByCategory).map(([cat, amt]) => [cat, formatKES(amt)]);
  const totalInputs = Object.values(inputsByCategory).reduce((a, b) => a + b, 0);
  inputRows.push(["Total Input Costs", formatKES(totalInputs)]);

  autoTable(doc, {
    startY: y, head: [["Category", "Cost (KES)"]], body: inputRows,
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    didParseCell: (d: any) => { if (d.row.index === inputRows.length - 1 && d.section === "body") d.cell.styles.fontStyle = "bold"; },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Crop-level budget
  if (cropData.length > 0) {
    checkPage(30);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Crop Production Summary", 14, y); y += 6;

    autoTable(doc, {
      startY: y, head: [["Crop", "Type", "Acreage", "Costs", "Revenue", "Profit"]],
      body: cropData.map(c => [c.name, c.type, String(c.acreage), formatKES(c.costs), formatKES(c.revenue), formatKES(c.profit)]),
      theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 8 },
    });
  }

  addFooters();
  doc.save(await farmFileName("Production-Budget", "pdf"));
}

// ========== 5. Enterprise Profitability Report ==========
export async function generateEnterpriseProfitability(data: ReportData) {
  const ctx = await createBrandedPDF("Enterprise Profitability Report");
  const { doc, headerColor, checkPage, addFooters } = ctx;
  let y = ctx.getY();

  // Revenue & cost by product type (enterprise)
  const enterprises: Record<string, { revenue: number; costs: number; salesCount: number }> = {};

  data.sales.forEach(s => {
    const key = `${s.product_type}: ${s.product_name}`;
    if (!enterprises[key]) enterprises[key] = { revenue: 0, costs: 0, salesCount: 0 };
    enterprises[key].revenue += s.total_amount || 0;
    enterprises[key].salesCount++;
  });

  data.purchases.forEach(p => {
    const key = `purchase: ${p.category}`;
    if (!enterprises[key]) enterprises[key] = { revenue: 0, costs: 0, salesCount: 0 };
    enterprises[key].costs += p.total_cost || 0;
  });

  // Crop enterprises
  const cropEnterprises = data.crops.map(crop => {
    const rev = data.sales.filter(s => s.product_name === crop.name).reduce((s, sale) => s + (sale.total_amount || 0), 0);
    const cost = data.purchases.filter(p => p.item_name.toLowerCase().includes(crop.name.toLowerCase())).reduce((s, p) => s + (p.total_cost || 0), 0);
    return { name: `Crop: ${crop.name}`, revenue: rev, costs: cost, profit: rev - cost, margin: rev > 0 ? ((rev - cost) / rev * 100) : 0 };
  });

  // Livestock enterprises
  const livestockTypes: Record<string, { count: number; value: number }> = {};
  data.livestock.forEach(l => {
    if (!livestockTypes[l.type]) livestockTypes[l.type] = { count: 0, value: 0 };
    livestockTypes[l.type].count++;
    livestockTypes[l.type].value += Number(l.purchase_price) || 0;
  });
  const livestockEnterprises = Object.entries(livestockTypes).map(([type, info]) => {
    const rev = data.sales.filter(s => s.product_type === 'livestock' && s.product_name.toLowerCase().includes(type.toLowerCase())).reduce((s, sale) => s + (sale.total_amount || 0), 0);
    return { name: `Livestock: ${type}`, revenue: rev, costs: info.value, profit: rev - info.value, margin: rev > 0 ? ((rev - info.value) / rev * 100) : 0 };
  });

  const allEnterprises = [...cropEnterprises, ...livestockEnterprises];

  autoTable(doc, {
    startY: y, head: [["Enterprise", "Revenue", "Costs", "Profit", "Margin %"]],
    body: allEnterprises.map(e => [e.name, formatKES(e.revenue), formatKES(e.costs), formatKES(e.profit), `${e.margin.toFixed(1)}%`]),
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 8 },
    didParseCell: (d: any) => {
      if (d.column.index === 3 && d.section === "body") {
        const val = allEnterprises[d.row.index]?.profit;
        if (val !== undefined) d.cell.styles.textColor = val >= 0 ? [40, 120, 40] : [180, 30, 30];
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (allEnterprises.length === 0) {
    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text("No enterprise data available. Add crops, livestock, sales and purchases.", 14, y);
  }

  addFooters();
  doc.save(await farmFileName("Enterprise-Profitability", "pdf"));
}

// ========== 6. Cost of Production Report ==========
export async function generateCostOfProduction(data: ReportData) {
  const ctx = await createBrandedPDF("Cost of Production Report");
  const { doc, headerColor, checkPage, addFooters } = ctx;
  let y = ctx.getY();

  const byCategory: Record<string, { items: Record<string, number>; total: number }> = {};
  data.purchases.forEach(p => {
    if (!byCategory[p.category]) byCategory[p.category] = { items: {}, total: 0 };
    byCategory[p.category].items[p.item_name] = (byCategory[p.category].items[p.item_name] || 0) + (p.total_cost || 0);
    byCategory[p.category].total += p.total_cost || 0;
  });

  const grandTotal = Object.values(byCategory).reduce((s, c) => s + c.total, 0);

  Object.entries(byCategory).forEach(([category, catData]) => {
    checkPage(30);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 80, 30);
    doc.text(category.toUpperCase(), 14, y); y += 6;

    const rows = Object.entries(catData.items).map(([name, amt]) => [name, formatKES(amt), `${(amt / grandTotal * 100).toFixed(1)}%`]);
    rows.push(["Subtotal", formatKES(catData.total), `${(catData.total / grandTotal * 100).toFixed(1)}%`]);

    autoTable(doc, {
      startY: y, head: [["Item", "Cost (KES)", "% of Total"]], body: rows,
      theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 8 },
      didParseCell: (d: any) => { if (d.row.index === rows.length - 1 && d.section === "body") d.cell.styles.fontStyle = "bold"; },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  });

  // Grand total
  checkPage(20);
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text(`Grand Total Cost of Production: ${formatKES(grandTotal)}`, 14, y);

  addFooters();
  doc.save(await farmFileName("Cost-of-Production", "pdf"));
}

// ========== 7. Inventory / Stock Report ==========
export async function generateInventoryReport(data: ReportData) {
  const ctx = await createBrandedPDF("Inventory / Stock Report");
  const { doc, headerColor, checkPage, addFooters } = ctx;
  let y = ctx.getY();

  const totalValue = data.inventory.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0), 0);
  const lowStock = data.inventory.filter(i => Number(i.quantity) <= Number(i.min_threshold));

  // Summary
  autoTable(doc, {
    startY: y, head: [["Metric", "Value"]],
    body: [
      ["Total Items", String(data.inventory.length)],
      ["Total Inventory Value", formatKES(totalValue)],
      ["Low Stock Items", String(lowStock.length)],
    ],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Full inventory list
  checkPage(30);
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Inventory Details", 14, y); y += 6;

  const invRows = data.inventory.map(i => [
    i.item_name, i.category, `${i.quantity} ${i.unit}`, formatKES(Number(i.unit_cost) || 0),
    formatKES((Number(i.quantity) || 0) * (Number(i.unit_cost) || 0)),
    Number(i.quantity) <= Number(i.min_threshold) ? "⚠️ LOW" : "OK",
  ]);

  autoTable(doc, {
    startY: y, head: [["Item", "Category", "Qty", "Unit Cost", "Total Value", "Status"]],
    body: invRows.length > 0 ? invRows : [["No inventory items", "", "", "", "", ""]],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 7 },
    didParseCell: (d: any) => {
      if (d.column.index === 5 && d.section === "body" && d.cell.raw === "⚠️ LOW") {
        d.cell.styles.textColor = [180, 30, 30]; d.cell.styles.fontStyle = "bold";
      }
    },
  });

  addFooters();
  doc.save(await farmFileName("Inventory-Stock-Report", "pdf"));
}

// ========== 8. Sales Revenue Report ==========
export async function generateSalesRevenueReport(data: ReportData) {
  const ctx = await createBrandedPDF("Sales Revenue Report");
  const { doc, headerColor, checkPage, addFooters } = ctx;
  let y = ctx.getY();

  const totalRevenue = data.sales.reduce((s, sale) => s + (sale.total_amount || 0), 0);
  const avgSale = data.sales.length > 0 ? totalRevenue / data.sales.length : 0;

  // Summary
  autoTable(doc, {
    startY: y, head: [["Metric", "Value"]],
    body: [
      ["Total Sales Transactions", String(data.sales.length)],
      ["Total Revenue", formatKES(totalRevenue)],
      ["Average Sale Value", formatKES(avgSale)],
    ],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // By product
  checkPage(30);
  const byProduct: Record<string, { qty: number; revenue: number; count: number }> = {};
  data.sales.forEach(s => {
    if (!byProduct[s.product_name]) byProduct[s.product_name] = { qty: 0, revenue: 0, count: 0 };
    byProduct[s.product_name].qty += Number(s.quantity) || 0;
    byProduct[s.product_name].revenue += s.total_amount || 0;
    byProduct[s.product_name].count++;
  });

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Revenue by Product", 14, y); y += 6;

  const productRows = Object.entries(byProduct).map(([name, d]) => [name, String(d.count), String(d.qty), formatKES(d.revenue), `${(d.revenue / totalRevenue * 100).toFixed(1)}%`]);

  autoTable(doc, {
    startY: y, head: [["Product", "Sales", "Qty Sold", "Revenue", "% of Total"]],
    body: productRows.length > 0 ? productRows : [["No sales data", "", "", "", ""]],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 8 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Sales detail
  checkPage(30);
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Sales Transactions", 14, y); y += 6;

  const saleRows = data.sales.slice(0, 50).map(s => [s.sale_date, s.product_name, s.buyer, `${s.quantity} ${s.unit}`, formatKES(s.total_amount || 0), s.payment_status || 'pending']);

  autoTable(doc, {
    startY: y, head: [["Date", "Product", "Buyer", "Qty", "Amount", "Payment"]],
    body: saleRows.length > 0 ? saleRows : [["No sales", "", "", "", "", ""]],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 7 },
  });

  addFooters();
  doc.save(await farmFileName("Sales-Revenue-Report", "pdf"));
}

// ========== 9. Expense Report ==========
export async function generateExpenseReport(data: ReportData) {
  const ctx = await createBrandedPDF("Expense Report");
  const { doc, headerColor, checkPage, addFooters } = ctx;
  let y = ctx.getY();

  const totalExpenses = data.purchases.reduce((s, p) => s + (p.total_cost || 0), 0);

  // Summary
  autoTable(doc, {
    startY: y, head: [["Metric", "Value"]],
    body: [
      ["Total Purchase Transactions", String(data.purchases.length)],
      ["Total Expenses", formatKES(totalExpenses)],
      ["Average Purchase", formatKES(data.purchases.length > 0 ? totalExpenses / data.purchases.length : 0)],
    ],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // By category
  checkPage(30);
  const byCategory: Record<string, number> = {};
  data.purchases.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + (p.total_cost || 0); });

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Expenses by Category", 14, y); y += 6;

  const catRows = Object.entries(byCategory).sort(([, a], [, b]) => b - a).map(([cat, amt]) => [cat, formatKES(amt), `${(amt / totalExpenses * 100).toFixed(1)}%`]);
  catRows.push(["Total", formatKES(totalExpenses), "100%"]);

  autoTable(doc, {
    startY: y, head: [["Category", "Amount", "% of Total"]], body: catRows.length > 1 ? catRows : [["No expenses", "", ""]],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    didParseCell: (d: any) => { if (d.row.index === catRows.length - 1 && d.section === "body") d.cell.styles.fontStyle = "bold"; },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // By supplier
  checkPage(30);
  const bySupplier: Record<string, number> = {};
  data.purchases.forEach(p => { bySupplier[p.supplier] = (bySupplier[p.supplier] || 0) + (p.total_cost || 0); });

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Expenses by Supplier", 14, y); y += 6;

  const supplierRows = Object.entries(bySupplier).sort(([, a], [, b]) => b - a).map(([sup, amt]) => [sup, formatKES(amt)]);

  autoTable(doc, {
    startY: y, head: [["Supplier", "Total Spent"]], body: supplierRows.length > 0 ? supplierRows : [["No data", ""]],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Transaction detail
  checkPage(30);
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Expense Transactions", 14, y); y += 6;

  const expRows = data.purchases.slice(0, 50).map(p => [p.purchase_date, p.item_name, p.category, p.supplier, formatKES(p.total_cost || 0), p.payment_status || 'pending']);

  autoTable(doc, {
    startY: y, head: [["Date", "Item", "Category", "Supplier", "Amount", "Status"]],
    body: expRows.length > 0 ? expRows : [["No expenses", "", "", "", "", ""]],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 7 },
  });

  addFooters();
  doc.save(await farmFileName("Expense-Report", "pdf"));
}

// ========== 10. Break-Even Analysis Report ==========
export async function generateBreakEvenAnalysis(data: ReportData) {
  const ctx = await createBrandedPDF("Break-Even Analysis Report");
  const { doc, headerColor, checkPage, addFooters } = ctx;
  let y = ctx.getY();

  const totalRevenue = data.sales.reduce((s, sale) => s + (sale.total_amount || 0), 0);
  const totalExpenses = data.purchases.reduce((s, p) => s + (p.total_cost || 0), 0);

  // Classify costs (simplified: direct vs indirect)
  const directCategories = ['seeds', 'feed', 'fertilizer', 'chemicals', 'fuel', 'casual_labour', 'casual labour'];
  const variableCosts = data.purchases.filter(p => directCategories.some(c => p.category.toLowerCase().includes(c))).reduce((s, p) => s + (p.total_cost || 0), 0);
  const fixedCosts = totalExpenses - variableCosts;

  const contributionMarginRatio = totalRevenue > 0 ? (totalRevenue - variableCosts) / totalRevenue : 0;
  const breakEvenRevenue = contributionMarginRatio > 0 ? fixedCosts / contributionMarginRatio : totalExpenses;
  const revenueAboveBelow = totalRevenue - breakEvenRevenue;
  const breakEvenReached = totalRevenue >= breakEvenRevenue;
  const marginOfSafety = totalRevenue > 0 ? (revenueAboveBelow / totalRevenue * 100) : 0;

  // Main analysis table
  autoTable(doc, {
    startY: y, head: [["Metric", "Value"]],
    body: [
      ["Total Revenue", formatKES(totalRevenue)],
      ["Variable Costs (Direct)", formatKES(variableCosts)],
      ["Contribution Margin", formatKES(totalRevenue - variableCosts)],
      ["Contribution Margin Ratio", contributionMarginRatio > 0 ? `${(contributionMarginRatio * 100).toFixed(1)}%` : "N/A"],
      ["Fixed Costs (Indirect)", formatKES(fixedCosts)],
      ["Total Costs", formatKES(totalExpenses)],
      ["Break-Even Revenue Required", formatKES(breakEvenRevenue)],
      [breakEvenReached ? "Revenue Above Break-Even" : "Revenue Below Break-Even (Shortfall)", formatKES(Math.abs(revenueAboveBelow))],
      ["Margin of Safety", `${marginOfSafety.toFixed(1)}%`],
      ["Status", breakEvenReached ? "✓ BREAK-EVEN ACHIEVED" : "✗ BELOW BREAK-EVEN"],
    ],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 110 } },
    didParseCell: (d: any) => {
      if (d.row.index === 9 && d.section === "body") {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.textColor = breakEvenReached ? [40, 120, 40] : [180, 30, 30];
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Explanation
  checkPage(30);
  doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100);
  doc.text("Break-Even Revenue = Fixed Costs ÷ Contribution Margin Ratio", 14, y); y += 5;
  doc.text("Contribution Margin Ratio = (Revenue − Variable Costs) ÷ Revenue", 14, y); y += 5;
  doc.text("Margin of Safety = (Actual Revenue − Break-Even Revenue) ÷ Actual Revenue × 100", 14, y); y += 10;

  // Cost breakdown
  checkPage(30);
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Cost Classification", 14, y); y += 6;

  const byCategory: Record<string, { amount: number; type: string }> = {};
  data.purchases.forEach(p => {
    const isVariable = directCategories.some(c => p.category.toLowerCase().includes(c));
    if (!byCategory[p.category]) byCategory[p.category] = { amount: 0, type: isVariable ? "Variable" : "Fixed" };
    byCategory[p.category].amount += p.total_cost || 0;
  });

  const classRows = Object.entries(byCategory).map(([cat, d]) => [cat, d.type, formatKES(d.amount)]);

  autoTable(doc, {
    startY: y, head: [["Category", "Type", "Amount"]],
    body: classRows.length > 0 ? classRows : [["No cost data", "", ""]],
    theme: "grid", headStyles: { fillColor: headerColor }, styles: { fontSize: 8 },
  });

  addFooters();
  doc.save(await farmFileName("Break-Even-Analysis", "pdf"));
}
