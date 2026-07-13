import { differenceInCalendarDays, addDays } from "date-fns";

export type LifecycleStatus = "upcoming" | "growing" | "ready" | "harvested" | "archived";

export interface LifecycleInfo {
  status: LifecycleStatus;
  statusLabel: string;
  ageDays: number;            // days since planting (can be negative if upcoming)
  ageLabel: string;           // "Day 25" or "In 5 days"
  ageBreakdown: string;       // "3 weeks · 25 days" etc.
  expectedHarvest: Date | null;
  daysRemaining: number | null;
  progressPercent: number;    // 0-100
  totalDuration: number | null;
}

const HARVEST_ALERT_DAYS = [30, 14, 7, 3, 1];

export function parseSafeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return isNaN(d.getTime()) ? null : d;
}

export function computeLifecycle(crop: {
  planting_date?: string | null;
  harvest_date?: string | null;
  growth_duration_days?: number | null;
  status?: string | null;
  archived?: boolean | null;
}): LifecycleInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const planting = parseSafeDate(crop.planting_date);
  const explicitHarvest = parseSafeDate(crop.harvest_date);
  const duration = crop.growth_duration_days && crop.growth_duration_days > 0
    ? crop.growth_duration_days
    : (planting && explicitHarvest ? differenceInCalendarDays(explicitHarvest, planting) : null);

  const expectedHarvest = explicitHarvest
    || (planting && duration ? addDays(planting, duration) : null);

  const ageDays = planting ? differenceInCalendarDays(today, planting) : 0;
  const daysRemaining = expectedHarvest ? differenceInCalendarDays(expectedHarvest, today) : null;

  let status: LifecycleStatus = "growing";
  if (crop.archived) status = "archived";
  else if (crop.status === "harvested") status = "harvested";
  else if (planting && ageDays < 0) status = "upcoming";
  else if (expectedHarvest && daysRemaining !== null && daysRemaining <= 0) status = "ready";
  else status = "growing";

  const statusLabel = {
    upcoming: "Upcoming",
    growing: "Growing",
    ready: "Ready for Harvest",
    harvested: "Harvested",
    archived: "Archived",
  }[status];

  let progressPercent = 0;
  if (duration && duration > 0 && planting) {
    progressPercent = Math.min(100, Math.max(0, (ageDays / duration) * 100));
  } else if (status === "harvested" || status === "archived" || status === "ready") {
    progressPercent = 100;
  }

  const ageLabel = ageDays < 0
    ? `Plants in ${Math.abs(ageDays)} day${Math.abs(ageDays) === 1 ? "" : "s"}`
    : `Day ${ageDays + 1}`;

  const weeks = Math.floor(Math.abs(ageDays) / 7);
  const months = Math.floor(Math.abs(ageDays) / 30);
  const parts: string[] = [];
  if (months >= 1) parts.push(`${months} mo`);
  if (weeks >= 1) parts.push(`${weeks} wk`);
  parts.push(`${Math.abs(ageDays)} d`);
  const ageBreakdown = parts.join(" · ");

  return {
    status,
    statusLabel,
    ageDays,
    ageLabel,
    ageBreakdown,
    expectedHarvest,
    daysRemaining,
    progressPercent,
    totalDuration: duration,
  };
}

export function harvestAlertFor(daysRemaining: number | null): string | null {
  if (daysRemaining === null) return null;
  if (daysRemaining === 0) return "Harvest day! Crop is ready for harvest.";
  if (daysRemaining < 0) return null;
  if (HARVEST_ALERT_DAYS.includes(daysRemaining)) {
    return `Harvest in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
  }
  return null;
}

export const lifecycleStages = [
  { key: "planted", label: "Planted", threshold: 0 },
  { key: "growing", label: "Growing", threshold: 25 },
  { key: "maturing", label: "Maturing", threshold: 65 },
  { key: "ready", label: "Ready", threshold: 95 },
  { key: "harvested", label: "Harvested", threshold: 100 },
];

export function currentStageIndex(info: LifecycleInfo): number {
  if (info.status === "harvested" || info.status === "archived") return lifecycleStages.length - 1;
  if (info.status === "upcoming") return 0;
  let idx = 0;
  for (let i = 0; i < lifecycleStages.length; i++) {
    if (info.progressPercent >= lifecycleStages[i].threshold) idx = i;
  }
  return idx;
}
