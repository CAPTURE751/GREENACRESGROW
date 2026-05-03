import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { farmFileName } from './report-export';
import { getFarmSettings } from './farm-settings-cache';

async function header(doc: jsPDF, title: string) {
  const settings = await getFarmSettings();
  const farmName = settings?.farm_name || 'My Farm';
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text(farmName, 14, 16);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(settings?.location || '', 14, 22);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 32);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);
  return 44;
}

export async function exportNotesPDF(notes: any[], crops: any[], opts: { cropFilter?: string } = {}) {
  const doc = new jsPDF();
  const startY = await header(doc, opts.cropFilter ? `Notes for ${opts.cropFilter}` : 'Farm Notebook - Notes');
  autoTable(doc, {
    startY,
    head: [['Date', 'Title', 'Crop', 'Content']],
    body: notes.map(n => [
      new Date(n.updated_at).toLocaleDateString(),
      n.title,
      crops.find(c => c.id === n.crop_id)?.name || '-',
      n.content || '-',
    ]),
    headStyles: { fillColor: [76, 119, 62] },
    styles: { fontSize: 9, cellWidth: 'wrap' },
    columnStyles: { 3: { cellWidth: 80 } },
  });
  doc.save(await farmFileName('Farm-Notes', 'pdf'));
}

export async function exportChallengesPDF(challenges: any[]) {
  const doc = new jsPDF();
  const startY = await header(doc, 'Season Challenges Report');
  const high = challenges.filter(c => c.severity === 'high').length;
  const inProg = challenges.filter(c => c.status === 'in_progress').length;
  const resolved = challenges.filter(c => c.status === 'resolved').length;
  autoTable(doc, {
    startY,
    head: [['High Severity', 'In Progress', 'Resolved', 'Total']],
    body: [[high, inProg, resolved, challenges.length]],
    headStyles: { fillColor: [76, 119, 62] },
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
    headStyles: { fillColor: [76, 119, 62] },
    styles: { fontSize: 9 },
  });
  doc.save(await farmFileName('Season-Challenges', 'pdf'));
}
