import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { applyBrandedHeader, applyBrandedFooter, applySignature } from '@/lib/pdf-branding';
import { formatKES } from '@/lib/currency';

export interface ReconciliationRow {
  cropId: string;
  cropName: string;
  recordedYield: number | null;
  salesQuantity: number;
  unit: string;
  expectedValue: number;
  transactionTotal: number;
  valueVariance: number;
  yieldVariance: number | null;
  saleCount: number;
  status: 'matched' | 'value-mismatch' | 'yield-mismatch' | 'no-sales';
  issues: string[];
}

const TOLERANCE = 0.01;

export function buildReconciliation(crops: any[], sales: any[]): ReconciliationRow[] {
  return crops.map((crop) => {
    const linked = sales.filter(
      (s) => s.linked_module === 'crop' && s.linked_record_id === crop.id
    );

    const salesQuantity = linked.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    const expectedValue = linked.reduce(
      (sum, s) => sum + (Number(s.quantity) || 0) * (Number(s.unit_price) || 0),
      0
    );
    const transactionTotal = linked.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    const valueVariance = transactionTotal - expectedValue;

    const recordedYield =
      crop.yield_quantity === null || crop.yield_quantity === undefined
        ? null
        : Number(crop.yield_quantity);
    const yieldVariance = recordedYield === null ? null : salesQuantity - recordedYield;

    const issues: string[] = [];
    if (Math.abs(valueVariance) > TOLERANCE) {
      issues.push(
        `Transaction total differs from quantity × unit price by ${formatKES(Math.abs(valueVariance))}`
      );
    }
    if (yieldVariance !== null && Math.abs(yieldVariance) > TOLERANCE) {
      issues.push(
        `Sales-derived harvest (${salesQuantity}) differs from recorded yield (${recordedYield}) by ${Math.abs(
          yieldVariance
        ).toFixed(2)}`
      );
    }
    if (linked.some((s) => !Number(s.quantity))) {
      issues.push('One or more linked sales have no quantity recorded');
    }

    let status: ReconciliationRow['status'] = 'matched';
    if (linked.length === 0) status = 'no-sales';
    else if (Math.abs(valueVariance) > TOLERANCE) status = 'value-mismatch';
    else if (yieldVariance !== null && Math.abs(yieldVariance) > TOLERANCE) status = 'yield-mismatch';

    return {
      cropId: crop.id,
      cropName: crop.name + (crop.variety ? ` (${crop.variety})` : ''),
      recordedYield,
      salesQuantity,
      unit: linked[0]?.unit || crop.yield_unit || 'kg',
      expectedValue,
      transactionTotal,
      valueVariance,
      yieldVariance,
      saleCount: linked.length,
      status,
      issues,
    };
  });
}

export function reconciliationSummary(rows: ReconciliationRow[]) {
  const withSales = rows.filter((r) => r.status !== 'no-sales');
  return {
    cropsChecked: rows.length,
    cropsWithSales: withSales.length,
    matched: withSales.filter((r) => r.status === 'matched').length,
    mismatched: withSales.filter((r) => r.status !== 'matched').length,
    totalExpected: withSales.reduce((s, r) => s + r.expectedValue, 0),
    totalRecorded: withSales.reduce((s, r) => s + r.transactionTotal, 0),
    netVariance: withSales.reduce((s, r) => s + r.valueVariance, 0),
  };
}

export async function exportReconciliationPDF(rows: ReconciliationRow[], printedBy?: string) {
  const doc = new jsPDF();
  const summary = reconciliationSummary(rows);

  let y = await applyBrandedHeader(doc, {
    title: 'Harvest & Transaction Reconciliation',
    subtitle: 'Sales-derived harvest totals compared against recorded transaction totals',
    printedBy,
  } as any);

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const lines = [
    `Crops checked: ${summary.cropsChecked}   |   With linked sales: ${summary.cropsWithSales}`,
    `Matched: ${summary.matched}   |   Mismatched: ${summary.mismatched}`,
    `Expected value: ${formatKES(summary.totalExpected)}   |   Recorded: ${formatKES(summary.totalRecorded)}`,
    `Net variance: ${formatKES(summary.netVariance)}`,
  ];
  for (const l of lines) { doc.text(l, 14, y); y += 5; }
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Crop', 'Sales', 'Harvested Qty', 'Recorded Yield', 'Expected', 'Recorded', 'Variance', 'Status']],
    body: rows.map((r) => [
      r.cropName,
      String(r.saleCount),
      `${r.salesQuantity} ${r.unit}`,
      r.recordedYield === null ? '—' : `${r.recordedYield} ${r.unit}`,
      formatKES(r.expectedValue),
      formatKES(r.transactionTotal),
      formatKES(r.valueVariance),
      r.status === 'matched' ? 'Matched' : r.status === 'no-sales' ? 'No sales' : 'Mismatch',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [76, 111, 60] },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 7 && data.cell.raw === 'Mismatch') {
        data.cell.styles.textColor = [190, 40, 40];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const flagged = rows.filter((r) => r.issues.length);
  if (flagged.length) {
    let fy = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150, 30, 30);
    doc.text('Highlighted mismatches', 14, fy);
    fy += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    for (const r of flagged) {
      for (const issue of r.issues) {
        if (fy > 265) { doc.addPage(); fy = 20; }
        const text = doc.splitTextToSize(`• ${r.cropName}: ${issue}`, 180);
        doc.text(text, 14, fy);
        fy += text.length * 5;
      }
    }
  }

  await applySignature(doc, 'reconciliation');
  await applyBrandedFooter(doc, 'reconciliation');
  doc.save(`reconciliation-${new Date().toISOString().slice(0, 10)}.pdf`);
}
