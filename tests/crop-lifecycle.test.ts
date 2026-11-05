import { describe, expect, test } from "bun:test";
import { addDays, format } from "date-fns";
import { getUnarchivedCropUpdates, isActiveCropForTransaction } from "../src/lib/crop-lifecycle";

const dateAt = (offset: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return format(addDays(date, offset), "yyyy-MM-dd");
};

describe("crop lifecycle actions", () => {
  test("new Finance transactions can select a growing, non-archived crop", () => {
    expect(isActiveCropForTransaction({ status: "growing", archived: false })).toBe(true);
  });

  test("new Finance transactions cannot select an archived crop", () => {
    expect(isActiveCropForTransaction({ status: "growing", archived: true })).toBe(false);
  });

  test("new Finance transactions cannot select a harvested crop", () => {
    expect(isActiveCropForTransaction({ status: "harvested", archived: false })).toBe(false);
    expect(isActiveCropForTransaction({ status: "growing", archived: false, actual_harvest_date: dateAt(-1) })).toBe(false);
  });

  test("unarchiving clears completion and restores a date-appropriate growing status", () => {
    const updates = getUnarchivedCropUpdates({
      planting_date: dateAt(-10),
      field_growth_duration_days: 30,
      harvest_date: dateAt(20),
      actual_harvest_date: dateAt(-1),
      archived: true,
      status: "harvested",
    });
    expect(updates).toEqual({
      archived: false,
      archived_at: null,
      actual_harvest_date: null,
      status: "growing",
    });
  });

  test("unarchiving an expired schedule restores overdue tracking", () => {
    const updates = getUnarchivedCropUpdates({
      planting_date: dateAt(-40),
      field_growth_duration_days: 30,
      harvest_date: dateAt(-10),
      archived: true,
      status: "harvested",
    });
    expect(updates.status).toBe("overdue");
  });
});