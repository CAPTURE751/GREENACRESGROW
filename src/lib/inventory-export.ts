import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatKES } from './currency';

interface ExportOpts {
  farmName: string;
  title: string;
  filters?: Record<string, string>;
}

export function exportInventoryPDF(items: any[], opts: ExportOpts) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(opts.farmName, pageWidth / 2, 40, { align: 'center' });
  doc.setFontSize(12);
  doc.text(opts.title, pageWidth / 2, 60, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, pageWidth / 2, 76, { align: 'center' });

  const totalValue = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0), 0);
  const lowStock = items.filter((i) => Number(i.quantity) <= Number(i.min_threshold || 0)).length;

  autoTable(doc, {
    startY: 95,
    head: [['Item', 'Type', 'Category', 'Stock', 'Unit', 'Cost', 'Value', 'Status']],
    body: items.map((i) => {
      const value = (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0);
      const status = Number(i.quantity) <= Number(i.min_threshold || 0) ? 'LOW' : 'OK';
      return [
        i.item_name,
        i.item_type || '-',
        i.category || '-',
        Number(i.quantity).toFixed(2),
        i.unit,
        formatKES(Number(i.unit_cost) || 0),
        formatKES(value),
        status,
      ];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 139, 34] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.text(`Total Items: ${items.length}`, 40, finalY);
  doc.text(`Total Stock Value: ${formatKES(totalValue)}`, 40, finalY + 16);
  doc.text(`Low Stock Items: ${lowStock}`, 40, finalY + 32);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 60, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(`inventory-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportMovementsPDF(movements: any[], itemMap: Record<string, any>, opts: ExportOpts) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(opts.farmName, pageWidth / 2, 40, { align: 'center' });
  doc.setFontSize(12);
  doc.text(opts.title, pageWidth / 2, 60, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, pageWidth / 2, 76, { align: 'center' });

  autoTable(doc, {
    startY: 95,
    head: [['Date', 'Item', 'Type', 'Qty', 'Unit Cost', 'Total', 'Source/Dest', 'Linked']],
    body: movements.map((m) => [
      m.movement_date,
      itemMap[m.inventory_id]?.item_name || '-',
      m.movement_type.toUpperCase(),
      Number(m.quantity).toFixed(2),
      formatKES(Number(m.unit_cost) || 0),
      formatKES(Number(m.total_cost) || 0),
      m.source || m.destination || m.reason || '-',
      m.linked_module || '-',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 139, 34] },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 60, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(`inventory-movements-${new Date().toISOString().slice(0, 10)}.pdf`);
}
