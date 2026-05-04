Most of the Inventory Module foundation (items, batches, FIFO movements, dashboard, predictive intelligence, PDF export, audit log, real-time updates) is already in place from earlier turns. This plan focuses on the **net-new requests** plus closing the remaining gaps on integration, livestock bulk entry, equipment maintenance, and unified PDF branding.

## 1. Finance "Add Transaction" form — make fields optional + auto-paid

`src/components/TransactionForm.tsx`
- Remove `required` from Buyer, Supplier, Quantity, Unit Price/Unit Cost (and Product/Item Name stays required as the only mandatory descriptor besides amount/date).
- Default `payment_status` to `paid` (instead of `pending`) for new income/expense and capital injection records.
- Keep Payment Status select visible so user can override, but initial state = `paid`.
- Fix `total_amount` calculation when quantity/price are blank → fall back to a manual "Total Amount" input the user can type when no quantity/price is given (income & expense both get an editable Total).
- Sales/purchase hooks already accept these as optional in the DB; verify no client-side validation rejects empty values.

## 2. Unified PDF branding (logo + header + footer on every report)

Create a shared helper `src/lib/pdf-branding.ts` that exposes:
- `applyHeader(doc, { title, filters?, farm })` — draws logo (if `farm.logo_url`), farm name, slogan, location, report title, generation timestamp, and an optional filters line.
- `applyFooter(doc)` — draws "Page X of Y", farm name, and date on every page.
- Loads the logo as a base64 image once via `getFarmSettings()` from `farm-settings-cache.ts`.

Refactor every existing PDF generator to call these helpers:
- `src/lib/inventory-export.ts` (`exportInventoryPDF`, `exportMovementsPDF`)
- `src/lib/notebook-export.ts`
- `src/lib/calendar-export.ts`
- `src/lib/capital-injection-export.ts`
- `src/lib/analytics-export.ts`
- `src/lib/pnl-module-export.ts`
- `src/lib/report-export.ts`
- `src/lib/report-generators.ts`
- `src/lib/venture-export.ts`
- Expenses page PDF (in `src/pages/Expenses.tsx`)
- Equipment maintenance PDF (new, see §4)

This guarantees every export has: logo top-left, farm name & slogan centered, title under header, generated date right, table body, summary block, footer with page numbers on all pages.

## 3. Inventory polish

`src/pages/Inventory.tsx`
- Add a **Filters bar** with: date range, item name search, category, transaction type, supplier/source, linked module, low-stock toggle, and a Reset button. Filters apply instantly to both inventory list and transactions tab.
- Add summary cards: Total Items, Total Quantity, Total Stock Value (KES), Low Stock count, Wastage (sum of `adjustment` movements).
- Add **Auto-Reorder Suggestions** panel: for each low-stock item compute suggested reorder qty = avg daily usage (last 30d) × lead-time buffer (default 14d) − current stock, capped at minimum threshold × 2.
- Add **Fast / Slow movers** widget (top 5 by 30-day out-movement volume).
- Add a **Transactions tab** with a full audit-log table + PDF export already wired to `exportMovementsPDF`.
- Add **Item Details drawer**: opens on row click, shows batches (with expiry), recent movements, total value, days remaining.

## 4. Livestock bulk entry & Equipment maintenance UI

Tables `livestock_batches` and `equipment_maintenance` already exist; need UI:

`src/components/LivestockBatchForm.tsx` (new) + integration in `src/pages/Livestock.tsx`
- Toggle between "Individual Animal" (existing form, with optional Tag Number for cattle/sheep/goats) and "Bulk Batch" (chicken/turkey).
- Bulk fields: animal_type, breed, batch_id, initial_quantity, arrival_date, source, notes.
- Mortality tracking control on batch row: `+ Record Mortality` increments `mortality_count` and decrements `current_quantity`.
- Feed deduction: when a feeding task references a batch, auto-create an inventory `out` movement linked to `livestock` module + batch id (extends existing `inputs_used` flow in `TaskForm`).

`src/pages/Equipment.tsx` + `src/components/EquipmentMaintenanceForm.tsx` (new)
- Per-equipment "Maintenance Log" drawer: lists `equipment_maintenance` records.
- Add log fields: log_type (service / fuel / usage), log_date, description, performed_by, cost, fuel_litres, hours_used, next_service_date, notes.
- Summary chips: total maintenance cost, last service date, next service due, total fuel litres, total hours.
- "Export PDF" button → uses unified branding helper.

## 5. Module integration glue

- **Crops → Inventory**: when a crop's `harvest_date` is filled and `yield_quantity > 0`, prompt (one-time) to add the harvest as a Stock In movement on a matching output inventory item (auto-create the item if missing). Implemented as a small toast-action in `src/components/Crops.tsx` after edit.
- **Sales → Inventory**: on sale create, if `product_name` matches an inventory item, auto-record a Stock Out movement (`linked_module='sale'`).
- **Purchases → Inventory**: existing trigger `update_inventory_on_purchase` handles this; also create a corresponding `inventory_movements` `in` row so it shows in the audit log. Done in `usePurchases.ts` after insert.
- **Tasks (inputs_used) → Inventory**: on task save, for each input, create an `out` movement (`linked_module='crop'` or `'livestock'` depending on task_type).

## 6. Smart categorization in Finance

In `TransactionForm.tsx`, when category is selected for an expense, infer linked module:
- `feed`, `medicine` → suggest `livestock` link
- `seeds`, `fertilizer`, `pesticides` → suggest `crop` link
- Show inline hint and pre-select `linkedModule` if user hasn't chosen yet.

## Technical notes

- No schema migration is required — all needed columns/tables already exist (inventory, inventory_batches, inventory_movements, livestock_batches, equipment_maintenance, purchases.linked_module, sales.linked_module).
- Logo base64 is cached in-memory after first fetch to keep PDFs fast.
- All new UI uses existing shadcn primitives (Dialog, Drawer, Tabs, Card, Table) and KES formatting via `formatKES`.
- Real-time channels keep unique names (timestamp suffix) to avoid Strict Mode duplicates.

## Files to create
- `src/lib/pdf-branding.ts`
- `src/components/LivestockBatchForm.tsx`
- `src/components/EquipmentMaintenanceForm.tsx`
- `src/hooks/useLivestockBatches.ts`
- `src/hooks/useEquipmentMaintenance.ts`

## Files to edit
- `src/components/TransactionForm.tsx` (optional fields + default paid + smart category)
- `src/pages/Inventory.tsx` (filters, reorder, movers, item drawer)
- `src/pages/Livestock.tsx` (bulk batch tab + mortality)
- `src/pages/Equipment.tsx` (maintenance log drawer + PDF)
- `src/pages/Expenses.tsx` (use shared branding helper)
- `src/components/Crops.tsx` (harvest → inventory prompt)
- `src/components/TaskForm.tsx` (auto-create out movements)
- `src/hooks/useSales.ts`, `src/hooks/usePurchases.ts` (auto-log inventory movements)
- All PDF generators in `src/lib/*-export.ts` and `report-generators.ts` (apply unified header/footer)
