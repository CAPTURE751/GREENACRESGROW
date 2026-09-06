import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { applyBrandedHeader, applyBrandedFooter, applySignature, BRAND_HEADER_COLOR } from "@/lib/pdf-branding";

export interface AIReportKpi { label: string; value: string; note?: string }
export interface AIReportSection {
  heading: string;
  narrative: string;
  bullets?: string[];
  table?: { columns: string[]; rows: string[][] };
}
export interface AIReport {
  title: string;
  period_label: string;
  executive_summary: string;
  kpis: AIReportKpi[];
  sections: AIReportSection[];
  recommendations: string[];
  risks: string[];
}

const MARGIN = 14;

export async function exportAIReportToPDF(report: AIReport, requestPrompt?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usable = pageWidth - MARGIN * 2;

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
