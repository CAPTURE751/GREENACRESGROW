
CREATE TABLE public.venture_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  farm_id uuid REFERENCES public.farms(id),
  name text NOT NULL,
  venture_type text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  costs_total numeric NOT NULL DEFAULT 0,
  revenue_total numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  ai_advice text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.venture_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets, admin/staff can view all"
  ON public.venture_budgets FOR SELECT TO authenticated
  USING (
    (created_by = auth.uid()) OR 
    (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]))
  );

CREATE POLICY "Users can create budgets"
  ON public.venture_budgets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own budgets, admin/staff can update all"
  ON public.venture_budgets FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid()) OR 
    (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]))
  );

CREATE POLICY "Users can delete own budgets, admin can delete all"
  ON public.venture_budgets FOR DELETE TO authenticated
  USING (
    (created_by = auth.uid()) OR 
    (get_user_role(auth.uid()) = 'admin'::user_role)
  );

CREATE TRIGGER update_venture_budgets_updated_at
  BEFORE UPDATE ON public.venture_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
