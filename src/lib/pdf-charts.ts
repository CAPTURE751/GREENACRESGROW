import jsPDF from "jspdf";

/** Native vector charts drawn directly with jsPDF (no canvas, crisp at any zoom). */
export type RGB = [number, number, number];
export const CHART_COLORS: RGB[] = [
  [76, 111, 60], [196, 138, 58], [120, 160, 90], [150, 90, 60], [90, 130, 150],
  [200, 170, 90], [110, 80, 120], [170, 110, 90], [60, 90, 70], [140, 140, 100],
];

export interface ChartBox { x: number; y: number; w: number; h: number; title?: string }

const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
  return `${Math.round(n)}`;
};
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…".replace("…", ".") : s);

function title(doc: jsPDF, b: ChartBox) {
  if (!b.title) return b.y;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(40, 40, 40);
  doc.text(b.title, b.x, b.y + 3);
  return b.y + 7;
}

function frame(doc: jsPDF, b: ChartBox) {
  doc.setDrawColor(225, 225, 215); doc.setLineWidth(0.2);
  doc.roundedRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4, 1.5, 1.5);
}

/** Grouped vertical bar chart. series = [{name, color, values[]}] aligned to labels. */
export function drawBarChart(
  doc: jsPDF, b: ChartBox, labels: string[],
  series: { name: string; color: RGB; values: number[] }[],
) {
  frame(doc, b);
  const top = title(doc, b);
  const legendH = series.length > 1 ? 5 : 0;
  const plotX = b.x + 12, plotY = top + legendH, plotW = b.w - 14, plotH = b.y + b.h - plotY - 9;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all), min = Math.min(0, ...all);
  const range = max - min || 1;
  const yOf = (v: number) => plotY + plotH - ((v - min) / range) * plotH;

  doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(120, 120, 120);
  for (let i = 0; i <= 4; i++) {
    const v = min + (range * i) / 4, y = yOf(v);
    doc.setDrawColor(235, 235, 230); doc.line(plotX, y, plotX + plotW, y);
    doc.text(compact(v), plotX - 1, y + 1, { align: "right" });
  }
  if (series.length > 1) {
    let lx = plotX;
    series.forEach((s) => {
      doc.setFillColor(...s.color); doc.rect(lx, top, 3, 3, "F");
      doc.setTextColor(70, 70, 70); doc.text(s.name, lx + 4, top + 2.6);
      lx += doc.getTextWidth(s.name) + 10;
    });
  }
  if (!labels.length) { doc.text("No data", plotX + plotW / 2, plotY + plotH / 2, { align: "center" }); return; }
  const groupW = plotW / labels.length;
  const barW = Math.min(10, (groupW * 0.75) / series.length);
  labels.forEach((lab, i) => {
    const gx = plotX + i * groupW + (groupW - barW * series.length) / 2;
    series.forEach((s, j) => {
      const v = s.values[i] || 0;
      const y0 = yOf(0), y1 = yOf(v);
      doc.setFillColor(...s.color);
      doc.rect(gx + j * barW, Math.min(y0, y1), barW * 0.9, Math.max(0.3, Math.abs(y1 - y0)), "F");
    });
    doc.setTextColor(90, 90, 90);
    doc.text(trunc(lab, Math.max(4, Math.floor(groupW / 1.4))), plotX + i * groupW + groupW / 2, plotY + plotH + 4, { align: "center" });
  });
  doc.setDrawColor(160, 160, 150); doc.line(plotX, yOf(0), plotX + plotW, yOf(0));
}

/** Horizontal bar ranking (good for long labels). */
export function drawHBarChart(doc: jsPDF, b: ChartBox, items: { label: string; value: number; color?: RGB }[]) {
  frame(doc, b);
  const top = title(doc, b);
  const rows = items.slice(0, 10);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
  if (!rows.length) { doc.setTextColor(120, 120, 120); doc.text("No data", b.x + b.w / 2, top + 10, { align: "center" }); return; }
  const labelW = 32, valueW = 18;
  const rowH = Math.min(7, (b.y + b.h - top) / rows.length);
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    doc.setTextColor(70, 70, 70);
    doc.text(trunc(r.label, 22), b.x, y + rowH * 0.65);
    const w = ((b.w - labelW - valueW) * Math.abs(r.value)) / max;
    doc.setFillColor(...(r.color || (r.value < 0 ? ([180, 70, 60] as RGB) : CHART_COLORS[0])));
    doc.rect(b.x + labelW, y + rowH * 0.2, Math.max(0.5, w), rowH * 0.6, "F");
    doc.text(compact(r.value), b.x + labelW + w + 1.5, y + rowH * 0.65);
  });
}

