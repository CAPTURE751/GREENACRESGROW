import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  applyBrandedHeader,
  applyBrandedFooter,
  applySignature,
  getBrandingAssets,
  BRAND_HEADER_COLOR,
} from "@/lib/pdf-branding";

export interface AIReportKpi { label: string; value: string; note?: string }
export interface AIReportChart {
  title: string;
  type: "bar" | "line" | "pie";
  labels: string[];
  series: { name: string; values: number[] }[];
  unit?: string;
  note?: string;
}
export interface AIReportSection {
  heading: string;
  narrative: string;
  bullets?: string[];
  table?: { columns: string[]; rows: string[][] };
  charts?: AIReportChart[];
}
export interface AIReport {
  title: string;
  period_label: string;
  executive_summary: string;
  kpis: AIReportKpi[];
  sections: AIReportSection[];
  recommendations: string[];
  risks: string[];
  charts?: AIReportChart[];
}

const MARGIN = 14;

const PALETTE: [number, number, number][] = [
  [76, 111, 60],
  [149, 176, 110],
  [212, 163, 74],
  [120, 148, 176],
  [176, 106, 92],
  [104, 133, 122],
];

const fmtNum = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n * 100) / 100}`;
};

/** Branded cover page: logo, farm name, slogan, report title and period. */
async function drawCoverPage(doc: jsPDF, report: AIReport, requestPrompt?: string) {
  const { farmName, location, slogan, logo } = await getBrandingAssets();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(...BRAND_HEADER_COLOR);
  doc.rect(0, 0, pageWidth, 62, "F");

  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth / 2 - 16, 12, 32, 32, 3, 3, "F");
    try { doc.addImage(logo, "PNG", pageWidth / 2 - 14, 14, 28, 28); } catch { /* ignore */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(farmName, pageWidth / 2, logo ? 53 : 34, { align: "center" });
  if (location) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(location, pageWidth / 2, logo ? 59 : 41, { align: "center" });
  }

  let y = 92;
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  const titleLines = doc.splitTextToSize(report.title || "Farm Intelligence Report", pageWidth - 50);
  titleLines.forEach((line: string) => { doc.text(line, pageWidth / 2, y, { align: "center" }); y += 11; });

  doc.setDrawColor(...BRAND_HEADER_COLOR);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 22, y + 2, pageWidth / 2 + 22, y + 2);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(90, 90, 90);
  if (report.period_label) { doc.text(report.period_label, pageWidth / 2, y, { align: "center" }); y += 10; }

  if (requestPrompt) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.splitTextToSize(`Request: ${requestPrompt}`, pageWidth - 60).forEach((line: string) => {
      doc.text(line, pageWidth / 2, y, { align: "center" });
      y += 5;
    });
  }

  if (slogan) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(`"${slogan}"`, pageWidth / 2, pageHeight - 42, { align: "center" });
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    `Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    pageWidth / 2,
    pageHeight - 32,
    { align: "center" },
  );

  doc.setFillColor(...BRAND_HEADER_COLOR);
  doc.rect(0, pageHeight - 6, pageWidth, 6, "F");
}

