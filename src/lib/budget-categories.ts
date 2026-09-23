// Flexible Category → Line Item budget model for the Venture Budget Simulator.

export const BUDGET_UNITS = [
  "kg", "bags", "tonnes", "litres", "pieces", "seedlings", "crates", "acres",
  "days", "trips", "hours", "units", "fixed cost",
] as const;

export interface BudgetLineItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number; // for "fixed cost" this is the total amount
  perAcre?: boolean; // multiply by farm size
  notes?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  description?: string;
  items: BudgetLineItem[];
}

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const isFixed = (i: BudgetLineItem) => i.unit === "fixed cost";

export function lineBaseTotal(i: BudgetLineItem): number {
  const base = isFixed(i) ? Number(i.unitCost) || 0 : (Number(i.quantity) || 0) * (Number(i.unitCost) || 0);
  return base;
}

export function lineTotal(i: BudgetLineItem, farmSize: number): number {
  const base = lineBaseTotal(i);
  return i.perAcre ? base * (Number(farmSize) || 0) : base;
}

export function categoryTotal(c: BudgetCategory, farmSize: number): number {
  return c.items.reduce((s, i) => s + lineTotal(i, farmSize), 0);
}

const li = (name: string, quantity: number, unit: string, unitCost: number, perAcre = true): BudgetLineItem =>
  ({ id: uid(), name, quantity, unit, unitCost, perAcre });

/** Convert legacy fixed-field inputs (older saved budgets / templates) to categories. */
export function legacyToCategories(inp: any): BudgetCategory[] {
  const n = (k: string) => Number(inp?.[k]) || 0;
  const perAcre = inp?.__perAcre === true;
  const f = (name: string, k: string) => (n(k) ? [li(name, 1, "fixed cost", n(k), perAcre)] : []);
  const cats: BudgetCategory[] = [
    { id: uid(), name: "Land Preparation", items: [...f("Ploughing", "ploughingCost"), ...f("Harrowing", "harrowingCost")] },
    { id: uid(), name: "Seeds / Planting Materials", items: n("seedQuantity") * n("seedCostPerUnit") ? [li(inp.seedType || "Seeds", n("seedQuantity"), "units", n("seedCostPerUnit"), perAcre)] : [] },
    { id: uid(), name: "Fertilizer", items: [...f("Basal Fertilizer", "basalFertilizer"), ...f("Top Dressing", "topDressingFertilizer")] },
    { id: uid(), name: "Crop Protection", items: [...f("Herbicides", "herbicides"), ...f("Pesticides", "pesticides"), ...f("Fungicides", "fungicides")] },
    { id: uid(), name: "Labour", items: [...f("Planting Labour", "plantingLabour"), ...f("Weeding Labour", "weedingLabour"), ...f("Harvesting Labour", "harvestingLabour")] },
    { id: uid(), name: "Irrigation / Utilities", items: [...f("Water", "waterCost"), ...f("Pump Fuel / Electricity", "pumpFuel")] },
    { id: uid(), name: "Other Costs", items: [...f("Transport", "transport"), ...f("Packaging", "packaging"), ...f("Storage", "storage")] },
  ];
  return cats.filter((c) => c.items.length > 0);
}

export function ensureCategories(inp: any): BudgetCategory[] {
  if (Array.isArray(inp?.categories)) return inp.categories;
  return legacyToCategories(inp);
}
