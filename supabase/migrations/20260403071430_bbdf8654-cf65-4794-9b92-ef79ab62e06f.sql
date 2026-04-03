
-- Create capital_injections table
CREATE TABLE public.capital_injections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  injection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'Owner',
  description TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  farm_id UUID REFERENCES public.farms(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.capital_injections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create capital injections"
  ON public.capital_injections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin and staff can view all capital injections"
  ON public.capital_injections FOR SELECT TO authenticated
  USING (
    (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]))
    OR (created_by = auth.uid())
  );

CREATE POLICY "Users can update own, admin/staff can update all"
  ON public.capital_injections FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid())
    OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]))
  );

CREATE POLICY "Admin can delete capital injections"
  ON public.capital_injections FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.capital_injections;