/** Draws a branded bar / line / pie chart. Returns the y position after the chart. */
function drawChart(doc: jsPDF, chart: AIReportChart, x: number, y: number, w: number, h: number): number {
  const labels = chart.labels || [];
  const series = (chart.series || []).filter((s) => Array.isArray(s.values));
  if (!labels.length || !series.length) return y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);
  doc.text(chart.title || "", x, y);
  let top = y + 4;

  doc.setDrawColor(226, 230, 222);
  doc.setFillColor(252, 253, 251);
  doc.roundedRect(x, top, w, h, 2, 2, "FD");

  const padL = 20, padR = 6, padT = 8, padB = 14;
  const plotX = x + padL;
  const plotY = top + padT;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  if (chart.type === "pie") {
    const values = series[0].values.map((v) => Number(v) || 0);
    const total = values.reduce((s, v) => s + Math.abs(v), 0) || 1;
    const cx = x + h / 2 + 6;
    const cy = top + h / 2;
    const r = Math.min(h, w) / 2 - 12;
    let angle = -Math.PI / 2;
    values.forEach((v, i) => {
      const slice = (Math.abs(v) / total) * Math.PI * 2;
      const steps = Math.max(2, Math.ceil((slice / (Math.PI * 2)) * 60));
      const pts: [number, number][] = [[cx, cy]];
      for (let s = 0; s <= steps; s++) {
        const a = angle + (slice * s) / steps;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      const c = PALETTE[i % PALETTE.length];
      doc.setFillColor(...c);
      doc.setDrawColor(...c);
      const rel = pts.slice(1).map((p, idx) => [p[0] - pts[idx][0], p[1] - pts[idx][1]] as [number, number]);
      (doc as any).lines(rel, pts[0][0], pts[0][1], [1, 1], "F", true);
      angle += slice;
    });
    // Legend
    let ly = top + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    labels.slice(0, 8).forEach((label, i) => {
      const c = PALETTE[i % PALETTE.length];
      doc.setFillColor(...c);
      doc.rect(cx + r + 10, ly - 2.4, 3, 3, "F");
      doc.setTextColor(80, 80, 80);
      const pct = Math.round((Math.abs(Number(series[0].values[i]) || 0) / total) * 100);
      doc.text(`${label} — ${pct}%`, cx + r + 15, ly);
      ly += 5;
    });
    return top + h + 8;
  }

  const allValues = series.flatMap((s) => s.values.map((v) => Number(v) || 0));
  const maxV = Math.max(0, ...allValues);
  const minV = Math.min(0, ...allValues);
  const range = maxV - minV || 1;
  const yOf = (v: number) => plotY + plotH - ((v - minV) / range) * plotH;

  // Gridlines + axis labels
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  for (let i = 0; i <= 4; i++) {
    const v = minV + (range * i) / 4;
    const gy = yOf(v);
    doc.setDrawColor(233, 236, 230);
    doc.setLineWidth(0.2);
    doc.line(plotX, gy, plotX + plotW, gy);
    doc.setTextColor(140, 140, 140);
    doc.text(fmtNum(v), plotX - 2, gy + 1.5, { align: "right" });
  }

  const groupW = plotW / labels.length;

  if (chart.type === "line") {
    series.forEach((s, si) => {
      const c = PALETTE[si % PALETTE.length];
      doc.setDrawColor(...c);
      doc.setLineWidth(0.7);
      let prev: [number, number] | null = null;
      s.values.forEach((raw, i) => {
        const px = plotX + groupW * i + groupW / 2;
        const py = yOf(Number(raw) || 0);
        if (prev) doc.line(prev[0], prev[1], px, py);
        doc.setFillColor(...c);
        doc.circle(px, py, 0.8, "F");
        prev = [px, py];
      });
    });
  } else {
    const barW = Math.max(1.5, (groupW * 0.68) / series.length);
    labels.forEach((_, i) => {
      series.forEach((s, si) => {
        const v = Number(s.values[i]) || 0;
        const px = plotX + groupW * i + (groupW - barW * series.length) / 2 + barW * si;
        const top0 = yOf(Math.max(v, 0));
        const bh = Math.abs(yOf(v) - yOf(0));
        const c = PALETTE[si % PALETTE.length];
        doc.setFillColor(...c);
        doc.rect(px, top0, barW, Math.max(0.5, bh), "F");
      });
    });
  }

  // X labels
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  const step = Math.ceil(labels.length / 12);
  labels.forEach((label, i) => {
    if (i % step !== 0) return;
    const px = plotX + groupW * i + groupW / 2;
    doc.text(String(label).slice(0, 12), px, top + h - 7, { align: "center" });
  });

  // Series legend
  if (series.length > 1) {
    let lx = plotX;
    doc.setFontSize(6.5);
    series.forEach((s, si) => {
      const c = PALETTE[si % PALETTE.length];
      doc.setFillColor(...c);
      doc.rect(lx, top + h - 4.5, 3, 3, "F");
      doc.setTextColor(90, 90, 90);
      doc.text(s.name || `Series ${si + 1}`, lx + 4.5, top + h - 2);
      lx += 6 + doc.getTextWidth(s.name || `Series ${si + 1}`);
    });
  }

  return top + h + 8;
}

