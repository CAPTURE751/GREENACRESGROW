import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { farmFileName } from './report-export';
import { applyBrandedHeader, applyBrandedFooter, BRAND_HEADER_COLOR } from './pdf-branding';

export async function exportNotesPDF(notes: any[], crops: any[], opts: { cropFilter?: string } = {}) {
  const doc = new jsPDF();
  const startY = await applyBrandedHeader(doc, {
    title: opts.cropFilter ? `Notes for ${opts.cropFilter}` : 'Farm Notebook - Notes',
  });
  autoTable(doc, {
    startY,
    head: [['Date', 'Title', 'Crop', 'Content']],
    body: notes.map(n => [
      new Date(n.updated_at).toLocaleDateString(),
      n.title,
      crops.find(c => c.id === n.crop_id)?.name || '-',
      n.content || '-',
    ]),
    headStyles: { fillColor: BRAND_HEADER_COLOR },
    styles: { fontSize: 9, cellWidth: 'wrap' },
    columnStyles: { 3: { cellWidth: 80 } },
  });
  await applyBrandedFooter(doc);
  doc.save(await farmFileName('Farm-Notes', 'pdf'));
}

export async function exportChallengesPDF(challenges: any[]) {
  const doc = new jsPDF();
  const startY = await applyBrandedHeader(doc, { title: 'Season Challenges Report' });
  const high = challenges.filter(c => c.severity === 'high').length;
  const inProg = challenges.filter(c => c.status === 'in_progress').length;
  const resolved = challenges.filter(c => c.status === 'resolved').length;
  autoTable(doc, {
    startY,
    head: [['High Severity', 'In Progress', 'Resolved', 'Total']],
    body: [[high, inProg, resolved, challenges.length]],
    headStyles: { fillColor: BRAND_HEADER_COLOR },
  });
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [['Date', 'Title', 'Severity', 'Status', 'Description']],
    body: challenges.map(c => [
      new Date(c.created_at).toLocaleDateString(),
      c.title,
      c.severity,
      c.status,
      c.description || '-',
    ]),
    headStyles: { fillColor: BRAND_HEADER_COLOR },
    styles: { fontSize: 9 },
  });
  await applyBrandedFooter(doc);
  doc.save(await farmFileName('Season-Challenges', 'pdf'));
}
