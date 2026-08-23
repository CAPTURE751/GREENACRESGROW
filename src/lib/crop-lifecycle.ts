import { differenceInCalendarDays, addDays, format } from "date-fns";

export type EstablishmentMethod = "direct_seed" | "nursery_transplant" | "bought_seedlings";

export type LifecycleStatus =
  | "planned"
  | "nursery"
  | "ready_to_transplant"
  | "transplanted"
  | "growing"
  | "maturing"
  | "ready"
  | "overdue"
  | "harvested"
  | "archived";

export interface CropLike {
  establishment_method?: string | null;
  nursery_start_date?: string | null;
  nursery_duration_days?: number | null;
  expected_transplant_date?: string | null;
  actual_transplant_date?: string | null;
  field_growth_duration_days?: number | null;
  expected_harvest_date?: string | null;
  actual_harvest_date?: string | null;
  planting_date?: string | null;
  harvest_date?: string | null;
  growth_duration_days?: number | null;
  status?: string | null;
  archived?: boolean | null;
}

export interface LifecycleInfo {
  method: EstablishmentMethod;
  methodLabel: string;
  status: LifecycleStatus;
  statusLabel: string;
  /** days since the lifecycle actually started (nursery sowing or field planting) */
  ageDays: number;
  ageLabel: string;
  ageBreakdown: string;
  startDate: Date | null;
  nurseryStart: Date | null;
  transplantDate: Date | null;   // actual if present, otherwise expected
  transplantIsActual: boolean;
  fieldStart: Date | null;       // when the crop entered the field
  expectedHarvest: Date | null;
  actualHarvest: Date | null;
  daysRemaining: number | null;
  daysToTransplant: number | null;
  progressPercent: number;
  totalDuration: number | null;
  isOverdue: boolean;
  countdownLabel: string;
}

export const HARVEST_ALERT_DAYS = [30, 14, 7, 3, 1];
export const TRANSPLANT_ALERT_DAYS = [7, 3, 1];

export const establishmentMethods: { value: EstablishmentMethod; label: string; hint: string }[] = [
  { value: "direct_seed", label: "Direct Seeding", hint: "Seed sown straight into the field" },
  { value: "nursery_transplant", label: "Nursery + Transplant", hint: "Raised in a nursery, then moved to the field" },
  { value: "bought_seedlings", label: "Bought Seedlings", hint: "Seedlings purchased and planted in the field" },
];

export const methodLabel = (m?: string | null) =>
  establishmentMethods.find((x) => x.value === m)?.label ?? "Direct Seeding";

export function parseSafeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return isNaN(d.getTime()) ? null : d;
}

export const toISODate = (d: Date | null | undefined) =>
  d ? format(d, "yyyy-MM-dd") : null;

/**
 * Smart schedule calculation. Given whatever the farmer has entered so far,
 * derive the expected transplant date and expected harvest date.
 * Actual dates always win over expected ones and cascade forward.
 */
export function calculateSchedule(crop: CropLike): {
  expectedTransplantDate: Date | null;
  expectedHarvestDate: Date | null;
  fieldStart: Date | null;
  totalDuration: number | null;
} {
  const method = (crop.establishment_method as EstablishmentMethod) || "direct_seed";
  const nurseryStart = parseSafeDate(crop.nursery_start_date);
  const nurseryDays = numOrNull(crop.nursery_duration_days);
  const actualTransplant = parseSafeDate(crop.actual_transplant_date);
  const storedExpectedTransplant = parseSafeDate(crop.expected_transplant_date);
  const planting = parseSafeDate(crop.planting_date);
  const fieldDays = numOrNull(crop.field_growth_duration_days) ?? numOrNull(crop.growth_duration_days);

  let expectedTransplantDate: Date | null = null;
  if (method === "nursery_transplant") {
    expectedTransplantDate =
      actualTransplant ||
      (nurseryStart && nurseryDays ? addDays(nurseryStart, nurseryDays) : storedExpectedTransplant);
  }

  // The day the crop starts growing in the field
  const fieldStart =
    method === "nursery_transplant"
      ? actualTransplant || expectedTransplantDate || planting
      : planting;

  const explicitHarvest =
    parseSafeDate(crop.actual_harvest_date) ||
    parseSafeDate(crop.expected_harvest_date) ||
    parseSafeDate(crop.harvest_date);

  let expectedHarvestDate: Date | null = null;
  if (fieldStart && fieldDays) expectedHarvestDate = addDays(fieldStart, fieldDays);
  else expectedHarvestDate = explicitHarvest;

  const lifecycleStart =
    method === "nursery_transplant" ? nurseryStart || fieldStart : fieldStart;

  const totalDuration =
    lifecycleStart && expectedHarvestDate
      ? Math.max(1, differenceInCalendarDays(expectedHarvestDate, lifecycleStart))
      : null;

  return { expectedTransplantDate, expectedHarvestDate, fieldStart, totalDuration };
}

function numOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function computeLifecycle(crop: CropLike): LifecycleInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const method = (crop.establishment_method as EstablishmentMethod) || "direct_seed";
  const nurseryStart = parseSafeDate(crop.nursery_start_date);
  const actualTransplant = parseSafeDate(crop.actual_transplant_date);
  const actualHarvest = parseSafeDate(crop.actual_harvest_date);
  const { expectedTransplantDate, expectedHarvestDate, fieldStart, totalDuration } =
    calculateSchedule(crop);

  const startDate = method === "nursery_transplant" ? nurseryStart || fieldStart : fieldStart;
  const ageDays = startDate ? differenceInCalendarDays(today, startDate) : 0;
  const expectedHarvest = expectedHarvestDate;
  const daysRemaining = expectedHarvest ? differenceInCalendarDays(expectedHarvest, today) : null;
  const daysToTransplant =
    !actualTransplant && expectedTransplantDate
      ? differenceInCalendarDays(expectedTransplantDate, today)
      : null;

  let status: LifecycleStatus;
  if (crop.archived) status = "archived";
  else if (crop.status === "harvested" || actualHarvest) status = "harvested";
  else if (startDate && ageDays < 0) status = "planned";
  else if (!startDate) status = "planned";
  else if (method === "nursery_transplant" && !actualTransplant) {
    status = daysToTransplant !== null && daysToTransplant <= 0 ? "ready_to_transplant" : "nursery";
  } else if (daysRemaining !== null && daysRemaining < 0) status = "overdue";
  else if (daysRemaining !== null && daysRemaining === 0) status = "ready";
  else if (
    totalDuration &&
    daysRemaining !== null &&
    daysRemaining <= Math.max(3, Math.round(totalDuration * 0.15))
  )
    status = "maturing";
  else if (actualTransplant && differenceInCalendarDays(today, actualTransplant) <= 7)
    status = "transplanted";
  else status = "growing";

  const statusLabel: Record<LifecycleStatus, string> = {
    planned: "Planned",
    nursery: "In Nursery",
    ready_to_transplant: "Ready to Transplant",
    transplanted: "Transplanted",
    growing: "Growing",
    maturing: "Maturing",
    ready: "Ready for Harvest",
    overdue: "Overdue Harvest",
    harvested: "Harvested",
    archived: "Archived",
  };

  let progressPercent = 0;
  if (totalDuration && totalDuration > 0 && startDate) {
    progressPercent = Math.min(100, Math.max(0, (ageDays / totalDuration) * 100));
  } else if (["harvested", "archived", "ready", "overdue"].includes(status)) {
    progressPercent = 100;
  }

  const ageLabel =
    ageDays < 0
      ? `Starts in ${Math.abs(ageDays)} day${Math.abs(ageDays) === 1 ? "" : "s"}`
      : `Day ${ageDays + 1}`;

  const weeks = Math.floor(Math.abs(ageDays) / 7);
  const months = Math.floor(Math.abs(ageDays) / 30);
  const parts: string[] = [];
  if (months >= 1) parts.push(`${months} mo`);
  if (weeks >= 1) parts.push(`${weeks} wk`);
  parts.push(`${Math.abs(ageDays)} d`);
  const ageBreakdown = parts.join(" · ");

  let countdownLabel = "No schedule";
  if (status === "harvested" || status === "archived") countdownLabel = "Completed";
  else if (method === "nursery_transplant" && !actualTransplant && daysToTransplant !== null)
    countdownLabel =
      daysToTransplant > 0
        ? `Transplant in ${daysToTransplant}d`
        : daysToTransplant === 0
          ? "Transplant today"
          : `Transplant ${Math.abs(daysToTransplant)}d overdue`;
  else if (daysRemaining !== null)
    countdownLabel =
      daysRemaining > 0
        ? `${daysRemaining}d to harvest`
        : daysRemaining === 0
          ? "Harvest today"
          : `${Math.abs(daysRemaining)}d overdue`;

  return {
    method,
    methodLabel: methodLabel(method),
    status,
    statusLabel: statusLabel[status],
    ageDays,
    ageLabel,
    ageBreakdown,
    startDate,
    nurseryStart,
    transplantDate: actualTransplant || expectedTransplantDate,
    transplantIsActual: !!actualTransplant,
    fieldStart,
    expectedHarvest,
    actualHarvest,
    daysRemaining,
    daysToTransplant,
    progressPercent,
    totalDuration,
    isOverdue: daysRemaining !== null && daysRemaining < 0 && status !== "harvested" && status !== "archived",
    countdownLabel,
  };
}

