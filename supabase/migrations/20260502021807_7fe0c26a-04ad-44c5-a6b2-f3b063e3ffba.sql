-- 1. Extend inventory with item_type
ALTER TABLE public.inventory 
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'input' CHECK (item_type IN ('input','output','asset'));

-- 2. inventory_batches (FIFO source of truth)
CREATE TABLE IF NOT EXISTS public.inventory_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  farm_id uuid,
  batch_number text,
  source text,
  expiry_date date,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity_received numeric NOT NULL CHECK (quantity_received > 0),
  quantity_remaining numeric NOT NULL CHECK (quantity_remaining >= 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_batches_item ON public.inventory_batches(inventory_id, received_date);
CREATE INDEX IF NOT EXISTS idx_inv_batches_farm ON public.inventory_batches(farm_id);

ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View inventory batches" ON public.inventory_batches FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','staff') OR created_by = auth.uid());
CREATE POLICY "Create inventory batches" ON public.inventory_batches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update inventory batches" ON public.inventory_batches FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','staff') OR created_by = auth.uid());
CREATE POLICY "Delete inventory batches admin" ON public.inventory_batches FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- 3. inventory_movements (audit trail)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  farm_id uuid,
  movement_type text NOT NULL CHECK (movement_type IN ('in','out','adjustment')),
  quantity numeric NOT NULL,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  source text,
  destination text,
  purpose text,
  reason text,
  batch_id uuid REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
  batch_number text,
  expiry_date date,
  linked_module text CHECK (linked_module IN ('crop','livestock','sale','purchase','equipment','manual')),
  linked_record_id uuid,
  linked_record_name text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_mov_item ON public.inventory_movements(inventory_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_inv_mov_farm ON public.inventory_movements(farm_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_linked ON public.inventory_movements(linked_module, linked_record_id);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View movements" ON public.inventory_movements FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','staff') OR created_by = auth.uid());
CREATE POLICY "Create movements" ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update movements" ON public.inventory_movements FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','staff') OR created_by = auth.uid());
CREATE POLICY "Delete movements admin" ON public.inventory_movements FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- 4. livestock_batches (bulk poultry)
CREATE TABLE IF NOT EXISTS public.livestock_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid,
  batch_id text NOT NULL,
  animal_type text NOT NULL,
  breed text,
  initial_quantity integer NOT NULL CHECK (initial_quantity > 0),
  current_quantity integer NOT NULL,
  mortality_count integer NOT NULL DEFAULT 0,
  arrival_date date NOT NULL DEFAULT CURRENT_DATE,
  source text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_livestock_batches_farm ON public.livestock_batches(farm_id);

ALTER TABLE public.livestock_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View livestock batches" ON public.livestock_batches FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','staff') OR created_by = auth.uid());
CREATE POLICY "Create livestock batches" ON public.livestock_batches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update livestock batches" ON public.livestock_batches FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','staff') OR created_by = auth.uid());
CREATE POLICY "Delete livestock batches admin" ON public.livestock_batches FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

CREATE TRIGGER update_livestock_batches_updated_at
  BEFORE UPDATE ON public.livestock_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Add tag_number to livestock for individual tracking
ALTER TABLE public.livestock 
  ADD COLUMN IF NOT EXISTS tag_number text;
CREATE INDEX IF NOT EXISTS idx_livestock_tag ON public.livestock(tag_number);

-- 6. equipment_maintenance
CREATE TABLE IF NOT EXISTS public.equipment_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  farm_id uuid,
  log_type text NOT NULL CHECK (log_type IN ('service','fuel','usage','schedule')),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  next_service_date date,
  hours_used numeric,
  fuel_litres numeric,
  cost numeric DEFAULT 0,
  performed_by text,
  description text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equip_maint_equip ON public.equipment_maintenance(equipment_id, log_date DESC);

ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View equipment maintenance" ON public.equipment_maintenance FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','staff') OR created_by = auth.uid());
CREATE POLICY "Manage equipment maintenance staff" ON public.equipment_maintenance FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','staff'));
CREATE POLICY "Create equipment maintenance" ON public.equipment_maintenance FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 7. FIFO trigger: on movement insert, update inventory quantity & consume batches
CREATE OR REPLACE FUNCTION public.process_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining numeric;
  batch_rec RECORD;
  consume numeric;
  total_consumed_cost numeric := 0;
BEGIN
  IF NEW.movement_type = 'in' THEN
    -- Increase inventory
    UPDATE public.inventory
      SET quantity = quantity + NEW.quantity,
          last_updated = now()
      WHERE id = NEW.inventory_id;

    -- Auto-create batch if not linked already
    IF NEW.batch_id IS NULL THEN
      INSERT INTO public.inventory_batches (
        inventory_id, farm_id, batch_number, source, expiry_date,
        received_date, quantity_received, quantity_remaining, unit_cost,
        notes, created_by
      ) VALUES (
        NEW.inventory_id, NEW.farm_id,
        COALESCE(NEW.batch_number, 'B-' || to_char(now(), 'YYMMDDHH24MISS')),
        NEW.source, NEW.expiry_date,
        NEW.movement_date, NEW.quantity, NEW.quantity,
        COALESCE(NEW.unit_cost, 0), NEW.notes, NEW.created_by
      ) RETURNING id INTO NEW.batch_id;
    END IF;

  ELSIF NEW.movement_type IN ('out','adjustment') THEN
    remaining := ABS(NEW.quantity);
    -- FIFO consume from oldest batches
    FOR batch_rec IN
      SELECT * FROM public.inventory_batches
      WHERE inventory_id = NEW.inventory_id AND quantity_remaining > 0
      ORDER BY received_date ASC, created_at ASC
    LOOP
      EXIT WHEN remaining <= 0;
      consume := LEAST(batch_rec.quantity_remaining, remaining);
      UPDATE public.inventory_batches
        SET quantity_remaining = quantity_remaining - consume
        WHERE id = batch_rec.id;
      total_consumed_cost := total_consumed_cost + (consume * batch_rec.unit_cost);
      remaining := remaining - consume;
    END LOOP;

    -- Decrease inventory (allow negative for adjustments only via warning)
    UPDATE public.inventory
      SET quantity = GREATEST(quantity - ABS(NEW.quantity), 0),
          last_updated = now()
      WHERE id = NEW.inventory_id;

    -- Persist computed cost if not provided
    IF NEW.total_cost IS NULL OR NEW.total_cost = 0 THEN
      NEW.total_cost := total_consumed_cost;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_inv_movement ON public.inventory_movements;
CREATE TRIGGER trg_process_inv_movement
  BEFORE INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.process_inventory_movement();