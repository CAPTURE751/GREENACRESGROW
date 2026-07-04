
CREATE TABLE public.profit_disbursements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  source_kind TEXT NOT NULL,
  source_id TEXT,
  source_name TEXT NOT NULL,
  category TEXT NOT NULL,
  recipient TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  disbursed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profit_disbursements TO authenticated;
GRANT ALL ON public.profit_disbursements TO service_role;

ALTER TABLE public.profit_disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view farm disbursements"
  ON public.profit_disbursements FOR SELECT TO authenticated
  USING (public.is_farm_member(auth.uid(), farm_id));

CREATE POLICY "Members can insert farm disbursements"
  ON public.profit_disbursements FOR INSERT TO authenticated
  WITH CHECK (public.is_farm_member(auth.uid(), farm_id) AND created_by = auth.uid());

CREATE POLICY "Creators can update their disbursements"
  ON public.profit_disbursements FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_farm_owner(auth.uid(), farm_id));

CREATE POLICY "Creators or owners can delete disbursements"
  ON public.profit_disbursements FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_farm_owner(auth.uid(), farm_id));

CREATE TRIGGER trg_profit_disbursements_updated
  BEFORE UPDATE ON public.profit_disbursements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_profit_disbursements_farm ON public.profit_disbursements(farm_id, disbursed_on DESC);
