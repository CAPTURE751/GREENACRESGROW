export interface CropExpenseCategory {
  name: string;
  activities: readonly string[];
}

export const CROP_EXPENSE_CATEGORIES: readonly CropExpenseCategory[] = [
  {
    name: "Land Preparation",
    activities: ["Ploughing", "Harrowing", "Making Beds", "Soil Testing / Analysis", "Liming / Soil Conditioning", "Subsoiling / Deep Ripping"],
  },
  {
    name: "Seeds / Planting Materials",
    activities: ["Certified Seeds", "Seedlings", "Nursery Management", "Peat Moss / Cocopeat", "Seedling Trays", "Rooting Hormones / Inoculants"],
  },
  {
    name: "Fertilizer & Plant Nutrition",
    activities: ["Basal Fertilizer (Planting)", "Top Dressing (30 Days)", "2nd Top Dressing", "Goat / Cow Manure", "Foliar Fertilizer / Foliars", "Micronutrients"],
  },
  {
    name: "Crop Protection",
    activities: ["Herbicides", "Pesticides", "Fungicides", "Foliar Sprays", "Stickers / Adjuvants"],
  },
  {
    name: "Labour",
    activities: ["Land Prep Labour", "Transplanting Labour", "Weeding Labour", "Spraying Labour", "Trellising / Staking Labour", "Pruning / De-suckering Labour", "Harvesting Labour", "Sorting & Grading Labour", "Farm Security / Night Watch"],
  },
  {
    name: "Irrigation / Utilities",
    activities: ["Irrigation Water", "Pump Fuel / Electricity", "Drip Line / Pipe Fittings", "Irrigation Repairs"],
  },
  {
    name: "Post-Harvest & Other Costs",
    activities: ["Transport to Market", "Packaging (Crates / Sacks / Boxes)", "Storage (Cold / Dry)", "Market Cess / County Levies", "Broker / Marketing Commission", "Produce Crates / Sacks Hire"],
  },
] as const;

export const OTHER_EXPENSE_CATEGORIES = [
  "Animal Feed", "Medicine", "Equipment", "Fuel", "Utilities", "Transport", "Other",
] as const;

export function activitiesForExpenseCategory(category: string): readonly string[] {
  return CROP_EXPENSE_CATEGORIES.find((entry) => entry.name === category)?.activities ?? [];
}