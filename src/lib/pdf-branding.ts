import jsPDF from "jspdf";
import fallbackLogoUrl from "@/assets/farm-logo.png";
import { getFarmSettings } from "./farm-settings-cache";
import { getSignatureSettings, isSignatureEnabledFor } from "./signature-store";

const HEADER_COLOR: [number, number, number] = [76, 111, 60];

let logoCache: string | null = null;
let logoCacheKey: string | null = null;

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("no ctx");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export interface BrandedDocOptions {
  title: string;
  subtitle?: string;
  filters?: string;
}

export async function getBrandingAssets() {
  const settings = await getFarmSettings();
  const logoSrc = settings?.logo_url || fallbackLogoUrl;
  if (logoCacheKey !== logoSrc) {
    try { logoCache = await loadImage(logoSrc); } catch { logoCache = null; }
    logoCacheKey = logoSrc;
  }
  return {
    farmName: settings?.farm_name || "My Farm",
    location: settings?.location || "",
    slogan: (settings as any)?.slogan || "",
    logo: logoCache,
  };
}

export async function applyBrandedHeader(doc: jsPDF, opts: BrandedDocOptions): Promise<number> {
  const { farmName, location, slogan, logo } = await getBrandingAssets();
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  let y = 14;

  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, pageWidth, 3, "F");

  if (logo) doc.addImage(logo, "PNG", 14, y - 2, 22, 22);
  const tx = logo ? 40 : 14;

  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...HEADER_COLOR);
  doc.text(farmName, tx, y + 6);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  if (location) doc.text(location, tx, y + 12);
  if (slogan) { doc.setFont("helvetica", "italic"); doc.text(`"${slogan}"`, tx, y + 17); doc.setFont("helvetica", "normal"); }

  doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text(`Date: ${now.toLocaleDateString()}`, pageWidth - 14, y + 4, { align: "right" });
  doc.text(`Time: ${now.toLocaleTimeString()}`, pageWidth - 14, y + 9, { align: "right" });

  y += 26;
  doc.setDrawColor(...HEADER_COLOR); doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text(opts.title, pageWidth / 2, y, { align: "center" });
  y += 6;
  if (opts.subtitle) {
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text(opts.subtitle, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  if (opts.filters) {
    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(110, 110, 110);
    doc.text(`Filters: ${opts.filters}`, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  return y + 4;
}

export async function applyBrandedFooter(doc: jsPDF) {
  const { farmName, slogan } = await getBrandingAssets();
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...HEADER_COLOR); doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...HEADER_COLOR);
    doc.text(farmName, 14, pageHeight - 12);
    if (slogan) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
      doc.text(`"${slogan}"`, 14, pageHeight - 8);
    }
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 12, { align: "right" });
    doc.setFillColor(...HEADER_COLOR);
    doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
  }
}

export const BRAND_HEADER_COLOR = HEADER_COLOR;
