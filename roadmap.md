# Roadmap

## Done
- PDF reporting engine: pdf-charts.ts + module-reports.ts (crops, livestock, finance, budgets) with branded header/footer, KPI tiles, native jsPDF charts
- Download buttons wired: Crops "Charts PDF", Livestock "Charts PDF", Finances "Finance Report", Budget Simulator "All Budgets PDF" (ModuleReportButton)
- Playwright-verified: all 4 PDFs download (~1MB each), Crops PDF visually checked (branding, charts, signature, footer), no console errors; tsgo clean
- Signature (name/role/date/time EAT) on all branded PDFs

## In progress
- Budget line items in Finance: link a Finance expense to a saved budget's category + line item so actual spending maps to the Budget vs Actual report
  - TransactionForm: optional budget → category → item picker on expenses
  - budget-vs-actual.ts: also match purchases linked to the budget (linked_record_id = budget.id)

## Open / later
- 7 older export files bypass branded helpers (no signature stamp): report-generators, analytics-export, calendar-export, venture-export, capital-injection-export, pnl-module-export, disbursement-export, notebook-export, inventory-export, EquipmentMaintenanceDialog, Expenses
- BvA name-only matching: differently named items show as Unbudgeted Expenses
