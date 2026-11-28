import { describe, expect, test } from "bun:test";
import { buildBudgetVsActual, getBudgetVariance } from "../src/lib/budget-vs-actual";

const budget = {
  id: "budget-1",
  name: "Tomato Crop Plan",
  venture_type: "crop",
  inputs: {
    farmSize: 1,
    categories: [
      { id: "protection", name: "Crop Protection", items: [
        { id: "fungicides", name: "Fungicides", quantity: 1, unit: "fixed cost", unitCost: 1000 },
        { id: "pesticides", name: "Pesticides", quantity: 1, unit: "fixed cost", unitCost: 1000 },
      ] },
      { id: "other", name: "Other Costs", items: [
        { id: "transport", name: "Transport", quantity: 1, unit: "fixed cost", unitCost: 500 },
      ] },
    ],
  },
};

describe("budget vs actual crop expense matching", () => {
  test("crop-linked fungicide and pesticide costs compare to their own budget lines and retain unspent lines", () => {
    const report = buildBudgetVsActual(budget, [
      { item_name: "Fungicides", category: "Crop Protection", total_cost: 1200, linked_module: "crop", linked_record_id: "crop-1" },
      { item_name: "Pesticides", category: "Crop Protection", total_cost: 500, linked_module: "crop", linked_record_id: "crop-1" },
    ], [], { recordId: "crop-1" });

    const protection = report.categories.find((category) => category.name === "Crop Protection");
    expect(protection?.rows.find((row) => row.name === "Fungicides")?.actual).toBe(1200);
    expect(protection?.rows.find((row) => row.name === "Pesticides")?.actual).toBe(500);
    expect(report.categories.find((category) => category.name === "Other Costs")?.rows[0]?.actual).toBe(0);
    expect(report.totalBudget).toBe(2500);
    expect(report.totalActual).toBe(1700);
  });

  test("adherence score accounts for over-budget and under-budget line differences", () => {
    const report = buildBudgetVsActual(budget, [
      { item_name: "Fungicides", category: "Crop Protection", total_cost: 1200, linked_module: "crop", linked_record_id: "crop-1" },
      { item_name: "Pesticides", category: "Crop Protection", total_cost: 500, linked_module: "crop", linked_record_id: "crop-1" },
    ], [], { recordId: "crop-1" });

    expect(report.adherencePct).toBe(72);
    expect(report.adherenceComment).toContain("Budget adherence is 72.0%");
    expect(report.adherenceComment).toContain("Largest increase: Fungicides by KSh 200");
    expect(report.adherenceComment).toContain("Largest decrease: Pesticides by KSh 500");
  });

  test("variance labels distinguish an increase, a decrease, and an exact match", () => {
    expect(getBudgetVariance(-200)).toEqual({ type: "increase", amount: 200 });
    expect(getBudgetVariance(500)).toEqual({ type: "decrease", amount: 500 });
    expect(getBudgetVariance(0)).toEqual({ type: "on_budget", amount: 0 });
  });
});