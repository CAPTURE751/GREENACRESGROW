
-- Add mother reference to livestock for birth tracking
ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS mother_id uuid;
CREATE INDEX IF NOT EXISTS idx_livestock_mother_id ON public.livestock(mother_id);

-- Births history table
CREATE TABLE IF NOT EXISTS public.livestock_births (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mother_id uuid NOT NULL,
  birth_date date NOT NULL DEFAULT CURRENT_DATE,
  newborn_count integer NOT NULL DEFAULT 1,
  notes text,
  farm_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.livestock_births ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View births" ON public.livestock_births
  FOR SELECT TO authenticated
  USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role,'staff'::user_role])) OR created_by = auth.uid());

CREATE POLICY "Create births" ON public.livestock_births
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update births" ON public.livestock_births
  FOR UPDATE TO authenticated
  USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role,'staff'::user_role])) OR created_by = auth.uid());

CREATE POLICY "Delete births admin" ON public.livestock_births
  FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::user_role);
