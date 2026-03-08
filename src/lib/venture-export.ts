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

export async function exportVenturePDF(
  inputs: any,
  costs: any,
  revenue: any,
  sensitivity: any,
  recommendation: any,
  aiAdvice: string | null
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
  doc.text(`Ref: ${ref}`, pw - 14, y + 9, { align: "right" });
  y += 26;
  doc.setDrawColor(...hc); doc.setLineWidth(0.8);
  doc.line(14, y, pw - 14, y);
  y += 10;

  // Title
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Farm Venture Budget Report", pw / 2, y, { align: "center" });
  y += 7;
  const ventureName = inputs.name || inputs.type;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text(`Venture: ${ventureName} | Farm Size: ${inputs.farmSize} Acres | Season: ${inputs.seasonDuration}`, pw / 2, y, { align: "center" });
  y += 10;

  // 1. Cost Breakdown
  checkPage(40);
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...hc);
  doc.text("1. Cost Breakdown", 14, y); y += 6;

  const costRows = [
    ["Land Preparation", formatKES(costs.landPrep)],
    ["Seeds / Planting Materials", formatKES(costs.seeds)],
    ["Fertilizer", formatKES(costs.fertilizer)],
    ["Chemicals", formatKES(costs.chemicals)],
    ["Labour", formatKES(costs.labour)],
    ["Irrigation", formatKES(costs.irrigation)],
    ["Other (Transport, Packaging, Storage)", formatKES(costs.other)],
  ];

  autoTable(doc, {
    startY: y, head: [["Cost Category", "Amount (KES)"]], body: costRows,
    theme: "grid", headStyles: { fillColor: hc }, styles: { fontSize: 9 },
    foot: [["TOTAL COST", formatKES(costs.total)]],
    footStyles: { fillColor: [240, 245, 235], textColor: [30, 30, 30], fontStyle: "bold" },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // 2. Revenue & Profitability
  checkPage(40);
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...hc);
  doc.text("2. Revenue & Profitability", 14, y); y += 6;

  autoTable(doc, {
    startY: y, head: [["Metric", "Value"]], body: [
      ["Total Production", `${revenue.totalProduction} ${inputs.yieldUnit}`],
      ["Market Price per Unit", formatKES(inputs.marketPricePerUnit)],
      ["Total Revenue", formatKES(revenue.totalRevenue)],
      ["Total Cost", formatKES(costs.total)],
      ["Net Profit", formatKES(revenue.profit)],
      ["Profit per Acre", formatKES(revenue.profitPerAcre)],
      ["Break-Even Price", formatKES(revenue.breakEvenPrice)],
    ],
    theme: "grid", headStyles: { fillColor: hc }, styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 80 } },
    didParseCell: (data: any) => {
      if (data.row.index === 4 && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = revenue.profit >= 0 ? [40, 120, 40] : [180, 30, 30];
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // 3. Recommendation
  checkPage(20);
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...hc);
  doc.text("3. Venture Recommendation", 14, y); y += 6;

  const recColor: [number, number, number] = revenue.profit > 0 ? [40, 120, 40] : revenue.profit === 0 ? [180, 150, 30] : [180, 30, 30];
  doc.setFillColor(recColor[0], recColor[1], recColor[2]);
  doc.rect(14, y - 2, pw - 28, 12, "F");
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text(recommendation.title, 18, y + 5);
  y += 16;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
  const msgLines = doc.splitTextToSize(recommendation.msg, pw - 36);
  doc.text(msgLines, 18, y);
  y += msgLines.length * 5 + 6;

  // 4. Yield Sensitivity
  checkPage(40);
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...hc);
  doc.text("4. Yield Risk Simulation", 14, y); y += 6;

  autoTable(doc, {
    startY: y, head: [["Scenario", `Yield (${inputs.yieldUnit})`, "Profit (KES)"]],
    body: sensitivity.scenarios.map((s: any) => [s.scenario, String(s.yield), formatKES(s.profit)]),
    theme: "grid", headStyles: { fillColor: hc }, styles: { fontSize: 9 },
    didParseCell: (data: any) => {
      if (data.column.index === 2 && data.section === "body") {
        const val = sensitivity.scenarios[data.row.index]?.profit;
        data.cell.styles.textColor = val >= 0 ? [40, 120, 40] : [180, 30, 30];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // 5. Price Sensitivity
  checkPage(40);
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...hc);
  doc.text("5. Price Sensitivity Analysis", 14, y); y += 6;

  autoTable(doc, {
    startY: y, head: [["Scenario", "Price (KES)", "Profit (KES)"]],
    body: sensitivity.priceScenarios.map((s: any) => [s.scenario, formatKES(s.price), formatKES(s.profit)]),
    theme: "grid", headStyles: { fillColor: hc }, styles: { fontSize: 9 },
    didParseCell: (data: any) => {
      if (data.column.index === 2 && data.section === "body") {
        const val = sensitivity.priceScenarios[data.row.index]?.profit;
        data.cell.styles.textColor = val >= 0 ? [40, 120, 40] : [180, 30, 30];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // 6. AI Advice
  if (aiAdvice) {
    checkPage(30);
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...hc);
    doc.text("6. AI Crop Advisor Recommendation", 14, y); y += 6;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
    const adviceLines = doc.splitTextToSize(aiAdvice, pw - 36);
    adviceLines.forEach((line: string) => {
      checkPage(6);
      doc.text(line, 18, y);
      y += 5;
    });
    y += 6;
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

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`${FARM_NAME} Venture-Budget-${ventureName}-${date}.pdf`);
}
