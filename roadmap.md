# Roadmap

## Done
- PDF reporting engine: pdf-charts.ts + module-reports.ts (crops, livestock, finance, budgets) with branded header/footer, KPI tiles, native jsPDF charts
- Download buttons wired: Crops "Charts PDF", Livestock "Charts PDF", Finances "Finance Report", Budget Simulator "All Budgets PDF" (ModuleReportButton)
- Playwright-verified: all 4 PDFs download (~1MB each), Crops PDF visually checked (branding, charts, signature, footer), no console errors; tsgo clean
- Signature (name/role/date/time EAT) on all branded PDFs

## In progress
- Budget Simulator ↔ Actual Crop Reports: preserve crop links while allowing expense entries to select a saved budget category + line item; compare each line with actual crop spending and show increase/decrease plus a budget-adherence comment
  - TransactionForm and crop expense dialog: category/activity presets plus optional budget → category → item selectors
  - Budget vs Actual report and PDF: exact line-item matching, explicit variance labels, and adherence commentary
- Crops and Finance: add confirmed crop deletion, restore archived crops to a date-appropriate status, and exclude harvested/archived crops from new transaction choices while retaining historical labels

## Open / later
- 7 older export files bypass branded helpers (no signature stamp): report-generators, analytics-export, calendar-export, venture-export, capital-injection-export, pnl-module-export, disbursement-export, notebook-export, inventory-export, EquipmentMaintenanceDialog, Expenses
- BvA name-only matching: differently named items show as Unbudgeted Expenses