/** Donut chart with legend on the right. */
export function drawDonutChart(doc: jsPDF, b: ChartBox, items: { label: string; value: number }[]) {
  frame(doc, b);
  const top = title(doc, b);
  const data = items.filter((i) => i.value > 0);
  const total = data.reduce((s, i) => s + i.value, 0);
  const r = Math.min((b.y + b.h - top) / 2 - 1, b.w / 4);
  const cx = b.x + r + 2, cy = top + (b.y + b.h - top) / 2;
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
  if (!total) { doc.setTextColor(120, 120, 120); doc.text("No data", b.x + b.w / 2, cy, { align: "center" }); return; }
  let a0 = -Math.PI / 2;
  const shown = data.slice(0, 8);
  const other = data.slice(8).reduce((s, i) => s + i.value, 0);
  if (other) shown.push({ label: "Other", value: other });
  shown.forEach((it, idx) => {
    const a1 = a0 + (it.value / total) * Math.PI * 2;
    const color = CHART_COLORS[idx % CHART_COLORS.length];
    doc.setFillColor(...color);
    const steps = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 60));
    const pts: [number, number][] = [];
    for (let s = 0; s <= steps; s++) {
      const a = a0 + ((a1 - a0) * s) / steps;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    const lines: [number, number][] = [];
    let px = cx, py = cy;
    pts.forEach(([x, y]) => { lines.push([x - px, y - py]); px = x; py = y; });
    lines.push([cx - px, cy - py]);
    doc.lines(lines, cx, cy, [1, 1], "F", true);
    // legend
    const ly = top + 2 + idx * 5;
    const lx = cx + r + 6;
    doc.rect(lx, ly - 2.4, 3, 3, "F");
    doc.setTextColor(70, 70, 70);
    doc.text(`${trunc(it.label, 20)}  ${((it.value / total) * 100).toFixed(0)}%`, lx + 4.5, ly);
    a0 = a1;
  });
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, r * 0.55, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(50, 50, 50);
  doc.text(compact(total), cx, cy + 1.2, { align: "center" });
}

/** Multi-series line chart over ordered labels (e.g. months). */
export function drawLineChart(
  doc: jsPDF, b: ChartBox, labels: string[],
  series: { name: string; color: RGB; values: number[] }[],
) {
  frame(doc, b);
  const top = title(doc, b);
  const plotX = b.x + 12, plotY = top + 5, plotW = b.w - 14, plotH = b.y + b.h - plotY - 9;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all), min = Math.min(0, ...all);
  const range = max - min || 1;
  const yOf = (v: number) => plotY + plotH - ((v - min) / range) * plotH;
  const xOf = (i: number) => plotX + (labels.length <= 1 ? plotW / 2 : (plotW * i) / (labels.length - 1));
  doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(120, 120, 120);
  for (let i = 0; i <= 4; i++) {
    const v = min + (range * i) / 4, y = yOf(v);
    doc.setDrawColor(235, 235, 230); doc.line(plotX, y, plotX + plotW, y);
    doc.text(compact(v), plotX - 1, y + 1, { align: "right" });
  }
  let lx = plotX;
  series.forEach((s) => {
    doc.setFillColor(...s.color); doc.rect(lx, top, 3, 3, "F");
    doc.setTextColor(70, 70, 70); doc.text(s.name, lx + 4, top + 2.6);
    lx += doc.getTextWidth(s.name) + 10;
  });
  const every = Math.max(1, Math.ceil(labels.length / 8));
  labels.forEach((l, i) => { if (i % every === 0) { doc.setTextColor(90, 90, 90); doc.text(l, xOf(i), plotY + plotH + 4, { align: "center" }); } });
  series.forEach((s) => {
    doc.setDrawColor(...s.color); doc.setLineWidth(0.6);
    for (let i = 1; i < s.values.length; i++) doc.line(xOf(i - 1), yOf(s.values[i - 1]), xOf(i), yOf(s.values[i]));
    doc.setFillColor(...s.color);
    s.values.forEach((v, i) => doc.circle(xOf(i), yOf(v), 0.7, "F"));
  });
  doc.setLineWidth(0.2);
}

/** Row of KPI tiles. Returns new y. */
export function drawKpiRow(doc: jsPDF, y: number, tiles: { label: string; value: string; tone?: "good" | "bad" | "neutral" }[]) {
  const pw = doc.internal.pageSize.getWidth();
  const gap = 3, w = (pw - 28 - gap * (tiles.length - 1)) / tiles.length, h = 16;
  tiles.forEach((t, i) => {
    const x = 14 + i * (w + gap);
    doc.setFillColor(246, 248, 242); doc.setDrawColor(215, 225, 205);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(110, 110, 110);
    doc.text(t.label.toUpperCase(), x + 3, y + 5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    if (t.tone === "good") doc.setTextColor(46, 125, 50);
    else if (t.tone === "bad") doc.setTextColor(190, 50, 40);
    else doc.setTextColor(35, 35, 35);
    doc.text(t.value, x + 3, y + 12, { maxWidth: w - 5 });
  });
  return y + h + 6;
}
