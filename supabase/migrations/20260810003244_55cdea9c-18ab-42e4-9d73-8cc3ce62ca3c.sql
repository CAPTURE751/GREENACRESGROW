-- 1. Remove duplicate triggers (double-execution bugs)
DROP TRIGGER IF EXISTS update_inventory_on_purchase_trigger ON public.purchases;
DROP TRIGGER IF EXISTS calculate_purchase_total_trigger ON public.purchases;
DROP TRIGGER IF EXISTS calculate_sale_total_trigger ON public.sales;

-- 2. Backfill inventory.farm_id from the purchases that generated the rows
UPDATE public.inventory i
SET farm_id = p.farm_id
FROM (
  SELECT DISTINCT ON (item_name) item_name, farm_id
  FROM public.purchases
  WHERE farm_id IS NOT NULL AND item_name IS NOT NULL
  ORDER BY item_name, purchase_date DESC, created_at DESC
) p
WHERE i.farm_id IS NULL AND lower(i.item_name) = lower(p.item_name);

-- Remaining orphans: attach to the farm owned by their creator, if unambiguous
UPDATE public.inventory i
SET farm_id = f.id
FROM public.farms f
WHERE i.farm_id IS NULL
  AND f.owner_id = i.created_by
  AND (SELECT count(*) FROM public.farms f2 WHERE f2.owner_id = i.created_by) = 1;

-- 3. Per-farm uniqueness instead of global uniqueness
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_item_name_unique;
DROP INDEX IF EXISTS public.inventory_item_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS inventory_farm_item_unique
  ON public.inventory (COALESCE(farm_id, '00000000-0000-0000-0000-000000000000'::uuid), item_name);

-- 4. Purchase -> inventory sync now farm-aware
CREATE OR REPLACE FUNCTION public.update_inventory_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.item_name IS NULL OR COALESCE(NEW.quantity, 0) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.inventory (item_name, category, quantity, unit, unit_cost, supplier, created_by, farm_id)
  VALUES (
    NEW.item_name,
    COALESCE(NEW.category, 'general'),
    NEW.quantity,
    COALESCE(NEW.unit, 'unit'),
    NEW.unit_cost,
    NEW.supplier,
    NEW.created_by,
    NEW.farm_id
  )
  ON CONFLICT (COALESCE(farm_id, '00000000-0000-0000-0000-000000000000'::uuid), item_name)
  DO UPDATE SET
    quantity = inventory.quantity + NEW.quantity,
    unit_cost = COALESCE(NEW.unit_cost, inventory.unit_cost),
    supplier = COALESCE(NEW.supplier, inventory.supplier),
    last_updated = now();
  RETURN NEW;
END;
$function$;

-- 5. Add missing WITH CHECK clauses on UPDATE policies
DROP POLICY IF EXISTS "Users can update own crops, admin/staff can update all" ON public.crops;
CREATE POLICY "Users can update own crops, admin/staff can update all"
ON public.crops FOR UPDATE TO authenticated
USING ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])))
WITH CHECK ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])));

DROP POLICY IF EXISTS "Users can update own sales, admin/staff can update all" ON public.sales;
CREATE POLICY "Users can update own sales, admin/staff can update all"
ON public.sales FOR UPDATE TO authenticated
USING ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])))
WITH CHECK ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])));

DROP POLICY IF EXISTS "Users can update own purchases" ON public.purchases;
CREATE POLICY "Users can update own purchases"
ON public.purchases FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Owners can update their farms" ON public.farms;
CREATE POLICY "Owners can update their farms"
ON public.farms FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());