export async function exportAIReportToPDF(report: AIReport, requestPrompt?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usable = pageWidth - MARGIN * 2;

  await drawCoverPage(doc, report, requestPrompt);
  doc.addPage();

  let y = await applyBrandedHeader(doc, {
    title: report.title || "Farm Intelligence Report",
    subtitle: report.period_label,
    filters: requestPrompt ? `Request: ${requestPrompt}` : undefined,
  });

  const ensure = (needed: number) => {
    if (y + needed > pageHeight - 28) {
      doc.addPage();
      y = 22;
    }
  };

  const heading = (text: string) => {
    ensure(16);
    doc.setFillColor(...BRAND_HEADER_COLOR);
    doc.rect(MARGIN, y, 3, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(text, MARGIN + 6, y + 5);
    y += 11;
  };

  const paragraph = (text: string, size = 9.5) => {
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, usable);
    for (const line of lines) {
      ensure(6);
      doc.text(line, MARGIN, y);
      y += 5;
    }
    y += 3;
  };

  const bulletList = (items: string[]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    for (const item of items || []) {
      const lines = doc.splitTextToSize(item, usable - 6);
      lines.forEach((line: string, i: number) => {
        ensure(6);
        if (i === 0) doc.text("•", MARGIN, y);
        doc.text(line, MARGIN + 5, y);
        y += 5;
      });
    }
    y += 3;
  };

  const renderCharts = (charts?: AIReportChart[]) => {
    for (const chart of charts || []) {
      const h = chart.type === "pie" ? 55 : 60;
      ensure(h + 12);
      y = drawChart(doc, chart, MARGIN, y, usable, h);
      if (chart.note) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(doc.splitTextToSize(chart.note, usable), MARGIN, y - 4);
        y += 2;
      }
    }
  };

  // Executive summary
  heading("Executive Summary");
  paragraph(report.executive_summary);

  // KPI grid
  if (report.kpis?.length) {
    heading("Key Indicators");
    const cardW = (usable - 8) / 3;
    const cardH = 20;
    report.kpis.forEach((kpi, i) => {
      const col = i % 3;
      if (col === 0) ensure(cardH + 4);
      const x = MARGIN + col * (cardW + 4);
      const top = y;
      doc.setDrawColor(220, 224, 218);
      doc.setFillColor(248, 250, 246);
      doc.roundedRect(x, top, cardW, cardH, 2, 2, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 110);
      doc.text(doc.splitTextToSize(kpi.label, cardW - 6)[0], x + 3, top + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(doc.splitTextToSize(kpi.value, cardW - 6)[0], x + 3, top + 13);
      if (kpi.note) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(doc.splitTextToSize(kpi.note, cardW - 6)[0], x + 3, top + 17.5);
      }
      if (col === 2 || i === report.kpis.length - 1) y = top + cardH + 4;
    });
    y += 2;
  }

  // Report-level charts
  if (report.charts?.length) {
    heading("Performance Charts");
    renderCharts(report.charts);
  }

  // Sections
  for (const section of report.sections || []) {
    heading(section.heading);
    paragraph(section.narrative);
    if (section.bullets?.length) bulletList(section.bullets);
    if (section.table?.columns?.length && section.table.rows?.length) {
      ensure(24);
      autoTable(doc, {
        startY: y,
        head: [section.table.columns],
        body: section.table.rows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: BRAND_HEADER_COLOR as any, textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 246] },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
    if (section.charts?.length) renderCharts(section.charts);
  }

  if (report.recommendations?.length) {
    heading("Actionable Recommendations");
    bulletList(report.recommendations);
  }
  if (report.risks?.length) {
    heading("Risks & Watch Points");
    bulletList(report.risks);
  }

  await applySignature(doc, "ai-intelligence");
  await applyBrandedFooter(doc, "AI Farm Intelligence Report");

  const slug = (report.title || "farm-intelligence-report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
