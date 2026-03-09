export interface VentureTemplate {
  name: string;
  type: string;
  seasonDuration: string;
  seedType: string;
  yieldUnit: string;
  // Per-acre estimates in KES
  ploughingCost: number;
  harrowingCost: number;
  seedQuantity: number;
  seedCostPerUnit: number;
  basalFertilizer: number;
  topDressingFertilizer: number;
  herbicides: number;
  pesticides: number;
  fungicides: number;
  plantingLabour: number;
  weedingLabour: number;
  harvestingLabour: number;
  waterCost: number;
  pumpFuel: number;
  transport: number;
  packaging: number;
  storage: number;
  expectedYieldPerAcre: number;
  marketPricePerUnit: number;
  // Cash flow month distribution (costs by month index, 0-based)
  cashFlowMonths: number;
  costDistribution: number[]; // % of total cost per month
  revenueMonth: number; // month index when revenue comes in
}

export const ventureTemplates: Record<string, VentureTemplate> = {
  maize: {
    name: "Maize (H614D)",
    type: "maize",
    seasonDuration: "4 months",
    seedType: "H614D Hybrid",
    yieldUnit: "bags (90kg)",
    ploughingCost: 4000,
    harrowingCost: 2000,
    seedQuantity: 10,
    seedCostPerUnit: 350,
    basalFertilizer: 5500,
    topDressingFertilizer: 4500,
    herbicides: 1500,
    pesticides: 1200,
    fungicides: 800,
    plantingLabour: 3000,
    weedingLabour: 4000,
    harvestingLabour: 5000,
    waterCost: 0,
    pumpFuel: 0,
    transport: 3000,
    packaging: 1500,
    storage: 2000,
    expectedYieldPerAcre: 30,
    marketPricePerUnit: 3800,
    cashFlowMonths: 4,
    costDistribution: [45, 25, 15, 15],
    revenueMonth: 3,
  },
  beans: {
    name: "Rosecoco Beans",
    type: "beans",
    seasonDuration: "3 months",
    seedType: "Rosecoco GLP-2",
    yieldUnit: "bags (90kg)",
    ploughingCost: 4000,
    harrowingCost: 2000,
    seedQuantity: 25,
    seedCostPerUnit: 200,
    basalFertilizer: 4000,
    topDressingFertilizer: 2500,
    herbicides: 1200,
    pesticides: 1500,
    fungicides: 1000,
    plantingLabour: 3000,
    weedingLabour: 3500,
    harvestingLabour: 4000,
    waterCost: 0,
    pumpFuel: 0,
    transport: 2500,
    packaging: 1200,
    storage: 1500,
    expectedYieldPerAcre: 8,
    marketPricePerUnit: 12000,
    cashFlowMonths: 3,
    costDistribution: [50, 30, 20],
    revenueMonth: 2,
  },
  onions: {
    name: "Red Creole Onions",
    type: "onions",
    seasonDuration: "4 months",
    seedType: "Red Creole",
    yieldUnit: "bags (50kg)",
    ploughingCost: 5000,
    harrowingCost: 3000,
    seedQuantity: 4,
    seedCostPerUnit: 3500,
    basalFertilizer: 6000,
    topDressingFertilizer: 4000,
    herbicides: 2000,
    pesticides: 2500,
    fungicides: 3000,
    plantingLabour: 5000,
    weedingLabour: 6000,
    harvestingLabour: 5000,
    waterCost: 4000,
    pumpFuel: 2000,
    transport: 4000,
    packaging: 3000,
    storage: 2000,
    expectedYieldPerAcre: 200,
    marketPricePerUnit: 2500,
    cashFlowMonths: 4,
    costDistribution: [35, 25, 20, 20],
    revenueMonth: 3,
  },
  vegetables: {
    name: "Sukuma Wiki (Kale)",
    type: "vegetables",
    seasonDuration: "3 months",
    seedType: "Collard Greens",
    yieldUnit: "bundles",
    ploughingCost: 3000,
    harrowingCost: 2000,
    seedQuantity: 2,
    seedCostPerUnit: 1500,
    basalFertilizer: 4000,
    topDressingFertilizer: 3000,
    herbicides: 800,
    pesticides: 1500,
    fungicides: 1000,
    plantingLabour: 3000,
    weedingLabour: 4000,
    harvestingLabour: 6000,
    waterCost: 3000,
    pumpFuel: 1500,
    transport: 3000,
    packaging: 500,
    storage: 0,
    expectedYieldPerAcre: 1500,
    marketPricePerUnit: 30,
    cashFlowMonths: 3,
    costDistribution: [40, 30, 30],
    revenueMonth: 2,
  },
  poultry: {
    name: "Broiler Chicken (500 birds)",
    type: "poultry",
    seasonDuration: "2 months",
    seedType: "Cobb 500 Day-Old Chicks",
    yieldUnit: "birds",
    ploughingCost: 0,
    harrowingCost: 0,
    seedQuantity: 500,
    seedCostPerUnit: 120,
    basalFertilizer: 0,
    topDressingFertilizer: 0,
    herbicides: 0,
    pesticides: 0,
    fungicides: 0,
    plantingLabour: 8000,
    weedingLabour: 8000,
    harvestingLabour: 5000,
    waterCost: 3000,
    pumpFuel: 2000,
    transport: 5000,
    packaging: 2000,
    storage: 0,
    expectedYieldPerAcre: 475,
    marketPricePerUnit: 750,
    cashFlowMonths: 2,
    costDistribution: [60, 40],
    revenueMonth: 1,
  },
  dairy: {
    name: "Dairy Cattle (per cow/year)",
    type: "dairy",
    seasonDuration: "12 months",
    seedType: "Friesian",
    yieldUnit: "litres",
    ploughingCost: 0,
    harrowingCost: 0,
    seedQuantity: 0,
    seedCostPerUnit: 0,
    basalFertilizer: 0,
    topDressingFertilizer: 0,
    herbicides: 0,
    pesticides: 0,
    fungicides: 0,
    plantingLabour: 15000,
    weedingLabour: 15000,
    harvestingLabour: 0,
    waterCost: 6000,
    pumpFuel: 0,
    transport: 12000,
    packaging: 0,
    storage: 0,
    expectedYieldPerAcre: 5400,
    marketPricePerUnit: 60,
    cashFlowMonths: 12,
    costDistribution: [8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9],
    revenueMonth: -1, // monthly revenue
  },
};

export function getMonthLabels(numMonths: number): string[] {
  return Array.from({ length: numMonths }, (_, i) => `Month ${i + 1}`);
}
