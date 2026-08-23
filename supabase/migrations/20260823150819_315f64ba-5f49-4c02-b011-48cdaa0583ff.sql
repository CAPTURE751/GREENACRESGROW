-- 1. Crops lifecycle columns
ALTER TABLE public.crops
  ADD COLUMN IF NOT EXISTS establishment_method text NOT NULL DEFAULT 'direct_seed',
  ADD COLUMN IF NOT EXISTS nursery_start_date date,
  ADD COLUMN IF NOT EXISTS nursery_duration_days integer,
  ADD COLUMN IF NOT EXISTS expected_transplant_date date,
  ADD COLUMN IF NOT EXISTS actual_transplant_date date,
  ADD COLUMN IF NOT EXISTS field_growth_duration_days integer,
  ADD COLUMN IF NOT EXISTS expected_harvest_date date,
  ADD COLUMN IF NOT EXISTS actual_harvest_date date,
  ADD COLUMN IF NOT EXISTS nursery_location text,
  ADD COLUMN IF NOT EXISTS seed_quantity numeric,
  ADD COLUMN IF NOT EXISTS seedlings_transplanted integer,
  ADD COLUMN IF NOT EXISTS spacing text,
  ADD COLUMN IF NOT EXISTS nursery_notes text,
  ADD COLUMN IF NOT EXISTS transplant_notes text,
  ADD COLUMN IF NOT EXISTS duration_source text NOT NULL DEFAULT 'custom';

-- 2. Crop variety duration library
CREATE TABLE IF NOT EXISTS public.crop_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  crop_name text NOT NULL,
  variety text,
  establishment_method text NOT NULL DEFAULT 'direct_seed',
  nursery_duration_days integer,
  field_duration_days integer,
  total_duration_days integer,
  min_duration_days integer,
  max_duration_days integer,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_varieties TO authenticated;
GRANT ALL ON public.crop_varieties TO service_role;
ALTER TABLE public.crop_varieties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crop_varieties_select" ON public.crop_varieties;
CREATE POLICY "crop_varieties_select" ON public.crop_varieties FOR SELECT TO authenticated
  USING (farm_id IS NULL OR public.is_farm_member(auth.uid(), farm_id));

DROP POLICY IF EXISTS "crop_varieties_insert" ON public.crop_varieties;
CREATE POLICY "crop_varieties_insert" ON public.crop_varieties FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (farm_id IS NULL OR public.is_farm_member(auth.uid(), farm_id)));

DROP POLICY IF EXISTS "crop_varieties_update" ON public.crop_varieties;
CREATE POLICY "crop_varieties_update" ON public.crop_varieties FOR UPDATE TO authenticated
  USING (farm_id IS NOT NULL AND public.is_farm_member(auth.uid(), farm_id))
  WITH CHECK (farm_id IS NOT NULL AND public.is_farm_member(auth.uid(), farm_id));

DROP POLICY IF EXISTS "crop_varieties_delete" ON public.crop_varieties;
CREATE POLICY "crop_varieties_delete" ON public.crop_varieties FOR DELETE TO authenticated
  USING (farm_id IS NOT NULL AND public.is_farm_member(auth.uid(), farm_id));

DROP TRIGGER IF EXISTS trg_crop_varieties_updated ON public.crop_varieties;
CREATE TRIGGER trg_crop_varieties_updated BEFORE UPDATE ON public.crop_varieties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Harvest events (staggered harvests)
CREATE TABLE IF NOT EXISTS public.crop_harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  harvest_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  quality_grade text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_harvests TO authenticated;
GRANT ALL ON public.crop_harvests TO service_role;
ALTER TABLE public.crop_harvests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crop_harvests_select" ON public.crop_harvests;
CREATE POLICY "crop_harvests_select" ON public.crop_harvests FOR SELECT TO authenticated
  USING (farm_id IS NULL OR public.is_farm_member(auth.uid(), farm_id));

DROP POLICY IF EXISTS "crop_harvests_insert" ON public.crop_harvests;
CREATE POLICY "crop_harvests_insert" ON public.crop_harvests FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (farm_id IS NULL OR public.is_farm_member(auth.uid(), farm_id)));

DROP POLICY IF EXISTS "crop_harvests_update" ON public.crop_harvests;
CREATE POLICY "crop_harvests_update" ON public.crop_harvests FOR UPDATE TO authenticated
  USING (farm_id IS NULL OR public.is_farm_member(auth.uid(), farm_id))
  WITH CHECK (farm_id IS NULL OR public.is_farm_member(auth.uid(), farm_id));

DROP POLICY IF EXISTS "crop_harvests_delete" ON public.crop_harvests;
CREATE POLICY "crop_harvests_delete" ON public.crop_harvests FOR DELETE TO authenticated
  USING (farm_id IS NULL OR public.is_farm_member(auth.uid(), farm_id));

CREATE INDEX IF NOT EXISTS idx_crop_harvests_crop ON public.crop_harvests(crop_id);

-- 4. Backfill: existing crops keep their current dates as the expected schedule
UPDATE public.crops
SET expected_harvest_date = COALESCE(expected_harvest_date, harvest_date),
    field_growth_duration_days = COALESCE(field_growth_duration_days, growth_duration_days)
WHERE expected_harvest_date IS NULL OR field_growth_duration_days IS NULL;