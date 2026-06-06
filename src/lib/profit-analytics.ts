// Pure analytics helpers — NEVER mutate any records.
// All values are computed projections used for forecasting & reporting only.

export type ProjectKind = "crop" | "livestock";

export interface ProjectRecord {
  id: string;
  kind: ProjectKind;
  name: string;
  meta?: string; // breed / type / location
  revenue: number;
  expenses: number;
}

export interface ProjectMetrics extends ProjectRecord {
  profit: number;
  margin: number; // %
  roi: number; // %
  breakEven: boolean;
}

export interface DistributionBucket {
  key: string;
  label: string;
  percent: number; // 0-100
}

export interface Scenario {
  id: string;
  name: string;
  buckets: DistributionBucket[];
}

export const DEFAULT_BUCKETS: DistributionBucket[] = [
  { key: "loan", label: "Loan Repayment", percent: 25 },
  { key: "salary", label: "Salary", percent: 25 },
  { key: "consultation", label: "Consultation", percent: 25 },
  { key: "reinvestment", label: "Farm Reinvestment", percent: 25 },
];

export function computeProjectMetrics(p: ProjectRecord): ProjectMetrics {
  const profit = p.revenue - p.expenses;
  const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
  const roi = p.expenses > 0 ? (profit / p.expenses) * 100 : 0;
  return { ...p, profit, margin, roi, breakEven: p.revenue >= p.expenses && p.revenue > 0 };
}

export function distribute(profit: number, buckets: DistributionBucket[]) {
  const total = buckets.reduce((s, b) => s + b.percent, 0) || 1;
  return buckets.map((b) => ({
    ...b,
    amount: profit > 0 ? (profit * b.percent) / total : 0,
  }));
}

export function equalSplit(parts: number): DistributionBucket[] {
  const labels = [
    "Loan Repayment", "Salary", "Consultation", "Farm Reinvestment",
    "Emergency Fund", "Equipment", "Marketing", "Insurance", "Training", "Savings",
  ];
  const pct = +(100 / parts).toFixed(4);
  return Array.from({ length: parts }, (_, i) => ({
    key: `part_${i + 1}`,
    label: labels[i] || `Part ${i + 1}`,
    percent: pct,
  }));
}

// Match sale/purchase to a crop or livestock project.
export function buildProjects(
  crops: any[],
  livestock: any[],
  sales: any[],
  purchases: any[]
): ProjectRecord[] {
  const projects: ProjectRecord[] = [];

  const sumFor = (rows: any[], field: "total_amount" | "total_cost", predicate: (r: any) => boolean) =>
    rows.filter(predicate).reduce((s, r) => s + (Number(r[field]) || 0), 0);

  for (const c of crops) {
    const revenue = sumFor(sales, "total_amount", (s) =>
      (s.linked_module === "crop" && s.linked_record_id === c.id) ||
      (s.product_name && c.name && String(s.product_name).toLowerCase() === String(c.name).toLowerCase())
    );
    const expenses = sumFor(purchases, "total_cost", (p) =>
      (p.linked_module === "crop" && p.linked_record_id === c.id) ||
      (p.linked_record_name && c.name && String(p.linked_record_name).toLowerCase() === String(c.name).toLowerCase())
    );
    projects.push({
      id: c.id,
      kind: "crop",
      name: c.name,
      meta: [c.type, c.farm_location, c.acreage ? `${c.acreage} ac` : null].filter(Boolean).join(" · "),
      revenue,
      expenses,
    });
  }

  for (const l of livestock) {
    const label = l.tag_number ? `${l.type} #${l.tag_number}` : `${l.type}${l.breed ? ` (${l.breed})` : ""}`;
    const revenue = sumFor(sales, "total_amount", (s) =>
      s.linked_module === "livestock" && s.linked_record_id === l.id
    );
    const expenses = sumFor(purchases, "total_cost", (p) =>
      p.linked_module === "livestock" && p.linked_record_id === l.id
    );
    projects.push({
      id: l.id,
      kind: "livestock",
      name: label,
      meta: [l.breed, l.location].filter(Boolean).join(" · "),
      revenue,
      expenses,
    });
  }

  return projects;
}