export function harvestAlertFor(daysRemaining: number | null): string | null {
  if (daysRemaining === null) return null;
  if (daysRemaining === 0) return "Harvest day! Crop is ready for harvest.";
  if (daysRemaining < 0) return `Harvest overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"}`;
  if (HARVEST_ALERT_DAYS.includes(daysRemaining)) {
    return `Harvest in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
  }
  return null;
}

export function transplantAlertFor(daysToTransplant: number | null): string | null {
  if (daysToTransplant === null) return null;
  if (daysToTransplant === 0) return "Transplant today — seedlings are ready.";
  if (daysToTransplant < 0)
    return `Transplant overdue by ${Math.abs(daysToTransplant)} day${Math.abs(daysToTransplant) === 1 ? "" : "s"}`;
  if (TRANSPLANT_ALERT_DAYS.includes(daysToTransplant))
    return `Transplant in ${daysToTransplant} day${daysToTransplant === 1 ? "" : "s"}`;
  return null;
}

/** Visual timeline stages, adapted to the establishment method. */
export function stagesFor(method: EstablishmentMethod) {
  if (method === "nursery_transplant") {
    return [
      { key: "nursery", label: "Nursery" },
      { key: "transplant", label: "Transplant" },
      { key: "growing", label: "Growing" },
      { key: "maturing", label: "Maturing" },
      { key: "harvest", label: "Harvest" },
    ];
  }
  return [
    { key: "planted", label: "Planted" },
    { key: "growing", label: "Growing" },
    { key: "maturing", label: "Maturing" },
    { key: "ready", label: "Ready" },
    { key: "harvest", label: "Harvest" },
  ];
}

export function currentStageIndex(info: LifecycleInfo): number {
  const last = stagesFor(info.method).length - 1;
  if (info.status === "harvested" || info.status === "archived") return last;
  if (info.status === "planned") return 0;

  if (info.method === "nursery_transplant") {
    switch (info.status) {
      case "nursery": return 0;
      case "ready_to_transplant": return 1;
      case "transplanted": return 2;
      case "growing": return 2;
      case "maturing": return 3;
      case "ready":
      case "overdue": return 4;
      default: return 2;
    }
  }
  switch (info.status) {
    case "growing":
    case "transplanted": return 1;
    case "maturing": return 2;
    case "ready":
    case "overdue": return 3;
    default: return 1;
  }
}

// Backwards compatibility for older imports
export const lifecycleStages = stagesFor("direct_seed");
