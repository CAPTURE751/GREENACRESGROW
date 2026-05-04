import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatKES } from './currency';
import { applyBrandedHeader, applyBrandedFooter, BRAND_HEADER_COLOR } from './pdf-branding';
import { farmFileName } from './report-export';

interface ExportOpts {
  farmName?: string;
  title: string;
  filters?: string;
}

export async function exportInventoryPDF(items: any[], opts: ExportOpts) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  // Use mm-friendly helper but we're in pt — convert by re-creating in mm
}

// Re-implemented in mm to align with shared branding helpers
export async function exportInventoryReport(items: any[], opts: ExportOpts) {
  const doc = new jsPDF();
  const startY = await applyBrandedHeader(doc, { title: opts.title || 'Inventory Report', filters: opts.filters });

  const totalValue = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0), 0);
  const lowStock = items.filter((i) => Number(i.quantity) <= Number(i.min_threshold || 0)).length;

  autoTable(doc, {
    startY,
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
    headStyles: { fillColor: BRAND_HEADER_COLOR },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  autoTable(doc, {
    startY: finalY,
    head: [['Summary', 'Value']],
    body: [
      ['Total Items', String(items.length)],
      ['Total Stock Value', formatKES(totalValue)],
      ['Low Stock Items', String(lowStock)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: BRAND_HEADER_COLOR },
  });

  await applyBrandedFooter(doc);
  doc.save(await farmFileName('Inventory', 'pdf'));
}

export async function exportMovementsPDF(movements: any[], itemMap: Record<string, any>, opts: ExportOpts) {
  const doc = new jsPDF();
  const startY = await applyBrandedHeader(doc, { title: opts.title || 'Inventory Transactions', filters: opts.filters });

  autoTable(doc, {
    startY,
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
    headStyles: { fillColor: BRAND_HEADER_COLOR },
  });

  await applyBrandedFooter(doc);
  doc.save(await farmFileName('Inventory-Movements', 'pdf'));
}

// Backward-compatible alias used by Inventory page
export { exportInventoryReport as exportInventoryPDFBranded };
