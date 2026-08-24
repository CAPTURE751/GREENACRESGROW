import { computeLifecycle, type CropLike, type LifecycleInfo } from "@/lib/crop-lifecycle";

export type MilestoneKind = "nursery_sow" | "transplant" | "harvest";

export interface CropMilestone {
  cropId: string;
  cropName: string;
  variety?: string | null;
  location?: string | null;
  kind: MilestoneKind;
  label: string;
  date: Date;
  daysAway: number;
  overdue: boolean;
  info: LifecycleInfo;
}

const kindLabel: Record<MilestoneKind, string> = {
  nursery_sow: "Nursery sowing",
  transplant: "Transplant",
  harvest: "Harvest",
};

/**
 * Build a flat, date-sorted list of upcoming (and overdue) crop milestones
 * for dashboard panels and calendar overlays.
 */
export function upcomingMilestones(
  crops: any[],
  { windowDays = 30, includeOverdue = true }: { windowDays?: number; includeOverdue?: boolean } = {}
): CropMilestone[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: CropMilestone[] = [];

  for (const crop of crops || []) {
    if (crop?.archived) continue;
    const info = computeLifecycle(crop as CropLike);
    if (info.status === "harvested" || info.status === "archived") continue;

    const push = (kind: MilestoneKind, date: Date | null) => {
      if (!date) return;
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const daysAway = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      if (daysAway > windowDays) return;
      if (daysAway < 0 && !includeOverdue) return;
      out.push({
        cropId: crop.id,
        cropName: crop.name,
        variety: crop.variety,
        location: crop.farm_location,
        kind,
        label: kindLabel[kind],
        date: d,
        daysAway,
        overdue: daysAway < 0,
        info,
      });
    };

    if (info.method === "nursery_transplant") {
      if (info.nurseryStart) push("nursery_sow", info.nurseryStart);
      if (!info.transplantIsActual) push("transplant", info.transplantDate);
    }
    push("harvest", info.expectedHarvest);
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Milestones grouped by yyyy-MM-dd for calendar day lookups. */
export function milestonesByDate(milestones: CropMilestone[]) {
  const map = new Map<string, CropMilestone[]>();
  for (const m of milestones) {
    const key = `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, "0")}-${String(m.date.getDate()).padStart(2, "0")}`;
    map.set(key, [...(map.get(key) || []), m]);
  }
  return map;
}

export const milestoneDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
