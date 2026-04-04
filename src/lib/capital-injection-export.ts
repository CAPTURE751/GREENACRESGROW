import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatKES } from "./currency";
import fallbackLogoUrl from "@/assets/farm-logo.png";
import { getFarmSettings } from "./farm-settings-cache";
import { farmFileName } from "./report-export";

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

export async function exportCapitalInjectionsPDF(
  injections: Array<{ id: string; amount: number; injection_date: string; source: string; description: string | null; notes: string | null }>,
  totalCapital: number,
  printedBy?: string
) {
  const settings = await getFarmSettings();
  const FARM_NAME = settings?.farm_name || "My Farm";
  const FARM_LOCATION = settings?.location || "";
  const FARM_SLOGAN = (settings as any)?.slogan || "";
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const headerColor: [number, number, number] = [76, 111, 60];
  let y = 14;

  const logoSrc = settings?.logo_url || fallbackLogoUrl;
  let logoBase64: string | null = null;
  try { logoBase64 = await loadImageAsBase64(logoSrc); } catch { /* */ }

  // Header
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, 3, "F");
  if (logoBase64) doc.addImage(logoBase64, "PNG", 14, y - 2, 22, 22);
  const textX = logoBase64 ? 40 : 14;
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...headerColor);
  doc.text(FARM_NAME, textX, y + 6);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text(FARM_LOCATION, textX, y + 12);
  if (FARM_SLOGAN) doc.text(`"${FARM_SLOGAN}"`, textX, y + 17);
  doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text(`Date: ${now.toLocaleDateString()}`, pageWidth - 14, y + 4, { align: "right" });
  doc.text(`Time: ${now.toLocaleTimeString()}`, pageWidth - 14, y + 9, { align: "right" });
  doc.text(`Printed By: ${printedBy || "System User"}`, pageWidth - 14, y + 14, { align: "right" });
  y += 26;
  doc.setDrawColor(...headerColor); doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 10;

  // Title
  doc.setFontSize(15); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("Capital Injections Report", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text("Owner's Equity / Capital Account", pageWidth / 2, y, { align: "center" });
  y += 10;

  // Summary
  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Total Capital Injected", formatKES(totalCapital)],
      ["Number of Injections", String(injections.length)],
      ["Report Date", now.toLocaleString()],
    ],
    theme: "grid",
    headStyles: { fillColor: headerColor },
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // Detail table
  if (injections.length > 0) {
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Injection Details", 14, y); y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Date", "Source", "Amount", "Description", "Notes"]],
      body: injections.map(ci => [
        new Date(ci.injection_date).toLocaleDateString(),
        ci.source,
        formatKES(ci.amount),
        ci.description || "—",
        ci.notes || "—",
      ]),
      theme: "grid",
      headStyles: { fillColor: headerColor },
      styles: { fontSize: 8 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
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
    if (FARM_SLOGAN) doc.text(`"${FARM_SLOGAN}"`, 14, pageHeight - 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 12, { align: "right" });
    doc.setFillColor(...headerColor);
    doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
  }

  doc.save(await farmFileName('Capital-Injections', 'pdf'));
}
