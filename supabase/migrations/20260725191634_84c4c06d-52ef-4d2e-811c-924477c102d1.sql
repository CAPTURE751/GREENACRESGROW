-- Ensure sale totals are always calculated (fixes 0.00 / missing totals and eliminates "Error recording sale")
DROP TRIGGER IF EXISTS trg_calculate_sale_total ON public.sales;
CREATE TRIGGER trg_calculate_sale_total
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.calculate_sale_total();

DROP TRIGGER IF EXISTS trg_calculate_purchase_total ON public.purchases;
CREATE TRIGGER trg_calculate_purchase_total
  BEFORE INSERT OR UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.calculate_purchase_total();

-- Remove inventory-side-effect trigger function that raised "Insufficient inventory" errors when
-- recording crop sales. Total Harvested is now derived from cumulative sales, not inventory.
DROP FUNCTION IF EXISTS public.update_inventory_on_sale() CASCADE;

-- Auto-archive a crop when a sale is linked to it (crop moves to Archived section, retains history)
CREATE OR REPLACE FUNCTION public.archive_crop_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.linked_module = 'crop' AND NEW.linked_record_id IS NOT NULL THEN
    UPDATE public.crops
      SET archived = true,
          archived_at = COALESCE(archived_at, now()),
          status = 'harvested',
          updated_at = now()
    WHERE id = NEW.linked_record_id
      AND (archived IS DISTINCT FROM true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_crop_on_sale ON public.sales;
CREATE TRIGGER trg_archive_crop_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.archive_crop_on_sale();